import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlert } from '../context/AlertContext'
import { useCamera } from '../context/CameraContext'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffM / 60)
    if (diffM < 1) return 'Just now'
    if (diffM < 60) return `${diffM} min ago`
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString(undefined, { dateStyle: 'short' })
  } catch {
    return iso
  }
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: 'bg-red-600/30 text-red-300',
    high: 'bg-orange-600/30 text-orange-300',
    medium: 'bg-amber-600/30 text-amber-300',
    low: 'bg-yellow-600/30 text-yellow-300',
  }
  const s = (severity || 'low').toLowerCase()
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
        styles[s] ?? styles.low
      }`}
    >
      {severity || '—'}
    </span>
  )
}

function AlertCard({ alert, onSendHelp, onViewFeed, isCritical }) {
  return (
    <div
      className={`p-3 rounded-lg border transition-opacity ${
        isCritical
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-gray-800/50 border-gray-700'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-green-400 uppercase">
          {alert.type || '—'}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(alert.created_at)}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Camera: {alert.camera_name ?? alert.incident_id ?? '—'}
      </p>
      <div className="flex items-center gap-2 mb-2">
        <SeverityBadge severity={alert.severity} />
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSendHelp(alert)}
          className="w-full text-xs px-3 py-2 rounded bg-red-600/40 text-red-200 hover:bg-red-600/60 font-medium"
        >
          Send Help
        </button>
        <button
          type="button"
          onClick={() => onViewFeed(alert)}
          className="w-full text-xs px-3 py-2 rounded bg-gray-600/40 text-gray-200 hover:bg-gray-600/60"
        >
          View Feed
        </button>
      </div>
    </div>
  )
}

function AlertPanel() {
  const { alerts, loading, error } = useAlert()
  const navigate = useNavigate()
  const { cameras, setActiveCamera } = useCamera()

  const handleSendHelp = (alert) => {
    const incidentId = alert.incident_id ?? alert.alert_id ?? ''
    navigate(`/alerts-help${incidentId ? `?incident=${incidentId}` : ''}`)
  }

  const handleViewFeed = (alert) => {
    const cameraName = (alert.camera_name || '').trim()
    if (cameraName) {
      const cam = cameras.find((c) => (c.name || '').toLowerCase() === cameraName.toLowerCase())
      if (cam) {
        setActiveCamera(cam)
      } else {
        // Fallback for demo camera names when API cameras differ
        const demoCamMap = {
          'intersection cctv #3': { camera_id: 'demo-01', name: 'Intersection CCTV #3', status: 'active', type: 'CCTV' },
          'warehouse cam 2': { camera_id: 'demo-02', name: 'Warehouse Cam 2', status: 'active', type: 'IP' },
          'stadium entry': { camera_id: 'demo-03', name: 'Stadium Entry', status: 'active', type: 'Mobile' },
        }
        const demo = demoCamMap[cameraName.toLowerCase()]
        if (demo) setActiveCamera(demo)
      }
    }
    navigate('/dashboard')
  }

  const activeAlerts = alerts.filter(
    (a) => (a.status || 'new').toLowerCase() === 'new'
  )

  const bySeverity = activeAlerts.reduce((acc, a) => {
    const s = (a.severity || 'low').toLowerCase()
    if (!acc[s]) acc[s] = []
    acc[s].push(a)
    return acc
  }, {})

  const severityOrder = ['critical', 'high', 'medium', 'low']



  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[300px] bg-gray-900 border-l border-gray-800 z-40 flex flex-col">
      <h2 className="px-4 py-4 text-sm font-semibold text-gray-200 border-b border-gray-800">
        Live Alerts
      </h2>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && activeAlerts.length === 0 && (
          <p className="text-sm text-gray-500">Loading alerts...</p>
        )}
        {error && activeAlerts.length === 0 && (
          <p className="text-sm text-amber-500">Unable to load alerts</p>
        )}
        {!loading && !error && activeAlerts.length === 0 && (
          <p className="text-sm text-gray-500">AI monitoring active, no threats detected</p>
        )}
        {severityOrder.map((sev) =>
          (bySeverity[sev] || []).map((alert) => (
            <div
              key={alert.alert_id}
              className={sev === 'critical' ? 'animate-pulse' : ''}
            >
              <AlertCard
                alert={alert}
                onSendHelp={handleSendHelp}
                onViewFeed={handleViewFeed}
                isCritical={sev === 'critical'}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

export default AlertPanel
