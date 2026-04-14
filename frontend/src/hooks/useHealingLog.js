import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001') // backend URL

export function useHealingLog() {
  const [healingLog, setHealingLog] = useState([])
  const [cooldowns, setCooldowns] = useState(null)

  const fetchInitial = useCallback(async () => {
    try {
      const [logRes, cooldownRes] = await Promise.all([
        fetch('/api/healing/log'),
        fetch('/api/healing/cooldowns'),
      ])

      if (logRes.ok) {
        const data = await logRes.json()
        setHealingLog(Array.isArray(data) ? data : [])
      }

      if (cooldownRes.ok) {
        const data = await cooldownRes.json()
        setCooldowns(data)
      }
    } catch (err) {
      console.error('[useHealingLog] Init fetch failed:', err)
    }
  }, [])

  useEffect(() => {
    // initial load
    fetchInitial()

    // listen for real-time updates
    socket.on('healing_update', (newAction) => {
      setHealingLog(prev => [newAction, ...prev])
    })

    return () => {
      socket.off('healing_update')
    }
  }, [fetchInitial])

  const triggerAction = useCallback(async (actionType) => {
    try {
      await fetch('/api/healing/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      })
    } catch (err) {
      console.error('[useHealingLog] Trigger failed:', err)
    }
  }, [])

  return { healingLog, cooldowns, triggerAction }
}