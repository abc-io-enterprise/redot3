package com.abcio.gateway;

import android.Manifest;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity implements View.OnClickListener {
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String PREFS_NAME = "ABCIOGatewayPrefs";
    private static final String KEY_SERVICE_RUNNING = "serviceRunning";

    private TextView statusText;
    private TextView deviceInfoText;
    private Button startButton;
    private Button stopButton;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        statusText = findViewById(R.id.statusText);
        deviceInfoText = findViewById(R.id.deviceInfoText);
        startButton = findViewById(R.id.startButton);
        stopButton = findViewById(R.id.stopButton);

        startButton.setOnClickListener(this);
        stopButton.setOnClickListener(this);

        updateDeviceInfo();
        checkPermissions();
        updateStatusFromService();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Handle foldable fold/unfold events
        updateDeviceInfo();
    }

    @Override
    public void onClick(View v) {
        if (v == startButton) {
            startGateway();
        } else if (v == stopButton) {
            stopGateway();
        }
    }

    private void updateDeviceInfo() {
        Display display = getWindowManager().getDefaultDisplay();
        DisplayMetrics metrics = new DisplayMetrics();
        display.getMetrics(metrics);

        int widthDp = (int) (metrics.widthPixels / metrics.density);
        int heightDp = (int) (metrics.heightPixels / metrics.density);
        boolean isFoldable = widthDp >= 600 || heightDp >= 600;

        StringBuilder info = new StringBuilder();
        info.append("Device: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL).append("\n");
        info.append("Android: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
        info.append("Screen: ").append(widthDp).append("x").append(heightDp).append(" dp");
        if (isFoldable) {
            info.append(" [Foldable]");
        }
        deviceInfoText.setText(info.toString());
    }

    private void checkPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();

        // Location permissions
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        // Notifications (Android 13+, API 33)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        // Phone state (optional, for cellular-aware routing)
        if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_PHONE_STATE);
        }

        if (!permissionsNeeded.isEmpty()) {
            requestPermissions(permissionsNeeded.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            if (!allGranted) {
                Toast.makeText(this, "Some permissions denied. Gateway may have limited functionality.", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void startGateway() {
        if (isServiceRunning(GatewayService.class)) {
            Toast.makeText(this, "Gateway already running", Toast.LENGTH_SHORT).show();
            return;
        }

        Intent serviceIntent = new Intent(this, GatewayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }

        prefs.edit().putBoolean(KEY_SERVICE_RUNNING, true).apply();
        updateStatus("Gateway ACTIVE - Port 5050");
        Toast.makeText(this, "Backup Gateway Started", Toast.LENGTH_SHORT).show();
    }

    private void stopGateway() {
        Intent serviceIntent = new Intent(this, GatewayService.class);
        stopService(serviceIntent);
        prefs.edit().putBoolean(KEY_SERVICE_RUNNING, false).apply();
        updateStatus("Gateway STOPPED");
        Toast.makeText(this, "Backup Gateway Stopped", Toast.LENGTH_SHORT).show();
    }

    private void updateStatus(String message) {
        statusText.setText(message);
    }

    private void updateStatusFromService() {
        if (isServiceRunning(GatewayService.class)) {
            updateStatus("Gateway ACTIVE - Port 5050");
        } else {
            updateStatus("ABC-IO Backup Gateway Ready");
        }
    }

    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (manager != null) {
            for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
                if (serviceClass.getName().equals(service.service.getClassName())) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatusFromService();
        updateDeviceInfo();
    }
}
