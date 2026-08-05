package dev.yuzuha

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BundleInstallerRulesTest {
  @Test
  fun validatesStrictVersionsAndBundleNames() {
    assertTrue(BundleInstallerRules.isVersion("0.2.0"))
    assertTrue(BundleInstallerRules.isVersion("0.2.0-alpha.2+build.1"))
    assertFalse(BundleInstallerRules.isVersion("01.2.0"))
    assertFalse(BundleInstallerRules.isVersion("0.2.0-alpha.01"))
    assertTrue(BundleInstallerRules.isBundleFileName("bundle-0.2.0.jsbundle"))
    assertFalse(BundleInstallerRules.isBundleFileName("bundle-0.2.0-alpha.01.jsbundle"))
    assertFalse(BundleInstallerRules.isBundleFileName("../bundle-0.2.0.jsbundle"))
  }

  @Test
  fun comparesReleaseAndPrereleaseVersions() {
    assertTrue(BundleInstallerRules.compareVersions("0.2.0", "0.1.9") > 0)
    assertTrue(BundleInstallerRules.compareVersions("0.2.0-alpha.2", "0.2.0-alpha.10") < 0)
    assertEquals(0, BundleInstallerRules.compareVersions("0.2.0", "0.2.0+build.1"))
    assertTrue(BundleInstallerRules.compareVersions("999999999999999999999.0.0", "10000000000000000000.0.0") > 0)
    assertTrue(BundleInstallerRules.compareVersions("0.2.0-alpha.999999999999999999999", "0.2.0-alpha.1000000000000000000000") < 0)
  }

  @Test
  fun validatesHashesAndSignatures() {
    assertTrue(BundleInstallerRules.isSha256("a".repeat(64)))
    assertFalse(BundleInstallerRules.isSha256("A".repeat(64)))
    assertTrue(BundleInstallerRules.isSignature("A".repeat(86) + "=="))
    assertFalse(BundleInstallerRules.isSignature("not-a-signature"))
  }

  @Test
  fun usesTheGitHubLatestReleaseMetadataAsset() {
    assertEquals(
      "https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle.json",
      YuzuhaBundleInstaller.DEFAULT_METADATA_URL,
    )
  }
}
