package dev.yuzuha

internal object BundleInstallerStateRules {
  fun markAttempted(state: InstallerState): InstallerState {
    val pending = state.pending ?: return state
    return state.copy(pending = pending.copy(attempted = true))
  }

  fun promote(state: InstallerState): InstallerState {
    val pending = state.pending ?: return state
    return InstallerState(current = pending.reference, pending = null, blockedVersion = null)
  }

  fun rollback(state: InstallerState): InstallerState {
    val pending = state.pending ?: return state
    return state.copy(pending = null, blockedVersion = pending.reference.version)
  }
}
