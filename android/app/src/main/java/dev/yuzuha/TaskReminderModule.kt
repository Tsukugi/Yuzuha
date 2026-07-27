package dev.yuzuha

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.Intent

class TaskReminderModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  init {
    current = this
  }

  override fun getName(): String = "YuzuhaTaskReminders"

  @ReactMethod
  fun scheduleTaskReminder(taskId: String, triggerAtMillis: Double, promise: Promise) {
    try {
      val trigger = triggerAtMillis.toLong()
      if (taskId.isBlank() || trigger <= System.currentTimeMillis()) {
        promise.reject("TASK_REMINDER_TIME_INVALID", "The task reminder time must be in the future.")
        return
      }
      TaskReminderReceiver.schedule(context, taskId, trigger)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("TASK_REMINDER_SCHEDULE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun cancelTaskReminder(taskId: String, promise: Promise) {
    try {
      if (taskId.isBlank()) {
        promise.reject("TASK_REMINDER_ID_INVALID", "The task reminder ID is invalid.")
        return
      }
      TaskReminderReceiver.cancel(context, taskId)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("TASK_REMINDER_CANCEL_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun syncTaskReminders(reminders: ReadableArray, promise: Promise) {
    try {
      val entries = mutableListOf<Pair<String, Long>>()
      for (index in 0 until reminders.size()) {
        val item = reminders.getMap(index)
        val taskId = item?.getString("taskId")
        val trigger = if (item?.hasKey("triggerAtMillis") == true) item.getDouble("triggerAtMillis").toLong() else 0L
        if (taskId.isNullOrBlank() || trigger <= 0L) {
          promise.reject("TASK_REMINDER_SYNC_INVALID", "A task reminder entry is invalid.")
          return
        }
        entries.add(taskId to trigger)
      }
      TaskReminderReceiver.sync(context, entries)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("TASK_REMINDER_SYNC_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getInitialTaskReminderId(promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity()
    val taskId = activity?.intent?.getStringExtra(TASK_REMINDER_ID_EXTRA)
    activity?.intent?.removeExtra(TASK_REMINDER_ID_EXTRA)
    promise.resolve(taskId?.takeIf { it.isNotBlank() })
  }

  override fun invalidate() {
    if (current === this) {
      current = null
    }
    super.invalidate()
  }

  private fun emitTaskReminderOpened(taskId: String) {
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(TASK_REMINDER_OPENED_EVENT, taskId)
  }

  companion object {
    const val TASK_REMINDER_ID_EXTRA = "taskId"
    const val TASK_REMINDER_OPENED_EVENT = "YuzuhaTaskReminderOpened"
    private var current: TaskReminderModule? = null

    fun handleActivityIntent(intent: Intent) {
      val taskId = intent.getStringExtra(TASK_REMINDER_ID_EXTRA)?.takeIf { it.isNotBlank() } ?: return
      intent.removeExtra(TASK_REMINDER_ID_EXTRA)
      current?.emitTaskReminderOpened(taskId)
    }
  }
}
