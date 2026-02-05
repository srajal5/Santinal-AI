import api from './axios'

export async function createDispatch(incidentId, serviceType, unitName, etaMinutes) {
  const { data } = await api.post('/dispatch', {
    incident_id: incidentId,
    service_type: serviceType,
    unit_name: unitName,
    eta_minutes: etaMinutes,
  })
  return data
}

export async function fetchDispatches() {
  const { data } = await api.get('/dispatch')
  return data
}

export async function fetchDispatchByIncident(incidentId) {
  const { data } = await api.get(`/dispatch/${incidentId}`)
  return data
}
