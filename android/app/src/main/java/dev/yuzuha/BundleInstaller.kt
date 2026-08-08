package dev.yuzuha

import android.content.Context
import android.util.Log
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
import java.util.Base64
import java.util.concurrent.CountDownLatch

data class BundleLaunchResult(
  val kind: String,
  val version: String,
  val bundlePath: String?,
  val reasonCode: String? = null,
)

data class BundleUpdateResult(
  val kind: String,
  val currentVersion: String,
  val availableVersion: String? = null,
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

internal data class BundleFileReference(
  val version: String,
  val fileName: String,
  val sizeBytes: Long,
  val sha256: String,
  val runtime: String = YuzuhaBundleInstaller.RUNTIME,
  val minNativeVersion: String = YuzuhaBundleInstaller.NATIVE_VERSION,
)

internal data class PendingBundleReference(
  val reference: BundleFileReference,
  val attempted: Boolean,
)

internal data class InstallerState(
  val current: BundleFileReference?,
  val pending: PendingBundleReference?,
  val blockedVersion: String?,
)

internal fun interface BundleInstallerConnectionFactory {
  fun open(url: URL): HttpURLConnection
}

private val defaultConnectionFactory = BundleInstallerConnectionFactory { url ->
  url.openConnection() as HttpURLConnection
}

/**
 * Native launch gate and OTA update owner.
 *
 * It verifies metadata and bundle bytes before any private bundle path reaches
 * the React host. Manual updates are stored as pending and only become current
 * after the next launch reports a healthy React root.
 */
class YuzuhaBundleInstaller internal constructor(
  private val filesDirectory: File,
  private val metadataUrl: URL,
  private val nativeVersion: String,
  private val pinnedPublicKey: String,
  private val connectionFactory: BundleInstallerConnectionFactory,
  private val remoteUpdatesEnabled: Boolean = true,
) {
  constructor(
    context: Context,
    metadataUrl: URL = URL(DEFAULT_METADATA_URL),
    nativeVersion: String = NATIVE_VERSION,
  ) : this(context.filesDir, metadataUrl, nativeVersion, PINNED_PUBLIC_KEY, defaultConnectionFactory, !BuildConfig.YUZUHA_LOCAL_BUNDLE_ONLY)

  private val resultLatch = CountDownLatch(1)
  private val operationLock = Any()
  @Volatile private var started = false
  @Volatile private var result: BundleLaunchResult? = null

  fun start() {
    synchronized(this) {
      if (started) {
        return
      }
      started = true
      Thread({
        try {
          run()
        } catch (error: Throwable) {
          try {
            Log.e(LOG_TAG, "installer thread failed", error)
          } catch (_: Throwable) {
            // Android local unit tests do not provide the framework logger.
          }
          if (result == null) {
            publish(BundleLaunchResult("embedded", EMBEDDED_VERSION, null, "INSTALLER_FAILED"))
          }
        } finally {
          if (result == null) {
            publish(BundleLaunchResult("embedded", EMBEDDED_VERSION, null, "INSTALLER_FAILED"))
          }
        }
      }, "yuzuha-installer").apply {
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

  fun checkForUpdate(): BundleUpdateResult {
    await()
    synchronized(operationLock) {
      if (!remoteUpdatesEnabled) {
        return BundleUpdateResult("unavailable", EMBEDDED_VERSION, reasonCode = "LOCAL_BUNDLE_ONLY")
      }
      var currentVersion = EMBEDDED_VERSION
      try {
        val state = readInstallerState()
        val current = usableReference(state?.current).takeIf { it == null || compareVersions(it.version, EMBEDDED_VERSION) >= 0 }
        val pending = state?.pending?.reference?.takeIf {
          usableReference(it) != null && compareVersions(it.version, current?.version ?: EMBEDDED_VERSION) > 0
        }
        currentVersion = current?.version ?: EMBEDDED_VERSION
        val metadata = fetchAndVerifyMetadata()
        if (metadata.version == state?.blockedVersion) {
          return BundleUpdateResult("current", currentVersion, reasonCode = "BLOCKED_VERSION")
        }
        if (pending != null && compareVersions(metadata.version, pending.version) <= 0) {
          return BundleUpdateResult("prepared", currentVersion, pending.version)
        }
        if (compareVersions(metadata.version, currentVersion) <= 0) {
          return BundleUpdateResult("current", currentVersion, reasonCode = "REMOTE_NOT_NEWER")
        }
        return BundleUpdateResult("available", currentVersion, metadata.version)
      } catch (_: InvalidStateException) {
        return BundleUpdateResult("error", EMBEDDED_VERSION, reasonCode = "INVALID_STATE")
      } catch (_: InvalidRemoteException) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "INVALID_REMOTE")
      } catch (_: IOException) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "REMOTE_UNAVAILABLE")
      } catch (_: Exception) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "INSTALLER_FAILED")
      }
    }
  }

  fun downloadUpdate(): BundleUpdateResult {
    await()
    synchronized(operationLock) {
      if (!remoteUpdatesEnabled) {
        return BundleUpdateResult("unavailable", EMBEDDED_VERSION, reasonCode = "LOCAL_BUNDLE_ONLY")
      }
      var currentVersion = EMBEDDED_VERSION
      try {
        val state = readInstallerState()
        val current = usableReference(state?.current).takeIf { it == null || compareVersions(it.version, EMBEDDED_VERSION) >= 0 }
        val pending = state?.pending?.reference?.takeIf {
          usableReference(it) != null && compareVersions(it.version, current?.version ?: EMBEDDED_VERSION) > 0
        }
        currentVersion = current?.version ?: EMBEDDED_VERSION
        val metadata = fetchAndVerifyMetadata()
        if (metadata.version == state?.blockedVersion) {
          return BundleUpdateResult("error", currentVersion, reasonCode = "BLOCKED_VERSION")
        }
        if (pending != null && compareVersions(metadata.version, pending.version) <= 0) {
          return BundleUpdateResult("prepared", currentVersion, pending.version)
        }
        if (compareVersions(metadata.version, currentVersion) <= 0) {
          return BundleUpdateResult("current", currentVersion, reasonCode = "REMOTE_NOT_NEWER")
        }

        val prepared = downloadAndPrepare(metadata)
        return BundleUpdateResult("prepared", currentVersion, prepared.version)
      } catch (_: InvalidStateException) {
        return BundleUpdateResult("error", EMBEDDED_VERSION, reasonCode = "INVALID_STATE")
      } catch (_: InvalidRemoteException) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "INVALID_REMOTE")
      } catch (_: IOException) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "REMOTE_UNAVAILABLE")
      } catch (_: Exception) {
        return BundleUpdateResult("error", currentVersion, reasonCode = "INSTALLER_FAILED")
      }
    }
  }

  fun markLaunchSuccessful() {
    await()
    synchronized(operationLock) {
      val state = readInstallerState() ?: return
      val pending = state.pending ?: return
      if (usableReference(pending.reference) == null) {
        throw IOException("The pending bundle is no longer valid.")
      }
      writeInstallerState(BundleInstallerStateRules.promote(state))
    }
  }

  private fun run() {
    synchronized(operationLock) {
      val embedded = BundleLaunchResult("embedded", EMBEDDED_VERSION, null)
      val local = try {
        loadVerifiedLocal()
      } catch (_: InvalidStateException) {
        publish(embedded.copy(reasonCode = "INVALID_STATE"))
        return
      } catch (_: Exception) {
        publish(embedded.copy(reasonCode = "INSTALLER_FAILED"))
        return
      }
      val baseline = local ?: embedded
      if (!remoteUpdatesEnabled) {
        publish(baseline.copy(kind = if (local == null) "embedded" else "local-current", reasonCode = "LOCAL_BUNDLE_ONLY"))
        return
      }
      try {
        val metadata = fetchAndVerifyMetadata()
        val state = readInstallerState()
        if (metadata.version == state?.blockedVersion) {
          publish(baseline.copy(reasonCode = "BLOCKED_VERSION"))
          return
        }
        if (compareVersions(metadata.version, baseline.version) <= 0) {
          publish(baseline.copy(kind = "local-current", reasonCode = "REMOTE_NOT_NEWER"))
          return
        }

        val prepared = downloadAndPrepare(metadata)
        val selected = markPendingAttempted(prepared)
        publish(BundleLaunchResult("remote-activated", selected.version, selectedPath(selected)))
      } catch (_: InvalidStateException) {
        publish(embedded.copy(reasonCode = "INVALID_STATE"))
      } catch (_: InvalidRemoteException) {
        publish(baseline.copy(kind = "invalid-remote", reasonCode = "INVALID_REMOTE"))
      } catch (_: IOException) {
        publish(baseline.copy(kind = "offline-local", reasonCode = "REMOTE_UNAVAILABLE"))
      } catch (_: Exception) {
        publish(baseline.copy(kind = "invalid-remote", reasonCode = "INSTALLER_FAILED"))
      }
    }
  }

  private fun publish(next: BundleLaunchResult) {
    result = next
    try {
      Log.i(LOG_TAG, "launch kind=${next.kind} version=${next.version} reason=${next.reasonCode ?: "none"}")
    } catch (_: Throwable) {
      // Android local unit tests do not provide the framework logger.
    }
    resultLatch.countDown()
  }

  private fun fetchAndVerifyMetadata(): RemoteBundleMetadata {
    val metadata = fetchMetadata()
    validateMetadata(metadata)
    verifySignature(metadata)
    return metadata
  }

  private fun compareVersions(left: String, right: String): Int {
    return BundleInstallerRules.compareVersions(left, right)
  }

  private fun fetchMetadata(): RemoteBundleMetadata {
    if (metadataUrl.protocol != "https" || metadataUrl.userInfo != null || metadataUrl.query != null || metadataUrl.ref != null) {
      throw InvalidRemoteException()
    }
    val connection = connectionFactory.open(metadataUrl).apply {
      connectTimeout = METADATA_TIMEOUT_MILLIS
      readTimeout = METADATA_TIMEOUT_MILLIS
      // GitHub's /releases/latest/download URL redirects to the immutable
      // release asset. Signature and hash checks still decide trust.
      instanceFollowRedirects = true
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
    val bundleUrl = try { URL(metadata.bundleUrl) } catch (error: Exception) { throw InvalidRemoteException(error) }
    val versionPath = "/${metadata.version}/"
    if (
      metadata.schema != 1 ||
      metadata.appId != APP_ID ||
      metadata.platform != "android" ||
      metadata.runtime != RUNTIME ||
      !BundleInstallerRules.isVersion(metadata.version) ||
      !BundleInstallerRules.isVersion(metadata.minNativeVersion) ||
      compareVersions(metadata.minNativeVersion, nativeVersion) > 0 ||
      bundleUrl.protocol != "https" ||
      bundleUrl.userInfo != null ||
      bundleUrl.query != null ||
      bundleUrl.ref != null ||
      (!bundleUrl.path.contains(versionPath) && !bundleUrl.path.contains("/v${metadata.version}/")) ||
      !bundleUrl.path.endsWith(".jsbundle") ||
      !BundleInstallerRules.isSha256(metadata.sha256) ||
      metadata.sizeBytes <= 0 ||
      metadata.sizeBytes > MAX_BUNDLE_BYTES ||
      !BundleInstallerRules.isSignature(metadata.signature)
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
      val keyBytes = Base64.getDecoder().decode(pinnedPublicKey)
      val publicKey = KeyFactory.getInstance("Ed25519").generatePublic(X509EncodedKeySpec(keyBytes))
      val verifier = Signature.getInstance("Ed25519")
      verifier.initVerify(publicKey)
      verifier.update(metadata.signingPayload().toByteArray(StandardCharsets.UTF_8))
      if (!verifier.verify(Base64.getDecoder().decode(metadata.signature))) {
        throw InvalidRemoteException()
      }
    } catch (error: InvalidRemoteException) {
      throw error
    } catch (error: Exception) {
      throw InvalidRemoteException(error)
    }
  }

  private fun downloadAndPrepare(metadata: RemoteBundleMetadata): BundleFileReference {
    val directory = verifiedDirectory().apply { mkdirs() }
    val reference = BundleFileReference(
      version = metadata.version,
      fileName = "bundle-${metadata.version}.jsbundle",
      sizeBytes = metadata.sizeBytes,
      sha256 = metadata.sha256,
      runtime = metadata.runtime,
      minNativeVersion = metadata.minNativeVersion,
    )
    val target = File(directory, reference.fileName)
    if (target.exists()) {
      if (!matchesFile(target, reference.sizeBytes, reference.sha256)) {
        throw InvalidRemoteException()
      }
      writeInstallerState(
        InstallerState(
          current = readInstallerState()?.current,
          pending = PendingBundleReference(reference, attempted = false),
          blockedVersion = null,
        ),
      )
      return reference
    }

    val temporary = File(directory, ".bundle-${metadata.version}.tmp")
    if (temporary.exists() && !temporary.delete()) {
      throw IOException("Installer could not clear its temporary bundle.")
    }
    try {
      val connection = connectionFactory.open(URL(metadata.bundleUrl)).apply {
        connectTimeout = DOWNLOAD_TIMEOUT_MILLIS
        readTimeout = DOWNLOAD_TIMEOUT_MILLIS
        // GitHub release assets redirect to their immutable CDN object. The
        // signed metadata, exact size, and SHA-256 remain the trust checks.
        instanceFollowRedirects = true
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
              if (read < 0) break
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
      moveAtomically(temporary, target)
      val previous = readInstallerState()
      writeInstallerState(
        InstallerState(
          current = previous?.current,
          pending = PendingBundleReference(reference, attempted = false),
          blockedVersion = null,
        ),
      )
      return reference
    } finally {
      if (temporary.exists()) temporary.delete()
    }
  }

  private fun markPendingAttempted(reference: BundleFileReference): BundleFileReference {
    val state = readInstallerState() ?: throw IOException("Installer state is missing.")
    val pending = state.pending ?: throw IOException("Installer pending state is missing.")
    if (pending.reference != reference || usableReference(reference) == null) {
      throw IOException("Installer pending state does not match the selected bundle.")
    }
    writeInstallerState(BundleInstallerStateRules.markAttempted(state))
    return reference
  }

  private fun selectedPath(reference: BundleFileReference): String =
    File(verifiedDirectory(), reference.fileName).absolutePath

  private fun loadVerifiedLocal(): BundleLaunchResult? {
    val state = readInstallerState() ?: return null
    val current = usableReference(state.current).takeIf { it == null || compareVersions(it.version, EMBEDDED_VERSION) >= 0 }
    val pending = state.pending
    if (pending != null) {
      if (
        usableReference(pending.reference) == null ||
        compareVersions(pending.reference.version, EMBEDDED_VERSION) < 0 ||
        (current != null && compareVersions(pending.reference.version, current.version) <= 0)
      ) {
        writeInstallerState(BundleInstallerStateRules.rollback(state))
        return current?.let { BundleLaunchResult("local-current", it.version, selectedPath(it), "PENDING_INVALID") }
      }
      if (pending.attempted) {
        writeInstallerState(BundleInstallerStateRules.rollback(state))
        return current?.let { BundleLaunchResult("local-current", it.version, selectedPath(it), "PENDING_ROLLBACK") }
      }
      writeInstallerState(BundleInstallerStateRules.markAttempted(state))
      return BundleLaunchResult("local-current", pending.reference.version, selectedPath(pending.reference), "PENDING_ATTEMPT")
    }
    return current?.let { BundleLaunchResult("local-current", it.version, selectedPath(it)) }
  }

  private fun readInstallerState(): InstallerState? {
    val stateFile = File(filesDirectory, "installer/state.json")
    if (!stateFile.isFile) return null
    return try {
      val json = JSONObject(stateFile.readText(StandardCharsets.UTF_8))
      val schema = if (json.has("schema")) json.getInt("schema") else LEGACY_STATE_SCHEMA
      if (schema == STATE_SCHEMA) {
        val current = json.optJSONObject("current")?.let { parseFileReference(it) }
        val pendingObject = json.optJSONObject("pending")
        val pending = pendingObject?.let {
          val attempted = it.opt("attempted")
          if (attempted !is Boolean) throw InvalidStateException()
          PendingBundleReference(parseFileReference(it), attempted)
        }
        val blockedVersion = json.optString("blockedVersion", null)
        if (blockedVersion != null && !isVersion(blockedVersion)) throw InvalidStateException()
        InstallerState(current, pending, blockedVersion)
      } else if (schema == LEGACY_STATE_SCHEMA && json.has("version")) {
        InstallerState(
          current = parseFileReference(json),
          pending = null,
          blockedVersion = null,
        )
      } else {
        throw InvalidStateException()
      }
    } catch (error: InvalidStateException) {
      throw error
    } catch (error: Exception) {
      throw InvalidStateException(error)
    }
  }

  private fun parseFileReference(json: JSONObject): BundleFileReference {
    val reference = BundleFileReference(
      version = json.getString("version"),
      fileName = json.getString("fileName"),
      sizeBytes = json.getLong("sizeBytes"),
      sha256 = json.getString("sha256"),
      runtime = json.optString("runtime", RUNTIME),
      minNativeVersion = json.optString("minNativeVersion", NATIVE_VERSION),
    )
    if (
      !isVersion(reference.version) ||
      !BundleInstallerRules.isBundleFileName(reference.fileName) ||
      reference.sizeBytes <= 0 ||
      reference.sizeBytes > MAX_BUNDLE_BYTES ||
      !BundleInstallerRules.isSha256(reference.sha256) ||
      reference.runtime != RUNTIME ||
      !isVersion(reference.minNativeVersion) ||
      compareVersions(reference.minNativeVersion, nativeVersion) > 0
    ) {
      throw InvalidStateException()
    }
    return reference
  }

  private fun usableReference(reference: BundleFileReference?): BundleFileReference? {
    if (reference == null) return null
    val file = File(verifiedDirectory(), reference.fileName)
    return if (isChildOf(verifiedDirectory(), file) && matchesFile(file, reference.sizeBytes, reference.sha256)) reference else null
  }

  private fun writeInstallerState(state: InstallerState) {
    val directory = installerDirectory().apply { mkdirs() }
    val stateFile = File(directory, "state.json")
    val temporary = File(directory, ".state.tmp")
    val json = JSONObject().put("schema", STATE_SCHEMA)
    state.current?.let { json.put("current", referenceJson(it)) }
    state.pending?.let {
      json.put("pending", referenceJson(it.reference).put("attempted", it.attempted))
    }
    state.blockedVersion?.let { json.put("blockedVersion", it) }
    FileOutputStream(temporary).use { output ->
      output.write(json.toString().toByteArray(StandardCharsets.UTF_8))
      output.fd.sync()
    }
    moveAtomically(temporary, stateFile)
  }

  private fun referenceJson(reference: BundleFileReference): JSONObject = JSONObject()
    .put("version", reference.version)
    .put("fileName", reference.fileName)
    .put("sizeBytes", reference.sizeBytes)
    .put("sha256", reference.sha256)
    .put("runtime", reference.runtime)
    .put("minNativeVersion", reference.minNativeVersion)

  private fun installerDirectory(): File = File(filesDirectory, "installer")

  private fun verifiedDirectory(): File = File(installerDirectory(), "verified")

  private fun moveAtomically(source: File, target: File) {
    try {
      Files.move(
        source.toPath(),
        target.toPath(),
        StandardCopyOption.REPLACE_EXISTING,
        StandardCopyOption.ATOMIC_MOVE,
      )
    } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
      Files.move(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }
  }

  private fun matchesFile(file: File, expectedSize: Long, expectedSha256: String): Boolean {
    if (expectedSize <= 0 || expectedSize > MAX_BUNDLE_BYTES || !BundleInstallerRules.isSha256(expectedSha256) || !file.isFile || file.length() != expectedSize) {
      return false
    }
    return try {
      FileInputStream(file).use { input ->
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(32 * 1024)
        while (true) {
          val read = input.read(buffer)
          if (read < 0) break
          digest.update(buffer, 0, read)
        }
        digest.digest().toHex() == expectedSha256
      }
    } catch (_: Exception) {
      false
    }
  }

  private fun isChildOf(parent: File, child: File): Boolean {
    return try {
      val rootPath = parent.canonicalFile.path + File.separator
      child.canonicalFile.path.startsWith(rootPath)
    } catch (_: IOException) {
      false
    }
  }

  private fun isVersion(value: String): Boolean = BundleInstallerRules.isVersion(value)

  private fun readBounded(input: java.io.InputStream, maxBytes: Long): ByteArray {
    val output = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8 * 1024)
    var total = 0L
    while (true) {
      val read = input.read(buffer)
      if (read < 0) break
      total += read
      if (total > maxBytes) throw InvalidRemoteException()
      output.write(buffer, 0, read)
    }
    return output.toByteArray()
  }

  private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }

  private class InvalidRemoteException(cause: Throwable? = null) : Exception(cause)

  private class InvalidStateException(cause: Throwable? = null) : Exception(cause)

  companion object {
    const val DEFAULT_METADATA_URL = "https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle.json"
    const val EMBEDDED_VERSION = "0.1.3"
    const val NATIVE_VERSION = "0.1.3"
    const val APP_ID = "yuzuha-mobile"
    const val RUNTIME = "0.86.0"
    const val MAX_BUNDLE_BYTES = 64L * 1024L * 1024L
    const val PINNED_PUBLIC_KEY = "MCowBQYDK2VwAyEAHtg4xjISeTsnO7iXTHPfyv6MTBQvEKcbYXot6em3V8s="
    private const val STATE_SCHEMA = 2
    private const val LEGACY_STATE_SCHEMA = 1
    private const val LOG_TAG = "YuzuhaInstaller"
    private const val MAX_METADATA_BYTES = 64L * 1024L
    private const val METADATA_TIMEOUT_MILLIS = 1_500
    private const val DOWNLOAD_TIMEOUT_MILLIS = 5_000
  }
}
