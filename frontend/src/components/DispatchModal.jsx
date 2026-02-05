import { useState } from 'react'
import { createDispatch } from '../api/dispatch'

const SERVICE_TYPES = ['Hospital', 'Fire', 'Police']

const DUMMY_UNITS = {
  Hospital: ['Ambulance Unit 1', 'Ambulance Unit 2', 'Medic 3'],
  Fire: ['Fire Truck 1', 'Rescue Unit 2', 'Engine 3'],
  Police: ['Patrol Car 1', 'Unit 2', 'Squad 3'],
}

function getRandomEta() {
  return Math.floor(Math.random() * 11) + 5
}

function DispatchModal({ incident, onClose, onDispatched }) {
  const [serviceType, setServiceType] = useState('Police')
  const [unitName, setUnitName] = useState(DUMMY_UNITS.Police[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const etaMinutes = getRandomEta()
  const units = DUMMY_UNITS[serviceType] || DUMMY_UNITS.Police

  const handleServiceChange = (st) => {
    setServiceType(st)
    setUnitName(DUMMY_UNITS[st]?.[0] ?? '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const dispatch = await createDispatch(
        incident.incident_id,
        serviceType,
        unitName,
        etaMinutes
      )
      onDispatched(dispatch)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to dispatch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-700 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Send Help</h3>
        <p className="text-sm text-gray-400 mb-4">
          Incident: {incident?.type} — {incident?.incident_id?.slice(-6)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Service type</label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-green-500"
            >
              {SERVICE_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nearby unit</label>
            <select
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:ring-1 focus:ring-green-500"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-400">
            ETA: <span className="text-green-400 font-medium">{etaMinutes} min</span>
          </p>
          {error && (
            <p className="text-sm text-amber-500">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-gray-700 text-gray-300 text-sm hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-50"
            >
              {submitting ? 'Dispatching…' : 'Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DispatchModal
