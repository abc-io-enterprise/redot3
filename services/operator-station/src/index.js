const express = require('express');
const http = require('http');
const net = require('net');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const { X509Certificate } = require('crypto');
const app = express();
const port = Number(process.env.PORT || 8080);
const execAsync = promisify(exec);

const services = [
  { key: 'gateway', name: 'API Gateway', url: 'http://gateway:4000/health', type: 'http' },
  { key: 'owner-dashboard', name: 'Owner Dashboard', url: 'http://owner-dashboard:8500/health', type: 'http' },
  { key: 'mobile-gateway', name: 'Mobile Gateway', url: 'http://mobile-gateway:5050/health', type: 'http' },
  { key: 'public-portal', name: 'Public Portal', url: 'http://public-portal:8090/health', type: 'http' },
  { key: 'operator-station', name: 'Operator Station', url: 'http://localhost:8080/health', type: 'http' },
  { key: 'beacon-pwa', name: 'Beacon PWA', url: 'http://beacon-pwa:3000/health', type: 'http' },
  { key: 'beacon', name: 'Beacon', url: 'http://beacon:3000/health', type: 'http' },
  { key: 'kimi', name: 'Kimi AI', url: 'http://kimi:5000/health', type: 'http' },
  { key: 'ai-isp', name: 'AI-ISP', url: 'http://ai-isp:7000/health', type: 'http' },
  { key: 'worker', name: 'Worker', url: 'http://worker:5000/health', type: 'http', unknownOnFail: true },
  { key: 'postgres', name: 'PostgreSQL', host: 'postgres', port: 5432, type: 'tcp' },
  { key: 'redis', name: 'Redis', host: 'redis', port: 6379, type: 'tcp' },
  { key: 'nginx', name: 'NGINX', url: 'http://nginx/health', type: 'http' },
  { key: 'prometheus', name: 'Prometheus', url: 'http://prometheus:9090/-/healthy', type: 'http' },
  { key: 'grafana', name: 'Grafana', url: 'http://grafana:3000/api/health', type: 'http' },
  { key: 'tracer', name: 'Tracer (Jaeger)', url: 'http://tracer:16686/', type: 'http' },
  { key: 'headscale', name: 'Headscale', host: 'headscale', port: 8080, type: 'tcp' },
];

function httpCheck(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode, body: data });
        } else {
          resolve({ ok: false, status: res.statusCode, body: data });
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

function tcpCheck(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    socket.once('error', (err) => {
      socket.destroy();
      resolve({ ok: false, error: err.message });
    });
    socket.connect(port, host);
  });
}

async function checkSelfHealing() {
  try {
    const data = await fs.readFile('/tmp/abc-io-health.state', 'utf8');
    const content = data.toLowerCase();
    if (content.includes('healing') || content.includes('restart')) {
      return { active: true, state: data.trim() };
    }
    return { active: false, state: data.trim() };
  } catch (err) {
    return { active: false, state: null };
  }
}

