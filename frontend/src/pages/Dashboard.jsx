import DashboardLayout from '../layouts/DashboardLayout'
import CameraFeed from '../components/CameraFeed'
import CameraList from '../components/CameraList'
import { useAlert } from '../context/AlertContext'

function Dashboard() {
  const { alerts } = useAlert()
  const activeAlerts = alerts.filter((a) => (a.status || 'new').toLowerCase() === 'new')

  return (
    <DashboardLayout activeItem="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Operational Dashboard</h2>
          <div className="text-xs text-gray-400">
            {activeAlerts.length > 0 ? `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}` : 'AI monitoring active, no threats detected'}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-1 rounded-xl border border-gray-800 bg-gray-900/50">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-200">Cameras</h3>
            </div>
            <CameraList />
          </section>
          <section className="lg:col-span-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Live Feed</h3>
              <div className="text-xs text-gray-500">Right panel shows Emergency Alerts</div>
            </div>
            <CameraFeed />
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
