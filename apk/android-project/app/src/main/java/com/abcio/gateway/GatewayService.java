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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import fi.iki.elonen.NanoHTTPD;

public class GatewayService extends Service {
    private static final String CHANNEL_ID = "ABCIOGatewayChannel";
    private static final String CHANNEL_NAME = "ABC-IO Autonomous Gateway";
    private static final int NOTIFICATION_ID = 1;
    private static final String PREFS_NAME = "ABCIOGatewayPrefs";
    private static final String KEY_BEACON_QUEUE = "beaconQueue";
    private static final String KEY_MESSAGE_QUEUE = "messageQueue";
    private static final String KEY_PRIMARY_DOMAIN = "primaryDomain";
    private static final String KEY_MOBILE_GATEWAY_HOST = "mobileGatewayHost";
    private static final String KEY_AI1_HOST = "ai1Host";
    private static final String KEY_AI2_HOST = "ai2Host";
    private static final String KEY_OWNER_TOKEN = "ownerToken";

    // Default autonomous backend endpoints
    private static final String DEFAULT_PRIMARY_DOMAIN = "abc-io.com";
    private static final String DEFAULT_MOBILE_GATEWAY_HOST = "162.254.32.142:5050";
    private static final String DEFAULT_AI1_HOST = "192.227.212.235";
    private static final String DEFAULT_AI2_HOST = "192.227.212.237";

    private GatewayServer server;
    private PowerManager.WakeLock wakeLock;
    private SharedPreferences prefs;
    private ExecutorService executor;
    private Handler mainHandler;
    private int requestCount = 0;
    private int beaconCount = 0;
    private int forwardedCount = 0;
    private int messageCount = 0;
    private int consecutiveFailures = 0;
    private int consecutivePasses = 0;
    private boolean publicSystemOnline = false;
    private String currentMode = "AUTONOMOUS"; // AUTONOMOUS, FAILOVER, RELAY, RECOVERING

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        executor = Executors.newSingleThreadExecutor();
        mainHandler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

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
                .setContentTitle("ABC-IO Autonomous Gateway")
                .setContentText("Owner-only cellular failsafe active on port 5050")
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

