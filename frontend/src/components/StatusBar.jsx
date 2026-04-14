import { useState, useEffect } from 'react'
import styles from './StatusBar.module.css'
import { formatTimestamp, formatUptime } from '../utils/formatters'

const BOOT_TIME = Date.now()

export default function StatusBar({ current, isConnected }) {
  const [now, setNow] = useState(new Date())
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date())
      setUptime(Date.now() - BOOT_TIME)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.logo}>S.H.I.M</span>
        <span className={styles.tagline}>Self-Healing Infrastructure Monitor</span>
      </div>

      <div className={styles.center}>
        <div className={`${styles.statusBadge} ${isConnected ? styles.online : styles.offline}`}>
          <span className={styles.dot} />
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </div>
        {current && (
          <div className={styles.quickStats}>
            <span className={styles.quickStat}>
              <span className={styles.qs_label}>CPU</span>
              <span className={styles.qs_val}>{parseFloat(current.cpu).toFixed(1)}%</span>
            </span>
            <span className={styles.divider} />
            <span className={styles.quickStat}>
              <span className={styles.qs_label}>RAM</span>
              <span className={styles.qs_val}>{parseFloat(current.ram).toFixed(1)}%</span>
            </span>
            <span className={styles.divider} />
            <span className={styles.quickStat}>
              <span className={styles.qs_label}>DISK</span>
              <span className={styles.qs_val}>{parseFloat(current.disk).toFixed(1)}%</span>
            </span>
            <span className={styles.divider} />
            <span className={styles.quickStat}>
              <span className={styles.qs_label}>GPU</span>
              <span className={styles.qs_val}>
                {parseFloat(current.gpu || 0).toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        <div className={styles.stat}>
          <span className="label-xs">UPTIME</span>
          <span className={`${styles.statVal} mono`}>{formatUptime(uptime)}</span>
        </div>
        <div className={styles.stat}>
          <span className="label-xs">TIME</span>
          <span className={`${styles.statVal} mono`}>{formatTimestamp(now)}</span>
        </div>
      </div>
    </header>
  )
}
