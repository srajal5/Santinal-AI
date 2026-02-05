import { useState } from 'react'
import { useCamera } from '../context/CameraContext'

const CAMERA_TYPES = ['CCTV', 'IP', 'Mobile']

function AddCameraModal({ open, onClose }) {
  const { addCamera } = useCamera()
  const [name, setName] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [type, setType] = useState(CAMERA_TYPES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const reset = () => {
    setName('')
    setStreamUrl('')
    setType(CAMERA_TYPES[0])
    setError('')
  }

  const handleAdd = async () => {
    setError('')
    if (!name.trim() || !streamUrl.trim()) {
      setError('Please enter camera name and stream URL')
      return
    }
    setSaving(true)
    try {
      await addCamera({
        name: name.trim(),
        type,
        stream_url: streamUrl.trim(),
        latitude: 0,
        longitude: 0,
      })
      reset()
      onClose?.()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to add camera'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-gray-900 border border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Add Camera</h2>
        <p className="text-xs text-gray-500 mb-4">
          Provide details to connect a new camera. Supported RTSP/HTTP streams.
        </p>
        {error && (
          <div className="mb-3 text-sm text-amber-500">{error}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Camera Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Intersection CCTV #3"
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">RTSP/HTTP Link</label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://..., or http://.../video"
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Camera Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {CAMERA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => { reset(); onClose?.() }}
            className="px-4 py-2 rounded bg-gray-700 text-gray-200 text-sm hover:bg-gray-600"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddCameraModal
