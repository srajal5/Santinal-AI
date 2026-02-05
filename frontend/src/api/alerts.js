import api from './axios'

export async function fetchAlerts() {
  const { data } = await api.get('/alerts')
  return data
}

export async function acknowledgeAlert(alertId) {
  const { data } = await api.patch(`/alerts/${alertId}/acknowledge`)
  return data
}
