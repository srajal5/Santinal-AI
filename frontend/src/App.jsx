import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import { IncidentProvider } from './context/IncidentContext'
import { CLERK_PUBLISHABLE_KEY } from './config/clerk'
import AlertsHelp from './pages/AlertsHelp'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

// Protected routes wrapper
function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <AlertProvider>
        <IncidentProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alerts-help" element={<AlertsHelp />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </IncidentProvider>
      </AlertProvider>
    </ProtectedRoute>
  )
}

// App routes that checks auth state
function AppRoutes() {
  const { authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

function App() {
  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#16a34a",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "#111827",
          colorText: "#ffffff",
          colorTextSecondary: "#9ca3af",
          colorInputBackground: "#1f2937",
          colorInputBorder: "#374151",
          colorBorder: "#374151",
        },
        elements: {
          rootBox: {
            color: "#ffffff",
          },
          card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
          },
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ClerkProvider>
  )
}

export default App
