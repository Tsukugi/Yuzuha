package dev.yuzuha

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class TaskReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_BOOT_COMPLETED -> rescheduleAll(context)
      ACTION_TASK_REMINDER -> intent.getStringExtra(TaskReminderModule.TASK_REMINDER_ID_EXTRA)?.let { showReminder(context, it) }
    }
  }

  companion object {
    private const val PREFS_NAME = "yuzuha_task_reminders"
    private const val CHANNEL_ID = "task_reminders"
    const val ACTION_TASK_REMINDER = "dev.yuzuha.TASK_REMINDER"
    const val ACTION_BOOT_COMPLETED = "android.intent.action.BOOT_COMPLETED"

    fun schedule(context: Context, taskId: String, triggerAtMillis: Long) {
      val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      preferences.edit().putLong(taskId, triggerAtMillis).apply()
      scheduleAlarm(context, taskId, triggerAtMillis)
    }

    fun cancel(context: Context, taskId: String) {
      val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      cancelAlarm(context, taskId)
      preferences.edit().remove(taskId).apply()
    }

    fun dismissNotification(context: Context, taskId: String) {
      NotificationManagerCompat.from(context).cancel(taskId.hashCode() and Int.MAX_VALUE)
    }

    fun sync(context: Context, entries: List<Pair<String, Long>>) {
      val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      preferences.all.keys.forEach { cancelAlarm(context, it) }
      val editor = preferences.edit().clear()
      entries.forEach { (taskId, triggerAtMillis) ->
        if (triggerAtMillis > System.currentTimeMillis()) {
          editor.putLong(taskId, triggerAtMillis)
        }
      }
      editor.apply()
      entries.filter { it.second > System.currentTimeMillis() }.forEach { (taskId, triggerAtMillis) ->
        scheduleAlarm(context, taskId, triggerAtMillis)
      }
    }

    private fun rescheduleAll(context: Context) {
      val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val now = System.currentTimeMillis()
      preferences.all.forEach { (taskId, value) ->
        val triggerAtMillis = value as? Long ?: return@forEach
        if (triggerAtMillis > now) {
          scheduleAlarm(context, taskId, triggerAtMillis)
        } else {
          preferences.edit().remove(taskId).apply()
        }
      }
    }

    private fun scheduleAlarm(context: Context, taskId: String, triggerAtMillis: Long) {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pendingIntent = pendingIntent(context, taskId)
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }

    private fun cancelAlarm(context: Context, taskId: String) {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.cancel(pendingIntent(context, taskId))
    }

    private fun pendingIntent(context: Context, taskId: String): PendingIntent {
      val intent = Intent(context, TaskReminderReceiver::class.java).apply {
        action = ACTION_TASK_REMINDER
        putExtra(TaskReminderModule.TASK_REMINDER_ID_EXTRA, taskId)
      }
      return PendingIntent.getBroadcast(
        context,
        taskId.hashCode() and Int.MAX_VALUE,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun showReminder(context: Context, taskId: String) {
      cancel(context, taskId)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        return
      }
      createChannel(context)
      val openIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtra(TaskReminderModule.TASK_REMINDER_ID_EXTRA, taskId)
        putExtra(TaskReminderModule.TASK_REMINDER_ACTION_EXTRA, TaskReminderModule.TASK_REMINDER_ACTION_OPEN)
      }
      val openPendingIntent = PendingIntent.getActivity(
        context,
        activityRequestCode(taskId, TaskReminderModule.TASK_REMINDER_ACTION_OPEN),
        openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val completeIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtra(TaskReminderModule.TASK_REMINDER_ID_EXTRA, taskId)
        putExtra(TaskReminderModule.TASK_REMINDER_ACTION_EXTRA, TaskReminderModule.TASK_REMINDER_ACTION_COMPLETE)
      }
      val completePendingIntent = PendingIntent.getActivity(
        context,
        activityRequestCode(taskId, TaskReminderModule.TASK_REMINDER_ACTION_COMPLETE),
        completeIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("Yuzuha task reminder")
        .setContentText("Open Yuzuha to review a task.")
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .setContentIntent(openPendingIntent)
        .addAction(NotificationCompat.Action.Builder(android.R.drawable.ic_menu_save, "Complete", completePendingIntent).build())
        .build()
      try {
        NotificationManagerCompat.from(context).notify(taskId.hashCode() and Int.MAX_VALUE, notification)
      } catch (_: SecurityException) {
        // Permission can be revoked between the check and notify call.
      }
    }

    private fun createChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return
      }
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Task reminders", NotificationManager.IMPORTANCE_DEFAULT))
    }

    private fun activityRequestCode(taskId: String, action: String): Int =
      (taskId.hashCode() xor action.hashCode()) and Int.MAX_VALUE
  }
}
