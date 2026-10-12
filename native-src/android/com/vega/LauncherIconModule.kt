package com.vega

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class LauncherIconModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "LauncherIconModule"

    @ReactMethod
    fun setIcon(icon: String, promise: Promise) {
        val aliases = mapOf(
            "white" to "LauncherWhite",
            "tomato" to "LauncherTomato",
            "gray" to "LauncherGray",
            "blue" to "LauncherBlue",
            "lavender" to "LauncherLavender",
        )
        val splashThemes = mapOf(
            "white" to R.style.BootTheme_White,
            "tomato" to R.style.BootTheme_Tomato,
            "gray" to R.style.BootTheme_Gray,
            "blue" to R.style.BootTheme_Blue,
            "lavender" to R.style.BootTheme_Lavender,
        )
        val selectedAlias = aliases[icon]
        val selectedSplashTheme = splashThemes[icon]
        if (selectedAlias == null || selectedSplashTheme == null) {
            promise.reject("LAUNCHER_ICON_ERROR", "Unknown launcher icon: $icon")
            return
        }

        try {
            // Android 12+ creates the first splash frame before MainActivity.onCreate.
            // Persist its native theme now so it matches RNBootSplash on the next launch.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                reactApplicationContext.currentActivity
                    ?.splashScreen
                    ?.setSplashScreenTheme(selectedSplashTheme)
            }
            reactApplicationContext
                .getSharedPreferences("vega_launcher", Context.MODE_PRIVATE)
                .edit()
                .putString("icon", icon)
                .commit()
            val packageManager = reactApplicationContext.packageManager
            val packageName = reactApplicationContext.packageName
            aliases.values.forEach { alias ->
                val state = if (alias == selectedAlias) {
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                } else {
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                }
                packageManager.setComponentEnabledSetting(
                    ComponentName(packageName, "$packageName.$alias"),
                    state,
                    PackageManager.DONT_KILL_APP,
                )
            }
            promise.resolve(icon)
        } catch (error: Exception) {
            promise.reject("LAUNCHER_ICON_ERROR", error.message, error)
        }
    }
}

class LauncherIconPackage : com.facebook.react.ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(LauncherIconModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
