package dev.yuzuha

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class DeepLinkModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingDeepLink: String? = null

  init {
    current = this
    DeepLinkModule.pendingDeepLink?.let {
      pendingDeepLink = it
      DeepLinkModule.pendingDeepLink = null
    }
  }

  override fun getName(): String = "YuzuhaDeepLinks"

  @ReactMethod
  fun getInitialDeepLink(promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity()
    val link = pendingDeepLink ?: activity?.intent?.let { intent ->
      deepLinkFor(intent)?.also { clearIntent(intent) }
    }
    pendingDeepLink = null
    promise.resolve(link)
  }

  override fun invalidate() {
    if (current === this) {
      current = null
    }
    super.invalidate()
  }

  private fun emitDeepLink(link: String) {
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(DEEP_LINK_EVENT, link)
  }

  companion object {
    const val DEEP_LINK_EVENT = "YuzuhaDeepLink"
    private const val SCHEME = "yuzuha"
    private const val HOST = "open"
    private var current: DeepLinkModule? = null
    private var pendingDeepLink: String? = null

    fun handleActivityIntent(intent: Intent) {
      val link = deepLinkFor(intent) ?: return
      clearIntent(intent)
      current?.let {
        it.pendingDeepLink = link
        it.emitDeepLink(link)
      } ?: run {
        pendingDeepLink = link
      }
    }

    private fun deepLinkFor(intent: Intent): String? {
      if (intent.action != Intent.ACTION_VIEW) {
        return null
      }
      val uri = intent.data ?: return null
      if (uri.scheme != SCHEME || uri.authority != HOST || uri.port != -1 || uri.query != null || uri.fragment != null) {
        return null
      }
      return when (uri.encodedPath) {
        "/money", "/notes", "/tasks", "/app-time" -> uri.toString()
        else -> null
      }
    }

    private fun clearIntent(intent: Intent) {
      intent.action = Intent.ACTION_MAIN
      intent.data = null
      intent.replaceExtras(null)
    }
  }
}
