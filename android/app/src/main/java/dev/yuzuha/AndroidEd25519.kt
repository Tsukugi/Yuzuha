package dev.yuzuha

import java.security.KeyFactory
import java.security.Signature
import org.bouncycastle.jce.provider.BouncyCastleProvider

/** Uses an app-owned provider because API 35 has no software Ed25519 provider. */
internal object AndroidEd25519 {
  private val provider by lazy { BouncyCastleProvider() }

  fun keyFactory(): KeyFactory = KeyFactory.getInstance("Ed25519", provider)

  fun signature(): Signature = Signature.getInstance("Ed25519", provider)
}
