package dev.yuzuha

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.FileProvider
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
import java.security.cert.CertificateFactory
import java.security.spec.X509EncodedKeySpec
import java.time.Instant
import java.util.Base64
import java.util.concurrent.TimeUnit
import org.json.JSONObject

data class NativeUpdateResult(
  val kind: String,
  val currentVersion: String,
  val availableVersion: String? = null,
  val reasonCode: String? = null,
)

data class NativeReleaseMetadata(
  val schema: Int,
  val appId: String,
  val platform: String,
  val version: String,
  val versionCode: Long,
  val apkUrl: String,
  val sha256: String,
  val sizeBytes: Long,
  val packageName: String,
  val signerSha256: String,
  val publishedAt: String,
  val signature: String,
) {
  fun signingPayload(): String = listOf(
    schema,
    appId,
    platform,
    version,
    versionCode,
    apkUrl,
    sha256,
    sizeBytes,
    packageName,
    signerSha256,
    publishedAt,
  ).joinToString("\n")
}

internal fun interface NativeUpdateConnectionFactory {
  fun open(url: URL): HttpURLConnection
}

internal fun interface ApkArchiveVerifier {
  fun verify(file: File, metadata: NativeReleaseMetadata): Boolean
}

internal fun interface ApkInstallLauncher {
  /** Returns `root-installed` or `prompted`; throws for a named install failure. */
  fun install(file: File): String
}

private val defaultNativeUpdateConnectionFactory = NativeUpdateConnectionFactory { url ->
  url.openConnection() as HttpURLConnection
}

