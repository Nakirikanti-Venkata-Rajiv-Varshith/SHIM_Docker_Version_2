const router = require('express').Router()
const metricsService = require('../services/metricsService')

/** GET /api/metrics/current — latest collected metric snapshot */
router.get('/current', (req, res) => {
  const current = metricsService.getLatest()
  if (!current) return res.status(503).json({ error: 'No data yet' })
  res.json(current)
})

/** GET /api/metrics/history?limit=60 — last N records from CSV */
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 60, 500)
  res.json(metricsService.getHistory(limit))
})

/** GET /api/metrics/predictions — latest ML predictions */
router.get('/predictions', (req, res) => {
  const predictions = metricsService.getPredictions()
  res.json(predictions || null)
})

/** GET /api/metrics/anomalies — current Z-Score anomalies */
router.get('/anomalies', (req, res) => {
  res.json(metricsService.getAnomalies())
})

module.exports = router
