package dev.yuzuha

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class YuzuhaNativePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      UsageAccessModule(reactContext),
      AttachmentPreviewModule(reactContext),
      TaskReminderModule(reactContext),
      ShareCaptureModule(reactContext),
      LaunchActionsModule(reactContext),
      YuzuhaWidgetModule(reactContext),
    )
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
