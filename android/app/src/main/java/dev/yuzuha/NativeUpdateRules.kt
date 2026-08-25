package dev.yuzuha

internal object NativeUpdateRules {
  fun isApkReleaseVersion(value: String): Boolean =
    BundleInstallerRules.isVersion(value) && !value.contains('-') && !value.contains('+')

  fun isApkFileName(value: String, version: String): Boolean =
    isApkReleaseVersion(version) && value == "Yuzuha-$version.apk"

  fun isNewerNativeLine(candidate: String, installed: String): Boolean {
    if (!isApkReleaseVersion(candidate) || !isApkReleaseVersion(installed)) return false
    val candidateParts = candidate.split('.').map { java.math.BigInteger(it) }
    val installedParts = installed.split('.').map { java.math.BigInteger(it) }
    return candidateParts[0] > installedParts[0] ||
      (candidateParts[0] == installedParts[0] && candidateParts[1] > installedParts[1])
  }
}
