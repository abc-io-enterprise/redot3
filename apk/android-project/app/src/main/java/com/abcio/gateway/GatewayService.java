package com.abcio.gateway;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

public class GatewayService extends Service {
    private static final String CHANNEL_ID = "ABCIOGatewayChannel";
    private static final int NOTIFICATION_ID = 1;
    private GatewayServer server;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        
        Notification notification = builder
                .setContentTitle("ABC-IO Backup Gateway")
                .setContentText("Cellular backup server running on port 5050")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        try {
            server = new GatewayServer(5050);
            server.start();
        } catch (IOException e) {
            e.printStackTrace();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (server != null) {
            server.stop();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "ABC-IO Gateway",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background gateway service notifications");
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private static class GatewayServer extends NanoHTTPD {
        public GatewayServer(int port) {
            super(port);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String uri = session.getUri();
            String method = session.getMethod().name();

            if ("/health".equals(uri)) {
                return newFixedLengthResponse(Response.Status.OK, "application/json",
                        "{\"status\":\"ok\",\"service\":\"abc-io-backup-gateway\",\"mode\":\"cellular\"}");
            }

            if ("/api/beacon".equals(uri) && "POST".equals(method)) {
                Map<String, String> files = new HashMap<>();
                try {
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData == null || postData.isEmpty()) {
                        postData = "{}";
                    }
                    return newFixedLengthResponse(Response.Status.OK, "application/json",
                            "{\"received\":true,\"backup\":true,\"timestamp\":\"" + System.currentTimeMillis() + "\"}");
                } catch (Exception e) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                            "{\"error\":\"invalid request\"}");
                }
            }

            if ("/".equals(uri) || "/index.html".equals(uri)) {
                String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
                        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                        "<title>ABC-IO Backup Gateway</title>" +
                        "<style>body{background:#0a0a2e;color:#00ff88;font-family:sans-serif;padding:20px;text-align:center}" +
                        ".status{font-size:1.2rem;margin:20px 0}.online{color:#0f0}.btn{background:#00ff88;color:#0a0a2e;padding:15px 30px;border:none;border-radius:8px;font-size:1rem;font-weight:bold;margin:10px}</style>" +
                        "</head><body><h1>ABC-IO Backup Gateway</h1>" +
                        "<div class='status online'>ACTIVE</div>" +
                        "<p>Cellular backup server running on port 5050</p>" +
                        "<p>Primary: 162.254.32.142<br>AI1: 159.203.110.44<br>AI2: 159.203.44.3</p>" +
                        "<button class='btn' onclick='sendBeacon()'>Send Emergency Beacon</button>" +
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
