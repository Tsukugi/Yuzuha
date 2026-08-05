package dev.yuzuha

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class YuzuhaInstallerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaInstaller"

  private fun installer(): YuzuhaBundleInstaller =
    (context.applicationContext as MainApplication).bundleInstaller()

  private fun updateResultMap(result: BundleUpdateResult) = Arguments.createMap().apply {
    putString("kind", result.kind)
    putString("currentVersion", result.currentVersion)
    result.availableVersion?.let { putString("availableVersion", it) }
    result.reasonCode?.let { putString("reasonCode", it) }
  }

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

  @ReactMethod
  fun checkForUpdate(promise: Promise) {
    Thread({
      try {
        promise.resolve(updateResultMap(installer().checkForUpdate()))
      } catch (error: Exception) {
        promise.reject("INSTALLER_CHECK_FAILED", error.message, error)
      }
    }, "yuzuha-installer-check").apply {
      isDaemon = true
      start()
    }
  }

  @ReactMethod
  fun downloadUpdate(promise: Promise) {
    Thread({
      try {
        promise.resolve(updateResultMap(installer().downloadUpdate()))
      } catch (error: Exception) {
        promise.reject("INSTALLER_DOWNLOAD_FAILED", error.message, error)
      }
    }, "yuzuha-installer-download").apply {
      isDaemon = true
      start()
    }
  }

  @ReactMethod
  fun markLaunchSuccessful(promise: Promise) {
    try {
      installer().markLaunchSuccessful()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("INSTALLER_HEALTH_FAILED", error.message, error)
    }
  }
}
