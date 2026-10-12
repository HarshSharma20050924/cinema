package com.vega

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.File
import java.net.ServerSocket
import java.util.concurrent.TimeUnit

private const val TAG = "WarpModule"

class WarpModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "WarpModule"

    @Volatile
    private var warpProcess: Process? = null

    @Volatile
    private var currentPort: Int? = null

    private fun getBinaryFile(): File {
        val nativeLib = File(reactApplicationContext.applicationInfo.nativeLibraryDir, "libusque.so")
        if (nativeLib.exists()) {
            if (!nativeLib.canExecute()) {
                nativeLib.setExecutable(true, false)
            }
            return nativeLib
        }

        val fallback = File(reactApplicationContext.filesDir, "libusque.so")
        if (!fallback.exists() || fallback.length() == 0L) {
            try {
                val apkPath = reactApplicationContext.applicationInfo.sourceDir
                if (apkPath != null) {
                    val apkFile = File(apkPath)
                    if (apkFile.exists()) {
                        java.util.zip.ZipFile(apkFile).use { zip ->
                            val entry = zip.getEntry("lib/arm64-v8a/libusque.so")
                                ?: zip.getEntry("lib/arm64/libusque.so")
                            if (entry != null) {
                                zip.getInputStream(entry).use { input ->
                                    fallback.outputStream().use { output ->
                                        input.copyTo(output)
                                    }
                                }
                                fallback.setExecutable(true, false)
                                Log.i(TAG, "Extracted libusque.so from APK to ${fallback.absolutePath}")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to extract libusque.so fallback from APK: ${e.message}")
            }
        }

        if (fallback.exists()) {
            fallback.setExecutable(true, false)
            return fallback
        }

        return nativeLib
    }

    private fun getWarpDir(): File {
        val dir = File(reactApplicationContext.filesDir, "warp")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun getConfigFile(): File {
        return File(getWarpDir(), "config.json")
    }

    private fun flushConnections() {
        try {
            OkHttpClientProvider.getOkHttpClient().connectionPool.evictAll()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to evict connection pool: ${e.message}")
        }
    }

    private fun stopInternal() {
        try {
            val proc = warpProcess
            if (proc != null && proc.isAlive) {
                proc.destroy()
                proc.waitFor(2, TimeUnit.SECONDS)
                if (proc.isAlive) {
                    proc.destroyForcibly()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping WARP process: ${e.message}")
        } finally {
            warpProcess = null
            currentPort = null
            DohOkHttpFactory.instance?.warpProxyPort = null
            flushConnections()
        }
    }

    @ReactMethod
    fun startWarp(promise: Promise) {
        Thread {
            try {
                if (warpProcess?.isAlive == true && currentPort != null) {
                    val result = Arguments.createMap().apply {
                        putBoolean("running", true)
                        putInt("port", currentPort!!)
                    }
                    promise.resolve(result)
                    return@Thread
                }

                val binary = getBinaryFile()
                if (!binary.exists()) {
                    promise.reject("WARP_BINARY_NOT_FOUND", "libusque.so not found at ${binary.absolutePath}")
                    return@Thread
                }

                val configFile = getConfigFile()
                if (!configFile.exists() || configFile.length() == 0L) {
                    Log.i(TAG, "Registering Cloudflare WARP account non-interactively (-a)...")
                    val regPb = ProcessBuilder(binary.absolutePath, "-c", configFile.absolutePath, "register", "-a")
                    regPb.directory(getWarpDir())
                    regPb.redirectErrorStream(true)
                    val regProc = regPb.start()

                    var regOutput = StringBuilder()
                    val readerThread = Thread {
                        try {
                            regProc.inputStream.bufferedReader().forEachLine { line ->
                                Log.d("WarpRegister", line)
                                regOutput.append(line).append("\n")
                            }
                        } catch (_: Exception) {}
                    }
                    readerThread.start()

                    val finished = regProc.waitFor(20, TimeUnit.SECONDS)
                    if (!finished) {
                        regProc.destroyForcibly()
                        promise.reject("WARP_REGISTRATION_TIMEOUT", "WARP registration timed out after 20s")
                        return@Thread
                    }
                    readerThread.join(1000)

                    val exitCode = regProc.exitValue()
                    if (exitCode != 0 || !configFile.exists() || configFile.length() == 0L) {
                        promise.reject("WARP_REGISTRATION_FAILED", "Failed to register WARP client (exit $exitCode): $regOutput")
                        return@Thread
                    }
                    Log.i(TAG, "WARP registration completed successfully")
                }

                val port = try {
                    ServerSocket(0).use { it.localPort }
                } catch (e: Exception) {
                    8086
                }

                val pb = ProcessBuilder(
                    binary.absolutePath,
                    "-c", configFile.absolutePath,
                    "http-proxy",
                    "-b", "127.0.0.1",
                    "-p", port.toString()
                )
                pb.directory(getWarpDir())
                pb.redirectErrorStream(true)
                val proc = pb.start()
                warpProcess = proc
                currentPort = port

                var isListening = false
                val logLines = StringBuilder()
                Thread {
                    try {
                        proc.inputStream.bufferedReader().forEachLine { line ->
                            Log.d("WarpProcess", line)
                            logLines.append(line).append("\n")
                            if (line.contains("listening on", ignoreCase = true) || line.contains("HTTP proxy", ignoreCase = true)) {
                                isListening = true
                            }
                        }
                    } catch (_: Exception) {}
                }.start()

                var waitedMs = 0
                while (waitedMs < 2500 && proc.isAlive && !isListening) {
                    Thread.sleep(100)
                    waitedMs += 100
                }

                if (!proc.isAlive) {
                    warpProcess = null
                    currentPort = null
                    promise.reject("WARP_START_FAILED", "WARP proxy process terminated immediately: $logLines")
                    return@Thread
                }

                DohOkHttpFactory.instance?.warpProxyPort = port
                flushConnections()

                val result = Arguments.createMap().apply {
                    putBoolean("running", true)
                    putInt("port", port)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                stopInternal()
                promise.reject("WARP_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun stopWarp(promise: Promise) {
        Thread {
            try {
                stopInternal()
                val result = Arguments.createMap().apply {
                    putBoolean("running", false)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("WARP_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val isRunning = warpProcess?.isAlive == true
        val result = Arguments.createMap().apply {
            putBoolean("running", isRunning)
            currentPort?.let { putInt("port", it) }
        }
        promise.resolve(result)
    }

    override fun onHostResume() {}

    override fun onHostPause() {}

    override fun onHostDestroy() {
        stopInternal()
    }

    override fun onCatalystInstanceDestroy() {
        stopInternal()
    }
}

class WarpPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WarpModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
