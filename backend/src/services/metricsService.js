const si = require('systeminformation')
const path = require('path')
const { exec } = require('child_process') 
const CSVStorage = require('./csvStorage')
const HealingEngine = require('./healingEngine')

const DATA_DIR = path.join(__dirname, '../../data')
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000'
const COLLECTION_INTERVAL_MS = 5000
const PREDICTION_EVERY_N = 6


function getGPUStats() {
  return new Promise((resolve) => {
    exec(
      'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      (err, stdout) => {
        if (err || !stdout) {
          return resolve({
            gpu: 0,
            gpu_mem_used: 0,
            gpu_mem_total: 0,
          })
        }

        try {
          const [usage, used, total] = stdout
            .trim()
            .split(',')
            .map(v => parseFloat(v.trim()))

          resolve({
            gpu: usage || 0,
            gpu_mem_used: used || 0,
            gpu_mem_total: total || 0,
          })
        } catch {
          resolve({
            gpu: 0,
            gpu_mem_used: 0,
            gpu_mem_total: 0,
          })
        }
      }
    )
  })
}

const metricsStorage = new CSVStorage(path.join(DATA_DIR, 'metrics.csv'), [
  'timestamp', 'cpu', 'ram', 'disk', 'cpu_temp',
  'gpu', 'gpu_mem_used', 'gpu_mem_total'
])

const healingStorage = new CSVStorage(path.join(DATA_DIR, 'healing_log.csv'), [
  'timestamp', 'action_type', 'trigger_metric', 'predicted_value', 'threshold', 'status', 'cooldown_until',
])

const healingEngine = new HealingEngine()

let io = null
function setSocket(socketInstance) {
  io = socketInstance
}

// State 
let latestMetrics = null
let latestPredictions = null
let latestAnomalies = []
let collectionTimer = null
let predictionCounter = 0

// Anomaly Detection 
function detectAnomalies(history) {
  const anomalies = []
  const metrics = ['cpu', 'ram', 'disk', 'gpu'] 

  metrics.forEach(metric => {
    const values = history.map(h => parseFloat(h[metric])).filter(v => !isNaN(v))
    if (values.length < 5) return

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    const std = Math.sqrt(variance)

    if (std < 0.5) return

    const latest = values[values.length - 1]
    const zScore = Math.abs((latest - mean) / std)

    if (zScore > 2.5) {
      anomalies.push({
        metric,
        value: parseFloat(latest.toFixed(2)),
        zScore: parseFloat(zScore.toFixed(3)),
        mean: parseFloat(mean.toFixed(2)),
        severity: zScore > 3.5 ? 'critical' : 'warning',
        timestamp: new Date().toISOString(),
      })
    }
  })

  return anomalies
}

// ML Prediction 
async function fetchPredictions(history) {
  try {
    const metrics = history.map(h => ({
      cpu: parseFloat(h.cpu) || 0,
      ram: parseFloat(h.ram) || 0,
      disk: parseFloat(h.disk) || 0,
      gpu: parseFloat(h.gpu) || 0,
    }))

    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      latestPredictions = await res.json()
      console.log('[MetricsService] Predictions updated')
    }
  } catch (err) {
    console.warn('[MetricsService] ML unavailable:', err.message)
  }
}

// Core Loop 
async function collectMetrics() {
  try {
    // replaced si.graphics() with getGPUStats() u get GPU stats in Ubuntu
    const [cpuLoad, mem, fsSize, cpuTemp, gpuStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature().catch(() => ({ main: null })),
      getGPUStats(), 
    ])

    const cpu = parseFloat(cpuLoad.currentLoad.toFixed(2))
    const ram = parseFloat(((mem.used / mem.total) * 100).toFixed(2))

    const primaryDisk = fsSize.find(d => d.size > 0) || fsSize[0]
    const disk = primaryDisk
      ? parseFloat(((primaryDisk.used / primaryDisk.size) * 100).toFixed(2))
      : 0

    const cpu_temp = cpuTemp.main ? parseFloat(cpuTemp.main.toFixed(1)) : null

    // GPU (from nvidia-smi)
    const gpu_usage = gpuStats.gpu
    const gpu_mem_used = gpuStats.gpu_mem_used
    const gpu_mem_total = gpuStats.gpu_mem_total

    const record = {
      timestamp: new Date().toISOString(),
      cpu,
      ram,
      disk,
      cpu_temp,
      gpu: gpu_usage,
      gpu_mem_used,
      gpu_mem_total,
    }

    latestMetrics = record
    metricsStorage.append(record)

    const recent = metricsStorage.readLast(20)
    latestAnomalies = detectAnomalies(recent)

    predictionCounter++
    if (predictionCounter >= PREDICTION_EVERY_N) {
      predictionCounter = 0
      const history = metricsStorage.readLast(60)

      if (history.length >= 5) {
        await fetchPredictions(history)

        if (latestPredictions) {
          const actions = await healingEngine.evaluate(latestPredictions, latestAnomalies)

          actions.forEach(action => {
            healingStorage.append(action)

            if (io) {
              io.emit('healing_update', action)
            }
          })
        }
      }
    }
  } catch (err) {
    console.error('[MetricsService] Collection error:', err.message)
  }
}

// Public API 
function startCollection() {
  if (collectionTimer) return
  collectMetrics()
  collectionTimer = setInterval(collectMetrics, COLLECTION_INTERVAL_MS)
  console.log('[MetricsService] Collection started')
}

function stopCollection() {
  if (collectionTimer) {
    clearInterval(collectionTimer)
    collectionTimer = null
  }
}

function triggerManual(actionType, metric) {
  const record = healingEngine.triggerManual(actionType, metric)
  healingStorage.append(record)

  if (io) {
    io.emit('healing_update', record)
  }

  return record
}

module.exports = {
  setSocket,
  startCollection,
  stopCollection,
  getLatest: () => latestMetrics,
  getPredictions: () => latestPredictions,
  getAnomalies: () => latestAnomalies,
  getHistory: (limit = 60) => metricsStorage.readLast(limit),
  getHealingLog: (limit = 50) => healingStorage.readLast(limit),
  getCooldownStatus: () => healingEngine.getCooldownStatus(),
  triggerManual,
}