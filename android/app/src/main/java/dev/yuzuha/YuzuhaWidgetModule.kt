package dev.yuzuha

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class YuzuhaWidgetModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaWidgetSummary"

  @ReactMethod
  fun updateSummary(openTaskCount: Double, activeNoteCount: Double, promise: Promise) {
    val openTasks = validCount(openTaskCount)
    val activeNotes = validCount(activeNoteCount)
    if (openTasks == null || activeNotes == null) {
      promise.reject("WIDGET_SUMMARY_INVALID", "Widget counts must be non-negative whole numbers.")
      return
    }

    val preferences = context.getSharedPreferences(YuzuhaSummaryWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
    if (preferences.getInt(YuzuhaSummaryWidgetProvider.OPEN_TASK_COUNT_KEY, -1) == openTasks &&
      preferences.getInt(YuzuhaSummaryWidgetProvider.ACTIVE_NOTE_COUNT_KEY, -1) == activeNotes) {
      promise.resolve(true)
      return
    }
    preferences.edit()
      .putInt(YuzuhaSummaryWidgetProvider.OPEN_TASK_COUNT_KEY, openTasks)
      .putInt(YuzuhaSummaryWidgetProvider.ACTIVE_NOTE_COUNT_KEY, activeNotes)
      .apply()
    YuzuhaSummaryWidgetProvider.updateAll(context)
    promise.resolve(true)
  }

  private fun validCount(value: Double): Int? {
    if (!value.isFinite() || value < 0.0 || value > Int.MAX_VALUE.toDouble() || value % 1.0 != 0.0) {
      return null
    }
    return value.toInt()
  }
}
