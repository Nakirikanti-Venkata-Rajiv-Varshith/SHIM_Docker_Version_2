import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import styles from './TrendChart.module.css'
import { formatTime } from '../utils/formatters'

const COLORS = {
  cpu: '#3b82f6',
  ram: '#00c6e0',
  disk: '#f59e0b',
  cpuPred: '#3b82f6',
  ramPred: '#00c6e0',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTime}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span className={styles.tooltipLabel}>{p.name}</span>
          <span className={styles.tooltipValue}>
            {p.value != null ? `${Number(p.value).toFixed(1)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function buildChartData(history, predictions) {
  const actual = history.map(h => ({
    time: formatTime(h.timestamp),
    cpu: parseFloat(h.cpu) || null,
    ram: parseFloat(h.ram) || null,
    disk: parseFloat(h.disk) || null,
    timestamp: h.timestamp,
  }))

  let predPoints = []
  if (predictions?.cpu?.values?.length && history.length > 0) {
    const lastTimestamp = new Date(history[history.length - 1].timestamp)
    // Show next 24 steps = 120s (matches healing engine window)
    predPoints = predictions.cpu.values.slice(0, 24).map((cpuVal, i) => ({
      time: formatTime(new Date(lastTimestamp.getTime() + (i + 1) * 5000).toISOString()),
      cpu: null,
      ram: null,
      disk: null,
      cpu_pred: Math.min(100, Math.max(0, parseFloat(cpuVal.toFixed(1)))),
      ram_pred: Math.min(
        100,
        Math.max(0, parseFloat((predictions?.ram?.values?.[i] ?? 0).toFixed(1)))
      ),
    }))
  }

  // Bridge point: copy last actual values into first pred point so lines connect
  if (predPoints.length > 0 && actual.length > 0) {
    const last = actual[actual.length - 1]
    predPoints[0] = {
      ...predPoints[0],
      cpu_pred: last.cpu ?? predPoints[0].cpu_pred,
      ram_pred: last.ram ?? predPoints[0].ram_pred,
    }
  }

  return [...actual, ...predPoints]
}

export default function TrendChart({ history, predictions }) {
  const chartData = buildChartData(history, predictions)
  const hasPredictions = predictions?.cpu?.values?.length > 0

  // Show every Nth tick to avoid crowding
  const tickInterval = Math.max(1, Math.floor(chartData.length / 10))

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className="label-sm">Resource Trends</span>
        <div className={styles.badges}>
          {hasPredictions && (
            <span className={styles.predBadge}>
              <span className={styles.predDash} />
              2-min forecast active
            </span>
          )}
          <span className={styles.pointCount}>{history.length} pts</span>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={tickInterval}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}%`}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)', paddingTop: 6 }}
              iconType="circle"
              iconSize={7}
            />

            {/* CPU Threshold */}
            <ReferenceLine
              y={85}
              stroke="rgba(239,68,68,0.35)"
              strokeDasharray="4 4"
              label={{
                value: 'CPU critical',
                fill: 'rgba(239,68,68,0.6)',
                fontSize: 9,
                position: 'insideTopRight',
              }}
            />
            {/* RAM Threshold */}
            <ReferenceLine
              y={90}
              stroke="rgba(245,158,11,0.3)"
              strokeDasharray="4 4"
              label={{
                value: 'RAM critical',
                fill: 'rgba(245,158,11,0.5)',
                fontSize: 9,
                position: 'insideTopLeft',
              }}
            />

            {/* Actual areas */}
            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU %"
              stroke={COLORS.cpu}
              strokeWidth={2}
              fill="rgba(59,130,246,0.08)"
              dot={false}
              activeDot={{ r: 4, stroke: COLORS.cpu, strokeWidth: 2 }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="ram"
              name="RAM %"
              stroke={COLORS.ram}
              strokeWidth={2}
              fill="rgba(0,198,224,0.06)"
              dot={false}
              activeDot={{ r: 4, stroke: COLORS.ram, strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Prediction lines */}
            {hasPredictions && (
              <Line
                type="monotone"
                dataKey="cpu_pred"
                name="CPU forecast"
                stroke={COLORS.cpuPred}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
              />
            )}
            {hasPredictions && (
              <Line
                type="monotone"
                dataKey="ram_pred"
                name="RAM forecast"
                stroke={COLORS.ramPred}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