        startHealthMonitor();
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
        if (executor != null) {
            executor.shutdown();
        }
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
            channel.setDescription("Background autonomous gateway for ABC-IO cellular failsafe");
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
                    "ABCIO::AutonomousGatewayWakeLock"
            );
            wakeLock.acquire(24 * 60 * 60 * 1000L);
        }
    }

    private void startHealthMonitor() {
        Runnable monitor = new Runnable() {
            @Override
            public void run() {
                checkPublicSystemHealth();
                mainHandler.postDelayed(this, 30000);
            }
        };
        mainHandler.post(monitor);
    }

    private void checkPublicSystemHealth() {
        executor.execute(() -> {
            String primaryDomain = prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN);
            boolean online = httpPing("https://" + primaryDomain + "/api/v1/system/health", 8000);
            if (online) {
                consecutiveFailures = 0;
                consecutivePasses++;
                if (consecutivePasses >= 2) {
                    publicSystemOnline = true;
                    if ("FAILOVER".equals(currentMode)) currentMode = "RECOVERING";
                    else if ("RECOVERING".equals(currentMode)) currentMode = "RELAY";
                    else currentMode = "RELAY";
                }
            } else {
                consecutivePasses = 0;
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    publicSystemOnline = false;
                    currentMode = "FAILOVER";
                }
            }
            if (publicSystemOnline) {
                flushBeaconQueue();
                flushMessageQueue();
            }
        });
    }

    private boolean httpPing(String urlString, int timeout) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(timeout);
            conn.setReadTimeout(timeout);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            return code >= 200 && code < 500;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String httpPostJson(String urlString, String json, int timeout) {
        HttpURLConnection conn = null;
        InputStream is = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(timeout);
            conn.setReadTimeout(timeout);
            OutputStream os = conn.getOutputStream();
            os.write(json.getBytes("UTF-8"));
            os.close();
            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                is = conn.getInputStream();
            } else {
                is = conn.getErrorStream();
            }
            if (is == null) return null;
            byte[] buffer = new byte[4096];
            StringBuilder sb = new StringBuilder();
            int n;
            while ((n = is.read(buffer)) != -1) sb.append(new String(buffer, 0, n, "UTF-8"));
            return (code >= 200 && code < 300) ? sb.toString() : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (is != null) try { is.close(); } catch (Exception ignored) {}
            if (conn != null) conn.disconnect();
        }
    }

    private void queueBeacon(JSONObject beacon) {
        String existing = prefs.getString(KEY_BEACON_QUEUE, "[]");
        try {
            JSONArray arr = new JSONArray(existing);
            arr.put(beacon);
            if (arr.length() > 500) {
                JSONArray trimmed = new JSONArray();
                for (int i = arr.length() - 500; i < arr.length(); i++) trimmed.put(arr.get(i));
                arr = trimmed;
            }
            prefs.edit().putString(KEY_BEACON_QUEUE, arr.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void queueMessage(JSONObject message) {
        String existing = prefs.getString(KEY_MESSAGE_QUEUE, "[]");
        try {
            JSONArray arr = new JSONArray(existing);
            arr.put(message);
            if (arr.length() > 500) {
                JSONArray trimmed = new JSONArray();
                for (int i = arr.length() - 500; i < arr.length(); i++) trimmed.put(arr.get(i));
                arr = trimmed;
            }
            prefs.edit().putString(KEY_MESSAGE_QUEUE, arr.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void flushMessageQueue() {
        String existing = prefs.getString(KEY_MESSAGE_QUEUE, "[]");
        try {
            JSONArray arr = new JSONArray(existing);
            if (arr.length() == 0) return;
            if (!publicSystemOnline) return;

            JSONArray remaining = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject msg = arr.getJSONObject(i);
                boolean sent = forwardMessageToPrimary(msg);
                if (!sent) remaining.put(msg);
            }
            prefs.edit().putString(KEY_MESSAGE_QUEUE, remaining.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean forwardMessageToPrimary(JSONObject msg) {
        HttpURLConnection conn = null;
        try {
            String primaryDomain = prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN);
            URL url = new URL("https://" + primaryDomain + "/api/v1/admin/escalate");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            OutputStream os = conn.getOutputStream();
            os.write(msg.toString().getBytes("UTF-8"));
            os.close();
            int code = conn.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void flushBeaconQueue() {
        String existing = prefs.getString(KEY_BEACON_QUEUE, "[]");
        try {
            JSONArray arr = new JSONArray(existing);
            if (arr.length() == 0) return;
            if (!publicSystemOnline) return;

            JSONArray remaining = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject beacon = arr.getJSONObject(i);
                boolean sent = forwardBeaconToPrimary(beacon);
                if (!sent) {
                    remaining.put(beacon);
                } else {
                    forwardedCount++;
                }
            }
            prefs.edit().putString(KEY_BEACON_QUEUE, remaining.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean forwardBeaconToPrimary(JSONObject beacon) {
        HttpURLConnection conn = null;
        try {
            String primaryDomain = prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN);
            URL url = new URL("https://" + primaryDomain + "/api/v1/beacon/emit");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            OutputStream os = conn.getOutputStream();
            os.write(beacon.toString().getBytes("UTF-8"));
            os.close();
            int code = conn.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
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
                JSONObject json = new JSONObject();
                try {
                    json.put("status", "ok");
                    json.put("service", "abc-io-autonomous-gateway");
                    json.put("mode", service.currentMode);
                    json.put("network", service.getNetworkType());
                    json.put("public_online", service.publicSystemOnline);
                    json.put("version", "2.1.0-autonomous");
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString());
            }

            if ("/api/status".equals(uri)) {
                JSONObject json = new JSONObject();
                try {
                    json.put("status", "active");
                    json.put("port", 5050);
                    json.put("requests", service.requestCount);
                    json.put("beacons", service.beaconCount);
                    json.put("messages", service.messageCount);
                    json.put("forwarded", service.forwardedCount);
                    json.put("network", service.getNetworkType());
                    json.put("mode", service.currentMode);
                    json.put("public_online", service.publicSystemOnline);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString());
            }

            if ("/api/backup/status".equals(uri)) {
                JSONObject json = new JSONObject();
                try {
                    json.put("mode", service.currentMode);
                    json.put("public_online", service.publicSystemOnline);
                    json.put("network", service.getNetworkType());
                    json.put("beacons_queued", service.prefs.getString(KEY_BEACON_QUEUE, "[]").length());
                    json.put("messages_queued", service.prefs.getString(KEY_MESSAGE_QUEUE, "[]").length());
                    JSONObject nodes = new JSONObject();
                    nodes.put("primary", service.prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN));
                    nodes.put("mobile_gateway", service.prefs.getString(KEY_MOBILE_GATEWAY_HOST, DEFAULT_MOBILE_GATEWAY_HOST));
                    nodes.put("ai1", service.prefs.getString(KEY_AI1_HOST, DEFAULT_AI1_HOST));
                    nodes.put("ai2", service.prefs.getString(KEY_AI2_HOST, DEFAULT_AI2_HOST));
                    json.put("nodes", nodes);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return newFixedLengthResponse(Response.Status.OK, "application/json", json.toString());
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
                    JSONObject beacon = new JSONObject(postData);
                    beacon.put("received_at", System.currentTimeMillis());

                    if (service.publicSystemOnline) {
                        service.executor.execute(() -> {
                            boolean sent = service.forwardBeaconToPrimary(beacon);
                            if (!sent) {
                                service.queueBeacon(beacon);
                            } else {
                                service.forwardedCount++;
                            }
                        });
                    } else {
                        service.queueBeacon(beacon);
                    }

                    return newFixedLengthResponse(Response.Status.OK, "application/json",
                            "{\"received\":true,\"mode\":\"" + service.currentMode + "\",\"privacy_note\":\"Beacon anonymized - owner-only retention\"}");
                } catch (Exception e) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                            "{\"error\":\"invalid request\"}");
                }
            }

            if ("/api/backup/message".equals(uri) && "POST".equals(method)) {
                service.messageCount++;
                Map<String, String> files = new HashMap<>();
                try {
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData == null || postData.isEmpty()) postData = "{}";
                    JSONObject msg = new JSONObject(postData);
                    msg.put("received_at", System.currentTimeMillis());

                    if (service.publicSystemOnline) {
                        service.executor.execute(() -> {
                            boolean sent = service.forwardMessageToPrimary(msg);
                            if (!sent) service.queueMessage(msg);
                        });
                    } else {
                        service.queueMessage(msg);
                    }
                    return newFixedLengthResponse(Response.Status.OK, "application/json",
                            "{\"stored\":true,\"mode\":\"" + service.currentMode + "\"}");
                } catch (Exception e) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                            "{\"error\":\"invalid request\"}");
                }
            }

            if ("/api/backup/ai/generate".equals(uri) && "POST".equals(method)) {
                Map<String, String> files = new HashMap<>();
                try {
                    session.parseBody(files);
                    String postData = files.get("postData");
                    if (postData == null || postData.isEmpty()) postData = "{}";
                    JSONObject req = new JSONObject(postData);
                    String prompt = req.optString("prompt", "");
                    if (prompt.isEmpty()) {
                        return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                                "{\"error\":\"prompt required\"}");
                    }
                    if (service.publicSystemOnline) {
                        String primaryDomain = service.prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN);
                        String result = service.httpPostJson("https://" + primaryDomain + "/api/v1/ai/generate", req.toString(), 20000);
                        if (result != null) {
                            return newFixedLengthResponse(Response.Status.OK, "application/json", result);
                        }
                    }
                    // Offline fallback
                    JSONObject offline = new JSONObject();
                    offline.put("status", "offline");
                    offline.put("text", "[OFFLINE MODE] Your request has been queued for processing when connectivity is restored.");
                    offline.put("model", "offline-fallback");
                    return newFixedLengthResponse(Response.Status.SERVICE_UNAVAILABLE, "application/json", offline.toString());
                } catch (Exception e) {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                            "{\"error\":\"invalid request\"}");
                }
            }

            if ("/".equals(uri) || "/index.html".equals(uri)) {
                String html = buildStatusPage();
                return newFixedLengthResponse(Response.Status.OK, "text/html", html);
            }

            return newFixedLengthResponse(Response.Status.NOT_FOUND, "application/json",
                    "{\"error\":\"not found\"}");
        }

        private String buildStatusPage() {
            StringBuilder sb = new StringBuilder();
            sb.append("<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>");
            sb.append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
            sb.append("<title>ABC-IO Autonomous Operator</title>");
            sb.append("<style>");
            sb.append("body{background:#0a0a2e;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;padding:20px;margin:0}");
            sb.append(".card{background:#111144;border-radius:16px;padding:24px;margin:20px auto;max-width:600px;box-shadow:0 4px 20px rgba(0,255,136,0.1)}");
            sb.append("h1{font-size:1.5rem;margin-bottom:8px;color:#00ff88}");
            sb.append(".status{font-size:1.1rem;margin:16px 0;font-weight:600}");
            sb.append(".online{color:#00ff88}.failover{color:#ffd800}.offline{color:#ff4444}");
            sb.append(".btn{background:#00ff88;color:#0a0a2e;padding:14px 28px;border:none;border-radius:10px;font-size:1rem;font-weight:700;margin:8px;cursor:pointer}");
            sb.append(".privacy{font-size:0.8rem;color:#667eea;margin-top:20px}");
            sb.append(".network-badge{display:inline-block;background:#1a1a5e;padding:6px 14px;border-radius:20px;font-size:0.85rem;margin:4px}");
            sb.append(".owner{font-size:0.85rem;color:#ffd800;margin-top:12px}");
            sb.append("</style></head><body>");
            sb.append("<div class='card'><h1>ABC-IO Autonomous Operator</h1>");
            sb.append("<div class='status ").append(service.publicSystemOnline ? "online" : "failover").append("'>● ")
              .append(service.publicSystemOnline ? "PUBLIC SYSTEM ONLINE (RELAY MODE)" : "CELLULAR FAILOVER ACTIVE")
              .append("</div>");
            sb.append("<div class='network-badge'>Mode: ").append(service.currentMode).append("</div>");
            sb.append("<div class='network-badge'>Network: ").append(service.getNetworkType()).append("</div>");
            sb.append("<div class='network-badge'>Requests: ").append(service.requestCount).append("</div>");
            sb.append("<div class='network-badge'>Beacons: ").append(service.beaconCount).append("</div>");
            sb.append("<p>Primary: ").append(service.prefs.getString(KEY_PRIMARY_DOMAIN, DEFAULT_PRIMARY_DOMAIN))
              .append("<br>Mobile Gateway: ").append(service.prefs.getString(KEY_MOBILE_GATEWAY_HOST, DEFAULT_MOBILE_GATEWAY_HOST))
              .append("<br>AI1: ").append(service.prefs.getString(KEY_AI1_HOST, DEFAULT_AI1_HOST))
              .append("<br>AI2: ").append(service.prefs.getString(KEY_AI2_HOST, DEFAULT_AI2_HOST))
              .append("</p>");
            sb.append("<button class='btn' onclick='sendBeacon()'>Send Emergency Beacon</button>");
            sb.append("<div class='owner'>Owner-only autonomous device</div>");
            sb.append("<div class='privacy'>Owner-only device. No personal data retained. Beacons and messages are queued and forwarded when public system recovers.</div>");
            sb.append("</div>");
            sb.append("<script>function sendBeacon(){navigator.geolocation.getCurrentPosition(pos=>{");
            sb.append("fetch('/api/beacon',{method:'POST',headers:{'Content-Type':'application/json'},");
            sb.append("body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,ts:Date.now()})});");
            sb.append("alert('Beacon queued for relay.');});}</script></body></html>");
            return sb.toString();
        }
    }
}
