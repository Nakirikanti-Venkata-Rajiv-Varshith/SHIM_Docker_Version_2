const { exec } = require('child_process')
const path = require('path')

const COOLDOWN_MS = 3 * 60 * 1000 // 3 minutes
const CPU_THRESHOLD = 85
const RAM_THRESHOLD = 90
const SCRIPTS_DIR = path.join(__dirname, '../../scripts')

class HealingEngine {
  constructor() {
    this.cooldowns = {}
  }

  // this === HealingEngine holder

  async evaluate(predictions, anomalies) {

    const cpuAnomaly = anomalies?.find(a => a.metric === 'cpu')
    const ramAnomaly = anomalies?.find(a => a.metric === 'ram')
    if (!predictions) return []
    const actions = []

    // CPU threshold check at 120s horizon
    if (
      predictions.cpu &&
      predictions.cpu.trend === 'increasing' &&
      predictions.cpu.at_120s > CPU_THRESHOLD &&
      predictions.cpu.confidence !== 'low' &&
      cpuAnomaly &&
      cpuAnomaly.severity === 'critical'
    ) {
      if (this.canTrigger('scale_up')) {
        const record = this._buildRecord('scale_up', 'cpu', predictions.cpu.at_120s, CPU_THRESHOLD)
        this._setCooldown('scale_up')
        this._runScript('scale_up.sh')
        actions.push(record)
        console.log(`[HealingEngine] Scale Up triggered — predicted CPU ${predictions.cpu.at_120s.toFixed(1)}%`)
      }
    }

    // RAM threshold check at 120s horizon
    if (
      predictions.ram &&
      predictions.ram.at_120s > RAM_THRESHOLD &&
      predictions.ram.trend === 'increasing' &&
      predictions.ram.confidence !== 'low' &&
      ramAnomaly &&
      ramAnomaly.severity === 'critical'

    ) {
      if (this.canTrigger('restart_service')) {
        const record = this._buildRecord('restart_service', 'ram', predictions.ram.at_120s, RAM_THRESHOLD)
        this._setCooldown('restart_service')
        this._runScript('restart_service.sh')
        actions.push(record)
        console.log(`[HealingEngine] Restart triggered — predicted RAM ${predictions.ram.at_120s.toFixed(1)}%`)
      }
    }


    return actions
  }

  /**
   * Force-trigger an action manually (bypasses cooldown).
   * Returns the action log record.
   */
  triggerManual(actionType, metric = 'manual') {
    const thresholds = { scale_up: CPU_THRESHOLD, restart_service: RAM_THRESHOLD }
    const record = this._buildRecord(actionType, metric, 0, thresholds[actionType] || 0)
    this._setCooldown(actionType)
    const scriptMap = { scale_up: 'scale_up.sh', restart_service: 'restart_service.sh' }
    if (scriptMap[actionType]) this._runScript(scriptMap[actionType])
    console.log(`[HealingEngine] Manual ${actionType} triggered`)
    return record
  }

  /** Check if an action can be triggered (not in cooldown) */
  canTrigger(actionType) {
    const last = this.cooldowns[actionType]
    if (!last) return true
    return Date.now() - last >= COOLDOWN_MS
  }

  /** Milliseconds remaining in cooldown (0 if not cooling) */
  cooldownRemaining(actionType) {
    const last = this.cooldowns[actionType]
    if (!last) return 0
    return Math.max(0, COOLDOWN_MS - (Date.now() - last))
  }

  /** Return cooldown status for all action types */
  getCooldownStatus() {
    return {
      scale_up: {
        inCooldown: !this.canTrigger('scale_up'),
        remaining: this.cooldownRemaining('scale_up'),
      },
      restart_service: {
        inCooldown: !this.canTrigger('restart_service'),
        remaining: this.cooldownRemaining('restart_service'),
      },
    }
  }

  _setCooldown(actionType) {
    this.cooldowns[actionType] = Date.now()
  }

  _buildRecord(actionType, triggerMetric, predictedValue, threshold) {
    return {
      timestamp: new Date().toISOString(),
      action_type: actionType,
      trigger_metric: triggerMetric,
      predicted_value: typeof predictedValue === 'number' ? predictedValue.toFixed(2) : predictedValue,
      threshold: String(threshold),
      status: 'triggered',
      cooldown_until: new Date(Date.now() + COOLDOWN_MS).toISOString(),
    }
  }

  _runScript(scriptName) {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName)
    exec(`bash "${scriptPath}"`, (error, stdout) => {
      if (error) {
        console.error(`[HealingEngine] Script "${scriptName}" error: ${error.message}`)
      } else {
        console.log(`[HealingEngine] Script "${scriptName}": ${stdout.trim()}`)
      }
    })
  }
}

module.exports = HealingEngine
