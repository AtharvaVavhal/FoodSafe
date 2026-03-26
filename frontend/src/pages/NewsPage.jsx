import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Newspaper, BellRing, ChevronRight, RefreshCw, Layers, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ── Derived from API data, not hardcoded ────────────────────────────────────
function getSeverityStyle(severity) {
  const styles = {
    HIGH:   { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500',    label: 'High'   },
    MEDIUM: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Medium' },
    LOW:    { bg: 'bg-brand/10',      border: 'border-brand/30',      text: 'text-brand',      dot: 'bg-brand',      label: 'Low'    },
  }
  return styles[severity?.toUpperCase()] || styles.MEDIUM
}

function getCategoryIcon(category) {
  const icons = {
    recall:  '🚨',
    warning: '⚠️',
    news:    '📰',
    update:  '📋',
  }
  return icons[category?.toLowerCase()] || '🗞'
}

export default function NewsPage() {
  const { lang } = useStore()
  const [articles,     setArticles]     = useState([])
  const [severityTabs, setSeverityTabs] = useState([])   // built from API data
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [activeTab,    setActiveTab]    = useState(null)  // null = All
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [refreshing,   setRefreshing]   = useState(false)
  const [newsSource,   setNewsSource]   = useState('')

  const fetchNews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const url = activeTab
        ? `${API_URL}/news/feed?severity=${activeTab}`
        : `${API_URL}/news/feed`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()

      const fetched = data.articles || []
      setArticles(fetched)
      setNewsSource(data.source || '')
      setLastUpdated(data.last_updated ? new Date(data.last_updated) : new Date())

      // Build severity tabs dynamically from what's actually in the data
      if (!activeTab && fetched.length > 0) {
        const severitiesInData = [...new Set(fetched.map(a => a.severity).filter(Boolean))]
        const order = ['HIGH', 'MEDIUM', 'LOW']
        const sorted = order.filter(s => severitiesInData.includes(s))
        setSeverityTabs(sorted)
      }
    } catch (e) {
      setError(e.message || 'Could not load news. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => { fetchNews() }, [fetchNews])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchNews(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  const severityEmoji = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex flex-col animate-fade-up px-3 md:px-8 py-6 max-w-4xl mx-auto w-full pb-32">

      {/* ── Header ── */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-6 backdrop-blur-xl">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-brand/10 blur-[50px] rounded-full pointer-events-none transform -translate-y-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-200 border border-white/10 flex items-center justify-center relative">
              <Newspaper className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand shadow-[0_0_8px_rgba(0,224,156,0.8)] border border-background" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">
                {t(lang, 'news') || 'Food Safety News'}
              </h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">
                Live FSSAI alerts
                {timeStr && ` · Last sync: ${timeStr}`}
                {newsSource && ` · ${newsSource === 'scraped+groq' ? 'Live sources + AI' : 'AI Analysis'}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-[11px] font-bold uppercase tracking-widest transition-all
              ${refreshing
                ? 'bg-surface-300 text-white/30 cursor-not-allowed'
                : 'bg-surface-100 hover:bg-surface-200 text-white/70 hover:text-white'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Severity Tabs (dynamic) ── */}
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar w-full mb-2">
        {/* All tab always present */}
        <button
          onClick={() => setActiveTab(null)}
          className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border
            ${activeTab === null
              ? 'bg-brand/10 text-brand border-brand/30 shadow-[0_0_12px_rgba(0,224,156,0.1)]'
              : 'bg-surface-100 text-white/40 border-white/5 hover:bg-surface-200 hover:text-white/80'}`}
        >
          All
        </button>

        {/* Severity tabs built from actual data */}
        {severityTabs.map(sev => (
          <button
            key={sev}
            onClick={() => setActiveTab(sev)}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border
              ${activeTab === sev
                ? 'bg-brand/10 text-brand border-brand/30 shadow-[0_0_12px_rgba(0,224,156,0.1)]'
                : 'bg-surface-100 text-white/40 border-white/5 hover:bg-surface-200 hover:text-white/80'}`}
          >
            {severityEmoji[sev]} {sev.charAt(0) + sev.slice(1).toLowerCase()} Risk
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 w-full">

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 rounded-[24px] bg-surface-100/50 border border-white/5 animate-pulse p-6 flex flex-col justify-between overflow-hidden relative">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-surface-300" />
                <div className="h-3 bg-surface-300 rounded w-1/4 mb-4" />
                <div className="h-4 bg-surface-300 rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-300 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-5 text-center bg-red-500/10 border border-red-500/20 rounded-[20px] text-red-400 text-sm font-medium flex flex-col items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            {error}
            <button
              onClick={() => fetchNews()}
              className="text-xs underline text-red-300 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Articles */}
        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-white/10 rounded-[32px] bg-surface-100/30">
                <Layers className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-white/40 text-sm font-medium">
                  No alerts found{activeTab ? ` for ${activeTab.toLowerCase()} severity` : ''}.
                </p>
                {activeTab && (
                  <button
                    onClick={() => setActiveTab(null)}
                    className="mt-3 text-xs text-brand/70 hover:text-brand transition-colors"
                  >
                    Show all alerts
                  </button>
                )}
              </div>
            ) : (
              articles.map((article, i) => {
                const sev     = getSeverityStyle(article.severity)
                const catIcon = getCategoryIcon(article.category)

                return (
                  <div
                    key={i}
                    className="bg-surface-100 border border-white/10 rounded-[24px] p-5 md:p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-surface-200/50 group"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Left severity bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${sev.dot}`} />

                    {/* Top row */}
                    <div className="flex justify-between items-center mb-4 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg bg-surface-300 w-8 h-8 rounded-lg flex items-center justify-center border border-white/5">
                          {catIcon}
                        </span>
                        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest ${sev.bg} ${sev.border} ${sev.text}`}>
                          {sev.label} Risk
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30 font-medium tracking-wider bg-surface-300 px-2 py-1 rounded-lg border border-white/5">
                        {article.date}
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <div className="pl-2">
                      <h3 className="text-[15px] font-bold text-white/90 leading-snug mb-2 group-hover:text-white transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-white/50 leading-relaxed font-medium mb-4 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/5 pl-2">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                        📍 {article.source || 'FSSAI Notification'}
                      </span>
                      {article.source_url ? (
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-brand hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          Read More <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/20 uppercase tracking-widest">
                          {article.source === 'FSSAI Food Recall Portal' ? 'Official Notice' : 'AI Analysis'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}