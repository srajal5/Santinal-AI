import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

function ProtectedRoute({ children }) {
  const { userId, isLoaded } = useAuth()
  const location = useLocation()

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!userId) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
