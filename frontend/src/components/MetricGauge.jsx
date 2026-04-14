import styles from './MetricGauge.module.css'
import { getThresholdColor } from '../utils/formatters'

const COLOR_MAP = {
  blue: '#3b82f6',
  cyan: '#00c6e0',
  amber: '#f59e0b',
  red: '#ef4444',
}

const DEFAULT_THRESHOLDS = { warning: 75, critical: 90 }

export default function MetricGauge({
  label,
  value = 0,
  unit = '%',
  color = 'blue',
  maxValue = 100,
  thresholds = DEFAULT_THRESHOLDS,
  anomaly = null,
  prediction = null,
  gpuMemory = null, 
}) {
  const safeValue = isNaN(value) ? 0 : value
  const pct = Math.min(100, Math.max(0, (safeValue / maxValue) * 100))
  const baseColor = COLOR_MAP[color] || COLOR_MAP.blue
  const dynamicColor = getThresholdColor(pct, thresholds)

  const isAnomaly = !!anomaly
  const animClass =
    anomaly?.severity === 'critical'
      ? styles.pulseCritical
      : anomaly?.severity === 'warning'
      ? styles.pulseWarning
      : ''

  const trendArrow =
    prediction != null
      ? prediction > safeValue
        ? '↑'
        : prediction < safeValue
        ? '↓'
        : '→'
      : null

  const predColor =
    prediction != null
      ? getThresholdColor(prediction, thresholds)
      : 'var(--text-muted)'

  const size = 160
  const stroke = 10
  const radius = 70
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const progress = pct / 100
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className={`${styles.card} ${isAnomaly ? animClass : ''}`}>
      {isAnomaly && (
        <div className={`${styles.anomalyBadge} ${styles[anomaly.severity]}`}>
          {anomaly.severity === 'critical' ? '⚠ CRITICAL' : '⚡ ANOMALY'}
        </div>
      )}

      <div className={styles.gaugeWrapper}>
        <svg height={size} width={size}>
          <circle
            stroke="rgba(255,255,255,0.06)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={size / 2}
            cy={size / 2}
          />

          <circle
            stroke={dynamicColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        <div className={styles.centerDisplay}>
          <span className={styles.valueText} style={{ color: dynamicColor }}>
            {safeValue.toFixed(unit === '°C' ? 0 : 1)}
          </span>
          <span className={styles.unitText}>{unit}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.metricLabel}>{label}</span>
        {prediction != null && (
          <span className={styles.prediction} style={{ color: predColor }}>
            {trendArrow} {prediction.toFixed(1)}% in 2m
          </span>
        )}
      </div>

      {anomaly && (
        <div className={styles.zScore}>
          z={anomaly.zScore?.toFixed(2)}σ
        </div>
      )}

      {/*  GPU memory display */}
      {gpuMemory && (
        <div className={styles.memory}>
          {gpuMemory.used} MB / {gpuMemory.total} MB
        </div>
      )}
    </div>
  )
}