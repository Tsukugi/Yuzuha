package dev.yuzuha

import android.app.Activity
import android.app.DatePickerDialog
import android.app.Dialog
import android.app.TimePickerDialog
import android.widget.DatePicker
import android.widget.TimePicker
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.GregorianCalendar
import java.util.Locale
import java.util.TimeZone

data class PickerDate(val year: Int, val month: Int, val day: Int)

data class PickerTime(val hour: Int, val minute: Int)

object DateTimePickerRules {
  private val localDatePattern = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$")
  private val localTimePattern = Regex("^(\\d{2}):(\\d{2})$")

  fun parseLocalDate(value: String): PickerDate? {
    val match = localDatePattern.matchEntire(value) ?: return null
    val year = match.groupValues[1].toInt()
    val month = match.groupValues[2].toInt()
    val day = match.groupValues[3].toInt()
    if (year !in 1..9999) {
      return null
    }

    val calendar = GregorianCalendar(TimeZone.getDefault(), Locale.ROOT).apply {
      isLenient = false
      clear()
      set(GregorianCalendar.YEAR, year)
      set(GregorianCalendar.MONTH, month - 1)
      set(GregorianCalendar.DAY_OF_MONTH, day)
    }
    return try {
      calendar.timeInMillis
      PickerDate(year, month, day)
    } catch (_: IllegalArgumentException) {
      null
    }
  }

  fun parseLocalTime(value: String): PickerTime? {
    val match = localTimePattern.matchEntire(value) ?: return null
    val hour = match.groupValues[1].toInt()
    val minute = match.groupValues[2].toInt()
    return if (hour in 0..23 && minute in 0..59) PickerTime(hour, minute) else null
  }

  fun formatLocalDate(year: Int, month: Int, day: Int): String? {
    if (year !in 1..9999 || month !in 1..12 || day !in 1..31) {
      return null
    }
    val calendar = GregorianCalendar(TimeZone.getDefault(), Locale.ROOT).apply {
      isLenient = false
      clear()
      set(GregorianCalendar.YEAR, year)
      set(GregorianCalendar.MONTH, month - 1)
      set(GregorianCalendar.DAY_OF_MONTH, day)
    }
    try {
      calendar.timeInMillis
    } catch (_: IllegalArgumentException) {
      return null
    }
    return "%04d-%02d-%02d".format(Locale.ROOT, year, month, day)
  }

  fun formatLocalTime(hour: Int, minute: Int): String? {
    if (hour !in 0..23 || minute !in 0..59) {
      return null
    }
    return "%02d:%02d".format(Locale.ROOT, hour, minute)
  }
}

class DateTimePickerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var activeDialog: Dialog? = null
  private var activePromise: Promise? = null

  override fun getName(): String = "YuzuhaDateTimePicker"

  @ReactMethod
  fun openDatePicker(initialLocalDate: String, promise: Promise) {
    val initialDate = DateTimePickerRules.parseLocalDate(initialLocalDate)
    if (initialDate == null) {
      promise.reject("DATE_PICKER_DATE_INVALID", "The initial date must be a valid YYYY-MM-DD local date.")
      return
    }
    val activity = getReactApplicationContext().getCurrentActivity()
    if (activity == null) {
      promise.reject("DATE_TIME_PICKER_UNAVAILABLE", "A foreground Android activity is required for the date picker.")
      return
    }
    postToActivity(activity, promise) {
      showDatePicker(activity, initialDate, promise)
    }
  }

  @ReactMethod
  fun openTimePicker(initialLocalTime: String, promise: Promise) {
    val initialTime = DateTimePickerRules.parseLocalTime(initialLocalTime)
    if (initialTime == null) {
      promise.reject("TIME_PICKER_TIME_INVALID", "The initial time must be a valid HH:mm local time.")
      return
    }
    val activity = getReactApplicationContext().getCurrentActivity()
    if (activity == null) {
      promise.reject("DATE_TIME_PICKER_UNAVAILABLE", "A foreground Android activity is required for the time picker.")
      return
    }
    postToActivity(activity, promise) {
      showTimePicker(activity, initialTime, promise)
    }
  }

  private fun postToActivity(activity: Activity, promise: Promise, action: () -> Unit) {
    try {
      activity.runOnUiThread {
        if (activity.isFinishing || activity.isDestroyed) {
          promise.reject("DATE_TIME_PICKER_UNAVAILABLE", "The Android activity is no longer available for a picker.")
          return@runOnUiThread
        }
        action()
      }
    } catch (error: Exception) {
      promise.reject("DATE_TIME_PICKER_UNAVAILABLE", error.message, error)
    }
  }

  private fun showDatePicker(activity: Activity, initialDate: PickerDate, promise: Promise) {
    if (activeDialog != null) {
      promise.reject("DATE_TIME_PICKER_BUSY", "Another date or time picker is already open.")
      return
    }

    lateinit var dialog: DatePickerDialog
    try {
      dialog = DatePickerDialog(
        activity,
        { _: DatePicker, year: Int, month: Int, day: Int ->
          val selectedDate = DateTimePickerRules.formatLocalDate(year, month + 1, day)
          settle(dialog) {
            if (selectedDate == null) {
              promise.reject("DATE_PICKER_RESULT_INVALID", "The Android date picker returned an invalid date.")
            } else {
              promise.resolve(selectedDate)
            }
          }
        },
        initialDate.year,
        initialDate.month - 1,
        initialDate.day,
      )
      dialog.setOnCancelListener {
        settle(dialog) { promise.resolve(null) }
      }
      dialog.setOnDismissListener {
        settle(dialog) { promise.resolve(null) }
      }
      activeDialog = dialog
      activePromise = promise
      dialog.show()
    } catch (error: Exception) {
      activeDialog = null
      activePromise = null
      promise.reject("DATE_PICKER_OPEN_FAILED", error.message, error)
    }
  }

  private fun showTimePicker(activity: Activity, initialTime: PickerTime, promise: Promise) {
    if (activeDialog != null) {
      promise.reject("DATE_TIME_PICKER_BUSY", "Another date or time picker is already open.")
      return
    }

    lateinit var dialog: TimePickerDialog
    try {
      dialog = TimePickerDialog(
        activity,
        { _: TimePicker, hour: Int, minute: Int ->
          val selectedTime = DateTimePickerRules.formatLocalTime(hour, minute)
          settle(dialog) {
            if (selectedTime == null) {
              promise.reject("TIME_PICKER_RESULT_INVALID", "The Android time picker returned an invalid time.")
            } else {
              promise.resolve(selectedTime)
            }
          }
        },
        initialTime.hour,
        initialTime.minute,
        android.text.format.DateFormat.is24HourFormat(activity),
      )
      dialog.setOnCancelListener {
        settle(dialog) { promise.resolve(null) }
      }
      dialog.setOnDismissListener {
        settle(dialog) { promise.resolve(null) }
      }
      activeDialog = dialog
      activePromise = promise
      dialog.show()
    } catch (error: Exception) {
      activeDialog = null
      activePromise = null
      promise.reject("TIME_PICKER_OPEN_FAILED", error.message, error)
    }
  }

  private fun settle(dialog: Dialog, completion: () -> Unit) {
    if (activeDialog !== dialog) {
      return
    }
    activeDialog = null
    activePromise = null
    completion()
  }

  override fun invalidate() {
    activePromise?.reject("DATE_TIME_PICKER_UNAVAILABLE", "The Android activity was destroyed while the picker was open.")
    activeDialog?.setOnCancelListener(null)
    activeDialog?.setOnDismissListener(null)
    activeDialog?.dismiss()
    activeDialog = null
    activePromise = null
    super.invalidate()
  }
}
