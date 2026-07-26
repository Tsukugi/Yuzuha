package dev.yuzuha

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class UsageAccessModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaUsageAccess"

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    try {
      promise.resolve(hasAccess())
    } catch (error: Exception) {
      promise.reject("USAGE_ACCESS_CHECK_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("USAGE_ACCESS_SETTINGS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun queryUsageStats(startTimeMillis: Double, endTimeMillis: Double, promise: Promise) {
    try {
      if (!hasAccess()) {
        promise.reject("USAGE_ACCESS_REQUIRED", "Android Usage Access is not granted.")
        return
      }

      val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val usageStats = manager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTimeMillis.toLong(),
        endTimeMillis.toLong(),
      )
      val result = Arguments.createArray()
      for (stat in usageStats) {
        val durationSeconds = stat.totalTimeInForeground / 1000.0
        if (durationSeconds <= 0) {
          continue
        }
        val item = Arguments.createMap()
        item.putString("packageName", stat.packageName)
        item.putString("displayName", displayNameFor(stat.packageName))
        item.putDouble("durationSeconds", durationSeconds)
        item.putDouble("beginTimeMillis", stat.firstTimeStamp.toDouble())
        result.pushMap(item)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("USAGE_QUERY_FAILED", error.message, error)
    }
  }

  private fun hasAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    @Suppress("DEPRECATION")
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    } else {
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun displayNameFor(packageName: String): String {
    return try {
      @Suppress("DEPRECATION")
      val info = context.packageManager.getApplicationInfo(packageName, 0)
      context.packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
  }
}
