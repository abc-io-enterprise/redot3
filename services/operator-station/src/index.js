const express = require('express');
const app = express();
const port = Number(process.env.PORT || 8080);

app.get('/', (req, res) => {
  res.send('<h1>ABC-IO Operator Station</h1><p>Dashboard online.</p>');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Operator Station listening on port ${port}`);
});
