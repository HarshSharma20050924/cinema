package com.cinema.runner;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register our native Cinema plugin BEFORE super.onCreate
        registerPlugin(CinemaPlugin.class);

        super.onCreate(savedInstanceState);

        // 1. Keep screen awake while app is open
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // 2. Request Notification Permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ArrayList<String> perms = new ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                perms.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            if (!perms.isEmpty()) {
                ActivityCompat.requestPermissions(this,
                    perms.toArray(new String[0]), PERMISSION_REQ_CODE);
            }
        }
    }
}
