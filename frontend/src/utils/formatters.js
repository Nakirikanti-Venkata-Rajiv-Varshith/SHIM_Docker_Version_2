// Format an ISO timestamp to HH:MM:SS

export function formatTime(isoString) {
  if (!isoString) return '--:--:--'
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}


 // Format a Date object to HH:MM:SS
 
export function formatTimestamp(date) {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}


// Format milliseconds to HH:MM:SS uptime string
 
export function formatUptime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}


 // Format an ISO timestamp to HH:MM short form
 
export function formatShortTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
}


 // Format a cooldown duration (ms) to M:SS string
 
export function formatCooldown(ms) {
  if (!ms || ms <= 0) return '0:00'
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}


// Return a CSS color token based on metric value and thresholds
 
export function getThresholdColor(value, thresholds = { warning: 75, critical: 90 }) {
  if (value >= thresholds.critical) return 'var(--accent-red)'
  if (value >= thresholds.warning) return 'var(--accent-amber)'
  return 'var(--accent-green)'
}

// Clamp a number between min and max

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}
