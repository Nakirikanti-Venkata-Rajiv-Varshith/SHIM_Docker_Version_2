import styles from './HealingLog.module.css'
import { formatShortTime, formatCooldown } from '../utils/formatters'

const ACTION_LABELS = {
  scale_up: '⬆ SCALE UP',
  restart_service: '↺ RESTART',
}

const ACTION_COLORS = {
  scale_up: styles.blue,
  restart_service: styles.amber,
}

export default function HealingLog({ entries = [], cooldowns = null, onTrigger }) {
  const scaleUpCooldown = cooldowns?.scale_up
  const restartCooldown = cooldowns?.restart_service

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="label-sm">Healing Log</span>
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnBlue}`}
            onClick={() => onTrigger?.('scale_up')}
            disabled={scaleUpCooldown?.inCooldown}
            title={
              scaleUpCooldown?.inCooldown
                ? `Cooldown: ${formatCooldown(scaleUpCooldown.remaining)}`
                : 'Trigger Scale Up'
            }
          >
            ⬆ Scale Up
            {scaleUpCooldown?.inCooldown && (
              <span className={styles.cooldownTimer}>
                {formatCooldown(scaleUpCooldown.remaining)}
              </span>
            )}
          </button>
          <button
            className={`${styles.btn} ${styles.btnAmber}`}
            onClick={() => onTrigger?.('restart_service')}
            disabled={restartCooldown?.inCooldown}
            title={
              restartCooldown?.inCooldown
                ? `Cooldown: ${formatCooldown(restartCooldown.remaining)}`
                : 'Trigger Service Restart'
            }
          >
            ↺ Restart
            {restartCooldown?.inCooldown && (
              <span className={styles.cooldownTimer}>
                {formatCooldown(restartCooldown.remaining)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={styles.entries}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✓</span>
            <span>No healing actions recorded</span>
          </div>
        ) : (
          [...entries]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((entry, i) => (
            <div key={entry.timestamp} className={styles.entry}>
                <div className={styles.entryTop}>
                  <span className={`mono ${styles.time}`}>
                    {formatShortTime(entry.timestamp)}
                  </span>
                  <span className={`${styles.actionBadge} ${ACTION_COLORS[entry.action_type] || ''}`}>
                    {ACTION_LABELS[entry.action_type] || entry.action_type}
                  </span>
                  <span className={`${styles.statusDot} ${styles[entry.status]}`} />
                </div>
                <div className={styles.entryDetail}>
                  <span className={styles.metric}>
                    {entry.trigger_metric?.toUpperCase()}
                  </span>
                  {entry.predicted_value && parseFloat(entry.predicted_value) > 0 && (
                    <span className={styles.predicted}>
                      predicted {parseFloat(entry.predicted_value).toFixed(1)}% {'>'} {entry.threshold}%
                    </span>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
