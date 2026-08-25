package dev.yuzuha

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.io.File
import java.io.FileOutputStream
import java.util.regex.Pattern
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SystemApkInstallerDeviceTest {
  @Test
  fun verifiedPrivateApkOpensAndroidOwnedInstallUi() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val sourcePath = InstrumentationRegistry.getArguments().getString("updateApkPath")
      ?: error("Pass -e updateApkPath /data/local/tmp/Yuzuha-update-test.apk")
    require(sourcePath == "/data/local/tmp/Yuzuha-update-test.apk")

    val context = instrumentation.targetContext
    val directory = File(context.filesDir, "installer/apk").apply { mkdirs() }
    val target = File(directory, "Yuzuha-0.2.0.apk")
    try {
      instrumentation.uiAutomation.executeShellCommand("cat $sourcePath").use { source ->
        FileOutputStream(target).use { output ->
          java.io.FileInputStream(source.fileDescriptor).use { input -> input.copyTo(output) }
        }
      }
      assertTrue(target.isFile && target.length() > 0)

      AndroidSystemApkInstaller(context).open(target)

      val device = UiDevice.getInstance(instrumentation)
      val textPattern = Pattern.compile(".*(install|update|security).*", Pattern.CASE_INSENSITIVE)
      assertTrue("Android did not show install-related UI.", device.wait(Until.hasObject(By.text(textPattern)), 8_000))
      val owner = device.currentPackageName
      assertNotEquals(context.packageName, owner)
      assertTrue(
        "Unexpected install UI owner: $owner",
        owner == "com.google.android.packageinstaller" ||
          owner == "com.android.packageinstaller" ||
          owner == "com.google.android.permissioncontroller" ||
          owner == "com.android.permissioncontroller" ||
          owner == "com.android.settings",
      )
      device.pressBack()
    } finally {
      target.delete()
    }
  }
}
