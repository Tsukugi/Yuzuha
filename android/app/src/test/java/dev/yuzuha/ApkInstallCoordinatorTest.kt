package dev.yuzuha

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ApkInstallCoordinatorTest {
  private val apk = File("fixed/Yuzuha-0.3.4.apk")

  @Test
  fun rootedDeviceInstallsSilentlyWithoutOpeningSystemPrompt() {
    val root = FakeRootInstaller(available = true, installed = true)
    val system = FakeSystemInstaller()

    val result = ApkInstallCoordinator(root, system).install(apk)

    assertEquals("root-installed", result)
    assertEquals(apk, root.file)
    assertEquals(null, system.file)
  }

  @Test
  fun nonRootDeviceOpensTheDefaultAndroidInstaller() {
    val root = FakeRootInstaller(available = false, installed = false)
    val system = FakeSystemInstaller()

    val result = ApkInstallCoordinator(root, system).install(apk)

    assertEquals("prompted", result)
    assertEquals(apk, system.file)
  }

  @Test
  fun failedRootInstallDoesNotStartASecondInstaller() {
    val system = FakeSystemInstaller()

    assertThrows(RootInstallException::class.java) {
      ApkInstallCoordinator(FakeRootInstaller(available = true, installed = false), system).install(apk)
    }
    assertEquals(null, system.file)
  }

  @Test
  fun aospRootDialectIsProbedAndUsedForTheSilentInstall() {
    val calls = mutableListOf<List<String>>()
    val executor = RootCommandExecutor { arguments, _ ->
      calls += arguments
      when (arguments) {
        listOf("su", "-c", "id -u") -> RootCommandResult(false, "su: invalid uid/gid '-c'")
        listOf("su", "0", "sh", "-c", "id -u") -> RootCommandResult(true, "0\n")
        else -> RootCommandResult(true, "Success\n")
      }
    }
    val installer = AndroidRootApkInstaller(executor)

    assertTrue(installer.isAvailable())
    assertTrue(installer.install(apk))
    assertEquals(listOf("su", "0", "sh", "-c", "id -u"), calls[1])
    assertEquals(listOf("su", "0", "sh", "-c"), calls[2].take(4))
    assertTrue(calls[2].last().startsWith("pm install -r --user 0 "))
  }

  @Test
  fun magiskRootDialectDoesNotRunTheAospProbe() {
    val calls = mutableListOf<List<String>>()
    val executor = RootCommandExecutor { arguments, _ ->
      calls += arguments
      RootCommandResult(true, if (arguments.last() == "id -u") "0\n" else "Success\n")
    }
    val installer = AndroidRootApkInstaller(executor)

    assertTrue(installer.isAvailable())
    assertTrue(installer.install(apk))
    assertEquals(listOf("su", "-c", "id -u"), calls[0])
    assertEquals(listOf("su", "-c"), calls[1].take(2))
    assertEquals(2, calls.size)
  }

  private class FakeRootInstaller(private val available: Boolean, private val installed: Boolean) : RootApkInstaller {
    var file: File? = null
    override fun isAvailable(): Boolean = available
    override fun install(file: File): Boolean {
      this.file = file
      return installed
    }
  }

  private class FakeSystemInstaller : SystemApkInstaller {
    var file: File? = null
    override fun open(file: File) {
      this.file = file
    }
  }
}