class AndroidNativeUpdater internal constructor(
  private val filesDirectory: File,
  private val metadataUrl: URL,
  private val installedVersion: String,
  private val installedVersionCode: Long,
  private val pinnedPublicKey: String,
  private val connectionFactory: NativeUpdateConnectionFactory,
  private val archiveVerifier: ApkArchiveVerifier,
  private val installLauncher: ApkInstallLauncher,
  private val enabled: Boolean,
) {
  private val operationLock = Any()

  constructor(context: Context) : this(
    filesDirectory = context.filesDir,
    metadataUrl = URL(DEFAULT_METADATA_URL),
    installedVersion = BuildConfig.VERSION_NAME,
    installedVersionCode = BuildConfig.VERSION_CODE.toLong(),
    pinnedPublicKey = PINNED_PUBLIC_KEY,
    connectionFactory = defaultNativeUpdateConnectionFactory,
    archiveVerifier = AndroidApkArchiveVerifier(context),
    installLauncher = AndroidApkInstallLauncher(context),
    enabled = !BuildConfig.YUZUHA_LOCAL_BUNDLE_ONLY,
  )

  fun applyLatest(): NativeUpdateResult = synchronized(operationLock) {
    if (!enabled) {
      return NativeUpdateResult("unavailable", installedVersion, reasonCode = "LOCAL_BUNDLE_ONLY")
    }
    try {
      val metadata = fetchAndVerifyMetadata()
      if (metadata.versionCode <= installedVersionCode || BundleInstallerRules.compareVersions(metadata.version, installedVersion) <= 0) {
        return NativeUpdateResult("current", installedVersion, metadata.version, "REMOTE_NOT_NEWER")
      }
      if (!NativeUpdateRules.isNewerNativeLine(metadata.version, installedVersion)) {
        return NativeUpdateResult("same-line", installedVersion, metadata.version)
      }
      val apk = downloadAndVerify(metadata)
      if (!archiveVerifier.verify(apk, metadata)) {
        apk.delete()
        return NativeUpdateResult("error", installedVersion, metadata.version, "APK_ARCHIVE_INVALID")
      }
      val installKind = installLauncher.install(apk)
      if (installKind != "root-installed" && installKind != "prompted") {
        return NativeUpdateResult("error", installedVersion, metadata.version, "INSTALL_RESULT_INVALID")
      }
      NativeUpdateResult(installKind, installedVersion, metadata.version)
    } catch (_: InvalidMetadataException) {
      NativeUpdateResult("error", installedVersion, reasonCode = "METADATA_INVALID")
    } catch (_: InvalidApkException) {
      NativeUpdateResult("error", installedVersion, reasonCode = "APK_INVALID")
    } catch (_: RootInstallException) {
      NativeUpdateResult("error", installedVersion, reasonCode = "ROOT_INSTALL_FAILED")
    } catch (_: IOException) {
      NativeUpdateResult("error", installedVersion, reasonCode = "UPDATE_UNAVAILABLE")
    } catch (_: Exception) {
      NativeUpdateResult("error", installedVersion, reasonCode = "NATIVE_UPDATE_FAILED")
    }
  }

  private fun fetchAndVerifyMetadata(): NativeReleaseMetadata {
    if (metadataUrl.protocol != "https" || metadataUrl.userInfo != null || metadataUrl.query != null || metadataUrl.ref != null) {
      throw InvalidMetadataException()
    }
    val connection = connectionFactory.open(metadataUrl).apply {
      connectTimeout = METADATA_TIMEOUT_MILLIS
      readTimeout = METADATA_TIMEOUT_MILLIS
      instanceFollowRedirects = true
      requestMethod = "GET"
    }
    return try {
      if (connection.responseCode != HttpURLConnection.HTTP_OK) throw InvalidMetadataException()
      val text = String(connection.inputStream.use { readBounded(it, MAX_METADATA_BYTES) }, StandardCharsets.UTF_8)
      parseAndValidateMetadata(text).also { verifySignature(it) }
    } finally {
      connection.disconnect()
    }
  }

  private fun parseAndValidateMetadata(text: String): NativeReleaseMetadata {
    val metadata = try {
      val json = JSONObject(text)
      NativeReleaseMetadata(
        schema = json.getInt("schema"),
        appId = json.getString("appId"),
        platform = json.getString("platform"),
        version = json.getString("version"),
        versionCode = json.getLong("versionCode"),
        apkUrl = json.getString("apkUrl"),
        sha256 = json.getString("sha256"),
        sizeBytes = json.getLong("sizeBytes"),
        packageName = json.getString("packageName"),
        signerSha256 = json.getString("signerSha256"),
        publishedAt = json.getString("publishedAt"),
        signature = json.getString("signature"),
      )
    } catch (error: Exception) {
      throw InvalidMetadataException(error)
    }
    val apkUrl = try { URL(metadata.apkUrl) } catch (error: Exception) { throw InvalidMetadataException(error) }
    if (
      metadata.schema != 1 ||
      metadata.appId != APP_ID ||
      metadata.platform != "android" ||
      !NativeUpdateRules.isApkReleaseVersion(metadata.version) ||
      metadata.versionCode <= 0 ||
      apkUrl.protocol != "https" ||
      apkUrl.userInfo != null ||
      apkUrl.query != null ||
      apkUrl.ref != null ||
      (!apkUrl.path.contains("/${metadata.version}/") && !apkUrl.path.contains("/v${metadata.version}/")) ||
      !apkUrl.path.endsWith("/Yuzuha-${metadata.version}.apk") ||
      !BundleInstallerRules.isSha256(metadata.sha256) ||
      metadata.sizeBytes <= 0 ||
      metadata.sizeBytes > MAX_APK_BYTES ||
      metadata.packageName != PACKAGE_NAME ||
      !BundleInstallerRules.isSha256(metadata.signerSha256) ||
      !BundleInstallerRules.isSignature(metadata.signature)
    ) {
      throw InvalidMetadataException()
    }
    try { Instant.parse(metadata.publishedAt) } catch (error: Exception) { throw InvalidMetadataException(error) }
    return metadata
  }

  private fun verifySignature(metadata: NativeReleaseMetadata) {
    try {
      val publicKey = AndroidEd25519.keyFactory().generatePublic(X509EncodedKeySpec(Base64.getDecoder().decode(pinnedPublicKey)))
      val verifier = AndroidEd25519.signature()
      verifier.initVerify(publicKey)
      verifier.update(metadata.signingPayload().toByteArray(StandardCharsets.UTF_8))
      if (!verifier.verify(Base64.getDecoder().decode(metadata.signature))) throw InvalidMetadataException()
    } catch (error: InvalidMetadataException) {
      throw error
    } catch (error: Exception) {
      throw InvalidMetadataException(error)
    }
  }

  private fun downloadAndVerify(metadata: NativeReleaseMetadata): File {
    val directory = File(filesDirectory, "installer/apk").apply { mkdirs() }
    if (directory.usableSpace < metadata.sizeBytes) throw IOException("Not enough private storage for the APK.")
    val target = File(directory, "Yuzuha-${metadata.version}.apk")
    if (target.exists()) {
      if (matchesFile(target, metadata.sizeBytes, metadata.sha256)) return target
      if (!target.delete()) throw IOException("Could not remove an invalid cached APK.")
    }
    val temporary = File(directory, ".Yuzuha-${metadata.version}.tmp")
    if (temporary.exists() && !temporary.delete()) throw IOException("Could not clear the temporary APK.")
    try {
      val connection = connectionFactory.open(URL(metadata.apkUrl)).apply {
        connectTimeout = DOWNLOAD_TIMEOUT_MILLIS
        readTimeout = DOWNLOAD_TIMEOUT_MILLIS
        instanceFollowRedirects = true
        requestMethod = "GET"
      }
      try {
        if (connection.responseCode != HttpURLConnection.HTTP_OK) throw InvalidApkException()
        val digest = MessageDigest.getInstance("SHA-256")
        var total = 0L
        FileOutputStream(temporary).use { output ->
          connection.inputStream.use { input ->
            val buffer = ByteArray(32 * 1024)
            while (true) {
              val read = input.read(buffer)
              if (read < 0) break
              total += read
              if (total > metadata.sizeBytes || total > MAX_APK_BYTES) throw InvalidApkException()
              digest.update(buffer, 0, read)
              output.write(buffer, 0, read)
            }
          }
          output.fd.sync()
        }
        if (total != metadata.sizeBytes || digest.digest().toHex() != metadata.sha256) throw InvalidApkException()
      } finally {
        connection.disconnect()
      }
      moveAtomically(temporary, target)
      return target
    } finally {
      if (temporary.exists()) temporary.delete()
    }
  }

  private fun matchesFile(file: File, sizeBytes: Long, sha256: String): Boolean {
    if (!file.isFile || file.length() != sizeBytes) return false
    return try {
      FileInputStream(file).use { input ->
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(32 * 1024)
        while (true) {
          val read = input.read(buffer)
          if (read < 0) break
          digest.update(buffer, 0, read)
        }
        digest.digest().toHex() == sha256
      }
    } catch (_: Exception) {
      false
    }
  }

  private fun moveAtomically(source: File, target: File) {
    try {
      Files.move(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
    } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
      Files.move(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }
  }

  private fun readBounded(input: java.io.InputStream, maxBytes: Long): ByteArray {
    val output = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8 * 1024)
    var total = 0L
    while (true) {
      val read = input.read(buffer)
      if (read < 0) break
      total += read
      if (total > maxBytes) throw InvalidMetadataException()
      output.write(buffer, 0, read)
    }
    return output.toByteArray()
  }

  private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }

  private class InvalidMetadataException(cause: Throwable? = null) : Exception(cause)
  private class InvalidApkException(cause: Throwable? = null) : Exception(cause)

  companion object {
    const val DEFAULT_METADATA_URL = "https://github.com/Tsukugi/Yuzuha/releases/latest/download/android-update.json"
    const val PINNED_PUBLIC_KEY = YuzuhaBundleInstaller.PINNED_PUBLIC_KEY
    const val APP_ID = "yuzuha-mobile"
    const val PACKAGE_NAME = "dev.yuzuha"
    const val MAX_APK_BYTES = 256L * 1024L * 1024L
    private const val MAX_METADATA_BYTES = 64L * 1024L
    private const val METADATA_TIMEOUT_MILLIS = 2_500
    private const val DOWNLOAD_TIMEOUT_MILLIS = 15_000
  }
}

