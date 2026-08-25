package dev.yuzuha

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeUpdateRulesTest {
  @Test
  fun acceptsStableApkVersionsIncludingPatches() {
    assertTrue(NativeUpdateRules.isApkReleaseVersion("0.2.0"))
    assertTrue(NativeUpdateRules.isApkReleaseVersion("0.2.1"))
    assertTrue(NativeUpdateRules.isApkReleaseVersion("0.3.4"))
    assertTrue(NativeUpdateRules.isApkReleaseVersion("1.0.0"))
    assertFalse(NativeUpdateRules.isApkReleaseVersion("0.2.0-alpha.1"))
  }

  @Test
  fun acceptsOnlyFixedApkNames() {
    assertTrue(NativeUpdateRules.isApkFileName("Yuzuha-0.2.0.apk", "0.2.0"))
    assertFalse(NativeUpdateRules.isApkFileName("../Yuzuha-0.2.0.apk", "0.2.0"))
    assertFalse(NativeUpdateRules.isApkFileName("Yuzuha-latest.apk", "0.2.0"))
  }
}
