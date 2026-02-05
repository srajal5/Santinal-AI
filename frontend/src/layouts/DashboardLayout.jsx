import { CameraProvider } from '../context/CameraContext'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import AlertPanel from '../components/AlertPanel'

function DashboardLayout({ children, activeItem = 'Dashboard' }) {
  return (
    <CameraProvider>
      <div className="min-h-screen">
        <Navbar />
        <Sidebar activeItem={activeItem} />
        <AlertPanel />
        <main className="ml-64 mr-[300px] pt-14 min-h-screen p-6">
          {children}
        </main>
      </div>
    </CameraProvider>
  )
}

export default DashboardLayout