private class AndroidApkArchiveVerifier(private val context: Context) : ApkArchiveVerifier {
  override fun verify(file: File, metadata: NativeReleaseMetadata): Boolean {
    return try {
      val packageManager = context.packageManager
      val archive = packageInfo(packageManager, file.absolutePath) ?: return false
      val installed = packageInfo(packageManager, context.packageName) ?: return false
      archive.packageName == metadata.packageName &&
        archive.versionName == metadata.version &&
        archive.longVersionCode == metadata.versionCode &&
        signerSha256(archive) == metadata.signerSha256 &&
        signerSha256(installed) == metadata.signerSha256
    } catch (_: Exception) {
      false
    }
  }

  private fun packageInfo(packageManager: PackageManager, value: String) = if (Build.VERSION.SDK_INT >= 33) {
    if (value.endsWith(".apk")) {
      packageManager.getPackageArchiveInfo(value, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
    } else {
      packageManager.getPackageInfo(value, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
    }
  } else {
    @Suppress("DEPRECATION")
    if (value.endsWith(".apk")) packageManager.getPackageArchiveInfo(value, PackageManager.GET_SIGNING_CERTIFICATES)
    else packageManager.getPackageInfo(value, PackageManager.GET_SIGNING_CERTIFICATES)
  }

  private fun signerSha256(info: android.content.pm.PackageInfo): String? {
    val signers = info.signingInfo?.apkContentsSigners ?: return null
    if (signers.size != 1) return null
    val certificate = CertificateFactory.getInstance("X.509").generateCertificate(signers[0].toByteArray().inputStream())
    return MessageDigest.getInstance("SHA-256").digest(certificate.encoded).joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }
}

internal class RootInstallException : Exception()

internal interface RootApkInstaller {
  fun isAvailable(): Boolean
  fun install(file: File): Boolean
}

internal fun interface SystemApkInstaller {
  fun open(file: File)
}

internal class ApkInstallCoordinator(
  private val rootInstaller: RootApkInstaller,
  private val systemInstaller: SystemApkInstaller,
) : ApkInstallLauncher {
  override fun install(file: File): String {
    if (rootInstaller.isAvailable()) {
      if (!rootInstaller.install(file)) throw RootInstallException()
      return "root-installed"
    }
    systemInstaller.open(file)
    return "prompted"
  }
}

private class AndroidApkInstallLauncher(context: Context) : ApkInstallLauncher {
  private val coordinator = ApkInstallCoordinator(AndroidRootApkInstaller(), AndroidSystemApkInstaller(context))
  override fun install(file: File): String = coordinator.install(file)
}

internal class AndroidSystemApkInstaller(private val context: Context) : SystemApkInstaller {
  override fun open(file: File) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, APK_MIME_TYPE)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(intent)
  }

