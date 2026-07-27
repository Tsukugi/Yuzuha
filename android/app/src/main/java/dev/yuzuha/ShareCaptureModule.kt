package dev.yuzuha

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class ShareCaptureModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private var pendingSharedCapture: WritableMap? = null

  init {
    current = this
    ShareCaptureModule.applicationContext = context
    ShareCaptureModule.pendingSharedCapture?.let {
      this.pendingSharedCapture = it
      ShareCaptureModule.pendingSharedCapture = null
    }
  }

  override fun getName(): String = "YuzuhaShareCapture"

  @ReactMethod
  fun getInitialSharedCapture(promise: Promise) {
    val payload = pendingSharedCapture ?: getReactApplicationContext().getCurrentActivity()?.intent?.let { intent ->
      payloadFor(intent, context.contentResolver).also { clearIntent(intent) }
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
    private var applicationContext: ReactApplicationContext? = null

    fun handleActivityIntent(intent: Intent) {
      val module = current
      val resolver = module?.context?.contentResolver ?: applicationContext?.contentResolver ?: return
      val payload = payloadFor(intent, resolver) ?: return
      clearIntent(intent)
      if (module == null) {
        pendingSharedCapture = payload
      } else {
        module.pendingSharedCapture = payload
        module.emitSharedCapture(payload)
      }
    }

    private fun payloadFor(intent: Intent, resolver: ContentResolver): WritableMap? {
      if (intent.action != Intent.ACTION_SEND) {
        return null
      }
      val text = intent.getStringExtra(Intent.EXTRA_TEXT)
      val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)
      val attachment = attachmentFor(intent, resolver)
      val textType = intent.type.isNullOrBlank() || intent.type.equals("text/plain", ignoreCase = true)
      if (!textType && attachment == null) {
        return null
      }
      if (text.isNullOrBlank() && subject.isNullOrBlank() && attachment == null) {
        return null
      }
      if ((text?.length ?: 0) > MAX_CAPTURE_CHARS || (subject?.length ?: 0) > MAX_CAPTURE_CHARS) {
        return null
      }
      return Arguments.createMap().apply {
        putString("text", text)
        putString("subject", subject)
        putString("mimeType", attachment?.mimeType ?: intent.type)
        if (attachment != null) {
          putString("attachmentUri", attachment.uri.toString())
          putString("attachmentName", attachment.name)
          putString("attachmentMimeType", attachment.mimeType)
          if (attachment.byteSize == null) {
            putNull("attachmentByteSize")
          } else {
            putDouble("attachmentByteSize", attachment.byteSize.toDouble())
          }
        }
      }
    }

    private fun attachmentFor(intent: Intent, resolver: ContentResolver): SharedAttachment? {
      val uri = streamUri(intent) ?: return null
      val rawMime = intent.type?.trim()?.lowercase(Locale.ROOT)
      val mimeType = if (rawMime.isNullOrBlank() || rawMime.contains('*')) resolver.getType(uri)?.trim()?.lowercase(Locale.ROOT) else rawMime
      if (mimeType == null || !isSupportedAttachmentMimeType(mimeType)) {
        return null
      }
      var name: String? = null
      var byteSize: Long? = null
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
          val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
          val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
          name = if (nameIndex >= 0 && !cursor.isNull(nameIndex)) cursor.getString(nameIndex)?.trim() else null
          byteSize = if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) cursor.getLong(sizeIndex).takeIf { it >= 0L } else null
        }
      }
      if (name.isNullOrBlank() || name!!.length > MAX_ATTACHMENT_NAME_LENGTH) {
        return null
      }
      if (byteSize != null && (byteSize!! <= 0L || byteSize!! > MAX_ATTACHMENT_BYTES)) {
        return null
      }
      return SharedAttachment(uri, name!!, mimeType, byteSize)
    }

    @Suppress("DEPRECATION")
    private fun streamUri(intent: Intent): Uri? {
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
      } else {
        intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
      }
    }

    private fun isSupportedAttachmentMimeType(mimeType: String?): Boolean = mimeType == "image/jpeg" || mimeType == "image/png" || mimeType == "image/gif" || mimeType == "image/webp" || mimeType == "application/pdf" || mimeType == "text/plain"

    private const val MAX_CAPTURE_CHARS = 20_000
    private const val MAX_ATTACHMENT_BYTES = 10L * 1024L * 1024L
    private const val MAX_ATTACHMENT_NAME_LENGTH = 255

    private fun clearIntent(intent: Intent) {
      intent.removeExtra(Intent.EXTRA_TEXT)
      intent.removeExtra(Intent.EXTRA_SUBJECT)
      intent.removeExtra(Intent.EXTRA_STREAM)
    }
  }

  private data class SharedAttachment(
    val uri: Uri,
    val name: String,
    val mimeType: String,
    val byteSize: Long?,
  )
}
