package dev.yuzuha

import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.CalendarContract
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar
import java.util.GregorianCalendar
import java.util.TimeZone

class CalendarDraftModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaCalendarDrafts"

  @ReactMethod
  fun openTaskCalendarDraft(title: String, details: String, dueLocalDate: String, promise: Promise) {
    val cleanTitle = title.trim()
    val cleanDetails = details.trim()
    if (cleanTitle.isEmpty()) {
      promise.reject("CALENDAR_TITLE_INVALID", "A task title is required.")
      return
    }

    val dayStart = parseLocalDate(dueLocalDate)
    if (dayStart == null) {
      promise.reject("CALENDAR_DATE_INVALID", "A valid task due date is required.")
      return
    }

    val dayEnd = (dayStart.clone() as Calendar).apply {
      add(Calendar.DAY_OF_MONTH, 1)
    }
    val intent = Intent(Intent.ACTION_INSERT).apply {
      data = CalendarContract.Events.CONTENT_URI
      putExtra(CalendarContract.Events.TITLE, cleanTitle)
      putExtra(CalendarContract.Events.DESCRIPTION, cleanDetails)
      putExtra(CalendarContract.Events.DTSTART, dayStart.timeInMillis)
      putExtra(CalendarContract.Events.DTEND, dayEnd.timeInMillis)
      putExtra(CalendarContract.Events.ALL_DAY, true)
      putExtra(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    try {
      context.startActivity(Intent.createChooser(intent, "Add task to calendar").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(true)
    } catch (_: ActivityNotFoundException) {
      promise.reject("CALENDAR_UNAVAILABLE", "No calendar editor is available on this device.")
    } catch (error: Exception) {
      promise.reject("CALENDAR_OPEN_FAILED", error.message, error)
    }
  }

  private fun parseLocalDate(value: String): Calendar? {
    val match = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$").matchEntire(value) ?: return null
    val calendar = GregorianCalendar(TimeZone.getDefault()).apply {
      isLenient = false
      clear()
      set(Calendar.YEAR, match.groupValues[1].toInt())
      set(Calendar.MONTH, match.groupValues[2].toInt() - 1)
      set(Calendar.DAY_OF_MONTH, match.groupValues[3].toInt())
    }
    return try {
      calendar.timeInMillis
      calendar
    } catch (_: IllegalArgumentException) {
      null
    }
  }
}
