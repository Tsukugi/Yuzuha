package dev.yuzuha

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class YuzuhaInstallerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaInstaller"

  @ReactMethod
  fun getLaunchStatus(promise: Promise) {
    try {
      val status = (context.applicationContext as MainApplication).bundleLaunchResult()
      val result = Arguments.createMap()
      result.putString("kind", status.kind)
      result.putString("version", status.version)
      status.reasonCode?.let { result.putString("reasonCode", it) }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("INSTALLER_STATUS_FAILED", error.message, error)
    }
  }
}
