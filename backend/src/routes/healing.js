const router = require('express').Router()
const metricsService = require('../services/metricsService')

/** GET /api/healing/log?limit=50 — healing action history */

router.get('/log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  res.json(metricsService.getHealingLog(limit))
})

/** GET /api/healing/cooldowns — per-action cooldown status */

router.get('/cooldowns', (req, res) => {
  res.json(metricsService.getCooldownStatus())
})

/** POST /api/healing/trigger — manually trigger a healing action */
router.post('/trigger', (req, res) => {
  const { action, metric } = req.body

  const validActions = ['scale_up', 'restart_service']
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(', ')}` })
  }

  try {
    const result = metricsService.triggerManual(action, metric)
    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
