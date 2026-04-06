import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ScanLine } from 'lucide-react'
import Badge from '../components/ui/Badge'
import useScanStore from '../store/useScanStore'
import { groupByDay, formatTime } from '../utils/date'

const FILTER_OPTIONS = ['All', 'Safe', 'Moderate', 'Unsafe']

export default function HistoryPage() {
  const navigate = useNavigate()
  const { scanHistory, setCurrentResult } = useScanStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = scanHistory.filter((s) => {
    const matchesText = s.foodName.toLowerCase().includes(query.toLowerCase())
    const matchesFilter =
      filter === 'All' ||
      s.riskLevel?.toLowerCase() === filter.toLowerCase() ||
      (filter === 'Unsafe' && (s.riskLevel === 'UNSAFE' || s.riskLevel === 'CRITICAL'))
    return matchesText && matchesFilter
  })

  const groups = groupByDay(filtered)

  function openResult(scan) {
    setCurrentResult(scan.result)
    navigate('/result')
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">History</h1>
        <span className="text-sm text-stone-400 tabular-nums">{scanHistory.length} scans</span>
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 text-stone-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search past scans…"
          className="w-full h-11 pl-10 pr-4 bg-stone-100 border-0 rounded-xl text-sm
                     text-stone-900 placeholder-stone-400
                     focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={[
              'shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors duration-100',
              filter === opt
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {groups.length > 0 ? (
        <div className="flex flex-col gap-6 pb-4">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2 px-1">
                {label}
              </p>
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-stone-100">
                {items.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => openResult(scan)}
                    className="w-full flex items-center gap-4 px-4 py-3.5
                               hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-stone-900 truncate">
                        {scan.foodName}
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">
                        {formatTime(scan.scannedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-stone-600">
                        {scan.safetyScore}
                      </span>
                      <Badge risk={scan.riskLevel} size="sm" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState hasHistory={scanHistory.length > 0} />
      )}
    </div>
  )
}

function EmptyState({ hasHistory }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <ScanLine size={24} className="text-stone-400" />
      </div>
      <p className="text-lg font-semibold text-stone-900 mb-1">
        {hasHistory ? 'No results for this filter' : 'No scans yet'}
      </p>
      <p className="text-sm text-stone-500 mb-6 max-w-xs">
        {hasHistory
          ? 'Try a different search or clear the filter.'
          : 'Scan a food item to build your history.'}
      </p>
      {!hasHistory && (
        <button
          onClick={() => navigate('/scan')}
          className="h-10 px-5 bg-stone-900 text-white text-sm font-medium rounded-xl
                     hover:bg-stone-800 transition-colors"
        >
          Scan a Food
        </button>
      )}
    </div>
  )
}
