import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000'

// Store Clerk token reference - will be set by AuthContext
let getClerkToken = null

export const setClerkTokenGetter = (getter) => {
  getClerkToken = getter
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  // Try to get Clerk token if available
  if (getClerkToken) {
    try {
      const token = await getClerkToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Error getting Clerk token:', error)
    }
  }
  
  // Fallback to localStorage (for demo mode or other auth methods)
  const storedToken = localStorage.getItem('clerk_token')
  if (storedToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${storedToken}`
  }
  
  return config
})

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token might be expired - could trigger re-authentication here
      console.warn('Authentication error - token may be expired')
    }
    return Promise.reject(error)
  }
)

export default api
