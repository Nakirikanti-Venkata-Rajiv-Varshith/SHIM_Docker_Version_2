const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')

const metricsRoutes = require('./routes/metrics')
const healingRoutes = require('./routes/healing')
const metricsService = require('./services/metricsService')

const app = express()
const PORT = process.env.PORT
  ? Number(process.env.PORT)
  : 3001 + Number(process.env.NODE_APP_INSTANCE || 0)
// helpful so that new scaled up insatnces dont fight for 3001 they get 3002,3003...

//  Create HTTP server + Socket.IO 
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
})

metricsService.setSocket(io)

//  Middleware 
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
}))
app.use(express.json())

//  Request logging (compact) 
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`)
  }
  next()
})

//  Routes 
app.use('/api/metrics', metricsRoutes)
app.use('/api/healing', healingRoutes)

//  Health check 
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

//  404 fallback 
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

//  Error handler 
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

//  Start 
server.listen(PORT, () => {
  console.log(`[S.H.I.M. Backend] Listening on port ${PORT}`)
  metricsService.startCollection()
})
