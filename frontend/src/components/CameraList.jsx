import { useEffect, useMemo } from 'react'
import { useCamera } from '../context/CameraContext'
import { useAlert } from '../context/AlertContext'

const LOCAL_WEBCAM = { camera_id: '__local__', name: 'Local Webcam', status: 'active' }

function CameraList() {
  const { cameras, loading, error, activeCamera, setActiveCamera } = useCamera()
  const { alerts } = useAlert()

  // Demo fallback only if backend returned zero cameras
  const demoCameras = useMemo(() => {
    if ((cameras || []).length > 0) return []
    return [
      { camera_id: 'demo-01', name: 'Intersection CCTV #3', status: 'active', type: 'CCTV', latitude: 40.7484, longitude: -73.9857, isDemo: true },
      { camera_id: 'demo-02', name: 'Warehouse Cam 2', status: 'active', type: 'IP', latitude: 40.7350, longitude: -74.0020, isDemo: true },
      { camera_id: 'demo-03', name: 'Stadium Entry', status: 'active', type: 'Mobile', latitude: 40.7527, longitude: -73.9772, isDemo: true },
    ]
  }, [cameras])

  useEffect(() => {
    if (demoCameras.length && (!activeCamera || activeCamera.camera_id === '__local__')) {
      setActiveCamera(demoCameras[0])
    }
  }, [demoCameras, activeCamera, setActiveCamera])

  const activeAlertCameraNames = useMemo(() => {
    return alerts
      .filter((a) => (a.status || 'new').toLowerCase() === 'new')
      .map((a) => (a.camera_name || '').toLowerCase())
  }, [alerts])

  const allCameras = [LOCAL_WEBCAM, ...(cameras.length ? cameras : demoCameras)]

  if (loading) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500">Loading cameras...</div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-amber-500">
        Unable to load cameras
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <p className="px-4 mb-2 text-xs font-medium text-gray-500 uppercase">
        Cameras
      </p>
      <nav className="flex flex-col gap-1">
        {allCameras.map((cam) => {
          const isActive = activeCamera?.camera_id === cam.camera_id
          const isOnline = cam.status === 'active'
          return (
            <button
              key={cam.camera_id}
              type="button"
              onClick={() => setActiveCamera(cam)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50'
              }`}
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--text-muted, #9ca3af)',
                boxShadow: activeAlertCameraNames.includes((cam.name || '').toLowerCase())
                  ? '0 0 0 1px var(--color-accent)'
                  : 'none',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isOnline ? 'var(--color-accent)' : 'var(--dot-muted, #6b7280)' }}
              />
              <span className="truncate">{cam.name}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default CameraList
