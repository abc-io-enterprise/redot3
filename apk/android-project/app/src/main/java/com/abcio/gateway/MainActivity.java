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
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

public class MainActivity extends Activity implements View.OnClickListener {
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String PREFS_NAME = "ABCIOGatewayPrefs";
    private static final String KEY_SERVICE_RUNNING = "serviceRunning";
    private static final String KEY_BIOMETRIC_PASSED = "biometricPassed";

    private TextView statusText;
    private TextView deviceInfoText;
    private TextView authStatusText;
    private Button startButton;
    private Button stopButton;
    private LinearLayout controlPanel;
    private LinearLayout authPanel;
    private SharedPreferences prefs;
    private boolean biometricAuthenticated = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        statusText = findViewById(R.id.statusText);
        deviceInfoText = findViewById(R.id.deviceInfoText);
        authStatusText = findViewById(R.id.authStatusText);
        startButton = findViewById(R.id.startButton);
        stopButton = findViewById(R.id.stopButton);
        controlPanel = findViewById(R.id.controlPanel);
        authPanel = findViewById(R.id.authPanel);

        startButton.setOnClickListener(this);
        stopButton.setOnClickListener(this);

        updateDeviceInfo();
        checkPermissions();

        // Always require biometric on launch
        showBiometricLock();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        updateDeviceInfo();
    }

    @Override
    public void onClick(View v) {
        if (!biometricAuthenticated) {
            Toast.makeText(this, "Owner biometric required", Toast.LENGTH_SHORT).show();
            showBiometricLock();
            return;
        }
        if (v == startButton) {
            startGateway();
        } else if (v == stopButton) {
            stopGateway();
        }
    }

    private void showBiometricLock() {
        controlPanel.setVisibility(View.GONE);
        authPanel.setVisibility(View.VISIBLE);
        authStatusText.setText("Waiting for owner biometric...");

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt prompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                authStatusText.setText("Authentication error: " + errString);
                Toast.makeText(MainActivity.this, "Owner access denied", Toast.LENGTH_LONG).show();
            }

            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                biometricAuthenticated = true;
                prefs.edit().putBoolean(KEY_BIOMETRIC_PASSED, true).apply();
                authPanel.setVisibility(View.GONE);
                controlPanel.setVisibility(View.VISIBLE);
                updateStatusFromService();
                Toast.makeText(MainActivity.this, "Owner authenticated", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                authStatusText.setText("Biometric not recognized. Try again.");
            }
        });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("ABC-IO Owner Authentication")
                .setSubtitle("Biometric login required")
                .setDescription("This device is the autonomous cellular failsafe for redot1 / ABC-IO. Only the owner may access it.")
                .setNegativeButtonText("Cancel")
                .setConfirmationRequired(false)
                .build();

        prompt.authenticate(promptInfo);
    }

    private void updateDeviceInfo() {
        Display display = getWindowManager().getDefaultDisplay();
        DisplayMetrics metrics = new DisplayMetrics();
        display.getMetrics(metrics);

        int widthDp = (int) (metrics.widthPixels / metrics.density);
        int heightDp = (int) (metrics.heightPixels / metrics.density);
        boolean isFoldable = widthDp >= 600 || heightDp >= 600;

        StringBuilder info = new StringBuilder();
        info.append("Owner: Christopher Porreca / redot1\n");
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

        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

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
        updateDeviceInfo();
        if (biometricAuthenticated) {
            updateStatusFromService();
        }
    }
}
