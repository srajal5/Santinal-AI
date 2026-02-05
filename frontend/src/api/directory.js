import api from './axios'

export async function fetchDirectory() {
  const { data } = await api.get('/directory')
  return data
}
