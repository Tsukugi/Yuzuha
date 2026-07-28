package dev.yuzuha

import android.content.Context
import android.util.Log
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.time.Instant
import java.util.concurrent.CountDownLatch

data class BundleLaunchResult(
  val kind: String,
  val version: String,
  val bundlePath: String?,
  val reasonCode: String? = null,
)

private data class RemoteBundleMetadata(
  val schema: Int,
  val appId: String,
  val platform: String,
  val runtime: String,
  val version: String,
  val minNativeVersion: String,
  val bundleUrl: String,
  val sha256: String,
  val sizeBytes: Long,
  val publishedAt: String,
  val signature: String,
) {
  fun signingPayload(): String = listOf(
    schema,
    appId,
    platform,
    runtime,
    version,
    minNativeVersion,
    bundleUrl,
    sha256,
    sizeBytes,
    publishedAt,
  ).joinToString("\n")
}

/**
 * Native launch gate. It performs one bounded metadata check per process start,
 * verifies a newer bundle before downloading it, and only returns a private
 * bundle file after its hash and signature checks pass.
 */
class YuzuhaBundleInstaller(
  private val context: Context,
  private val metadataUrl: URL = URL(DEFAULT_METADATA_URL),
  private val nativeVersion: String = NATIVE_VERSION,
) {
  private val resultLatch = CountDownLatch(1)
  @Volatile private var started = false
  @Volatile private var result: BundleLaunchResult? = null

  fun start() {
    synchronized(this) {
      if (started) {
        return
      }
      started = true
      Thread({run()}, "yuzuha-installer").apply {
        isDaemon = true
        start()
      }
    }
  }

  fun await(): BundleLaunchResult {
    start()
    resultLatch.await()
    return requireNotNull(result)
  }

  private fun run() {
    val embedded = BundleLaunchResult("embedded", EMBEDDED_VERSION, null)
    val local = loadVerifiedLocal()
    val baseline = local ?: embedded
    try {
      val metadata = fetchMetadata()
      validateMetadata(metadata)
      if (compareVersions(metadata.version, baseline.version) <= 0) {
        publish(BundleLaunchResult("local-current", baseline.version, baseline.bundlePath, "REMOTE_NOT_NEWER"))
        return
      }
      verifySignature(metadata)
      val activated = downloadAndActivate(metadata)
      publish(BundleLaunchResult("remote-activated", activated.version, activated.bundlePath))
    } catch (_: InvalidRemoteException) {
      publish(BundleLaunchResult("invalid-remote", baseline.version, baseline.bundlePath, "INVALID_REMOTE"))
    } catch (_: IOException) {
      publish(BundleLaunchResult("offline-local", baseline.version, baseline.bundlePath, "REMOTE_UNAVAILABLE"))
    } catch (_: Exception) {
      publish(BundleLaunchResult("invalid-remote", baseline.version, baseline.bundlePath, "INSTALLER_FAILED"))
    }
  }

  private fun publish(next: BundleLaunchResult) {
    result = next
    Log.i(LOG_TAG, "launch kind=${next.kind} version=${next.version} reason=${next.reasonCode ?: "none"}")
    resultLatch.countDown()
  }

  private fun compareVersions(left: String, right: String): Int {
    val leftParts = left.split("-", limit = 2)
    val rightParts = right.split("-", limit = 2)
    val leftCore = leftParts[0].split('.').map { it.toLong() }
    val rightCore = rightParts[0].split('.').map { it.toLong() }
    for (index in 0 until 3) {
      if (leftCore[index] != rightCore[index]) {
        return leftCore[index].compareTo(rightCore[index])
      }
    }

    val leftPre = leftParts.getOrNull(1)
    val rightPre = rightParts.getOrNull(1)
    if (leftPre == null && rightPre == null) {
      return 0
    }
    if (leftPre == null) {
      return 1
    }
    if (rightPre == null) {
      return -1
    }
    val leftIdentifiers = leftPre.split('.')
    val rightIdentifiers = rightPre.split('.')
    for (index in 0 until maxOf(leftIdentifiers.size, rightIdentifiers.size)) {
      val leftIdentifier = leftIdentifiers.getOrNull(index) ?: return -1
      val rightIdentifier = rightIdentifiers.getOrNull(index) ?: return 1
      if (leftIdentifier == rightIdentifier) {
        continue
      }
      val leftNumber = leftIdentifier.toLongOrNull()
      val rightNumber = rightIdentifier.toLongOrNull()
      return when {
        leftNumber != null && rightNumber != null -> leftNumber.compareTo(rightNumber)
        leftNumber != null -> -1
        rightNumber != null -> 1
        else -> leftIdentifier.compareTo(rightIdentifier)
      }
    }
    return leftIdentifiers.size.compareTo(rightIdentifiers.size)
  }

  private fun fetchMetadata(): RemoteBundleMetadata {
    if (metadataUrl.protocol != "https" || metadataUrl.userInfo != null || metadataUrl.query != null || metadataUrl.ref != null) {
      throw InvalidRemoteException()
    }
    val connection = (metadataUrl.openConnection() as HttpURLConnection).apply {
      connectTimeout = METADATA_TIMEOUT_MILLIS
      readTimeout = METADATA_TIMEOUT_MILLIS
      instanceFollowRedirects = false
      requestMethod = "GET"
    }
    return try {
      if (connection.responseCode != HttpURLConnection.HTTP_OK) {
        throw InvalidRemoteException()
      }
      val bytes = connection.inputStream.use { readBounded(it, MAX_METADATA_BYTES) }
      parseMetadata(String(bytes, StandardCharsets.UTF_8))
    } finally {
      connection.disconnect()
    }
  }

  private fun parseMetadata(text: String): RemoteBundleMetadata {
    try {
      val json = JSONObject(text)
      return RemoteBundleMetadata(
        schema = json.getInt("schema"),
        appId = json.getString("appId"),
        platform = json.getString("platform"),
        runtime = json.getString("runtime"),
        version = json.getString("version"),
        minNativeVersion = json.getString("minNativeVersion"),
        bundleUrl = json.getString("bundleUrl"),
        sha256 = json.getString("sha256"),
        sizeBytes = json.getLong("sizeBytes"),
        publishedAt = json.getString("publishedAt"),
        signature = json.getString("signature"),
      )
    } catch (error: Exception) {
      throw InvalidRemoteException(error)
    }
  }

  private fun validateMetadata(metadata: RemoteBundleMetadata) {
    val semver = Regex("^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$")
    val sha256 = Regex("^[a-f0-9]{64}$")
    val signature = Regex("^[A-Za-z0-9+/]{86}==$")
    val bundleUrl = try { URL(metadata.bundleUrl) } catch (error: Exception) { throw InvalidRemoteException(error) }
    if (
      metadata.schema != 1 ||
      metadata.appId != APP_ID ||
      metadata.platform != "android" ||
      metadata.runtime != RUNTIME ||
      !semver.matches(metadata.version) ||
      !semver.matches(metadata.minNativeVersion) ||
      compareVersions(metadata.minNativeVersion, nativeVersion) > 0 ||
      bundleUrl.protocol != "https" ||
      bundleUrl.userInfo != null ||
      bundleUrl.query != null ||
      bundleUrl.ref != null ||
      !sha256.matches(metadata.sha256) ||
      metadata.sizeBytes <= 0 ||
      metadata.sizeBytes > MAX_BUNDLE_BYTES ||
      !signature.matches(metadata.signature)
    ) {
      throw InvalidRemoteException()
    }
    try {
      Instant.parse(metadata.publishedAt)
    } catch (error: Exception) {
      throw InvalidRemoteException(error)
    }
  }

  private fun verifySignature(metadata: RemoteBundleMetadata) {
    try {
      val keyBytes = Base64.decode(PINNED_PUBLIC_KEY, Base64.DEFAULT)
      val publicKey = KeyFactory.getInstance("Ed25519").generatePublic(X509EncodedKeySpec(keyBytes))
      val verifier = Signature.getInstance("Ed25519")
      verifier.initVerify(publicKey)
      verifier.update(metadata.signingPayload().toByteArray(StandardCharsets.UTF_8))
      if (!verifier.verify(Base64.decode(metadata.signature, Base64.DEFAULT))) {
        throw InvalidRemoteException()
      }
    } catch (error: InvalidRemoteException) {
      throw error
    } catch (error: Exception) {
      throw InvalidRemoteException(error)
    }
  }

  private fun downloadAndActivate(metadata: RemoteBundleMetadata): BundleLaunchResult {
    val directory = File(context.filesDir, "installer/verified").apply { mkdirs() }
    val target = File(directory, "bundle-${metadata.version}.jsbundle")
    if (target.exists()) {
      if (!matchesFile(target, metadata.sizeBytes, metadata.sha256)) {
        throw InvalidRemoteException()
      }
      writeState(directory, metadata)
      return BundleLaunchResult("local-current", metadata.version, target.absolutePath)
    }

    val temporary = File(directory, ".bundle-${metadata.version}.tmp")
    if (temporary.exists()) {
      temporary.delete()
    }
    try {
      val connection = (URL(metadata.bundleUrl).openConnection() as HttpURLConnection).apply {
        connectTimeout = DOWNLOAD_TIMEOUT_MILLIS
        readTimeout = DOWNLOAD_TIMEOUT_MILLIS
        instanceFollowRedirects = false
        requestMethod = "GET"
      }
      try {
        if (connection.responseCode != HttpURLConnection.HTTP_OK) {
          throw InvalidRemoteException()
        }
        val digest = MessageDigest.getInstance("SHA-256")
        var total = 0L
        FileOutputStream(temporary).use { output ->
          connection.inputStream.use { input ->
            val buffer = ByteArray(32 * 1024)
            while (true) {
              val read = input.read(buffer)
              if (read < 0) {
                break
              }
              total += read
              if (total > metadata.sizeBytes || total > MAX_BUNDLE_BYTES) {
                throw InvalidRemoteException()
              }
              digest.update(buffer, 0, read)
              output.write(buffer, 0, read)
            }
          }
          output.fd.sync()
        }
        if (total != metadata.sizeBytes || !digest.digest().toHex().equals(metadata.sha256, ignoreCase = false)) {
          throw InvalidRemoteException()
        }
      } finally {
        connection.disconnect()
      }
      if (!temporary.renameTo(target)) {
        throw IOException("Installer could not activate the verified bundle.")
      }
      writeState(directory, metadata)
      return BundleLaunchResult("remote-activated", metadata.version, target.absolutePath)
    } finally {
      if (temporary.exists()) {
        temporary.delete()
      }
    }
  }

  private fun loadVerifiedLocal(): BundleLaunchResult? {
    val directory = File(context.filesDir, "installer/verified")
    val stateFile = File(context.filesDir, "installer/state.json")
    if (!stateFile.isFile) {
      return null
    }
    return try {
      val json = JSONObject(stateFile.readText(StandardCharsets.UTF_8))
      val version = json.getString("version")
      val fileName = json.getString("fileName")
      val sizeBytes = json.getLong("sizeBytes")
      val sha256 = json.getString("sha256")
      val target = File(directory, fileName)
      if (
        !Regex("^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$").matches(version) ||
        !Regex("^[a-f0-9]{64}$").matches(sha256) ||
        sizeBytes <= 0 ||
        sizeBytes > MAX_BUNDLE_BYTES ||
        !Regex("^bundle-\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?\\.jsbundle$").matches(fileName) ||
        !isChildOf(directory, target)
      ) {
        return null
      }
      if (!matchesFile(target, sizeBytes, sha256)) {
        return null
      }
      BundleLaunchResult("local-current", version, target.absolutePath)
    } catch (_: Exception) {
      null
    }
  }

  private fun writeState(directory: File, metadata: RemoteBundleMetadata) {
    val stateDirectory = directory.parentFile ?: throw IOException("Installer state directory is missing.")
    val stateFile = File(stateDirectory, "state.json")
    val temporary = File(stateDirectory, ".state.tmp")
    val json = JSONObject()
      .put("version", metadata.version)
      .put("fileName", "bundle-${metadata.version}.jsbundle")
      .put("sizeBytes", metadata.sizeBytes)
      .put("sha256", metadata.sha256)
    FileOutputStream(temporary).use { output ->
      output.write(json.toString().toByteArray(StandardCharsets.UTF_8))
      output.fd.sync()
    }
    try {
      Files.move(
        temporary.toPath(),
        stateFile.toPath(),
        StandardCopyOption.REPLACE_EXISTING,
        StandardCopyOption.ATOMIC_MOVE,
      )
    } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
      Files.move(temporary.toPath(), stateFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }
  }

  private fun matchesFile(file: File, expectedSize: Long, expectedSha256: String): Boolean {
    if (expectedSize <= 0 || expectedSize > MAX_BUNDLE_BYTES || !Regex("^[a-f0-9]{64}$").matches(expectedSha256) || !file.isFile || file.length() != expectedSize) {
      return false
    }
    FileInputStream(file).use { input ->
      val digest = MessageDigest.getInstance("SHA-256")
      val buffer = ByteArray(32 * 1024)
      while (true) {
        val read = input.read(buffer)
        if (read < 0) {
          break
        }
        digest.update(buffer, 0, read)
      }
      return digest.digest().toHex() == expectedSha256
    }
  }

  private fun isChildOf(parent: File, child: File): Boolean {
    return try {
      child.canonicalFile.parentFile == parent.canonicalFile
    } catch (_: IOException) {
      false
    }
  }

  private fun readBounded(input: java.io.InputStream, maxBytes: Long): ByteArray {
    val output = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8 * 1024)
    var total = 0L
    while (true) {
      val read = input.read(buffer)
      if (read < 0) {
        break
      }
      total += read
      if (total > maxBytes) {
        throw InvalidRemoteException()
      }
      output.write(buffer, 0, read)
    }
    return output.toByteArray()
  }

  private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }

  private class InvalidRemoteException(cause: Throwable? = null) : Exception(cause)

  companion object {
    const val DEFAULT_METADATA_URL = "https://updates.yuzuha.dev/installer/bundle.json"
    const val EMBEDDED_VERSION = "0.1.2"
    const val NATIVE_VERSION = "0.1.2"
    const val APP_ID = "yuzuha-mobile"
    const val RUNTIME = "0.86.0"
    const val MAX_BUNDLE_BYTES = 64L * 1024L * 1024L
    private const val LOG_TAG = "YuzuhaInstaller"
    private const val MAX_METADATA_BYTES = 64L * 1024L
    private const val METADATA_TIMEOUT_MILLIS = 1_500
    private const val DOWNLOAD_TIMEOUT_MILLIS = 5_000
    private const val PINNED_PUBLIC_KEY = "MCowBQYDK2VwAyEArRLIQBBtDHvW3gZ41eGFtO/e1xvDManBmIhpF401L5g="
  }
}
