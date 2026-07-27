package dev.yuzuha

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class YuzuhaSummaryWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    const val PREFS_NAME = "yuzuha_widget_summary"
    const val OPEN_TASK_COUNT_KEY = "open_task_count"
    const val ACTIVE_NOTE_COUNT_KEY = "active_note_count"

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, YuzuhaSummaryWidgetProvider::class.java)
      updateWidgets(context, manager, manager.getAppWidgetIds(component))
    }

    private fun updateWidgets(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
      if (appWidgetIds.isEmpty()) {
        return
      }
      val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val openTaskCount = preferences.getInt(OPEN_TASK_COUNT_KEY, 0)
      val activeNoteCount = preferences.getInt(ACTIVE_NOTE_COUNT_KEY, 0)
      val views = RemoteViews(context.packageName, R.layout.yuzuha_widget).apply {
        setTextViewText(R.id.yuzuha_widget_summary, summaryText(context, openTaskCount, activeNoteCount))
        setOnClickPendingIntent(R.id.yuzuha_widget_root, openAppPendingIntent(context))
      }
      manager.updateAppWidget(appWidgetIds, views)
    }

    private fun summaryText(context: Context, openTaskCount: Int, activeNoteCount: Int): String {
      val tasks = context.resources.getQuantityString(R.plurals.widget_open_tasks, openTaskCount, openTaskCount)
      val notes = context.resources.getQuantityString(R.plurals.widget_active_notes, activeNoteCount, activeNoteCount)
      return "$tasks · $notes"
    }

    private fun openAppPendingIntent(context: Context): PendingIntent {
      val intent = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_MAIN
        addCategory(Intent.CATEGORY_LAUNCHER)
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      return PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
