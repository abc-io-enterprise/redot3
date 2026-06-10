package com.abcio.gateway;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity implements View.OnClickListener {
    private static final int PERMISSION_REQUEST_CODE = 100;
    private TextView statusText;
    private Button startButton;
    private Button stopButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        statusText = findViewById(R.id.statusText);
        startButton = findViewById(R.id.startButton);
        stopButton = findViewById(R.id.stopButton);

        startButton.setOnClickListener(this);
        stopButton.setOnClickListener(this);

        checkPermissions();
        updateStatus("ABC-IO Backup Gateway Ready");
    }

    @Override
    public void onClick(View v) {
        if (v == startButton) {
            startGateway();
        } else if (v == stopButton) {
            stopGateway();
        }
    }

    private void checkPermissions() {
        String[] permissions = {
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };

        for (String permission : permissions) {
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(permissions, PERMISSION_REQUEST_CODE);
                break;
            }
        }
    }

    private void startGateway() {
        Intent serviceIntent = new Intent(this, GatewayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        updateStatus("Gateway ACTIVE - Port 5050");
        Toast.makeText(this, "Backup Gateway Started", Toast.LENGTH_SHORT).show();
    }

    private void stopGateway() {
        Intent serviceIntent = new Intent(this, GatewayService.class);
        stopService(serviceIntent);
        updateStatus("Gateway STOPPED");
        Toast.makeText(this, "Backup Gateway Stopped", Toast.LENGTH_SHORT).show();
    }

    private void updateStatus(String message) {
        statusText.setText(message);
    }
}
