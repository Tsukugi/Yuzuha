package dev.yuzuha

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.app.usage.UsageEventsQuery
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
      var resultCount = appendUsageStats(result, usageStats, startTimeMillis.toLong(), endTimeMillis.toLong())

      // Some current Android emulator images expose foreground time through
      // usage events while queryUsageStats returns zero-duration records.
      // Keep the stats API as the primary source, then use the event stream
      // for that deterministic empty-result case.
      if (resultCount == 0) {
        val eventDurations = queryForegroundDurations(
          manager,
          UsageAccessRules.eventQueryStart(startTimeMillis.toLong()),
          endTimeMillis.toLong(),
          startTimeMillis.toLong(),
        )
        for ((packageName, durationMillis) in eventDurations) {
          if (durationMillis <= 0) {
            continue
          }
          val item = Arguments.createMap()
          item.putString("packageName", packageName)
          item.putString("displayName", displayNameFor(packageName))
          item.putDouble("durationSeconds", durationMillis / 1000.0)
          item.putDouble("beginTimeMillis", startTimeMillis)
          result.pushMap(item)
          resultCount += 1
        }
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

  private fun appendUsageStats(
    result: com.facebook.react.bridge.WritableArray,
    usageStats: Collection<android.app.usage.UsageStats>,
    startTimeMillis: Long,
    endTimeMillis: Long,
  ): Int {
    var resultCount = 0
    for (stat in usageStats) {
      // Android 15 emulator images may report visible time while the
      // foreground field remains zero. Visible time is still device app
      // usage, and max keeps the older foreground-only behavior intact.
      val durationMillis = maxOf(stat.totalTimeInForeground, stat.totalTimeVisible)
      if (UsageAccessRules.boundedDurationMillis(durationMillis, startTimeMillis, endTimeMillis) == null) {
        continue
      }
      if (!UsageAccessRules.hasActivityInRange(
          stat.lastTimeUsed,
          stat.lastTimeVisible,
          startTimeMillis,
          endTimeMillis,
        )) {
        continue
      }
      val item = Arguments.createMap()
      item.putString("packageName", stat.packageName)
      item.putString("displayName", displayNameFor(stat.packageName))
      item.putDouble("durationSeconds", durationMillis / 1000.0)
      item.putDouble("beginTimeMillis", stat.firstTimeStamp.toDouble())
      result.pushMap(item)
      resultCount += 1
    }
    return resultCount
  }

  private fun queryForegroundDurations(
    manager: UsageStatsManager,
    eventQueryStartMillis: Long,
    endTimeMillis: Long,
    requestedStartMillis: Long,
  ): Map<String, Long> {
    val events = if (Build.VERSION.SDK_INT >= 35) {
      manager.queryEvents(
        UsageEventsQuery.Builder(eventQueryStartMillis, endTimeMillis)
          .setEventTypes(
            android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED,
            android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
            android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED,
          )
          .build(),
      )
    } else {
      manager.queryEvents(eventQueryStartMillis, endTimeMillis)
    } ?: return emptyMap()
    val event = android.app.usage.UsageEvents.Event()
    val openAt = mutableMapOf<String, Long>()
    val durations = mutableMapOf<String, Long>()

    fun addDuration(packageName: String, durationMillis: Long) {
      if (durationMillis > 0) {
        durations[packageName] = (durations[packageName] ?: 0L) + durationMillis
      }
    }

      while (events.hasNextEvent()) {
      events.getNextEvent(event)
        val packageName = event.packageName ?: continue
      val timestamp = event.timeStamp.coerceIn(requestedStartMillis, endTimeMillis)
      when (event.eventType) {
        android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND,
        android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED -> {
          openAt.putIfAbsent(packageName, timestamp)
        }
        android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND,
        android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
        android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED -> {
          val openedAt = openAt.remove(packageName)
          if (openedAt != null) {
            addDuration(packageName, timestamp - openedAt)
          }
        }
      }
    }

    for ((packageName, openedAt) in openAt) {
      addDuration(packageName, endTimeMillis - openedAt.coerceAtLeast(requestedStartMillis))
    }
    return durations
  }
}
