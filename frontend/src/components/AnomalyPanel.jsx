import styles from './AnomalyPanel.module.css'
import { formatShortTime } from '../utils/formatters'

const SEVERITY_LABELS = {
  critical: '⚠ CRITICAL',
  warning: '⚡ WARNING',
  normal: '✓ NORMAL',
}

export default function AnomalyPanel({ anomalies = [] }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="label-sm">Anomaly Detection</span>
        <div className={styles.summary}>
          <span className={styles.countBadge} data-count={anomalies.length}>
            {anomalies.length} active
          </span>
          <span className={styles.method}>Z-Score σ&gt;2.5</span>
        </div>
      </div>

      <div className={styles.content}>
        {anomalies.length === 0 ? (
          <div className={styles.nominal}>
            <div className={styles.nominalIcon}>✓</div>
            <div className={styles.nominalText}>
              <strong>All systems nominal</strong>
              <span>No statistical anomalies detected</span>
            </div>
          </div>
        ) : (
          <div className={styles.anomalyList}>
            {anomalies.map((anomaly, i) => (
              <div
                key={i}
                className={`${styles.anomalyItem} ${styles[anomaly.severity]}`}
              >
                <div className={styles.itemHeader}>
                  <span className={styles.metricName}>
                    {anomaly.metric?.toUpperCase()}
                  </span>
                  <span className={`${styles.severityBadge} ${styles[anomaly.severity]}`}>
                    {SEVERITY_LABELS[anomaly.severity]}
                  </span>
                </div>
                <div className={styles.itemStats}>
                  <div className={styles.statRow}>
                    <span className={styles.statKey}>Current</span>
                    <span className={`mono ${styles.statVal}`}>
                      {Number(anomaly.value).toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statKey}>Mean</span>
                    <span className={`mono ${styles.statVal}`}>
                      {Number(anomaly.mean).toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statKey}>Z-Score</span>
                    <span className={`mono ${styles.statVal} ${styles.zHighlight}`}>
                      {Number(anomaly.zScore).toFixed(2)}σ
                    </span>
                  </div>
                </div>
                {anomaly.timestamp && (
                  <div className={styles.detectedAt}>
                    detected {formatShortTime(anomaly.timestamp)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
