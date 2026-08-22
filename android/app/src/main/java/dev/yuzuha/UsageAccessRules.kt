package dev.yuzuha

internal object UsageAccessRules {
  private const val EVENT_LOOKBACK_MILLIS = 24L * 60L * 60L * 1000L

  fun boundedDurationMillis(durationMillis: Long, startTimeMillis: Long, endTimeMillis: Long): Long? {
    val querySpanMillis = endTimeMillis - startTimeMillis
    return if (durationMillis > 0 && querySpanMillis > 0 && durationMillis <= querySpanMillis) {
      durationMillis
    } else {
      null
    }
  }

  fun hasActivityInRange(
    lastTimeUsedMillis: Long,
    lastTimeVisibleMillis: Long,
    startTimeMillis: Long,
    endTimeMillis: Long,
  ): Boolean {
    if (endTimeMillis <= startTimeMillis) {
      return false
    }
    return listOf(lastTimeUsedMillis, lastTimeVisibleMillis).any { timestamp ->
      timestamp >= startTimeMillis && timestamp < endTimeMillis
    }
  }

  fun eventQueryStart(startTimeMillis: Long): Long {
    return (startTimeMillis - EVENT_LOOKBACK_MILLIS).coerceAtLeast(0L)
  }
}
