import { createContext, useContext, useEffect, useState } from 'react'
import { fetchCameras, createCamera } from '../api/cameras'
import { seedDemo } from '../api/demo'

const CameraContext = createContext(null)

export function CameraProvider({ children }) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCamera, setActiveCamera] = useState({
    camera_id: '__local__',
    name: 'Local Webcam',
    status: 'active',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        let data = await fetchCameras()
        const list = Array.isArray(data) ? data : []
        if (!cancelled && list.length === 0) {
          await seedDemo()
          data = await fetchCameras()
        }
        if (!cancelled) setCameras(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) {
          setError(true)
          setCameras([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const addCamera = async ({ name, type, stream_url, latitude = 0, longitude = 0 }) => {
    const created = await createCamera({ name, type, stream_url, latitude, longitude })
    setCameras((prev) => [created, ...prev])
    setActiveCamera(created)
    return created
  }

  return (
    <CameraContext.Provider
      value={{
        cameras,
        loading,
        error,
        activeCamera,
        setActiveCamera,
        addCamera,
      }}
    >
      {children}
    </CameraContext.Provider>
  )
}

export function useCamera() {
  const ctx = useContext(CameraContext)
  if (!ctx) throw new Error('useCamera must be used within CameraProvider')
  return ctx
}
