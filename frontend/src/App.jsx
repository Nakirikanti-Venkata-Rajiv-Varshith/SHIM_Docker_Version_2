import styles from './App.module.css'
import StatusBar from './components/StatusBar'
import MetricGauge from './components/MetricGauge'
import TrendChart from './components/TrendChart'
import HealingLog from './components/HealingLog'
import AnomalyPanel from './components/AnomalyPanel'
import { useMetrics } from './hooks/useMetrics'
import { useHealingLog } from './hooks/useHealingLog'

function App() {
  const { current, history, predictions, anomalies, isConnected } = useMetrics()
  const { healingLog, cooldowns, triggerAction } = useHealingLog()

  const cpuAnomaly = anomalies.find(a => a.metric === 'cpu')
  const ramAnomaly = anomalies.find(a => a.metric === 'ram')
  const diskAnomaly = anomalies.find(a => a.metric === 'disk')

  return (
    <div className={styles.app}>
      <StatusBar current={current} isConnected={isConnected} />
      <main className={styles.main}>
        {/* Metric Gauges Row */}
        <div className={styles.gaugesRow}>
          <MetricGauge
            label="CPU Load"
            value={current ? parseFloat(current.cpu) : 0}
            unit="%"
            color="blue"
            anomaly={cpuAnomaly}
            prediction={predictions?.cpu?.at_120s}
          />
          <MetricGauge
            label="RAM Usage"
            value={current ? parseFloat(current.ram) : 0}
            unit="%"
            color="cyan"
            anomaly={ramAnomaly}
            prediction={predictions?.ram?.at_120s}
          />
          <MetricGauge
            label="Disk Usage"
            value={current ? parseFloat(current.disk) : 0}
            unit="%"
            color="amber"
            anomaly={diskAnomaly}
            prediction={predictions?.disk?.at_120s}
          />
          <MetricGauge
            label="GPU Usage"
            value={current ? parseFloat(current.gpu) : 0}
            unit="%"
            color="blue"
            anomaly={anomalies.find(a => a.metric === 'gpu')}
            prediction={predictions?.gpu?.at_120s}
            gpuMemory={{
              used: current?.gpu_mem_used || 0,
              total: current?.gpu_mem_total || 0
            }}
          />
        </div>

        {/* Trend Chart */}
        <div className={styles.chartRow}>
          <TrendChart history={history} predictions={predictions} />
        </div>

        {/* Bottom Row */}
        <div className={styles.bottomRow}>
          <AnomalyPanel anomalies={anomalies} />
          <HealingLog
            entries={healingLog}
            cooldowns={cooldowns}
            onTrigger={triggerAction}
          />
        </div>
      </main>
    </div>
  )
}

export default App
