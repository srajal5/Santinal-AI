import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import CameraList from './CameraList'
import AddCameraModal from './AddCameraModal'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Incidents', path: '/incidents' },
  { label: 'Alerts & Help', path: '/alerts-help' },
  { label: 'Analytics', path: '/analytics' },
]

function Sidebar() {
  const location = useLocation()
  const [openAdd, setOpenAdd] = useState(false)

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 pt-6 z-40 overflow-y-auto sidebar-surface">
      <nav className="flex flex-col gap-1 px-4">
        {NAV_ITEMS.map(({ label, path }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={label}
              to={path}
              aria-current={isActive ? 'page' : undefined}
              className={`px-4 py-3 rounded-lg text-sm block focus-ring ${isActive ? 'nav-item nav-item--active' : 'nav-item'}`}
            >
              <span className="mr-2 nav-bullet">•</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 mt-4">
        <button
          type="button"
          onClick={() => setOpenAdd(true)}
          className="w-full px-4 py-2.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 focus-ring"
        >
          Add Camera
        </button>
      </div>
      <CameraList />
      <AddCameraModal open={openAdd} onClose={() => setOpenAdd(false)} />
    </aside>
  )
}

export default Sidebar
