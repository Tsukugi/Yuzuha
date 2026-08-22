package dev.yuzuha

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UsageAccessRulesTest {
  @Test
  fun acceptsOnlyDurationsThatFitInsideTheRequestedWindow() {
    assertEquals(10_000L, UsageAccessRules.boundedDurationMillis(10_000L, 100L, 10_100L))
    assertNull(UsageAccessRules.boundedDurationMillis(10_001L, 100L, 10_100L))
    assertNull(UsageAccessRules.boundedDurationMillis(0L, 100L, 10_100L))
    assertNull(UsageAccessRules.boundedDurationMillis(10_000L, 10_100L, 100L))
  }

  @Test
  fun eventFallbackLooksBackOneDayWithoutUsingNegativeTime() {
    assertEquals(0L, UsageAccessRules.eventQueryStart(1L))
    assertEquals(86_400_000L, UsageAccessRules.eventQueryStart(172_800_000L))
  }

  @Test
  fun acceptsStatsOnlyWhenTheLastActivityIsInsideTheRequestedWindow() {
    assertEquals(true, UsageAccessRules.hasActivityInRange(5_000L, 0L, 1_000L, 6_000L))
    assertEquals(true, UsageAccessRules.hasActivityInRange(0L, 5_000L, 1_000L, 6_000L))
    assertEquals(false, UsageAccessRules.hasActivityInRange(999L, 0L, 1_000L, 6_000L))
    assertEquals(false, UsageAccessRules.hasActivityInRange(6_000L, 0L, 1_000L, 6_000L))
    assertEquals(false, UsageAccessRules.hasActivityInRange(0L, 0L, 1_000L, 6_000L))
  }
}
