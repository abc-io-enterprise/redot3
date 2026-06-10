const express = require('express');
const app = express();
const port = Number(process.env.PORT || 4000);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'gateway', message: 'ABC-IO v2.0 API gateway online.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/ai', async (req, res) => {
  const body = req.body || {};

  try {
    const response = await fetch('http://kimi:5000/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('AI proxy error:', error);
    return res.status(502).json({ error: 'AI service unavailable', details: String(error) });
  }
});

app.listen(port, () => {
  console.log(`Gateway listening on port ${port}`);
});