async function getSslExpiry() {
  const certPath = '/etc/letsencrypt/live/abc-io.com/fullchain.pem';
  try {
    const pem = await fs.readFile(certPath, 'utf8');
    const cert = new X509Certificate(pem);
    const expiry = new Date(cert.validTo);
    const now = new Date();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    return {
      available: true,
      domain: 'abc-io.com',
      expiry: expiry.toISOString(),
      daysRemaining,
      warning: daysRemaining < 30,
    };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

async function getSystemMetrics() {
  const metrics = {
    cpu: { loadAverage: null },
    memory: { total: null, used: null, free: null, percentUsed: null },
    disk: { total: null, used: null, free: null, percentUsed: null },
  };

  try {
    const { stdout: loadavg } = await execAsync('cat /proc/loadavg');
    const loadParts = loadavg.trim().split(' ');
    metrics.cpu.loadAverage = {
      '1m': parseFloat(loadParts[0]),
      '5m': parseFloat(loadParts[1]),
      '15m': parseFloat(loadParts[2]),
    };
  } catch (e) {
    metrics.cpu.error = e.message;
  }

  try {
    const { stdout: meminfo } = await execAsync('cat /proc/meminfo');
    const lines = meminfo.split('\n');
    const memTotalLine = lines.find((l) => l.startsWith('MemTotal:'));
    const memAvailableLine = lines.find((l) => l.startsWith('MemAvailable:'));
    const memFreeLine = lines.find((l) => l.startsWith('MemFree:'));

    const memTotalKB = memTotalLine ? parseInt(memTotalLine.replace(/\D/g, ''), 10) : 0;
    const memAvailableKB = memAvailableLine ? parseInt(memAvailableLine.replace(/\D/g, ''), 10) : 0;
    const memFreeKB = memFreeLine ? parseInt(memFreeLine.replace(/\D/g, ''), 10) : 0;

    const memUsedKB = memTotalKB - (memAvailableKB || memFreeKB);
    metrics.memory.totalMB = Math.round(memTotalKB / 1024);
    metrics.memory.usedMB = Math.round(memUsedKB / 1024);
    metrics.memory.freeMB = Math.round((memAvailableKB || memFreeKB) / 1024);
    metrics.memory.percentUsed = memTotalKB > 0 ? Math.round((memUsedKB / memTotalKB) * 100) : 0;
  } catch (e) {
    metrics.memory.error = e.message;
  }

  try {
    const { stdout: df } = await execAsync("df -h / | tail -n 1");
    const parts = df.trim().split(/\s+/);
    if (parts.length >= 6) {
      metrics.disk.total = parts[1];
      metrics.disk.used = parts[2];
      metrics.disk.free = parts[3];
      metrics.disk.percentUsed = parseInt(parts[4].replace('%', ''), 10);
    }
  } catch (e) {
    metrics.disk.error = e.message;
  }

  return metrics;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'operator-station' });
});

