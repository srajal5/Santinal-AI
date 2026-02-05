import api from './axios'

export async function fetchCameras() {
  const { data } = await api.get('/cameras')
  return data
}

export async function createCamera(payload) {
  const { data } = await api.post('/cameras', payload)
  return data
}
