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

class BundleInstallerFlowTest {
  @get:Rule
  val temporaryFolder = TemporaryFolder()

  @Test
  fun signedStartupBundleIsPromotedOnlyAfterHealth() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(release.metadata, release.bundle)
    val root = temporaryFolder.newFolder("files")
    val installer = createInstaller(root, release, network)

    val launch = installer.await()

    assertEquals("reason=${launch.reasonCode}", "remote-activated", launch.kind)
    assertEquals("0.2.0", launch.version)
    assertEquals(release.bundle.toList(), File(requireNotNull(launch.bundlePath)).readBytes().toList())
    var state = File(root, "installer/state.json").readText()
    assertTrue(state.contains("\"pending\""))
    assertTrue(state.contains("\"attempted\":true"))

    installer.markLaunchSuccessful()

    state = File(root, "installer/state.json").readText()
    assertTrue(state.contains("\"current\""))
    assertTrue(state.contains("\"version\":\"0.2.0\""))
    assertFalse(state.contains("\"pending\""))
  }

  @Test
  fun newProjectProductionPinAcceptsSignedGithubReleaseFixture() {
    val bundle = "new-project-ota-key".toByteArray(StandardCharsets.UTF_8)
    val metadata = """
      {"schema":1,"appId":"yuzuha-mobile","platform":"android","runtime":"0.86.0","version":"0.1.4","minNativeVersion":"0.1.3","bundleUrl":"https://github.com/Tsukugi/Yuzuha/releases/download/v0.1.4/Yuzuha-0.1.4.jsbundle","sha256":"3cd85130c1f0bef0756475fe270f90cdb5e080ad65f30cd7fbb0ea4095477586","sizeBytes":19,"publishedAt":"2026-08-05T00:00:00Z","signature":"+SYf3260+9knmao0EDFp358ARs2hBsrh6oTKUojgEG7d29WciI6wviDHKpcs1KWlaR69OxFfq2aWU4dd2h07BA=="}
    """.trimIndent().toByteArray(StandardCharsets.UTF_8)
    val network = FixtureNetwork(metadata, bundle)
    val root = temporaryFolder.newFolder("files")
    val installer = YuzuhaBundleInstaller(
      filesDirectory = root,
      metadataUrl = URL("https://updates.test/installer/bundle.json"),
      nativeVersion = "0.1.3",
      pinnedPublicKey = YuzuhaBundleInstaller.PINNED_PUBLIC_KEY,
      connectionFactory = network,
    )

    val launch = installer.await()

    assertEquals("remote-activated", launch.kind)
    assertEquals("0.1.4", launch.version)
    assertEquals(bundle.toList(), File(requireNotNull(launch.bundlePath)).readBytes().toList())
  }

  @Test
  fun manualDownloadKeepsCurrentProcessAndPreservesProductFiles() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val productFile = File(root, "workspace.db").apply { writeText("keep me") }
    val installer = createInstaller(root, release, network)

    val launch = installer.await()
    assertEquals("offline-local", launch.kind)
    assertEquals("0.1.3", launch.version)

    network.metadata = release.metadata
    network.bundle = release.bundle
    val check = installer.checkForUpdate()
    assertEquals("reason=${check.reasonCode}", "available", check.kind)
    assertEquals("prepared", installer.downloadUpdate().kind)
    assertEquals("0.1.3", installer.await().version)
    assertEquals("keep me", productFile.readText())
    assertEquals(1, network.bundleRequests)

    val state = File(root, "installer/state.json").readText()
    assertTrue(state.contains("\"pending\""))
    assertTrue(state.contains("\"attempted\":false"))
  }

  @Test
  fun olderEndpointDoesNotReplaceNewerPendingBundle() {
    val release = ReleaseFixture.create("0.2.0")
    val olderRelease = ReleaseFixture.create("0.1.5", release.keyPair)
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val installer = createInstaller(root, release, network)
    installer.await()
    network.metadata = release.metadata
    network.bundle = release.bundle
    assertEquals("prepared", installer.downloadUpdate().kind)

    network.metadata = olderRelease.metadata
    network.bundle = olderRelease.bundle

    val result = installer.downloadUpdate()

    assertEquals("prepared", result.kind)
    assertEquals("0.2.0", result.availableVersion)
    assertEquals(1, network.bundleRequests)
  }

  @Test
  fun olderVerifiedLocalBundleDoesNotOverrideEmbeddedBaseline() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val verifiedDirectory = File(root, "installer/verified").apply { mkdirs() }
    val oldBundle = "old-bundle".toByteArray(StandardCharsets.UTF_8)
    val oldHash = MessageDigest.getInstance("SHA-256").digest(oldBundle).joinToString("") { "%02x".format(it.toInt() and 0xff) }
    File(verifiedDirectory, "bundle-0.1.0.jsbundle").writeBytes(oldBundle)
    File(root, "installer/state.json").writeText(
      "{\"schema\":2,\"current\":{\"version\":\"0.1.0\",\"fileName\":\"bundle-0.1.0.jsbundle\",\"sizeBytes\":${oldBundle.size},\"sha256\":\"$oldHash\"}}",
    )

    val launch = createInstaller(root, release, network).await()

    assertEquals("offline-local", launch.kind)
    assertEquals("0.1.3", launch.version)
    assertEquals(null, launch.bundlePath)
  }

  @Test
  fun incompatibleCachedStateFailsClosedToEmbeddedBundle() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val verifiedDirectory = File(root, "installer/verified").apply { mkdirs() }
    val cachedBundle = "cached".toByteArray(StandardCharsets.UTF_8)
    val cachedHash = MessageDigest.getInstance("SHA-256").digest(cachedBundle).joinToString("") { "%02x".format(it.toInt() and 0xff) }
    File(verifiedDirectory, "bundle-0.2.0.jsbundle").writeBytes(cachedBundle)
    File(root, "installer/state.json").writeText(
      "{\"schema\":2,\"current\":{\"version\":\"0.2.0\",\"fileName\":\"bundle-0.2.0.jsbundle\",\"sizeBytes\":${cachedBundle.size},\"sha256\":\"$cachedHash\",\"runtime\":\"0.83.0\",\"minNativeVersion\":\"0.1.3\"}}",
    )

    val launch = createInstaller(root, release, network).await()

    assertEquals("embedded", launch.kind)
    assertEquals("0.1.3", launch.version)
    assertEquals("INVALID_STATE", launch.reasonCode)
    assertEquals(null, launch.bundlePath)
  }

  @Test
  fun pendingBundleIsRolledBackAndBlockedAfterUnhealthyLaunch() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val firstInstaller = createInstaller(root, release, network)
    firstInstaller.await()
    network.metadata = release.metadata
    network.bundle = release.bundle
    val prepared = firstInstaller.downloadUpdate()
    assertEquals("reason=${prepared.reasonCode}", "prepared", prepared.kind)

    val attemptedInstaller = createInstaller(root, release, network)
    assertEquals("0.2.0", attemptedInstaller.await().version)
    val rolledBackInstaller = createInstaller(root, release, network)

    val rollback = rolledBackInstaller.await()

    assertEquals("embedded", rollback.kind)
    assertEquals("0.1.3", rollback.version)
    assertEquals("BLOCKED_VERSION", rollback.reasonCode)
    assertEquals("BLOCKED_VERSION", rolledBackInstaller.checkForUpdate().reasonCode)
    assertEquals(1, network.bundleRequests)
    val state = File(root, "installer/state.json").readText()
    assertFalse(state.contains("\"pending\""))
    assertTrue(state.contains("\"blockedVersion\":\"0.2.0\""))
  }

  @Test
  fun tamperedBundleDoesNotCreatePendingState() {
    val release = ReleaseFixture.create("0.2.0")
    val network = FixtureNetwork(null, null)
    val root = temporaryFolder.newFolder("files")
    val installer = createInstaller(root, release, network)
    installer.await()
    network.metadata = release.metadata
    network.bundle = "tampered".toByteArray(StandardCharsets.UTF_8)

    val check = installer.checkForUpdate()
    assertEquals("reason=${check.reasonCode}", "available", check.kind)
    val result = installer.downloadUpdate()

    assertEquals("error", result.kind)
    assertEquals("INVALID_REMOTE", result.reasonCode)
    val stateFile = File(root, "installer/state.json")
    assertFalse(stateFile.exists())
    assertTrue(File(root, "installer/verified").listFiles().isNullOrEmpty())
  }

  private fun createInstaller(root: File, release: ReleaseFixture, network: FixtureNetwork): YuzuhaBundleInstaller {
    return YuzuhaBundleInstaller(
      filesDirectory = root,
      metadataUrl = URL("https://updates.test/installer/bundle.json"),
      nativeVersion = "0.1.3",
      pinnedPublicKey = release.publicKey,
      connectionFactory = network,
    )
  }

  private data class ReleaseFixture(
    val keyPair: KeyPair,
    val publicKey: String,
    val metadata: ByteArray,
    val bundle: ByteArray,
  ) {
    companion object {
      fun create(version: String, keyPair: KeyPair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()): ReleaseFixture {
        val bundle = "bundle-$version".toByteArray(StandardCharsets.UTF_8)
        val sha256 = MessageDigest.getInstance("SHA-256").digest(bundle).joinToString("") { "%02x".format(it.toInt() and 0xff) }
        val bundleUrl = "https://updates.test/bundles/android/$version/main.jsbundle"
        val publishedAt = "2026-08-05T00:00:00Z"
        val payload = listOf(
          1,
          "yuzuha-mobile",
          "android",
          "0.86.0",
          version,
          "0.1.3",
          bundleUrl,
          sha256,
          bundle.size,
          publishedAt,
        ).joinToString("\n")
        val signer = Signature.getInstance("Ed25519")
        signer.initSign(keyPair.private)
        signer.update(payload.toByteArray(StandardCharsets.UTF_8))
        val signature = Base64.getEncoder().encodeToString(signer.sign())
        val metadata = """
          {"schema":1,"appId":"yuzuha-mobile","platform":"android","runtime":"0.86.0","version":"$version","minNativeVersion":"0.1.3","bundleUrl":"$bundleUrl","sha256":"$sha256","sizeBytes":${bundle.size},"publishedAt":"$publishedAt","signature":"$signature"}
        """.trimIndent().toByteArray(StandardCharsets.UTF_8)
        return ReleaseFixture(keyPair, Base64.getEncoder().encodeToString(keyPair.public.encoded), metadata, bundle)
      }
    }
  }

  private class FixtureNetwork(
    var metadata: ByteArray?,
    var bundle: ByteArray?,
  ) : BundleInstallerConnectionFactory {
    var bundleRequests = 0

    override fun open(url: URL): HttpURLConnection {
      val body = if (url.path.endsWith("bundle.json")) {
        metadata ?: throw IOException("metadata unavailable")
      } else {
        bundleRequests += 1
        bundle ?: throw IOException("bundle unavailable")
      }
      return FixtureConnection(url, body)
    }
  }

  private class FixtureConnection(
    url: URL,
    private val body: ByteArray,
  ) : HttpURLConnection(url) {
    override fun connect() = Unit

    override fun disconnect() = Unit

    override fun usingProxy(): Boolean = false

    override fun getResponseCode(): Int = HTTP_OK

    override fun getInputStream() = ByteArrayInputStream(body)
  }
}
