package com.cinema.runner;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
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
 * CinemaTunnelService — Foreground service that:
 * 1. Extracts the cloudflared ARM64 binary from assets
 * 2. Starts it to create a tunnel to localhost:3001 (Node.js server)
 * 3. Reads the tunnel URL and registers it with cinema-dwh.pages.dev
 * 4. Sends heartbeats every 25 seconds to keep the registration alive
 */
public class CinemaTunnelService extends Service {

    private static final String TAG = "CinemaTunnel";
    private static final String CHANNEL_ID = "cinema_runner_channel";
    private static final int NOTIF_ID = 1001;

    public static final String ACTION_START = "com.cinema.runner.START";
    public static final String ACTION_STOP = "com.cinema.runner.STOP";

    // Static state so MainActivity can read it
    public static volatile String currentTunnelUrl = null;
    public static volatile boolean isRunning = false;
    public static volatile String statusMessage = "Idle";

    private Process cloudflaredProcess = null;
    private ScheduledExecutorService heartbeatScheduler = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIF_ID, buildNotification("Cinema Runner starting…"));
        isRunning = true;
        statusMessage = "Starting…";

        Executors.newSingleThreadExecutor().execute(this::startTunnel);

        return START_STICKY;
    }

    private void startTunnel() {
        try {
            // 1. Extract cloudflared binary from assets
            File cfBin = new File(getFilesDir(), "cloudflared");
            if (!cfBin.exists() || cfBin.length() < 1_000_000) {
                updateNotification("Extracting cloudflared…");
                extractAsset("cloudflared-arm64", cfBin);
            }

            // Make executable
            cfBin.setExecutable(true, false);
            if (!cfBin.canExecute()) {
                // Fallback: copy to /data/data/.../
                Runtime.getRuntime().exec(new String[]{"chmod", "755", cfBin.getAbsolutePath()}).waitFor();
            }

            // 2. Start cloudflared tunnel
            updateNotification("Starting tunnel…");
            statusMessage = "Starting tunnel…";

            String[] cmd = {cfBin.getAbsolutePath(), "tunnel", "--url", "http://localhost:3001"};
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            cloudflaredProcess = pb.start();

            // 3. Read output looking for tunnel URL
            BufferedReader reader = new BufferedReader(new InputStreamReader(cloudflaredProcess.getInputStream()));
            String line;
            String foundUrl = null;
            long startTime = System.currentTimeMillis();
            long timeout = 90_000; // 90 seconds

            while ((line = reader.readLine()) != null) {
                Log.d(TAG, "CF: " + line);

                // Look for tunnel URL
                if (line.contains("trycloudflare.com")) {
                    int idx = line.indexOf("https://");
                    if (idx >= 0) {
                        String raw = line.substring(idx);
                        // trim at first whitespace
                        int end = raw.indexOf(' ');
                        foundUrl = (end > 0 ? raw.substring(0, end) : raw).trim();
                        foundUrl = foundUrl.replaceAll("[|\\s].*", "").trim();
                        break;
                    }
                }

                if (System.currentTimeMillis() - startTime > timeout) {
                    Log.e(TAG, "Timeout waiting for tunnel URL");
                    updateNotification("Tunnel timeout. Retrying…");
                    break;
                }
            }

            if (foundUrl != null && foundUrl.startsWith("https://")) {
                currentTunnelUrl = foundUrl;
                statusMessage = "Live: " + foundUrl;
                updateNotification("🟢 Live: " + foundUrl);

                // Register with coordinator
                registerTunnel(foundUrl);

                // Schedule heartbeat
                startHeartbeat(foundUrl);
            } else {
                statusMessage = "Failed to get tunnel URL";
                updateNotification("❌ Tunnel failed. Tap to retry.");
                isRunning = false;
            }

        } catch (Exception e) {
            Log.e(TAG, "Error starting tunnel", e);
            statusMessage = "Error: " + e.getMessage();
            updateNotification("❌ Error: " + e.getMessage());
            isRunning = false;
        }
    }

    private void extractAsset(String assetName, File dest) throws IOException {
        try (InputStream in = getAssets().open(assetName);
             FileOutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
        }
    }

    public String getUniqueDeviceId() {
        android.content.SharedPreferences sp = getSharedPreferences("CINEMA_TUNNEL_PREFS", Context.MODE_PRIVATE);
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

    private void registerTunnel(String tunnelUrl) {
        try {
            String devId = getUniqueDeviceId();
            String devName = getDeviceName();

            // 1. Sync with Website Coordinator
            String body = String.format(
                "{\"url\":\"%s\",\"secret\":\"cinema_secret_2026\",\"deviceId\":\"%s\",\"deviceName\":\"%s\"}",
                tunnelUrl, devId, devName
            );
            URL url = new URL("https://cinema-dwh.pages.dev/api/tunnel-sync");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes("UTF-8"));
            }
            int code = conn.getResponseCode();
            Log.d(TAG, "Website Register response (" + devName + "): " + code);
            conn.disconnect();

            // 2. Sync with Admin Panel
            String adminBody = String.format(
                "{\"deviceId\":\"%s\",\"deviceName\":\"%s\",\"tunnelUrl\":\"%s\",\"status\":\"running\"}",
                devId, devName, tunnelUrl
            );
            URL adminUrl = new URL("https://cinema-admin.pages.dev/api/runner/heartbeat");
            HttpURLConnection conn2 = (HttpURLConnection) adminUrl.openConnection();
            conn2.setRequestMethod("POST");
            conn2.setRequestProperty("Content-Type", "application/json");
            conn2.setDoOutput(true);
            conn2.setConnectTimeout(10000);
            conn2.setReadTimeout(10000);
            try (OutputStream os2 = conn2.getOutputStream()) {
                os2.write(adminBody.getBytes("UTF-8"));
            }
            int adminCode = conn2.getResponseCode();
            Log.d(TAG, "Admin Register response (" + devName + "): " + adminCode);
            conn2.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Register failed: " + e.getMessage());
        }
    }

    private void startHeartbeat(String tunnelUrl) {
        heartbeatScheduler = Executors.newSingleThreadScheduledExecutor();
        heartbeatScheduler.scheduleAtFixedRate(() -> {
            registerTunnel(tunnelUrl);
            Log.d(TAG, "Heartbeat sent for: " + tunnelUrl);
        }, 25, 25, TimeUnit.SECONDS);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        currentTunnelUrl = null;
        statusMessage = "Stopped";
        if (heartbeatScheduler != null) {
            heartbeatScheduler.shutdownNow();
        }
        if (cloudflaredProcess != null) {
            cloudflaredProcess.destroy();
            cloudflaredProcess = null;
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel chan = new NotificationChannel(
                CHANNEL_ID, "Cinema Runner", NotificationManager.IMPORTANCE_LOW
            );
            chan.setDescription("Cinema phone server tunnel status");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(chan);
        }
    }

    private Notification buildNotification(String text) {
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🎬 Cinema Runner")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void updateNotification(String text) {
        Notification notif = buildNotification(text);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, notif);
    }

    public static void start(Context ctx) {
        Intent intent = new Intent(ctx, CinemaTunnelService.class);
        intent.setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }
    }

    public static void stop(Context ctx) {
        Intent intent = new Intent(ctx, CinemaTunnelService.class);
        intent.setAction(ACTION_STOP);
        ctx.startService(intent);
    }
}
