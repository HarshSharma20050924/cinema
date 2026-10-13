package com.cinema.runner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.system.ErrnoException;
import android.system.Os;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * NodeJSService — Foreground service that:
 * 1. Extracts nodejs-project assets from APK
 * 2. Starts real Node.js runtime (via JNI / libnode.so)
 * 3. The Node.js server starts cloudflared, gets tunnel URL
 * 4. Registers tunnel with cinema-dwh.pages.dev
 * 5. Sends heartbeats every 25s
 */
public class NodeJSService extends Service {

    private static final String TAG = "NodeJSService";
    private static final String CHANNEL_ID = "cinema_node_channel";
    private static final int NOTIF_ID = 2001;

    private static final String NODEJS_PROJECT_DIR = "nodejs-project";
    private static final String SHARED_PREFS = "CINEMA_NODE_PREFS";
    private static final String LAST_UPDATE_KEY = "APK_LAST_UPDATE";

    public static final String ACTION_START = "com.cinema.runner.NODE_START";
    public static final String ACTION_STOP  = "com.cinema.runner.NODE_STOP";

    // Static state readable by CinemaPlugin
    public static volatile boolean isRunning = false;
    public static volatile String statusMessage = "Idle";
    public static volatile String tunnelUrl = null;
    private static volatile NodeJSService activeInstance = null;

