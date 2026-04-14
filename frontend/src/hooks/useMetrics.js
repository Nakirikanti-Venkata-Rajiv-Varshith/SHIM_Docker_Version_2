import { useState, useEffect, useCallback } from 'react'

const POLL_INTERVAL_MS = 5000
const PRED_INTERVAL_MS = 30000

export function useMetrics() {
  const [history, setHistory] = useState([])
  const [predictions, setPredictions] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/history?limit=60')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [])

  const fetchPredictionsAndAnomalies = useCallback(async () => {
    const [predResult, anomalyResult] = await Promise.allSettled([
      fetch('/api/metrics/predictions'),
      fetch('/api/metrics/anomalies'),
    ])

    if (predResult.status === 'fulfilled' && predResult.value.ok) {
      try {
        const data = await predResult.value.json()
        setPredictions(data)
      } catch {
        /* ignore */
      }
    }

    if (anomalyResult.status === 'fulfilled' && anomalyResult.value.ok) {
      try {
        const data = await anomalyResult.value.json()
        setAnomalies(Array.isArray(data) ? data : [])
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    // Initial load
    fetchHistory()
    fetchPredictionsAndAnomalies()

    const historyTimer = setInterval(fetchHistory, POLL_INTERVAL_MS)
    const predTimer = setInterval(fetchPredictionsAndAnomalies, PRED_INTERVAL_MS)

    return () => {
      clearInterval(historyTimer)
      clearInterval(predTimer)
    }
  }, [fetchHistory, fetchPredictionsAndAnomalies])

  const current = history.length > 0 ? history[history.length - 1] : null

  return { current, history, predictions, anomalies, isConnected }
}
