import { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

const TOKEN_KEY = 'sentinel_token'
const USER_KEY = 'sentinel_user'
const DEMO_EMAIL = 'admin@sentinel.com'
const DEMO_PASSWORD = 'admin123'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const autoLoginAttempted = useRef(false)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      setAuthReady(true)
      return
    }
    if (autoLoginAttempted.current) return
    autoLoginAttempted.current = true
    api
      .post('/auth/login', { email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .then(({ data }) => {
        const accessToken = data.access_token
        localStorage.setItem(TOKEN_KEY, accessToken)
        return api.get('/auth/me').then(({ data: userData }) => ({
          email: userData.email,
          role: userData.role,
        }))
      })
      .then((userObj) => {
        setToken(localStorage.getItem(TOKEN_KEY))
        setUser(userObj)
        localStorage.setItem(USER_KEY, JSON.stringify(userObj))
      })
      .catch(() => {})
      .finally(() => setAuthReady(true))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const accessToken = data.access_token
    localStorage.setItem(TOKEN_KEY, accessToken)
    const { data: userData } = await api.get('/auth/me')
    const userObj = { email: userData.email, role: userData.role }
    setToken(accessToken)
    setUser(userObj)
    localStorage.setItem(USER_KEY, JSON.stringify(userObj))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = { user, token, login, logout, authReady }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
