package dev.yuzuha

import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.io.FileOutputStream
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RootApkInstallerDeviceTest {
  @Test
  fun controlledRootInstallsWithoutOpeningSystemUi() {
    assumeTrue("Requires a userdebug/rooted test image.", Build.TYPE == "userdebug" || Build.TYPE == "eng")
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
      val installer = AndroidRootApkInstaller()
      assertTrue("The controlled root service was not available.", installer.isAvailable())
      assertTrue("Root package install failed.", installer.install(target))

      val packageState = instrumentation.uiAutomation
        .executeShellCommand("dumpsys package dev.yuzuha")
        .use { descriptor -> java.io.FileInputStream(descriptor.fileDescriptor).bufferedReader().readText() }
      assertTrue(packageState.contains("versionName=0.2.0"))
      assertTrue(packageState.contains("versionCode=7 "))
    } finally {
      target.delete()
    }
  }
}