    private static boolean nodeJsStarted = false;
    private Thread nodeThread = null;
    private ScheduledExecutorService heartbeat = null;
    private android.os.PowerManager.WakeLock wakeLock = null;
    private android.net.wifi.WifiManager.WifiLock wifiLock = null;
    private final android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());

    // JNI — implemented in cinema-node.cpp
    static {
        try {
            System.loadLibrary("node");
            System.loadLibrary("cinema-node-lib");
            Log.i(TAG, "✅ Node.js native libraries loaded");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "❌ Failed to load native libs: " + e.getMessage());
        }
    }

    public native void startNodeWithArguments(String[] arguments);
    public native String getCurrentABI();

    @Override
    public void onCreate() {
        super.onCreate();
        activeInstance = this;
        createNotificationChannel();

        // 1. Acquire partial wake lock to keep CPU alive in ColorOS / OxygenOS
        try {
            android.os.PowerManager pm = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "Cinema:RunnerWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
                Log.i(TAG, "🔒 CPU Partial WakeLock acquired (24/7 background persistence)");
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock error: " + e.getMessage());
        }

        // 2. Acquire high-performance WiFi lock so socket does not disconnect when screen turns off
        try {
            android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(android.net.wifi.WifiManager.WIFI_MODE_FULL_HIGH_PERF, "Cinema:RunnerWifiLock");
                wifiLock.setReferenceCounted(false);
                wifiLock.acquire();
                Log.i(TAG, "📶 WiFi High-Perf Lock acquired (prevents sleep disconnects)");
            }
        } catch (Exception e) {
            Log.w(TAG, "WifiLock error: " + e.getMessage());
        }

        // Set TMPDIR for Node.js
        try {
            Os.setenv("TMPDIR", getCacheDir().getAbsolutePath(), true);
        } catch (ErrnoException e) {
            Log.e(TAG, "TMPDIR set failed: " + e.getMessage());
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Called when user swipes app from recent apps.
        // DO NOT stop the service! Keep running 24/7 like a VPN.
        Log.i(TAG, "📱 App swiped from recents — Foreground Service remains locked and active!");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIF_ID, buildNotification("🎬 Cinema Server", "Starting tunnel…", false));
        isRunning = true;
        statusMessage = "Starting tunnel…";

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                // 1. Copy Node.js project only if newly installed / updated
                String projectPath = copyNodeJsProject();

                // 2. Set HOME so Node can write .npm etc
                try {
                    Os.setenv("HOME", getFilesDir().getAbsolutePath(), true);
                    Os.setenv("NODE_PATH", projectPath + "/node_modules", true);
                } catch (ErrnoException e) { /* ignore */ }

                File nativeCf = new File(getApplicationInfo().nativeLibraryDir, "libcloudflared.so");
                String cfPath = nativeCf.getAbsolutePath();
                if (nativeCf.exists()) {
                    Log.i(TAG, "✅ Found native libcloudflared.so at " + cfPath);
                } else {
                    Log.w(TAG, "libcloudflared.so not in nativeLibraryDir, falling back to filesDir");
                    cfPath = getFilesDir().getAbsolutePath() + "/cloudflared";
                    extractCloudflared(cfPath);
                }

                // 3. Always ensure Cloudflare tunnel is running cleanly
                try {
                    Runtime.getRuntime().exec(new String[]{"pkill", "-f", "cloudflared"}).waitFor();
                } catch (Exception ignored) {}

                if (cloudflaredProcess != null) {
                    try { cloudflaredProcess.destroyForcibly(); } catch (Exception ignored) {}
                    cloudflaredProcess = null;
                }
                startCloudflaredTunnel(cfPath);

                // 4. Start Node.js if not already running in process
                if (!nodeJsStarted) {
                    nodeJsStarted = true;
                    String mainScript = projectPath + "/main.js";
                    Log.i(TAG, "Starting node: " + mainScript);
                    startNodeWithArguments(new String[]{"node", mainScript});
                    nodeJsStarted = false;
                    isRunning = false;
                    statusMessage = "Stopped";
                }

            } catch (Exception e) {
                Log.e(TAG, "NodeJS startup error", e);
                setStatus("Error: " + e.getMessage());
                isRunning = false;
            }
        });

        return START_STICKY;
    }

    private Process cloudflaredProcess = null;

    private void startCloudflaredTunnel(String cfPath) {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                // Short wait for local port 3001
                Thread.sleep(400);

                Log.i(TAG, "Starting cloudflared process from Java: " + cfPath);
                setStatus("Connecting Cloudflare tunnel…");

                File cfFile = new File(cfPath);
                cfFile.setExecutable(true, false);

                ProcessBuilder pb = new ProcessBuilder(cfPath, "tunnel", "--url", "http://127.0.0.1:3001");
                pb.environment().put("HOME", getFilesDir().getAbsolutePath());
                pb.environment().put("TMPDIR", getCacheDir().getAbsolutePath());
                pb.redirectErrorStream(true);
                cloudflaredProcess = pb.start();

                BufferedReader reader = new BufferedReader(new InputStreamReader(cloudflaredProcess.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    Log.i("CLOUDFLARED", line);
                    if (tunnelUrl == null && line.contains("trycloudflare.com")) {
                        int idx = line.indexOf("https://");
                        if (idx >= 0) {
                            String raw = line.substring(idx);
                            int end = raw.indexOf(' ');
                            String foundUrl = (end > 0 ? raw.substring(0, end) : raw).trim();
                            foundUrl = foundUrl.replaceAll("[|\\s].*", "").trim();
                            if (foundUrl.startsWith("https://")) {
                                tunnelUrl = foundUrl;
                                isRunning = true;
                                Log.i(TAG, "🎉 Live Tunnel URL: " + foundUrl);
                                setStatus("Tunnel LIVE: " + foundUrl);
                                updateNotification("🟢 Cinema Server: Active", "Tunnel LIVE • Serving stream requests", true);
                                registerTunnelWithCoordinator(foundUrl);
                                startHeartbeat(foundUrl);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Cloudflared runner error", e);
            } finally {
                Log.w(TAG, "⚠️ Cloudflared process stream ended or exited");
                tunnelUrl = null;
                if (isRunning) {
                    setStatus("Tunnel disconnected • Reconnecting...");
                    updateNotification("🟡 Cinema Server: Reconnecting", "Tunnel disconnected • Auto-reconnecting...", false);
                    notifyCoordinatorOffline();
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException ignored) {}
                    if (isRunning) {
                        Log.i(TAG, "🔄 Auto-reconnecting Cloudflare tunnel now...");
                        startCloudflaredTunnel(cfPath);
                    }
                } else {
                    setStatus("Stopped");
                }
            }
        });
    }

    public String getUniqueDeviceId() {
        SharedPreferences sp = getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
        String id = sp.getString("UNIQUE_DEVICE_ID", null);
        if (id == null) {
            String androidId = null;
            try {
                androidId = android.provider.Settings.Secure.getString(getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
            } catch (Exception ignored) {}
            if (androidId != null && !androidId.isEmpty() && !"9774d56d682e549c".equals(androidId)) {
                id = "dev_" + androidId;
            } else {
                id = "dev_" + java.util.UUID.randomUUID().toString().substring(0, 8);
            }
            sp.edit().putString("UNIQUE_DEVICE_ID", id).apply();
        }
        return id;
    }

    public String getDeviceName() {
        String manufacturer = Build.MANUFACTURER;
        String model = Build.MODEL;
        if (model == null) model = "Android Device";
        if (manufacturer == null) return model;
        if (model.toLowerCase().startsWith(manufacturer.toLowerCase())) {
            return capitalize(model);
        }
        return capitalize(manufacturer) + " " + model;
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return "";
        return Character.toUpperCase(str.charAt(0)) + str.substring(1);
    }

    private void registerTunnelWithCoordinator(String tUrl) {
        if (tUrl == null || !tUrl.equals(tunnelUrl) || !isRunning) {
            Log.d(TAG, "Skipping coordinator sync: tunnel is not active");
            return;
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            if (tUrl == null || !tUrl.equals(tunnelUrl) || !isRunning) return;
            String devId = getUniqueDeviceId();
            String devName = getDeviceName();

            // 1. Sync with Website Coordinator
            try {
                URL url = new URL("https://cinema-dwh.pages.dev/api/tunnel-sync");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                String json = "{\"url\":\"" + tUrl + "\",\"secret\":\"cinema_secret_2026\",\"deviceId\":\"" + devId + "\",\"deviceName\":\"" + devName + "\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes("UTF-8"));
                }
                int code = conn.getResponseCode();
                Log.i(TAG, "✅ Registered tunnel with website (" + devName + " / " + devId + "), HTTP " + code);
            } catch (Exception e) {
                Log.e(TAG, "Website sync failed: " + e.getMessage());
            }

            // 2. Sync with Admin Panel Dashboard
            try {
                URL adminUrl = new URL("https://cinema-admin.pages.dev/api/runner/heartbeat");
                HttpURLConnection conn2 = (HttpURLConnection) adminUrl.openConnection();
                conn2.setRequestMethod("POST");
                conn2.setRequestProperty("Content-Type", "application/json");
                conn2.setDoOutput(true);
                conn2.setConnectTimeout(8000);
                conn2.setReadTimeout(8000);

                String adminJson = "{\"deviceId\":\"" + devId + "\",\"deviceName\":\"" + devName + "\",\"tunnelUrl\":\"" + tUrl + "\",\"status\":\"running\"}";
                try (OutputStream os2 = conn2.getOutputStream()) {
                    os2.write(adminJson.getBytes("UTF-8"));
                }
                int code2 = conn2.getResponseCode();
                Log.i(TAG, "✅ Heartbeat synced with Admin Console (" + devName + "), HTTP " + code2);
            } catch (Exception e) {
                Log.e(TAG, "Admin sync failed: " + e.getMessage());
            }
        });
    }

    private void notifyCoordinatorOffline() {
        Executors.newSingleThreadExecutor().execute(() -> {
            String devId = getUniqueDeviceId();
            String devName = getDeviceName();
            try {
                URL adminUrl = new URL("https://cinema-admin.pages.dev/api/runner/heartbeat");
                HttpURLConnection conn = (HttpURLConnection) adminUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);
                String adminJson = "{\"deviceId\":\"" + devId + "\",\"deviceName\":\"" + devName + "\",\"tunnelUrl\":\"\",\"status\":\"stopped\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(adminJson.getBytes("UTF-8"));
                }
                conn.getResponseCode();
            } catch (Exception ignored) {}
        });
    }

    private void startHeartbeat(String tUrl) {
        if (heartbeat != null) heartbeat.shutdownNow();
        heartbeat = Executors.newSingleThreadScheduledExecutor();
        heartbeat.scheduleAtFixedRate(() -> registerTunnelWithCoordinator(tUrl), 30, 30, TimeUnit.SECONDS);
    }

    private void extractCloudflared(String destPath) {
        File dest = new File(destPath);
        long assetLength = -1;
        try {
            android.content.res.AssetFileDescriptor afd = getAssets().openFd("cloudflared-arm64");
            assetLength = afd.getLength();
            afd.close();
        } catch (Exception ignored) {}

        if (dest.exists() && dest.length() > 20_000_000) {
            dest.setExecutable(true, false);
            return;
        }

        try (InputStream in = getAssets().open("cloudflared-arm64");
             FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[32768];
            int len;
            while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
            dest.setExecutable(true, false);
            Log.i(TAG, "✅ cloudflared extracted to " + destPath);
        } catch (IOException e) {
            Log.e(TAG, "Failed to extract cloudflared: " + e.getMessage());
        }
    }

    private String copyNodeJsProject() throws IOException {
        File destDir = new File(getFilesDir(), NODEJS_PROJECT_DIR);
        File mainFile = new File(destDir, "main.js");
        long lastUpdate = getPackageLastUpdateTime();
        long savedUpdate = getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE).getLong(LAST_UPDATE_KEY, 0);

        if (mainFile.exists() && mainFile.length() > 0 && lastUpdate == savedUpdate) {
            Log.i(TAG, "⚡ nodejs-project already cached & up to date");
            return destDir.getAbsolutePath();
        }

        Log.i(TAG, "Copying nodejs-project assets...");
        deleteRecursive(destDir);
        destDir.mkdirs();
        copyAssetDir(NODEJS_PROJECT_DIR, destDir.getAbsolutePath());
        getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE).edit().putLong(LAST_UPDATE_KEY, lastUpdate).apply();
        Log.i(TAG, "✅ nodejs-project copied to " + destDir.getAbsolutePath());
        return destDir.getAbsolutePath();
    }

    private long getPackageLastUpdateTime() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            return System.currentTimeMillis();
        }
    }

    private void copyAssetDir(String assetPath, String destPath) throws IOException {
        String[] assets = getAssets().list(assetPath);
        if (assets == null || assets.length == 0) {
            // It's a file
            try (InputStream in = getAssets().open(assetPath);
                 FileOutputStream out = new FileOutputStream(destPath)) {
                byte[] buf = new byte[8192];
                int len;
                while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
            }
        } else {
            // It's a directory
            File destDir = new File(destPath);
            destDir.mkdirs();
            for (String asset : assets) {
                copyAssetDir(assetPath + "/" + asset, destPath + "/" + asset);
            }
        }
    }

    private void deleteRecursive(File f) {
        if (f.isDirectory()) {
            for (File child : f.listFiles()) deleteRecursive(child);
        }
        f.delete();
    }

    private void setStatus(String msg) {
        statusMessage = msg;
        boolean isLive = tunnelUrl != null;
        String title = isLive ? "🟢 Cinema Server: Active" : "🎬 Cinema Server";
        String body = isLive ? "Tunnel LIVE • Serving stream requests" : msg;
        updateNotification(title, body, isLive);
    }

    // Called from Node.js main.js when tunnel URL is ready
    public static void onTunnelReady(String url) {
        tunnelUrl = url;
        isRunning = true;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        activeInstance = null;
        isRunning = false;
        tunnelUrl = null;
        statusMessage = "Stopped";
        notifyCoordinatorOffline();
        if (heartbeat != null) {
            heartbeat.shutdownNow();
            heartbeat = null;
        }
        if (cloudflaredProcess != null) {
            try { cloudflaredProcess.destroyForcibly(); } catch (Exception ignored) {}
            cloudflaredProcess = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
            wakeLock = null;
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            try { wifiLock.release(); } catch (Exception ignored) {}
            wifiLock = null;
        }
        try {
            stopForeground(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIF_ID);
        } catch (Exception ignored) {}
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel chan = new NotificationChannel(
                CHANNEL_ID, "Cinema Server", NotificationManager.IMPORTANCE_LOW
            );
            chan.setDescription("Cinema Node.js server status");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(chan);
        }
    }

    private Notification buildNotification(String title, String text, boolean isConnected) {
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, NodeJSService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Server", stopPi);

        return builder.build();
    }

    private void updateNotification(String title, String text, boolean isConnected) {
        mainHandler.post(() -> {
            try {
                Notification n = buildNotification(title, text, isConnected);
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) nm.notify(NOTIF_ID, n);
            } catch (Exception e) {
                Log.w(TAG, "Notification update failed: " + e.getMessage());
            }
        });
    }

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, NodeJSService.class);
        i.setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
    }

    public static void stop(Context ctx) {
        Intent i = new Intent(ctx, NodeJSService.class);
        i.setAction(ACTION_STOP);
        ctx.startService(i);
    }

    public static void reconnect(Context ctx) {
        if (ctx == null) return;
        Executors.newSingleThreadExecutor().execute(() -> {
            Log.i(TAG, "⚡ Manual reconnect triggered");
            tunnelUrl = null;
            statusMessage = "Reconnecting tunnel...";
            if (activeInstance != null && isRunning) {
                if (activeInstance.cloudflaredProcess != null) {
                    try { activeInstance.cloudflaredProcess.destroyForcibly(); } catch (Exception ignored) {}
                    activeInstance.cloudflaredProcess = null;
                }
                File nativeCf = new File(activeInstance.getApplicationInfo().nativeLibraryDir, "libcloudflared.so");
                String cfPath = nativeCf.exists() ? nativeCf.getAbsolutePath() : activeInstance.getFilesDir().getAbsolutePath() + "/cloudflared";
                activeInstance.startCloudflaredTunnel(cfPath);
            } else {
                start(ctx);
            }
        });
    }
}
