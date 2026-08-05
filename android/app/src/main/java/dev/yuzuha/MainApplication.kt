package dev.yuzuha

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  private val bundleInstaller by lazy { YuzuhaBundleInstaller(applicationContext) }

  override val reactHost: ReactHost by lazy {
    val launchResult = bundleInstaller.await()
    getDefaultReactHost(
        context = applicationContext,
        packageList =
        PackageList(this).packages.apply {
          add(YuzuhaNativePackage())
        },
        jsBundleFilePath = launchResult.bundlePath,
    )
  }

  override fun onCreate() {
    super.onCreate()
    bundleInstaller.start()
    loadReactNative(this)
  }

  fun bundleLaunchResult(): BundleLaunchResult = bundleInstaller.await()

  fun bundleInstaller(): YuzuhaBundleInstaller = bundleInstaller
}