  companion object {
    private const val APK_MIME_TYPE = "application/vnd.android.package-archive"
  }
}

internal data class RootCommandResult(val success: Boolean, val output: String)

internal fun interface RootCommandExecutor {
  fun run(arguments: List<String>, timeoutSeconds: Long): RootCommandResult
}

private val processRootCommandExecutor = RootCommandExecutor { arguments, timeoutSeconds ->
  val process = try {
    ProcessBuilder(arguments).redirectErrorStream(true).start()
  } catch (_: Exception) {
    return@RootCommandExecutor RootCommandResult(false, "")
  }
  try {
    if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
      process.destroyForcibly()
      RootCommandResult(false, "")
    } else {
      RootCommandResult(process.exitValue() == 0, process.inputStream.bufferedReader().use { it.readText() })
    }
  } catch (_: Exception) {
    process.destroyForcibly()
    RootCommandResult(false, "")
  }
}

internal class AndroidRootApkInstaller(
  private val executor: RootCommandExecutor = processRootCommandExecutor,
) : RootApkInstaller {
  private var dialect: RootDialect? = null

  override fun isAvailable(): Boolean {
    val magisk = executor.run(listOf("su", "-c", "id -u"), ROOT_PROBE_TIMEOUT_SECONDS)
    if (magisk.success && magisk.output.trim() == "0") {
      dialect = RootDialect.MAGISK
      return true
    }
    val aosp = executor.run(listOf("su", "0", "sh", "-c", "id -u"), ROOT_PROBE_TIMEOUT_SECONDS)
    if (aosp.success && aosp.output.trim() == "0") {
      dialect = RootDialect.AOSP
      return true
    }
    dialect = null
    return false
  }

  override fun install(file: File): Boolean {
    val command = "pm install -r --user 0 ${shellQuote(file.absolutePath)}"
    val arguments = when (dialect) {
      RootDialect.MAGISK -> listOf("su", "-c", command)
      RootDialect.AOSP -> listOf("su", "0", "sh", "-c", command)
      null -> return false
    }
    return executor.run(arguments, INSTALL_TIMEOUT_SECONDS).success
  }

  private fun shellQuote(value: String): String = "'${value.replace("'", "'\\''")}'"

  private enum class RootDialect { MAGISK, AOSP }

  companion object {
    private const val ROOT_PROBE_TIMEOUT_SECONDS = 3L
    private const val INSTALL_TIMEOUT_SECONDS = 60L
  }
}
