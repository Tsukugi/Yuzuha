package dev.yuzuha

import java.math.BigInteger

internal object BundleInstallerRules {
  private val versionPattern = Regex("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$")
  private val numericIdentifierPattern = Regex("^\\d+$")
  private val sha256Pattern = Regex("^[a-f0-9]{64}$")
  private val signaturePattern = Regex("^[A-Za-z0-9+/]{86}==$")

  fun isVersion(value: String): Boolean {
    val match = versionPattern.matchEntire(value) ?: return false
    val prerelease = match.groups[4]?.value ?: return true
    return prerelease.split('.').all { identifier ->
      !numericIdentifierPattern.matches(identifier) || identifier == "0" || !identifier.startsWith("0")
    }
  }

  fun isSha256(value: String): Boolean = sha256Pattern.matches(value)

  fun isSignature(value: String): Boolean = signaturePattern.matches(value)

  fun isBundleFileName(value: String): Boolean {
    if (!value.startsWith("bundle-") || !value.endsWith(".jsbundle")) return false
    return isVersion(value.removePrefix("bundle-").removeSuffix(".jsbundle"))
  }

  fun compareVersions(left: String, right: String): Int {
    val leftParts = left.substringBefore('+').split("-", limit = 2)
    val rightParts = right.substringBefore('+').split("-", limit = 2)
    val leftCore = leftParts[0].split('.').map { BigInteger(it) }
    val rightCore = rightParts[0].split('.').map { BigInteger(it) }
    for (index in 0 until 3) {
      if (leftCore[index] != rightCore[index]) return leftCore[index].compareTo(rightCore[index])
    }

    val leftPre = leftParts.getOrNull(1)
    val rightPre = rightParts.getOrNull(1)
    if (leftPre == null && rightPre == null) return 0
    if (leftPre == null) return 1
    if (rightPre == null) return -1

    val leftIdentifiers = leftPre.split('.')
    val rightIdentifiers = rightPre.split('.')
    for (index in 0 until maxOf(leftIdentifiers.size, rightIdentifiers.size)) {
      val leftIdentifier = leftIdentifiers.getOrNull(index) ?: return -1
      val rightIdentifier = rightIdentifiers.getOrNull(index) ?: return 1
      if (leftIdentifier == rightIdentifier) continue
      val leftNumber = leftIdentifier.takeIf { numericIdentifierPattern.matches(it) }?.let { BigInteger(it) }
      val rightNumber = rightIdentifier.takeIf { numericIdentifierPattern.matches(it) }?.let { BigInteger(it) }
      return when {
        leftNumber != null && rightNumber != null -> leftNumber.compareTo(rightNumber)
        leftNumber != null -> -1
        rightNumber != null -> 1
        else -> leftIdentifier.compareTo(rightIdentifier)
      }
    }
    return 0
  }
}
