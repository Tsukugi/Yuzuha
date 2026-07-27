package dev.yuzuha

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShareCaptureModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingSharedCapture: WritableMap? = null

  init {
    current = this
    ShareCaptureModule.pendingSharedCapture?.let {
      this.pendingSharedCapture = it
      ShareCaptureModule.pendingSharedCapture = null
    }
  }

  override fun getName(): String = "YuzuhaShareCapture"

  @ReactMethod
  fun getInitialSharedCapture(promise: Promise) {
    val payload = pendingSharedCapture ?: getReactApplicationContext().getCurrentActivity()?.intent?.let { intent ->
      payloadFor(intent).also { clearIntent(intent) }
    }
    pendingSharedCapture = null
    promise.resolve(payload)
  }

  override fun invalidate() {
    if (current === this) {
      current = null
    }
    super.invalidate()
  }

  private fun emitSharedCapture(payload: WritableMap) {
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(SHARED_CAPTURE_EVENT, payload)
  }

  companion object {
    const val SHARED_CAPTURE_EVENT = "YuzuhaSharedCapture"
    private var current: ShareCaptureModule? = null
    private var pendingSharedCapture: WritableMap? = null

    fun handleActivityIntent(intent: Intent) {
      val payload = payloadFor(intent) ?: return
      clearIntent(intent)
      val module = current
      if (module == null) {
        pendingSharedCapture = payload
      } else {
        module.pendingSharedCapture = payload
        module.emitSharedCapture(payload)
      }
    }

    private fun payloadFor(intent: Intent): WritableMap? {
      if (intent.action != Intent.ACTION_SEND || (intent.type != null && intent.type != "text/plain")) {
        return null
      }
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)
      val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
      if (text.isNullOrBlank() && subject.isNullOrBlank()) {
        return null
      }
      if ((text?.length ?: 0) > MAX_CAPTURE_CHARS || (subject?.length ?: 0) > MAX_CAPTURE_CHARS) {
        return null
      }
      return Arguments.createMap().apply {
        putString("text", text)
        putString("subject", subject)
        putString("mimeType", intent.type)
      }
    }

    private const val MAX_CAPTURE_CHARS = 20_000

    private fun clearIntent(intent: Intent) {
      intent.removeExtra(Intent.EXTRA_TEXT)
      intent.removeExtra(Intent.EXTRA_SUBJECT)
    }
  }
}
