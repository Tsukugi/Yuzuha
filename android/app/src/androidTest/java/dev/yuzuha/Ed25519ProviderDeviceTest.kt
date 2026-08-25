package dev.yuzuha

import androidx.test.ext.junit.runners.AndroidJUnit4
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Ed25519ProviderDeviceTest {
  @Test
  fun providerCanBuildAndVerifyPinnedKey() {
    val keyBytes = Base64.getDecoder().decode(YuzuhaBundleInstaller.PINNED_PUBLIC_KEY)
    val payload = listOf(
      1,
      "yuzuha-mobile",
      "android",
      "0.86.0",
      "0.1.11",
      "0.1.3",
      "https://github.com/Tsukugi/Yuzuha/releases/download/v0.1.11/Yuzuha-0.1.11.jsbundle",
      "7ec6b282958ea66879bcc5596c3b0bdc2d343cb0bdd5b6a59ed21b7421d5262e",
      1353570,
      "2026-08-25T17:01:32.176Z",
    ).joinToString("\n").toByteArray()
    val signature = Base64.getDecoder().decode("jVq+u8suj+7wDwEF/peK/D83pZxXNwcOmJT1R4f2W7+NYUrxeSlEcT8aeLLlE9EvBwdM2CNKrSd/cAsxl+CMDA==")
    val key = AndroidEd25519.keyFactory().generatePublic(X509EncodedKeySpec(keyBytes))
    val verifier = AndroidEd25519.signature()
    verifier.initVerify(key)
    verifier.update(payload)
    assertTrue(verifier.verify(signature))
  }
}
