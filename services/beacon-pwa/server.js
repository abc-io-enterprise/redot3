const express = require('express')
const path = require('path')
const helmet = require('helmet')
const cors = require('cors')
const http = require('http')

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())

// Proxy beacon backend API calls
app.use('/api/v1/beacon', (req, res) => {
  const options = {
    hostname: 'beacon',
    port: Number(process.env.BEACON_PORT || 3000),
    path: req.originalUrl,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-Forwarded-For': req.ip,
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode)
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value)
      }
    })
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error('Beacon proxy error:', err.message)
    res.status(502).json({ error: 'Bad Gateway', message: 'Beacon backend unavailable' })
  })

  if (req.body && Object.keys(req.body).length > 0) {
    const body = JSON.stringify(req.body)
    proxyReq.setHeader('Content-Length', Buffer.byteLength(body))
    proxyReq.write(body)
  }
  proxyReq.end()
})

// Serve static PWA UI
app.use('/', express.static(path.join(__dirname, 'public')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'beacon-pwa' })
})

app.listen(process.env.PORT || 3000, () => console.log('Beacon PWA listening on port', process.env.PORT || 3000))
