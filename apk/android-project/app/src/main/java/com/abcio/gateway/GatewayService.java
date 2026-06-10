package com.abcio.gateway;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

public class GatewayService extends Service {
    private static final String CHANNEL_ID = "ABCIOGatewayChannel";
    private static final String CHANNEL_NAME = "ABC-IO Gateway";
    private static final int NOTIFICATION_ID = 1;
    private static final String PREFS_NAME = "ABCIOGatewayPrefs";

    private GatewayServer server;
    private PowerManager.WakeLock wakeLock;
    private SharedPreferences prefs;
    private int requestCount = 0;
    private int beaconCount = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Build modern notification with actions
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        // Pending intent to open app when notification tapped
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Stop action on notification
        Intent stopIntent = new Intent(this, GatewayService.class);
        stopIntent.setAction("STOP_GATEWAY");
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this, 1, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Action stopAction = new Notification.Action.Builder(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop Gateway",
                stopPendingIntent
        ).build();

        Notification notification = builder
                .setContentTitle("ABC-IO Backup Gateway")
                .setContentText("Cellular backup server on port 5050 - Privacy-first mode")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(stopAction)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        if (intent != null && "STOP_GATEWAY".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            if (server == null) {
                server = new GatewayServer(5050, this);
                server.start();
            }
        } catch (IOException e) {
            e.printStackTrace();
            stopSelf();
            return START_NOT_STICKY;
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (server != null) {
            server.stop();
            server = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        // Clear in-memory stats on shutdown (privacy)
        requestCount = 0;
        beaconCount = 0;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background gateway service for ABC-IO cellular backup");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableLights(false);
            channel.enableVibration(false);
            channel.setShowBadge(false);

            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ABCIO::GatewayWakeLock"
            );
            wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hour max
        }
    }

    private String getNetworkType() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return "unknown";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network activeNetwork = cm.getActiveNetwork();
            if (activeNetwork == null) return "none";
            NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
            if (caps == null) return "none";

            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) return "cellular";
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return "wifi";
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) return "ethernet";
            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return "vpn";
            return "other";
        } else {
            NetworkInfo info = cm.getActiveNetworkInfo();
            if (info == null || !info.isConnected()) return "none";
            int type = info.getType();
            if (type == ConnectivityManager.TYPE_MOBILE) return "cellular";
            if (type == ConnectivityManager.TYPE_WIFI) return "wifi";
            if (type == ConnectivityManager.TYPE_ETHERNET) return "ethernet";
            return "other";
        }
    }

    private static class GatewayServer extends NanoHTTPD {
        private final GatewayService service;

        public GatewayServer(int port, GatewayService service) {
            super(port);
            this.service = service;
        }

        @Override
        public Response serve(IHTTPSession session) {
            String uri = session.getUri();
            String method = session.getMethod().name();
            service.requestCount++;

            if ("/health".equals(uri)) {
                return newFixedLengthResponse(Response.Status.OK, "application/json",
                        "{\"status\":\"ok\",\"service\":\"abc-io-backup-gateway\",\"mode\":\"cellular\",\"network\":\"" + service.getNetworkType() + "\"}");
            }

            if ("/api/status".equals(uri)) {
                String json = "{\"status\":\"active\",\"port\":5050,\"requests\":" + service.requestCount
                        + ",\"beacons\":" + service.beaconCount
                        + ",\"network\":\"" + service.getNetworkType() + "\"}";
                return newFixedLengthResponse(Response.Status.OK, "application/json", json);
            }

            if ("/api/beacon".equals(uri) && "POST".equals(method)) {
                service.beaconCount++;
                Map<String, String> files = new HashMap<>();
                try {
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData == null || postData.isEmpty()) {
                        postData = "{}";
                    }
                    return newFixedLengthResponse(Response.Status.OK, "application/json",
                            "{\"received\":true,\"backup\":true,\"timestamp\":\"" + System.currentTimeMillis() + "\",\"privacy_note\":\"Beacon anonymized - no PII retained\"}");
                } catch (Exception e) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                            "{\"error\":\"invalid request\"}");
                }
            }

            if ("/".equals(uri) || "/index.html".equals(uri)) {
                String html = "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>" +
                        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                        "<title>ABC-IO Backup Gateway</title>" +
                        "<style>" +
                        "body{background:#0a0a2e;color:#00ff88;font-family:system-ui,-apple-system,sans-serif;padding:20px;text-align:center;margin:0}" +
                        ".card{background:#111144;border-radius:16px;padding:24px;margin:20px auto;max-width:600px;box-shadow:0 4px 20px rgba(0,255,136,0.1)}" +
                        "h1{font-size:1.5rem;margin-bottom:8px}" +
                        ".status{font-size:1.1rem;margin:16px 0;font-weight:600}" +
                        ".online{color:#00ff88}" +
                        ".btn{background:#00ff88;color:#0a0a2e;padding:14px 28px;border:none;border-radius:10px;font-size:1rem;font-weight:700;margin:8px;cursor:pointer}" +
                        ".privacy{font-size:0.8rem;color:#667eea;margin-top:20px}" +
                        ".network-badge{display:inline-block;background:#1a1a5e;padding:6px 14px;border-radius:20px;font-size:0.85rem;margin:4px}" +
                        "</style></head><body>" +
                        "<div class='card'><h1>ABC-IO Backup Gateway</h1>" +
                        "<div class='status online'>● ACTIVE (Privacy Mode)</div>" +
                        "<div class='network-badge'>Network: " + service.getNetworkType() + "</div>" +
                        "<div class='network-badge'>Requests: " + service.requestCount + "</div>" +
                        "<p>Cellular backup server running on port 5050</p>" +
                        "<p>Primary: 162.254.32.142<br>AI1: 192.227.212.235<br>AI2: 192.227.212.237</p>" +
                        "<button class='btn' onclick='sendBeacon()'>Send Emergency Beacon</button>" +
                        "<div class='privacy'>No personal data is stored or transmitted. All beacons are anonymized.</div>" +
                        "</div>" +
                        "<script>function sendBeacon(){navigator.geolocation.getCurrentPosition(pos=>{" +
                        "fetch('/api/beacon',{method:'POST',headers:{'Content-Type':'application/json'}," +
                        "body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,ts:Date.now()})});" +
                        "alert('Beacon sent!');});}</script></body></html>";
                return newFixedLengthResponse(Response.Status.OK, "text/html", html);
            }

            return newFixedLengthResponse(Response.Status.NOT_FOUND, "application/json",
                    "{\"error\":\"not found\"}");
        }
    }
}
