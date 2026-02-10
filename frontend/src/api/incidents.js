import api from './axios'

export async function fetchIncidents() {
  const { data } = await api.get('/incidents/all')
  return data
}

export async function updateIncidentStatus(id, status) {
  const { data } = await api.patch(`/incidents/${id}/status`, { status })
  return data
}

export async function detectIncidentsFromVideo({ cameraId, file }) {
  const formData = new FormData()
  formData.append('camera_id', cameraId)
  formData.append('file', file)

  const { data } = await api.post('/incidents/detect-from-video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}

export async function detectFrameFromWebcam(frameData, confidence = 0.5) {
  const { data } = await api.post('/incidents/detect-frame', {
    frame_data: frameData,
    conf: confidence,
  })

  return data
}

export async function createIncidentFromDetection({ type, confidence, latitude = 0, longitude = 0, cameraId = null }) {
  const { data } = await api.post('/incidents/create-from-detection', {
    type,
    confidence,
    latitude,
    longitude,
    camera_id: cameraId,
  })

  return data
}
