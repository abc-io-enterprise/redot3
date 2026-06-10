const express = require('express');
const app = express();
const port = Number(process.env.PORT || 8080);

const serviceEndpoints = {
  gateway: 'http://gateway:4000/health',
  ownerDashboard: 'http://owner-dashboard:8500/health',
  mobileGateway: 'http://mobile-gateway:5050/health',
  publicPortal: 'http://public-portal:8090/health'
};

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>ABC-IO Operator Station</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 2rem auto; padding: 1rem; background:#f8f9fb; }
          .card { background:#fff; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.08); margin-bottom:1rem; padding:1.25rem; }
          button { padding:.8rem 1.25rem; border:none; border-radius:8px; background:#0b5ed7; color:#fff; cursor:pointer; }
          pre { background:#eef2f7; padding:1rem; border-radius:10px; }
        </style>
      </head>
      <body>
        <h1>ABC-IO Operator Station</h1>
        <div class="card">
          <h2>Operational Links</h2>
          <ul>
            <li><a href="http://localhost:8500" target="_blank">Owner Dashboard</a> (local admin)</li>
            <li><a href="http://localhost:8080" target="_blank">Operator Station</a></li>
            <li><a href="http://localhost:5050" target="_blank">Mobile Gateway</a></li>
            <li><a href="http://localhost:8090" target="_blank">Public Portal</a></li>
          </ul>
          <p>Use the Owner Dashboard to fetch APK backup status and download the latest local APK.</p>
        </div>
        <div class="card">
          <h2>System Status</h2>
          <button onclick="refreshStatus()">Refresh Status</button>
          <pre id="status">No status loaded.</pre>
        </div>
        <script>
          async function refreshStatus() {
            const res = await fetch('/status');
            const data = await res.json();
            document.getElementById('status').textContent = JSON.stringify(data, null, 2);
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'operator-station' });
});

app.get('/status', async (req, res) => {
  const results = {};
  await Promise.all(Object.entries(serviceEndpoints).map(async ([key, url]) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      results[key] = { status: response.status, healthy: response.ok };
    } catch (error) {
      results[key] = { status: 'error', healthy: false, error: error.name === 'AbortError' ? 'timeout' : error.message };
    }
  }));
  res.json({ service: 'operator-station', timestamp: new Date().toISOString(), results });
});

app.listen(port, () => {
  console.log(`Operator Station listening on port ${port}`);
});
