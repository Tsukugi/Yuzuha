package dev.yuzuha

import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class AndroidNativeUpdaterFlowTest {
  @get:Rule
  val temporaryFolder = TemporaryFolder()

  @Test
  fun crossLineUpdateDownloadsLatestPatchApkAndStartsInstaller() {
    val release = NativeReleaseFixture.create("0.3.4", 14)
    val network = NativeFixtureNetwork(release.metadata, release.apk)
    val archiveVerifier = RecordingArchiveVerifier(true)
    val installLauncher = RecordingInstallLauncher("prompted")
    val updater = createUpdater(release, network, archiveVerifier, installLauncher)

    val result = updater.applyLatest()

    assertEquals("prompted", result.kind)
    assertEquals("0.3.4", result.availableVersion)
    assertEquals(1, network.metadataRequests)
    assertEquals(1, network.apkRequests)
    assertEquals("0.3.4", archiveVerifier.version)
    assertTrue(requireNotNull(installLauncher.file).isFile)
    assertEquals(release.apk.toList(), requireNotNull(installLauncher.file).readBytes().toList())
  }

  @Test
  fun sameLinePatchLeavesDeliveryToBundleOta() {
    val release = NativeReleaseFixture.create("0.2.9", 14)
    val network = NativeFixtureNetwork(release.metadata, release.apk)
    val archiveVerifier = RecordingArchiveVerifier(true)
    val installLauncher = RecordingInstallLauncher("prompted")
    val updater = createUpdater(release, network, archiveVerifier, installLauncher)

    val result = updater.applyLatest()

    assertEquals("same-line", result.kind)
    assertEquals("0.2.9", result.availableVersion)
    assertEquals(1, network.metadataRequests)
    assertEquals(0, network.apkRequests)
    assertEquals(null, installLauncher.file)
  }

  @Test
  fun tamperedApkIsRemovedAndNeverInstalled() {
    val release = NativeReleaseFixture.create("0.3.4", 14)
    val network = NativeFixtureNetwork(release.metadata, "tampered".toByteArray())
    val installLauncher = RecordingInstallLauncher("prompted")
    val root = temporaryFolder.newFolder("tampered-files")
    val updater = createUpdater(release, network, RecordingArchiveVerifier(true), installLauncher, root)

    val result = updater.applyLatest()

    assertEquals("error", result.kind)
    assertEquals("APK_INVALID", result.reasonCode)
    assertEquals(null, installLauncher.file)
    assertTrue(File(root, "installer/apk").listFiles().isNullOrEmpty())
  }

  @Test
  fun archiveMismatchIsNeverInstalled() {
    val release = NativeReleaseFixture.create("0.3.4", 14)
    val network = NativeFixtureNetwork(release.metadata, release.apk)
    val installLauncher = RecordingInstallLauncher("prompted")
    val updater = createUpdater(release, network, RecordingArchiveVerifier(false), installLauncher)

    val result = updater.applyLatest()

    assertEquals("error", result.kind)
    assertEquals("APK_ARCHIVE_INVALID", result.reasonCode)
    assertEquals(null, installLauncher.file)
  }

  private fun createUpdater(
    release: NativeReleaseFixture,
    network: NativeFixtureNetwork,
    archiveVerifier: RecordingArchiveVerifier,
    installLauncher: RecordingInstallLauncher,
    root: File = temporaryFolder.newFolder("files-${System.nanoTime()}"),
  ) = AndroidNativeUpdater(
    filesDirectory = root,
    metadataUrl = URL("https://updates.test/android-update.json"),
    installedVersion = "0.2.8",
    installedVersionCode = 10,
    pinnedPublicKey = release.publicKey,
    connectionFactory = network,
    archiveVerifier = archiveVerifier,
    installLauncher = installLauncher,
    enabled = true,
  )

  private class RecordingArchiveVerifier(private val accepted: Boolean) : ApkArchiveVerifier {
    var version: String? = null

    override fun verify(file: File, metadata: NativeReleaseMetadata): Boolean {
      version = metadata.version
      return accepted
    }
  }

  private class RecordingInstallLauncher(private val result: String) : ApkInstallLauncher {
    var file: File? = null

    override fun install(file: File): String {
      this.file = file
      return result
    }
  }

  private class NativeFixtureNetwork(var metadata: ByteArray?, var apk: ByteArray?) : NativeUpdateConnectionFactory {
    var metadataRequests = 0
    var apkRequests = 0

    override fun open(url: URL): HttpURLConnection {
      val body = if (url.path.endsWith("android-update.json")) {
        metadataRequests += 1
        metadata ?: throw IOException("metadata unavailable")
      } else {
        apkRequests += 1
        apk ?: throw IOException("apk unavailable")
      }
      return object : HttpURLConnection(url) {
        override fun connect() = Unit
        override fun disconnect() = Unit
        override fun usingProxy(): Boolean = false
        override fun getResponseCode(): Int = HTTP_OK
        override fun getInputStream() = ByteArrayInputStream(body)
      }
    }
  }

  private data class NativeReleaseFixture(
    val publicKey: String,
    val metadata: ByteArray,
    val apk: ByteArray,
  ) {
    companion object {
      fun create(version: String, versionCode: Int, keyPair: KeyPair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()): NativeReleaseFixture {
        val apk = "apk-$version".toByteArray(StandardCharsets.UTF_8)
        val sha256 = MessageDigest.getInstance("SHA-256").digest(apk).joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val apkUrl = "https://updates.test/releases/v$version/Yuzuha-$version.apk"
        val signerSha256 = "b".repeat(64)
        val publishedAt = "2026-08-25T12:00:00Z"
        val payload = listOf(1, "yuzuha-mobile", "android", version, versionCode, apkUrl, sha256, apk.size, "dev.yuzuha", signerSha256, publishedAt).joinToString("\n")
        val signer = Signature.getInstance("Ed25519")
        signer.initSign(keyPair.private)
        signer.update(payload.toByteArray(StandardCharsets.UTF_8))
        val signature = Base64.getEncoder().encodeToString(signer.sign())
        val metadata = """
          {"schema":1,"appId":"yuzuha-mobile","platform":"android","version":"$version","versionCode":$versionCode,"apkUrl":"$apkUrl","sha256":"$sha256","sizeBytes":${apk.size},"packageName":"dev.yuzuha","signerSha256":"$signerSha256","publishedAt":"$publishedAt","signature":"$signature"}
        """.trimIndent().toByteArray(StandardCharsets.UTF_8)
        return NativeReleaseFixture(Base64.getEncoder().encodeToString(keyPair.public.encoded), metadata, apk)
      }
    }
  }
}
