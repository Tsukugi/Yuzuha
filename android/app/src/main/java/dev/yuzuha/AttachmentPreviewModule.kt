package dev.yuzuha

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AttachmentPreviewModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "YuzuhaAttachmentPreview"

  @ReactMethod
  fun openAttachment(path: String, mimeType: String, promise: Promise) {
    try {
      val attachmentRoot = File(context.filesDir, "attachments").canonicalFile
      val attachmentFile = File(path).canonicalFile
      if (attachmentFile.parentFile != attachmentRoot || !attachmentFile.isFile) {
        promise.reject("ATTACHMENT_FILE_INVALID", "The attachment file is not available.")
        return
      }
      if (mimeType !in SUPPORTED_MIME_TYPES) {
        promise.reject("ATTACHMENT_TYPE_INVALID", "This attachment type cannot be previewed.")
        return
      }

      val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", attachmentFile)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mimeType)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(Intent.createChooser(intent, "Open attachment").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("ATTACHMENT_PREVIEW_FAILED", error.message ?: "The attachment could not be opened.", error)
    }
  }

  companion object {
    private val SUPPORTED_MIME_TYPES = setOf(
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
    )
  }
}
