package dev.yuzuha

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class LaunchActionsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingLaunchAction: String? = null

  init {
    current = this
    LaunchActionsModule.pendingLaunchAction?.let {
      pendingLaunchAction = it
      LaunchActionsModule.pendingLaunchAction = null
    }
  }

  override fun getName(): String = "YuzuhaLaunchActions"

  @ReactMethod
  fun getInitialLaunchAction(promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity()
    val action = pendingLaunchAction ?: activity?.intent?.let { intent ->
      actionFor(intent).also { clearIntent(intent) }
    }
    pendingLaunchAction = null
    promise.resolve(action)
  }

  override fun invalidate() {
    if (current === this) {
      current = null
    }
    super.invalidate()
  }

  private fun emitLaunchAction(action: String) {
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(LAUNCH_ACTION_EVENT, action)
  }

  companion object {
    const val LAUNCH_ACTION_EVENT = "YuzuhaLaunchAction"
    private var current: LaunchActionsModule? = null
    private var pendingLaunchAction: String? = null

    fun handleActivityIntent(intent: Intent) {
      val action = actionFor(intent) ?: return
      clearIntent(intent)
      val module = current
      if (module == null) {
        pendingLaunchAction = action
      } else {
        module.pendingLaunchAction = action
        module.emitLaunchAction(action)
      }
    }

    private fun actionFor(intent: Intent): String? = when (intent.action) {
      ACTION_OPEN_MONEY -> ACTION_OPEN_MONEY
      ACTION_OPEN_NOTES -> ACTION_OPEN_NOTES
      ACTION_OPEN_TASKS -> ACTION_OPEN_TASKS
      ACTION_OPEN_APP_TIME -> ACTION_OPEN_APP_TIME
      else -> null
    }

    private fun clearIntent(intent: Intent) {
      intent.action = Intent.ACTION_MAIN
      intent.replaceExtras(null)
    }

    const val ACTION_OPEN_MONEY = "dev.yuzuha.OPEN_MONEY"
    const val ACTION_OPEN_NOTES = "dev.yuzuha.OPEN_NOTES"
    const val ACTION_OPEN_TASKS = "dev.yuzuha.OPEN_TASKS"
    const val ACTION_OPEN_APP_TIME = "dev.yuzuha.OPEN_APP_TIME"
  }
}
