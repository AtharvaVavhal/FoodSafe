import { useState } from 'react'
import { Bell } from 'lucide-react'
import { FSSAI_ALERTS, COMMUNITY_REPORTS } from '../data/mock'
import { getRiskConfig } from '../utils/risk'

const TABS = ['FSSAI Recalls', 'Community Reports']

const SEVERITY_STRIP = {
  CRITICAL: 'border-l-red-700',
  UNSAFE:   'border-l-red-500',
  MODERATE: 'border-l-amber-500',
  SAFE:     'border-l-emerald-500',
}

export default function AlertsPage() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col gap-6 pt-8">
      {/* Header */}
      <div className="px-5">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Alerts</h1>
        <p className="text-[15px] text-stone-500 mt-1">
          FSSAI recalls and community reports near you.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex px-5 border-b border-stone-200">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={[
              'pb-3 mr-6 text-sm font-medium transition-colors duration-100',
              'focus:outline-none focus-visible:underline',
              tab === i
                ? 'text-stone-900 border-b-2 border-stone-900 -mb-px'
                : 'text-stone-400 hover:text-stone-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 flex flex-col gap-3 pb-4">
        {tab === 0 ? <FssaiList /> : <CommunityList />}
      </div>
    </div>
  )
}

function FssaiList() {
  if (FSSAI_ALERTS.length === 0) return <EmptyState message="No active FSSAI recalls." />

  return (
    <>
      {FSSAI_ALERTS.map((alert) => {
        const risk = getRiskConfig(alert.severity)
        const strip = SEVERITY_STRIP[alert.severity] ?? SEVERITY_STRIP.MODERATE
        return (
          <div
            key={alert.id}
            className={`bg-white border border-stone-200 border-l-4 ${strip} rounded-2xl p-4 shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-stone-900 leading-snug">
                  {alert.product}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">{alert.brand}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${risk.badgeClass}`}>
                {risk.shortLabel}
              </span>
            </div>
            <p className="text-sm text-stone-700 mt-2 leading-snug">{alert.violation}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-stone-400">{alert.state}</span>
              <span className="text-stone-300" aria-hidden="true">·</span>
              <span className="text-xs text-stone-400">{alert.date}</span>
            </div>
          </div>
        )
      })}
    </>
  )
}

function CommunityList() {
  if (COMMUNITY_REPORTS.length === 0) return <EmptyState message="No reports near you." />

  return (
    <>
      {COMMUNITY_REPORTS.map((report) => (
        <div
          key={report.id}
          className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold text-stone-900 capitalize">{report.food}</p>
            <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full shrink-0">
              {report.reports} {report.reports === 1 ? 'report' : 'reports'}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">{report.location}</p>
          <p className="text-sm text-stone-700 mt-2 leading-snug">{report.description}</p>
          <p className="text-xs text-stone-400 mt-3">{report.date}</p>
        </div>
      ))}
    </>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <Bell size={24} className="text-stone-400" />
      </div>
      <p className="text-base font-medium text-stone-600">{message}</p>
      <p className="text-sm text-stone-400 mt-1">Check back later for updates.</p>
    </div>
  )
}
