import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchIncidents, updateIncidentStatus as apiUpdateStatus } from '../api/incidents'

const IncidentContext = createContext(null)

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved']

export function IncidentProvider({ children }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const updateStatus = useCallback(async (incidentId, newStatus) => {
    let prev = null
    setIncidents((list) => {
      prev = list.find((i) => i.incident_id === incidentId)
      if (!prev || prev.status === newStatus) return list
      return list.map((i) =>
        i.incident_id === incidentId ? { ...i, status: newStatus } : i
      )
    })
    if (!prev || prev.status === newStatus) return

    setUpdatingId(incidentId)

    try {
      const updated = await apiUpdateStatus(incidentId, newStatus)
      setIncidents((list) =>
        list.map((i) => (i.incident_id === incidentId ? updated : i))
      )
    } catch {
      setIncidents((list) =>
        list.map((i) => (i.incident_id === incidentId ? prev : i))
      )
    } finally {
      setUpdatingId(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        let data = await fetchIncidents()
        if (!cancelled) setIncidents(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) {
          setError(true)
          setIncidents([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <IncidentContext.Provider
      value={{
        incidents,
        loading,
        error,
        setIncidents,
        updateStatus,
        updatingId,
        statusOptions: STATUS_OPTIONS,
      }}
    >
      {children}
    </IncidentContext.Provider>
  )
}

export function useIncident() {
  const ctx = useContext(IncidentContext)
  if (!ctx) throw new Error('useIncident must be used within IncidentProvider')
  return ctx
}
