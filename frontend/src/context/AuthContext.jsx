/**
 * Auth Context that wraps Clerk authentication
 * Provides the same interface as the original AuthContext for backward compatibility
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { 
  ClerkProvider, 
  useAuth as useClerkAuth, 
  useUser,
} from '@clerk/clerk-react'
import { CLERK_PUBLISHABLE_KEY } from '../config/clerk'
import { setClerkTokenGetter } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { isLoaded, userId, getToken } = useClerkAuth()
  const { user } = useUser()
  const [token, setToken] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  // Register the token getter with axios when getToken is available
  useEffect(() => {
    if (getToken) {
      setClerkTokenGetter(getToken)
    }
  }, [getToken])

  useEffect(() => {
    if (isLoaded && userId) {
      // Get the Clerk token
      getToken().then((clerkToken) => {
        setToken(clerkToken)
        // Also store in localStorage as backup
        if (clerkToken) {
          localStorage.setItem('clerk_token', clerkToken)
        }
        setAuthReady(true)
      }).catch(() => {
        setAuthReady(true)
      })
    } else if (isLoaded && !userId) {
      setToken(null)
      localStorage.removeItem('clerk_token')
      setAuthReady(true)
    }
  }, [isLoaded, userId, getToken])

  const logout = async () => {
    // Clerk handles logout via SignIn component or clerk.signOut()
    // This is handled by the SignedOut component automatically
    setToken(null)
    localStorage.removeItem('clerk_token')
  }

  // Extract user info from Clerk user
  const userInfo = user ? {
    email: user.primaryEmailAddress?.emailAddress || '',
    role: 'admin', // Default role - can be extended with custom metadata
    name: user.fullName || user.firstName || '',
    id: user.id,
  } : null

  const value = {
    user: userInfo,
    token,
    logout,
    authReady: isLoaded,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Wrapper component that provides the ClerkProvider
export function ClerkAuthProvider({ children }) {
  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#16a34a',
          colorTextOnPrimaryBackground: '#ffffff',
          colorBackground: '#111827',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Re-export Clerk's useUser hook for components that need direct Clerk user access
export { useUser as useClerkUser }
