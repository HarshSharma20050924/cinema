package com.cinema.runner;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import android.util.Log;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * CinemaPlugin — bridge between the WebView (index.html) and the native Android service.
 * Called from JS:  Capacitor.Plugins.Cinema.start()
 *                  Capacitor.Plugins.Cinema.stop()
 *                  Capacitor.Plugins.Cinema.getStatus()
 *                  Capacitor.Plugins.Cinema.installApk({ base64: "..." })
 */
@CapacitorPlugin(name = "Cinema")
public class CinemaPlugin extends Plugin {

    private static final String TAG = "CinemaPlugin";

    @PluginMethod
    public void start(PluginCall call) {
        Context ctx = getContext();
        try {
            NodeJSService.start(ctx);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Node.js server starting...");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        NodeJSService.stop(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", NodeJSService.isRunning);
        ret.put("tunnelUrl", NodeJSService.tunnelUrl != null ? NodeJSService.tunnelUrl : "");
        ret.put("status", NodeJSService.statusMessage);
        call.resolve(ret);
    }

    @PluginMethod
    public void reconnect(PluginCall call) {
        NodeJSService.reconnect(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Reconnecting Cloudflare tunnel...");
        call.resolve(ret);
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        Context ctx = getContext();
        String base64Data = call.getString("base64");
        String filePath = call.getString("filePath");

        try {
            File apkFile;
            if (base64Data != null && !base64Data.isEmpty()) {
                File dir = ctx.getExternalCacheDir() != null ? ctx.getExternalCacheDir() : ctx.getCacheDir();
                apkFile = new File(dir, "Cinema-Runner-Update.apk");
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                try (FileOutputStream fos = new FileOutputStream(apkFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
            } else if (filePath != null && !filePath.isEmpty()) {
                apkFile = new File(filePath);
            } else {
                call.reject("Either base64 or filePath must be provided");
                return;
            }

            if (!apkFile.exists()) {
                call.reject("APK file does not exist");
                return;
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apkFile);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Installer opened");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Install APK error: " + e.getMessage(), e);
            call.reject("Failed to trigger installer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        Context ctx = getContext();
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL(downloadUrl);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                conn.connect();

                int status = conn.getResponseCode();
                // Manually follow redirect if needed
                int redirectCount = 0;
                while ((status == java.net.HttpURLConnection.HTTP_MOVED_TEMP
                    || status == java.net.HttpURLConnection.HTTP_MOVED_PERM
                    || status == 307 || status == 308) && redirectCount < 5) {
                    String newUrl = conn.getHeaderField("Location");
                    if (newUrl == null) break;
                    conn.disconnect();
                    url = new java.net.URL(newUrl);
                    conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(30000);
                    conn.connect();
                    status = conn.getResponseCode();
                    redirectCount++;
                }

                if (status >= 400) {
                    throw new Exception("HTTP server error " + status);
                }

                int contentLength = conn.getContentLength();
                File dir = ctx.getExternalCacheDir() != null ? ctx.getExternalCacheDir() : ctx.getCacheDir();
                File apkFile = new File(dir, "Cinema-Runner-Update.apk");

                try (java.io.InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    int totalRead = 0;
                    long lastNotify = 0;

                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                        totalRead += bytesRead;
                        long now = System.currentTimeMillis();
                        if (contentLength > 0 && (now - lastNotify > 200)) {
                            lastNotify = now;
                            int pct = (int) ((totalRead * 100L) / contentLength);
                            JSObject progressObj = new JSObject();
                            progressObj.put("progress", pct);
                            progressObj.put("bytes", totalRead);
                            progressObj.put("total", contentLength);
                            notifyListeners("updateProgress", progressObj);
                        }
                    }
                    out.flush();
                }

                // Final 100% progress event
                JSObject finalObj = new JSObject();
                finalObj.put("progress", 100);
                notifyListeners("updateProgress", finalObj);

                // Launch package installer
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apkFile);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    apkUri = Uri.fromFile(apkFile);
                }

                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Installer opened");
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Native download error: " + e.getMessage(), e);
                call.reject("Download failed: " + e.getMessage());
            }
        }).start();
    }
}
