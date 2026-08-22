package dev.yuzuha

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DateTimePickerRulesTest {
  @Test
  fun acceptsStrictLocalDateAndRejectsInvalidCalendarDays() {
    assertEquals(PickerDate(2026, 2, 28), DateTimePickerRules.parseLocalDate("2026-02-28"))
    assertNull(DateTimePickerRules.parseLocalDate("2026-02-29"))
    assertNull(DateTimePickerRules.parseLocalDate("2026-2-8"))
    assertNull(DateTimePickerRules.parseLocalDate("2026-02-28 "))
  }

  @Test
  fun acceptsStrictLocalTimeAndRejectsOutOfRangeValues() {
    assertEquals(PickerTime(23, 59), DateTimePickerRules.parseLocalTime("23:59"))
    assertEquals(PickerTime(0, 0), DateTimePickerRules.parseLocalTime("00:00"))
    assertNull(DateTimePickerRules.parseLocalTime("24:00"))
    assertNull(DateTimePickerRules.parseLocalTime("12:60"))
    assertNull(DateTimePickerRules.parseLocalTime("9:05"))
  }

  @Test
  fun formatsOnlyValuesThatFitTheBridgeContract() {
    assertEquals("2026-08-22", DateTimePickerRules.formatLocalDate(2026, 8, 22))
    assertEquals("09:05", DateTimePickerRules.formatLocalTime(9, 5))
    assertNull(DateTimePickerRules.formatLocalDate(2026, 2, 31))
    assertNull(DateTimePickerRules.formatLocalTime(25, 0))
  }
}
