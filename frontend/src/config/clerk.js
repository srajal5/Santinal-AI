/**
 * Clerk Authentication Configuration
 * 
 * To get your Clerk keys:
 * 1. Go to https://clerk.com and create a free account
 * 2. Create a new application
 * 3. Navigate to API Keys to find your keys
 * 
 * Publishable Key format: pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * Secret Key format: sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */

// Replace this with your actual Clerk publishable key
// Get it from: Clerk Dashboard > API Keys
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_your_key_here'

// Clerk frontend API (usually same as publishable key without pk_test prefix)
export const CLERK_FRONTEND_API = CLERK_PUBLISHABLE_KEY

// Configure Clerk appearance
export const clerkAppearance = {
  variables: {
    colorPrimary: '#16a34a', // Green-600 to match Sentinel theme
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#111827', // gray-900
    colorInputBackground: '#1f2937', // gray-800
    colorInputText: '#e5e7eb', // gray-200
    colorText: '#f9fafb', // gray-50
    colorTextSecondary: '#9ca3af', // gray-400
    borderRadius: '0.5rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  elements: {
    formButtonPrimary: {
      backgroundColor: '#16a34a',
      '&:hover': {
        backgroundColor: '#15803d',
      },
    },
    card: {
      backgroundColor: '#111827',
      border: '1px solid #374151',
    },
    input: {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
    },
  },
}

export default {
  CLERK_PUBLISHABLE_KEY,
  clerkAppearance,
}
