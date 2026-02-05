import { useEffect, useState } from 'react'

const STATUS_ORDER = ['Dispatched', 'En Route', 'Arrived']

function DispatchStatusCard({ dispatch, onStatusChange }) {
  const [etaLeft, setEtaLeft] = useState(dispatch?.eta_minutes ?? 0)
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    const status = (dispatch?.status || 'Dispatched').toLowerCase().replace(/\s/g, '_')
    const idx = STATUS_ORDER.findIndex(
      (s) => s.toLowerCase().replace(/\s/g, '_') === status
    )
    setStatusIndex(idx >= 0 ? idx : 0)
    setEtaLeft(dispatch?.eta_minutes ?? 0)
  }, [dispatch?.status, dispatch?.eta_minutes])

  useEffect(() => {
    const id = setInterval(() => {
      setEtaLeft((prev) => Math.max(0, prev - 1))
      setStatusIndex((prev) => {
        if (prev >= STATUS_ORDER.length - 1) return prev
        const next = prev + 1
        if (onStatusChange) onStatusChange(STATUS_ORDER[next])
        return next
      })
    }, 8000)
    return () => clearInterval(id)
  }, [onStatusChange])

  const statusSteps = STATUS_ORDER.map((s, i) => ({
    label: s,
    active: i <= statusIndex,
  }))

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-800/70 border border-gray-700">
      <p className="text-xs font-medium text-green-400 mb-2">Dispatch active</p>
      <p className="text-xs text-gray-300 mb-1">
        {dispatch?.unit_name} • {dispatch?.service_type}
      </p>
      <div className="flex gap-2 mb-2">
        {statusSteps.map((step) => (
          <span
            key={step.label}
            className={`text-xs px-2 py-0.5 rounded ${
              step.active ? 'bg-green-600/30 text-green-300' : 'bg-gray-700 text-gray-500'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        ETA: <span className="text-amber-400 font-medium">{etaLeft} min</span>
      </p>
    </div>
  )
}

export default DispatchStatusCard
