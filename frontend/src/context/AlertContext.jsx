import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fetchAlerts, acknowledgeAlert as apiAcknowledge } from '../api/alerts'
import { seedDemo } from '../api/demo'

const AlertContext = createContext(null)

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }
const POLL_INTERVAL = 5000

function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    const pa = SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 0
    const pb = SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 0
    if (pa !== pb) return pb - pa
    const ta = new Date(a.created_at || 0).getTime()
    const tb = new Date(b.created_at || 0).getTime()
    return tb - ta
  })
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    gain.connect(ctx.destination)
    const play = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(start)
      osc.stop(start + duration)
    }
    play(880, 0, 0.15)
    play(880, 0.2, 0.15)
    play(880, 0.4, 0.3)
  } catch {
    // Web Audio not supported - no sound fallback
  }
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acknowledgingId, setAcknowledgingId] = useState(null)
  const seenAlertIdsRef = useRef(new Set())

  const load = useCallback(async () => {
    try {
      let data = await fetchAlerts()
      const list = sortAlerts(Array.isArray(data) ? data : [])
      if (list.length === 0) {
        await seedDemo()
        data = await fetchAlerts()
      }
      const sorted = sortAlerts(Array.isArray(data) ? data : [])
      const seen = seenAlertIdsRef.current
      const newCriticalOrHigh = sorted.filter((a) => {
        const sev = (a.severity || '').toLowerCase()
        const isRelevant = sev === 'critical' || sev === 'high'
        const isNew = !seen.has(a.alert_id)
        return isRelevant && isNew
      })
      if (newCriticalOrHigh.length > 0) {
        newCriticalOrHigh.forEach((a) => seen.add(a.alert_id))
        playAlarmSound()
      }
      sorted.forEach((a) => seen.add(a.alert_id))
      setAlerts(sorted)
      setError(null)
    } catch {
      setError(true)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  const acknowledgeAlert = useCallback(async (alertId) => {
    setAcknowledgingId(alertId)
    try {
      await apiAcknowledge(alertId)
      setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId))
    } catch {
      load()
    } finally {
      setAcknowledgingId(null)
    }
  }, [load])

  return (
    <AlertContext.Provider
      value={{
        alerts,
        loading,
        error,
        acknowledgeAlert,
        acknowledgingId,
        refresh: load,
      }}
    >
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}
