package com.vega

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private data class ProxySession(
    val url: String,
    val headers: Map<String, String>,
)

/**
 * Local HTTP Stream Proxy Server for Android
 * Bypasses player restrictions (such as VLC's inability to pass custom Referer / Origin HTTP headers)
 * by proxying the media stream through a local HTTP ServerSocket on 127.0.0.1.
 */
class StreamProxyModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val DEFAULT_PORT = 8998
        private val sessions = ConcurrentHashMap<String, ProxySession>()
        private val executor = Executors.newCachedThreadPool()
    }

    @Volatile private var serverSocket: ServerSocket? = null
    @Volatile private var activePort: Int = DEFAULT_PORT
    private var wakeLock: PowerManager.WakeLock? = null

    private fun acquireWakeLock() {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (wakeLock == null) {
                wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "cinema:StreamProxyWakeLock")
            }
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire(45 * 60 * 1000L) // 45 min
            }
        } catch (_: Exception) {}
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        wakeLock = null
    }

    private val client: OkHttpClient by lazy {
        OkHttpClientProvider.getOkHttpClient()
            .newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .retryOnConnectionFailure(true)
            .dns(object : Dns {
                override fun lookup(hostname: String): List<InetAddress> {
                    try {
                        val addresses = Dns.SYSTEM.lookup(hostname)
                        if (addresses.isNotEmpty()) return addresses
                    } catch (_: Exception) {}
                    // Public DNS fallback if ISP (like Jio) blocked the streaming domain
                    return try {
                        val dohClient = DohOkHttpFactory.instance?.createNewNetworkModuleClient()
                        dohClient?.dns?.lookup(hostname) ?: Dns.SYSTEM.lookup(hostname)
                    } catch (_: Exception) {
                        Dns.SYSTEM.lookup(hostname)
                    }
                }
            })
            .build()
    }

    override fun getName(): String = "StreamProxyModule"

    override fun initialize() {
        super.initialize()
        startServer()
    }

    override fun invalidate() {
        stopServer()
        super.invalidate()
    }

    @Synchronized
    private fun startServer() {
        acquireWakeLock()
        if (serverSocket != null && !serverSocket!!.isClosed) {
            return
        }

        try {
            // Attempt preferred port 8998 first
            serverSocket = ServerSocket(DEFAULT_PORT, 50, InetAddress.getByName("127.0.0.1"))
            activePort = DEFAULT_PORT
        } catch (e: Exception) {
            try {
                // Fall back to any free ephemeral port
                val socket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
                activePort = socket.localPort
                serverSocket = socket
            } catch (err: Exception) {
                return
            }
        }

        val socket = serverSocket ?: return
        executor.execute {
            while (!socket.isClosed) {
                try {
                    val clientSocket = socket.accept()
                    executor.execute { handleClientConnection(clientSocket) }
                } catch (e: Exception) {
                    if (socket.isClosed) break
                }
            }
        }
    }

    private fun stopServer() {
        releaseWakeLock()
        try {
            serverSocket?.close()
        } catch (_: Exception) {}
        serverSocket = null
        sessions.clear()
    }

    @ReactMethod
    fun getProxyUrl(streamUrl: String, customHeaders: ReadableMap?, promise: Promise) {
        startServer()

        val headers = mutableMapOf<String, String>()
        customHeaders?.toHashMap()?.forEach { (k, v) ->
            if (v != null) headers[k] = v.toString()
        }

        // Auto-inject MovieBox headers if missing
        val lowerUrl = streamUrl.lowercase()
        if (lowerUrl.contains("hakunaymatata") || lowerUrl.contains("moviebox") || lowerUrl.contains("inmoviebox")) {
            if (!headers.keys.any { it.equals("referer", ignoreCase = true) }) {
                headers["Referer"] = "https://officialmoviebox.com/"
            }
            if (!headers.keys.any { it.equals("origin", ignoreCase = true) }) {
                headers["Origin"] = "https://officialmoviebox.com"
            }
        }

        val sessionId = UUID.randomUUID().toString().replace("-", "").substring(0, 10)
        sessions[sessionId] = ProxySession(streamUrl, headers)

        // Give VLC a clean .mp4 URL extension on localhost
        val proxyUrl = "http://127.0.0.1:$activePort/stream.mp4?id=$sessionId"
        promise.resolve(proxyUrl)
    }

    @ReactMethod
    fun launchPlayer(streamUrl: String, title: String?, customHeaders: ReadableMap?, promise: Promise) {
        startServer()

        val headers = mutableMapOf<String, String>()
        customHeaders?.toHashMap()?.forEach { (k, v) ->
            if (v != null) headers[k] = v.toString()
        }

        val lowerUrl = streamUrl.lowercase()
        val isHttp = lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://")
        val isMovieBox =
            lowerUrl.contains("hakunaymatata") ||
            lowerUrl.contains("moviebox") ||
            lowerUrl.contains("inmoviebox")
        val hasHeaders = headers.isNotEmpty() || isMovieBox

        if (isMovieBox) {
            headers["Referer"] = "https://officialmoviebox.com/"
            headers["Origin"] = "https://officialmoviebox.com"
            if (!headers.keys.any { it.equals("user-agent", ignoreCase = true) }) {
                headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
        }

        val finalUrl = if (isHttp && hasHeaders) {
            val sessionId = UUID.randomUUID().toString().replace("-", "").substring(0, 10)
            sessions[sessionId] = ProxySession(streamUrl, headers)
            "http://127.0.0.1:$activePort/stream.mp4?id=$sessionId"
        } else {
            streamUrl
        }

        val headerStrings = ArrayList<String>()
        headers.forEach { (k, v) -> headerStrings.add("$k: $v") }
        val headerArray = if (headerStrings.isNotEmpty()) headerStrings.toTypedArray() else null

        try {
            val vlcIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(finalUrl), "video/*")
                setPackage("org.videolan.vlc")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                if (title != null) {
                    putExtra("title", title)
                    putExtra("android.intent.extra.TITLE", title)
                }
                if (headerArray != null) {
                    putExtra("extra_headers", headerArray)
                    putExtra("headers", headerArray)
                }
            }
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.startActivity(vlcIntent)
            } else {
                vlcIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(vlcIntent)
            }
            promise.resolve(true)
        } catch (vlcErr: Exception) {
            // VLC not found, open system chooser (MX Player, Just Player, etc.)
            try {
                val chooser = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(finalUrl), "video/*")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    if (title != null) {
                        putExtra("title", title)
                        putExtra("android.intent.extra.TITLE", title)
                    }
                    if (headerArray != null) {
                        putExtra("extra_headers", headerArray)
                        putExtra("headers", headerArray)
                    }
                }
                val chooserIntent = Intent.createChooser(chooser, "Play Video With").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(chooserIntent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("LAUNCH_FAILED", err.message, err)
            }
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        val running = serverSocket != null && !serverSocket!!.isClosed
        promise.resolve(running)
    }

    private fun handleClientConnection(clientSocket: Socket) {
        try {
            clientSocket.soTimeout = 30000
            val reader = BufferedReader(InputStreamReader(clientSocket.getInputStream()))
            val firstLine = reader.readLine() ?: return clientSocket.close()

            // e.g., "GET /stream.mp4?id=abc12345 HTTP/1.1"
            val parts = firstLine.split(" ")
            if (parts.size < 2) {
                clientSocket.close()
                return
            }
            val method = parts[0].uppercase()
            val path = parts[1]

            var rangeHeader: String? = null
            var line: String? = reader.readLine()
            while (!line.isNullOrEmpty()) {
                if (line.startsWith("Range:", ignoreCase = true)) {
                    rangeHeader = line.substring(6).trim()
                }
                line = reader.readLine()
            }

            val uri = Uri.parse("http://127.0.0.1$path")
            val sessionId = uri.getQueryParameter("id")
            val session = if (sessionId != null) sessions[sessionId] else null

            if (session == null) {
                val out = BufferedOutputStream(clientSocket.getOutputStream())
                out.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray())
                out.flush()
                clientSocket.close()
                return
            }

            val reqBuilder = Request.Builder().url(session.url)
            session.headers.forEach { (name, value) ->
                if (!name.equals("range", ignoreCase = true) && !name.equals("host", ignoreCase = true)) {
                    reqBuilder.header(name, value)
                }
            }
            if (!session.headers.keys.any { it.equals("user-agent", ignoreCase = true) }) {
                reqBuilder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
            }
            if (rangeHeader != null) {
                reqBuilder.header("Range", rangeHeader)
            }

            val response = client.newCall(reqBuilder.build()).execute()
            response.use { resp ->
                val out = BufferedOutputStream(clientSocket.getOutputStream())
                val statusLine = "HTTP/1.1 ${resp.code} ${resp.message}\r\n"
                out.write(statusLine.toByteArray())

                var hasContentType = false
                resp.headers.forEach { (name, value) ->
                    val lowerName = name.lowercase()
                    if (lowerName != "transfer-encoding" && lowerName != "connection") {
                        if (lowerName == "content-type") hasContentType = true
                        out.write("$name: $value\r\n".toByteArray())
                    }
                }
                if (!hasContentType) {
                    out.write("Content-Type: video/mp4\r\n".toByteArray())
                }
                out.write("Accept-Ranges: bytes\r\n".toByteArray())
                out.write("Connection: keep-alive\r\n\r\n".toByteArray())
                out.flush()

                if (method != "HEAD") {
                    resp.body?.byteStream()?.use { bodyStream ->
                        val buffer = ByteArray(64 * 1024)
                        var read: Int
                        while (bodyStream.read(buffer).also { read = it } != -1) {
                            try {
                                out.write(buffer, 0, read)
                            } catch (e: Exception) {
                                break // Client disconnected or stopped playback
                            }
                        }
                        try {
                            out.flush()
                        } catch (_: Exception) {}
                    }
                }
            }
        } catch (_: Exception) {
            try {
                val out = BufferedOutputStream(clientSocket.getOutputStream())
                out.write("HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: 11\r\n\r\nBad Gateway".toByteArray())
                out.flush()
            } catch (_: Exception) {}
        } finally {
            try {
                clientSocket.close()
            } catch (_: Exception) {}
        }
    }
}