app.get('/status', async (req, res) => {
  const results = {};
  const selfHealing = await checkSelfHealing();
  const sslInfo = await getSslExpiry();
  const systemMetrics = await getSystemMetrics();

  await Promise.all(services.map(async (svc) => {
    try {
      let result;
      if (svc.type === 'tcp') {
        result = await tcpCheck(svc.host, svc.port, 5000);
      } else {
        result = await httpCheck(svc.url, 5000);
      }

      if (result.ok) {
        results[svc.key] = { status: 'online', detail: svc.type === 'tcp' ? 'TCP connected' : `HTTP ${result.status}` };
      } else if (svc.unknownOnFail) {
        results[svc.key] = { status: 'unknown', detail: result.error || `HTTP ${result.status}` };
      } else {
        results[svc.key] = { status: 'offline', detail: result.error || `HTTP ${result.status}` };
      }
    } catch (err) {
      if (svc.unknownOnFail) {
        results[svc.key] = { status: 'unknown', detail: err.message };
      } else {
        results[svc.key] = { status: 'offline', detail: err.message };
      }
    }
  }));

  res.json({
    service: 'operator-station',
    timestamp: new Date().toISOString(),
    selfHealing: selfHealing.active ? selfHealing.state : false,
    ssl: sslInfo,
    system: systemMetrics,
    services: results
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ABC-IO Operator Station</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0a0a2e;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #00ff88;
    }
    h1 {
      color: #00ff88;
      font-size: 1.75rem;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .timestamp {
      font-family: 'Courier New', monospace;
      color: #a0a0c0;
      font-size: 0.9rem;
    }
    .healing-banner {
      background: rgba(255, 193, 7, 0.15);
      border: 1px solid #ffc107;
      color: #ffc107;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: none;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }
    .healing-banner.active { display: flex; }
    .count-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .count-item {
      background: #0f1633;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      border: 1px solid rgba(0, 255, 136, 0.1);
    }
    .count-value { font-weight: 700; margin-left: 0.25rem; }
    .count-online { color: #00ff88; }
    .count-offline { color: #ff4444; }
    .count-unknown { color: #aaaaaa; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .card {
      background: #0f1633;
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid rgba(0, 255, 136, 0.15);
      transition: transform 0.2s, border-color 0.2s;
      position: relative;
      overflow: hidden;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 255, 136, 0.4);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .service-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #c0c8e0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .led {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 10px currentColor;
    }
    .led.online { background: #00ff88; color: rgba(0, 255, 136, 0.6); }
    .led.offline { background: #ff4444; color: rgba(255, 68, 68, 0.6); }
    .led.unknown { background: #aaaaaa; color: rgba(170, 170, 170, 0.5); }
    .led.healing { background: #ffc107; color: rgba(255, 193, 7, 0.6); animation: pulse 1.2s infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
    .detail {
      font-size: 0.75rem;
      color: #8090b0;
      font-family: 'Courier New', monospace;
    }
    .metrics-section, .ssl-section, .mobile-section {
      margin-top: 2rem;
      background: #0f1633;
      border-radius: 12px;
      padding: 1.25rem;
      border: 1px solid rgba(0, 255, 136, 0.15);
    }
    .metrics-section h2, .ssl-section h2, .mobile-section h2 {
      color: #00ff88;
      font-size: 1.1rem;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .metric-card {
      background: #0a0a2e;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      border: 1px solid rgba(0, 255, 136, 0.1);
    }
    .metric-label {
      font-size: 0.75rem;
      color: #a0a8c0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    .metric-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
    }
    .metric-value.warning { color: #ffc107; }
    .metric-value.danger { color: #ff4444; }
    .ssl-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }
    .mobile-status {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .mobile-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .mobile-label { font-size: 0.85rem; color: #a0a8c0; }
    .refreshing {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #00ff88;
      opacity: 0;
      transition: opacity 0.3s;
      margin-bottom: 0.25rem;
    }
    .refreshing.active { opacity: 1; }
    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid #00ff88;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 600px) {
      h1 { font-size: 1.25rem; }
      .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      .metrics-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ABC-IO Operator Station</h1>
      <div>
        <div class="refreshing" id="refreshing"><div class="spinner"></div> Refreshing...</div>
        <div class="timestamp" id="timestamp">Last check: --</div>
      </div>
    </header>

    <div class="healing-banner" id="healing-banner">
      <span>⚠️</span>
      <span>Self-Healing Active: <span id="healing-state"></span></span>
    </div>

    <div class="ssl-section" id="ssl-section" style="display:none;">
      <h2>SSL Certificate</h2>
      <div class="ssl-status" id="ssl-status"></div>
    </div>

    <div class="metrics-section" id="metrics-section" style="display:none;">
      <h2>System Metrics</h2>
      <div class="metrics-grid" id="metrics-grid"></div>
    </div>

    <div class="count-bar" id="count-bar"></div>

    <div class="grid" id="grid"></div>

    <div class="mobile-section">
      <h2>Mobile Gateway</h2>
      <div class="mobile-status">
        <div class="mobile-item">
          <div class="led unknown" id="mobile-led"></div>
          <span class="mobile-label" id="mobile-label">Primary: checking...</span>
        </div>
        <div class="mobile-item">
          <div class="led unknown" id="cellular-led"></div>
          <span class="mobile-label" id="cellular-label">Cellular Fallback: Standby</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const statusMap = {
      online: { class: 'online', emoji: '🟢' },
      offline: { class: 'offline', emoji: '🔴' },
      unknown: { class: 'unknown', emoji: '⚪' },
      healing: { class: 'healing', emoji: '🟡' }
    };

    function displayName(key) {
      const map = {
        'gateway': 'API Gateway',
        'owner-dashboard': 'Owner Dashboard',
        'mobile-gateway': 'Mobile Gateway',
        'public-portal': 'Public Portal',
        'operator-station': 'Operator Station',
        'beacon-pwa': 'Beacon PWA',
        'beacon': 'Beacon',
        'kimi': 'Kimi AI',
        'ai-isp': 'AI-ISP',
        'worker': 'Worker',
        'postgres': 'PostgreSQL',
        'redis': 'Redis',
        'nginx': 'NGINX',
        'prometheus': 'Prometheus',
        'grafana': 'Grafana',
        'tracer': 'Tracer (Jaeger)',
        'headscale': 'Headscale'
      };
      return map[key] || key;
    }

    async function fetchStatus() {
      const refreshing = document.getElementById('refreshing');
      refreshing.classList.add('active');
      try {
        const res = await fetch('/status');
        const data = await res.json();
        render(data);
      } catch (err) {
        console.error('Failed to fetch status:', err);
      } finally {
        setTimeout(() => refreshing.classList.remove('active'), 500);
      }
    }

    function render(data) {
      document.getElementById('timestamp').textContent = 'Last check: ' + new Date(data.timestamp).toLocaleString();

      const banner = document.getElementById('healing-banner');
      if (data.selfHealing) {
        banner.classList.add('active');
        document.getElementById('healing-state').textContent = data.selfHealing;
      } else {
        banner.classList.remove('active');
      }

      // SSL
      const sslSection = document.getElementById('ssl-section');
      const sslStatus = document.getElementById('ssl-status');
      if (data.ssl && data.ssl.available) {
        sslSection.style.display = 'block';
        const warning = data.ssl.warning;
        sslStatus.innerHTML = \`
          <div class="led \${warning ? 'healing' : 'online'}"></div>
          <span>\${data.ssl.domain} — expires in <strong class="\${warning ? 'warning' : ''}">\${data.ssl.daysRemaining} days</strong> (\${new Date(data.ssl.expiry).toLocaleDateString()})</span>
        \`;
      } else if (data.ssl && !data.ssl.available) {
        sslSection.style.display = 'none';
      }

      // System Metrics
      const metricsSection = document.getElementById('metrics-section');
      const metricsGrid = document.getElementById('metrics-grid');
      if (data.system) {
        metricsSection.style.display = 'block';
        const m = data.system;
        metricsGrid.innerHTML = '';

        if (m.cpu && m.cpu.loadAverage) {
          metricsGrid.innerHTML += \`
            <div class="metric-card">
              <div class="metric-label">CPU Load (1m)</div>
              <div class="metric-value">\${m.cpu.loadAverage['1m'].toFixed(2)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">CPU Load (5m)</div>
              <div class="metric-value">\${m.cpu.loadAverage['5m'].toFixed(2)}</div>
            </div>
          \`;
        }

        if (m.memory && m.memory.totalMB) {
          const memClass = m.memory.percentUsed > 90 ? 'danger' : (m.memory.percentUsed > 75 ? 'warning' : '');
          metricsGrid.innerHTML += \`
            <div class="metric-card">
              <div class="metric-label">Memory Used</div>
              <div class="metric-value \${memClass}">\${m.memory.percentUsed}% (\${m.memory.usedMB} / \${m.memory.totalMB} MB)</div>
            </div>
          \`;
        }

        if (m.disk && m.disk.total) {
          const diskClass = m.disk.percentUsed > 90 ? 'danger' : (m.disk.percentUsed > 75 ? 'warning' : '');
          metricsGrid.innerHTML += \`
            <div class="metric-card">
              <div class="metric-label">Disk Used</div>
              <div class="metric-value \${diskClass}">\${m.disk.percentUsed}% (\${m.disk.used} / \${m.disk.total})</div>
            </div>
          \`;
        }
      }

      const services = data.services;
      const grid = document.getElementById('grid');
      grid.innerHTML = '';

      let online = 0, offline = 0, unknown = 0;

      for (const [key, info] of Object.entries(services)) {
        if (info.status === 'online') online++;
        else if (info.status === 'offline') offline++;
        else unknown++;

        const status = statusMap[info.status] || statusMap.unknown;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = \`
          <div class="card-header">
            <span class="service-name">\${displayName(key)}</span>
            <div class="led \${status.class}" title="\${status.emoji} \${info.status}"></div>
          </div>
          <div class="detail">\${info.detail || ''}</div>
        \`;
        grid.appendChild(card);

        if (key === 'mobile-gateway') {
          const mobileLed = document.getElementById('mobile-led');
          const mobileLabel = document.getElementById('mobile-label');
          mobileLed.className = 'led ' + status.class;
          mobileLabel.textContent = 'Primary: ' + info.status.toUpperCase() + (info.detail ? ' (' + info.detail + ')' : '');

          const cellularLed = document.getElementById('cellular-led');
          const cellularLabel = document.getElementById('cellular-label');
          if (info.status === 'offline') {
            cellularLed.className = 'led healing';
            cellularLabel.textContent = 'Cellular Fallback: ACTIVE';
          } else {
            cellularLed.className = 'led unknown';
            cellularLabel.textContent = 'Cellular Fallback: Standby';
          }
        }
      }

      const countBar = document.getElementById('count-bar');
      countBar.innerHTML = \`
        <div class="count-item">\${statusMap.online.emoji} Online: <span class="count-value count-online">\${online}</span></div>
        <div class="count-item">\${statusMap.offline.emoji} Offline: <span class="count-value count-offline">\${offline}</span></div>
        <div class="count-item">\${statusMap.unknown.emoji} Unknown: <span class="count-value count-unknown">\${unknown}</span></div>
      \`;
    }

    fetchStatus();
    setInterval(fetchStatus, 5000);
  </script>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`Operator Station listening on port ${port}`);
});
