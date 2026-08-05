package dev.yuzuha

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BundleInstallerStateRulesTest {
  private val reference = BundleFileReference(
    version = "0.2.0",
    fileName = "bundle-0.2.0.jsbundle",
    sizeBytes = 10,
    sha256 = "a".repeat(64),
  )

  @Test
  fun marksPendingAttemptBeforeSelection() {
    val state = InstallerState(current = null, pending = PendingBundleReference(reference, attempted = false), blockedVersion = null)

    val updated = BundleInstallerStateRules.markAttempted(state)

    assertTrue(updated.pending?.attempted == true)
    assertEquals(reference, updated.pending?.reference)
    assertNull(updated.blockedVersion)
  }

  @Test
  fun promotesOnlyPendingAndClearsBlock() {
    val state = InstallerState(
      current = null,
      pending = PendingBundleReference(reference, attempted = true),
      blockedVersion = "0.1.9",
    )

    val updated = BundleInstallerStateRules.promote(state)

    assertEquals(reference, updated.current)
    assertNull(updated.pending)
    assertNull(updated.blockedVersion)
  }

  @Test
  fun rollbackBlocksExactPendingVersionAndKeepsCurrent() {
    val current = reference.copy(version = "0.1.9", fileName = "bundle-0.1.9.jsbundle")
    val state = InstallerState(
      current = current,
      pending = PendingBundleReference(reference, attempted = true),
      blockedVersion = null,
    )

    val updated = BundleInstallerStateRules.rollback(state)

    assertEquals(current, updated.current)
    assertNull(updated.pending)
    assertEquals("0.2.0", updated.blockedVersion)
  }
}
