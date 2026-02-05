import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { useAlert } from '../context/AlertContext'
import { useCamera } from '../context/CameraContext'
import { fetchDirectory } from '../api/directory'
import { createDispatch } from '../api/dispatch'
import { useIncident } from '../context/IncidentContext'

const DISPATCHED_KEY = 'sentinel_dispatched'
const CONTACTED_KEY = 'sentinel_contacted'

function getPersistedSet(key) {
  try {
    const s = localStorage.getItem(key)
    return new Set(s ? JSON.parse(s) : [])
  } catch {
    return new Set()
  }
}

function persistSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

function AlertsHelpInner() {
  const { alerts } = useAlert()
  const { cameras, activeCamera, setActiveCamera } = useCamera()
  const [directory, setDirectory] = useState([])
  const [dispatched, setDispatched] = useState(() => getPersistedSet(DISPATCHED_KEY))
  const [contacted, setContacted] = useState(() => getPersistedSet(CONTACTED_KEY))
  const navigate = useNavigate()
  const location = useLocation()
  const { incidents } = useIncident()
  const [demoBaseTime, setDemoBaseTime] = useState(null)
  useEffect(() => {
    setDemoBaseTime(Date.now())
  }, [])
  const mapRef = useRef(null)
  const mapElRef = useRef(null)
  const markersRef = useRef({ inc: [], svc: [] })

  const incidentParam = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('incident') || ''
  }, [location.search])

  useEffect(() => {
    ;(async () => {
      try {
        const list = await fetchDirectory()
        const arr = Array.isArray(list) ? list : []
        if (arr.length === 0) {
          // DEMO services when none available (component-scoped, not persisted)
          setDirectory([
            { type: 'Police', name: 'Midtown Precinct', phone: '+1 212-555-0110', address: '123 5th Ave, New York, NY', latitude: 40.7488, longitude: -73.9850, isDemo: true },
            { type: 'Ambulance', name: 'NYC EMS Unit 7', phone: '+1 212-555-0199', address: '225 W 34th St, New York, NY', latitude: 40.7505, longitude: -73.9934, isDemo: true },
            { type: 'Fire Dept', name: 'FDNY Engine 1', phone: '+1 212-555-0142', address: '9 W 33rd St, New York, NY', latitude: 40.7493, longitude: -73.9865, isDemo: true },
          ])
        } else {
          setDirectory(arr)
        }
      } catch {
        setDirectory([])
      }
    })()
  }, [])

  const onSelectCamera = (idOrName) => {
    const byId = cameras.find((c) => c.camera_id === idOrName)
    const byName = cameras.find((c) => c.name === idOrName)
    setActiveCamera(byId || byName || activeCamera)
  }

  const groups = alerts.reduce((acc, a) => {
    const sev = (a.severity || '').toLowerCase()
    const key =
      sev === 'critical' ? 'critical'
      : sev === 'high' ? 'major'
      : sev === 'medium' || sev === 'low' ? 'minor'
      : 'false alarm'
    acc[key] = acc[key] || []
    acc[key].push(a)
    return acc
  }, {})

  const selectedIncident = useMemo(() => {
    if (!incidentParam) return null
    return (incidents || []).find((i) => i.incident_id === incidentParam) || null
  }, [incidentParam, incidents])

  const effectiveIncidents = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : []
    if (list.length > 0) return list
    // DEMO incidents when none available
    if (demoBaseTime == null) return []
    return [
      { incident_id: 'demo-i1', camera_name: 'Intersection CCTV #3', type: 'accident', latitude: 40.7484, longitude: -73.9857, severity: 'high', reported_at: new Date(demoBaseTime - 20 * 60_000).toISOString(), isDemo: true },
      { incident_id: 'demo-i2', camera_name: 'Warehouse Cam 2', type: 'fire', latitude: 40.735, longitude: -74.002, severity: 'critical', reported_at: new Date(demoBaseTime - 35 * 60_000).toISOString(), isDemo: true },
      { incident_id: 'demo-i3', camera_name: 'Stadium Entry', type: 'crowd', latitude: 40.7527, longitude: -73.9772, severity: 'medium', reported_at: new Date(demoBaseTime - 5 * 60_000).toISOString(), isDemo: true },
    ]
  }, [incidents, demoBaseTime])

  const centerLatLon = useMemo(() => {
    const inc = selectedIncident || effectiveIncidents[0]
    const lat = inc?.latitude ?? activeCamera?.latitude
    const lon = inc?.longitude ?? activeCamera?.longitude
    if (typeof lat === 'number' && typeof lon === 'number') return [lat, lon]
    return [12.9716, 77.5946]
  }, [selectedIncident, effectiveIncidents, activeCamera])

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const toRad = (v) => (v * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const sortedDirectory = useMemo(() => {
    const [lat, lon] = centerLatLon
    const list = Array.isArray(directory) ? directory.slice() : []
    list.sort((a, b) => {
      const da = haversineKm(lat, lon, a.latitude ?? lat, a.longitude ?? lon)
      const db = haversineKm(lat, lon, b.latitude ?? lat, b.longitude ?? lon)
      return da - db
    })
    return list.map((d) => {
      const km = haversineKm(lat, lon, d.latitude ?? lat, d.longitude ?? lon)
      const eta = Math.max(1, Math.round((km / 40) * 60)) // ~40km/h -> minutes
      return { ...d, _distance_km: km, _eta_min: eta }
    })
  }, [directory, centerLatLon])

  useEffect(() => {
    let Lmod = null
    let cancelled = false
    ;(async () => {
      const L = await import('leaflet')
      Lmod = L
      if (cancelled) return
      if (!mapRef.current && mapElRef.current) {
        mapRef.current = L.map(mapElRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView(centerLatLon, 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapRef.current)
      } else if (mapRef.current) {
        mapRef.current.setView(centerLatLon, 13)
      }
      // Clear old markers
      markersRef.current.inc.forEach((m) => m.remove())
      markersRef.current.svc.forEach((m) => m.remove())
      markersRef.current.inc = []
      markersRef.current.svc = []
      // Add incident markers
      effectiveIncidents.forEach((i) => {
        if (typeof i.latitude !== 'number' || typeof i.longitude !== 'number') return
        const icon = L.divIcon({
          className: 'marker-incident',
          html: `${(i.severity || 'low').toUpperCase()}`,
        })
        const m = L.marker([i.latitude, i.longitude], { icon }).addTo(mapRef.current)
        m.bindPopup(`<strong>${i.type}</strong><br/>${i.camera_name || ''}`)
        markersRef.current.inc.push(m)
      })
      // Add services markers
      sortedDirectory.forEach((d) => {
        if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return
        const icon = L.divIcon({
          className: 'marker-service',
          html: `${d.type}`,
        })
        const m = L.marker([d.latitude, d.longitude], { icon }).addTo(mapRef.current)
        m.bindPopup(`<strong>${d.name}</strong><br/>${d.address || ''}`)
        markersRef.current.svc.push(m)
      })
    })()
    return () => { cancelled = true }
  }, [centerLatLon, effectiveIncidents, sortedDirectory])

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Alerts & Help</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Camera:</span>
            <select
              value={activeCamera?.camera_id || activeCamera?.name || ''}
              onChange={(e) => onSelectCamera(e.target.value)}
              className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white"
            >
              {[activeCamera, ...cameras].filter(Boolean).map((c) => (
                <option key={c.camera_id} value={c.camera_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-xl bg-gray-900/50 border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Alerts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['critical', 'major', 'minor', 'false alarm'].map((type) => (
                <div
                  key={type}
                  className={`rounded-lg border p-3 ${
                    type === 'critical'
                      ? 'bg-red-900/20 border-red-700/40'
                      : type === 'major'
                      ? 'bg-orange-900/20 border-orange-700/40'
                      : type === 'minor'
                      ? 'bg-amber-900/20 border-amber-700/40'
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-100 capitalize">{type}</p>
                  <ul className="mt-2 space-y-2">
                    {(groups[type] || []).map((a) => (
                      <li key={a.alert_id} className="text-xs text-gray-400">
                        • {a.type} • {new Date(a.created_at).toLocaleString()}
                      </li>
                    ))}
                    {(!groups[type] || groups[type].length === 0) && (
                      <li className="text-xs text-gray-600">No alerts</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="lg:col-span-1 rounded-xl bg-gray-900/50 border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Nearby Services</h3>
            <div className="space-y-3">
              {directory.map((d) => {
                const key = `${incidentParam || 'none'}-${d.type}-${d.name}`
                const isDispatched = dispatched.has(key)
                const isContacted = contacted.has(key)
                return (
                  <div key={key} className="p-3 rounded-lg bg-gray-800/60 border border-gray-700">
                    <p className="text-sm text-white">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.type} • {d.address}</p>
                    <p className="text-xs text-gray-400">{d.phone}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isDispatched ? (
                        <span className="px-3 py-1.5 rounded bg-green-600/40 text-green-300 text-xs">
                          ✓ Dispatched
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded bg-green-600/30 text-green-400 hover:bg-green-600/50 text-xs"
                          onClick={() => {
                            const inc = incidentParam
                            if (inc) {
                              createDispatch(inc, d.type, d.name, 10).then(() => {
                                setDispatched((prev) => {
                                  const next = new Set(prev)
                                  next.add(key)
                                  persistSet(DISPATCHED_KEY, next)
                                  return next
                                })
                                navigate('/incidents')
                              })
                            }
                          }}
                        >
                          Dispatch
                        </button>
                      )}
                      <a
                        href={`tel:${d.phone || ''}`}
                        className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
                      >
                        Call
                      </a>
                      {isContacted ? (
                        <span className="px-3 py-1.5 rounded bg-blue-600/40 text-blue-300 text-xs">
                          ✓ Contacted
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 text-xs"
                          onClick={() => {
                            setContacted((prev) => {
                              const next = new Set(prev)
                              next.add(key)
                              persistSet(CONTACTED_KEY, next)
                              return next
                            })
                          }}
                        >
                          Mark Contacted
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {directory.length === 0 && (
                <p className="text-xs text-gray-500">No directory entries</p>
              )}
            </div>
          </section>
          <section className="lg:col-span-3 rounded-xl bg-gray-900/50 border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Incident Map</h3>
            <div ref={mapElRef} className="rounded-lg overflow-hidden bg-gray-800 border border-gray-700" style={{ height: 360 }} />
          </section>
        </div>
      </div>
  )
}

function AlertsHelp() {
  return (
    <DashboardLayout activeItem="Alerts">
      <AlertsHelpInner />
    </DashboardLayout>
  )
}

export default AlertsHelp
