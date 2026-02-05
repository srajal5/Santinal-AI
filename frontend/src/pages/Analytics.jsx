import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import DashboardLayout from '../layouts/DashboardLayout'
import { useIncident } from '../context/IncidentContext'

const CHART_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

function useIncidentsOverTime(incidents) {
  return useMemo(() => {
    if (!incidents?.length) return []
    const byDate = {}
    incidents.forEach((inc) => {
      const d = inc.reported_at
      const key = d
        ? new Date(d).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'Unknown'
      byDate[key] = (byDate[key] || { count: 0, ts: d ? new Date(d).getTime() : 0 })
      byDate[key].count += 1
    })
    return Object.entries(byDate)
      .map(([date, { count, ts }]) => ({ date, count, ts }))
      .sort((a, b) => a.ts - b.ts)
  }, [incidents])
}

function useIncidentsBySeverity(incidents) {
  return useMemo(() => {
    if (!incidents?.length) return []
    const bySeverity = {}
    incidents.forEach((inc) => {
      const s = (inc.severity || 'low').toLowerCase()
      bySeverity[s] = (bySeverity[s] || 0) + 1
    })
    return SEVERITY_ORDER.filter((s) => bySeverity[s]).map((s) => ({
      name: s,
      value: bySeverity[s],
      fill: CHART_COLORS[s] ?? CHART_COLORS.low,
    }))
  }, [incidents])
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1f2937', border: '1px solid #374151' },
  labelStyle: { color: '#9ca3af' },
}

function IncidentsOverTimeChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 text-sm">
        No incident data to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
        <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#22c55e"
          fillOpacity={1}
          fill="url(#colorCount)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function IncidentsBySeverityChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 text-sm">
        No incident data to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} stroke="#1f2937" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => (
            <span className="text-gray-300 capitalize">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function SeverityBarChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 text-sm">
        No incident data to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="name"
          stroke="#9ca3af"
          fontSize={12}
          tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} name="Count" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Analytics() {
  const { incidents, loading, error } = useIncident()
  const overTimeData = useIncidentsOverTime(incidents)
  const bySeverityData = useIncidentsBySeverity(incidents)

  return (
    <DashboardLayout activeItem="Analytics">
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Analytics</h2>

        {loading && (
          <div className="flex items-center justify-center py-24 text-gray-500">
            Loading analytics...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-amber-900/20 border border-amber-700/50 p-6 text-amber-400 text-center">
            Unable to load incident data
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Incidents Over Time
              </h3>
              <IncidentsOverTimeChart data={overTimeData} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Incidents by Severity (Pie)
                </h3>
                <IncidentsBySeverityChart data={bySeverityData} />
              </section>
              <section className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Incidents by Severity (Bar)
                </h3>
                <SeverityBarChart data={bySeverityData} />
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Analytics
