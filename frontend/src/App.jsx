import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import { IncidentProvider } from './context/IncidentContext'
import AlertsHelp from './pages/AlertsHelp'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'

function AppRoutes() {
  return (
    <AlertProvider>
      <IncidentProvider>
        <BrowserRouter>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/alerts-help" element={<AlertsHelp />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
      </IncidentProvider>
    </AlertProvider>
  )
}

function App() {
  const { authReady } = useAuth()
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }
  return <AppRoutes />
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
