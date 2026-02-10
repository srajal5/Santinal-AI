import { useNavigate } from 'react-router-dom'
import { useAuth, useClerkUser } from '../context/AuthContext'
import { UserButton } from '@clerk/clerk-react'

function Navbar() {
  const { user } = useClerkUser()
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-50 navbar">
      <div className="flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" fill="currentColor" />
        </svg>
        <div className="flex items-baseline gap-2">
          <span className="brand text-sm font-semibold">Sentinel AI</span>
          <span className="brand-sub">Public Safety Control</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm status">
            <span className="status-dot" />
            <span>System Online</span>
          </div>
          <div className="flex items-center gap-2 text-sm status">
            <span className="status-dot" />
            <span>Monitoring Active</span>
          </div>
        </div>
        {/* Clerk UserButton for profile and logout */}
        <div className="flex items-center">
          <UserButton 
            appearance={{
              elements: {
                avatarBox: {
                  width: '32px',
                  height: '32px',
                },
                userButtonPopoverCard: {
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                },
                userButtonPopoverActionButton: {
                  color: '#e5e7eb',
                  '&:hover': {
                    backgroundColor: '#374151',
                  },
                },
                userButtonPopoverActionButtonText: {
                  color: '#e5e7eb',
                },
                userButtonPopoverFooter: {
                  display: 'none',
                },
              },
            }}
            afterSignOutUrl="/login"
            showName={false}
          />
        </div>
      </div>
    </header>
  )
}

export default Navbar
