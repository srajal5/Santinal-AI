import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { useIncident } from '../context/IncidentContext'
import { useCamera } from '../context/CameraContext'
import { fetchDispatches } from '../api/dispatch'

function formatTime(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

function IconCamera({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconSiren({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <path d="M12 8a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0v-4a4 4 0 0 1 4-4z" />
    </svg>
  )
}

function IconActivity({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconAlertCircle({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconTrendingUp({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconCheckCircle({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function SeverityBadge({ severity }) {
  const styles = {
    low: 'bg-gray-600/40 text-gray-200',
    medium: 'bg-amber-600/40 text-amber-200',
    high: 'bg-orange-600/40 text-orange-200',
    critical: 'bg-red-600/40 text-red-200',
  }
  const s = (severity || 'low').toLowerCase()
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[s] ?? styles.low}`}>
      {severity || '—'}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    open: 'bg-red-600/40 text-red-200',
    in_progress: 'bg-blue-600/40 text-blue-200',
    resolved: 'bg-green-600/40 text-green-200',
  }
  const s = (status || 'open').toLowerCase().replace(/\s/g, '_')
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[s] ?? styles.open}`}>
      {(status || '—').replace(/_/g, ' ')}
    </span>
  )
}

function IncidentManagementInner() {
  const { incidents, loading, error, updateStatus, updatingId } = useIncident()
  const { cameras, setActiveCamera } = useCamera()
  const navigate = useNavigate()
  const [dispatchMap, setDispatchMap] = useState({})
  const [filter, setFilter] = useState('all')
  const [demoBaseTime, setDemoBaseTime] = useState(null)
  useEffect(() => {
    setDemoBaseTime(Date.now())
  }, [])

  const loadDispatches = useCallback(async () => {
    try {
      const list = await fetchDispatches()
      const map = {}
      ;(list || []).forEach((d) => {
        if (d.incident_id && !map[d.incident_id]) map[d.incident_id] = d
      })
      setDispatchMap(map)
    } catch {
      setDispatchMap({})
    }
  }, [])

  useEffect(() => {
    loadDispatches()
  }, [loadDispatches])

  useEffect(() => {
    const onFocus = () => loadDispatches()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadDispatches])

  const baseIncidents = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : []
    if (list.length > 0) return list
    // DEMO incidents when none available
    if (demoBaseTime == null) return []
    return [
      { incident_id: 'demo-i1', camera_name: 'Intersection CCTV #3', type: 'accident', severity: 'high', status: 'open', reported_at: new Date(demoBaseTime - 45 * 60_000).toISOString(), isDemo: true },
      { incident_id: 'demo-i2', camera_name: 'Warehouse Cam 2', type: 'fire', severity: 'critical', status: 'in_progress', reported_at: new Date(demoBaseTime - 30 * 60_000).toISOString(), isDemo: true },
      { incident_id: 'demo-i3', camera_name: 'Stadium Entry', type: 'crowd', severity: 'medium', status: 'open', reported_at: new Date(demoBaseTime - 10 * 60_000).toISOString(), isDemo: true },
    ]
  }, [incidents, demoBaseTime])

  const filtered = useMemo(() => {
    const list = baseIncidents
    if (filter === 'all') return list
    return list.filter((i) => (i.status || 'open').toLowerCase().replace(/\s/g, '_') === filter)
  }, [baseIncidents, filter])

  const stats = useMemo(() => {
    const list = baseIncidents || []
    return {
      total: list.length,
      open: list.filter((i) => (i.status || 'open').toLowerCase() === 'open').length,
      inProgress: list.filter((i) => (i.status || '').toLowerCase() === 'in_progress').length,
      resolved: list.filter((i) => (i.status || '').toLowerCase() === 'resolved').length,
    }
  }, [baseIncidents])

  const statCards = [
    { label: 'Total Incidents', value: stats.total, Icon: IconActivity, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Open', value: stats.open, Icon: IconAlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'In Progress', value: stats.inProgress, Icon: IconTrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Resolved', value: stats.resolved, Icon: IconCheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  ]

  if (error) {
    return (
      <div className="rounded-xl bg-amber-900/20 border border-amber-700/50 p-6 text-amber-400 text-center">
        Unable to load incidents
      </div>
    )
  }

  return (
    <>
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Incident Management</h1>
          <p className="text-sm text-gray-500">Monitor and manage incidents detected by the system</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl bg-gray-900/50 border border-gray-800 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
                <div className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center`}>
                  <card.Icon size={18} className={card.color} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg font-bold text-white">Incident Log</h2>
            <div className="flex flex-wrap gap-2">
              {['all', 'open', 'in_progress', 'resolved'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Camera</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Incident Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reported At</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      Loading incidents...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      No incidents found
                    </td>
                  </tr>
                ) : (
                  filtered.map((inc) => (
                    <tr
                      key={inc.incident_id}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <IconCamera size={16} className="text-gray-500 shrink-0" />
                          <span className="text-sm text-white">{inc.camera_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white capitalize">
                        {(inc.type || '—').replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatTime(inc.reported_at)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {inc.status !== 'resolved' && (
                            <>
                              {dispatchMap[inc.incident_id] ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/40 text-green-200">
                                  ✓ Help Sent
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/alerts-help?incident=${inc.incident_id}`)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
                                >
                                  <IconSiren size={14} /> Send Help
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => updateStatus(inc.incident_id, 'resolved')}
                                disabled={updatingId === inc.incident_id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:opacity-50"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const cam = cameras[0] || { camera_id: '__local__', name: 'Local Webcam', status: 'active' }
                              setActiveCamera(cam)
                              navigate('/dashboard')
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
                          >
                            <IconCamera size={14} /> View Feed
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function Incidents() {
  return (
    <DashboardLayout activeItem="Incidents">
      <IncidentManagementInner />
    </DashboardLayout>
  )
}

export default Incidents
