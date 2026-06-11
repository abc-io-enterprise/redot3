const express = require('express')
const path = require('path')
const helmet = require('helmet')
const cors = require('cors')

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())

// Serve static PWA UI
app.use('/', express.static(path.join(__dirname, 'public')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'beacon-pwa' })
})

// Minimal public beacon API
app.get('/api/beacon', (req, res) => {
  const { lat, lon } = req.query
  res.json({
    message: 'public beacon data',
    location: lat && lon ? { lat, lon } : null,
    timestamp: Date.now(),
    weather: {
      summary: 'unknown',
      temperature_c: null
    },
    alerts: []
  })
})

app.listen(process.env.PORT || 3000, () => console.log('Beacon PWA listening on port', process.env.PORT || 3000))
