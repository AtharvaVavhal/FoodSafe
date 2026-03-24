import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Newspaper, BellRing, ChevronRight, RefreshCw, Layers } from 'lucide-react'

const SEVERITY_COLORS = {
  HIGH:   { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',  dot: 'bg-red-500',   label: 'High' },
  MEDIUM: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Medium' },
  LOW:    { bg: 'bg-brand/10',      border: 'border-brand/30',      text: 'text-brand',    dot: 'bg-brand',     label: 'Low' },
}

const TABS = [
  { key: null,     label: 'All' },
  { key: 'HIGH',   label: '🔴 High Risk' },
  { key: 'MEDIUM', label: '🟡 Medium Risk' },
  { key: 'LOW',    label: '🟢 Low Risk' },
]

const CATEGORY_ICONS = {
  recall: '🚨',
  warning: '⚠️',
  news: '📰',
  update: '📋',
}

export default function NewsPage() {
  const { lang } = useStore()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const API = import.meta.env.VITE_API_URL || '/api'

  const fetchNews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const url = activeTab ? `${API}/news/feed?severity=${activeTab}` : `${API}/news/feed`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setArticles(data.articles || [])
      setLastUpdated(data.last_updated ? new Date(data.last_updated) : new Date())
    } catch {
      setError('Could not load news. Retrying...')
      setTimeout(() => fetchNews(), 2000)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [API, activeTab])

  useEffect(() => { fetchNews() }, [fetchNews])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchNews(true), 60000)
    return () => clearInterval(interval)
  }, [fetchNews])

  return (
    <div className="flex flex-col animate-fade-up px-3 md:px-8 py-6 max-w-4xl mx-auto w-full pb-32">
      
      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-6 backdrop-blur-xl">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-brand/10 blur-[50px] rounded-full pointer-events-none transform -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-200 border border-white/10 flex items-center justify-center relative">
              <Newspaper className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand shadow-[0_0_8px_rgba(0,224,156,0.8)] border border-background"></span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">
                {t(lang, 'news') || 'Food Safety News'}
              </h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">
                Real-time FSSAI alerts {lastUpdated && `• Last sync: \${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-[11px] font-bold uppercase tracking-widest transition-all
              \${refreshing ? 'bg-surface-300 text-white/30 cursor-not-allowed' : 'bg-surface-100 hover:bg-surface-200 text-white/70 hover:text-white'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 \${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar custom-scrollbar w-full mb-2">
        {TABS.map(tab => (
          <button
            key={tab.label}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border
              \${activeTab === tab.key 
                ? 'bg-brand/10 text-brand border-brand/30 shadow-[0_0_12px_rgba(0,224,156,0.1)]' 
                : 'bg-surface-100 text-white/40 border-white/5 hover:bg-surface-200 hover:text-white/80'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 w-full">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-32 rounded-[24px] bg-surface-100/50 border border-white/5 animate-pulse-slow p-6 flex flex-col justify-between overflow-hidden relative">
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
             <BellRing className="w-6 h-6 animate-pulse" /> {error}
          </div>
        )}

        {/* Articles List */}
        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {articles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-white/10 rounded-[32px] bg-surface-100/30">
                <Layers className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-white/40 text-sm font-medium">No alerts found for this filter criteria.</p>
              </div>
            )}
            
            {articles.map((article, i) => {
              const sev = SEVERITY_COLORS[article.severity] || SEVERITY_COLORS.MEDIUM
              const catIcon = CATEGORY_ICONS[article.category] || '🗞'
              
              return (
                <div 
                  key={i} 
                  className={`bg-surface-100 border border-white/10 rounded-[24px] p-5 md:p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-surface-200/50 group`}
                  style={{ animation: `fadeUp 0.5s ease forwards \${i * 0.05}s`, opacity: 0 }}
                >
                  {/* Left severity indicator line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 \${sev.dot} shadow-[0_0_8px_\${sev.bg}]`} />
                  
                  {/* Top row */}
                  <div className="flex justify-between items-center mb-4 pl-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg bg-surface-300 w-8 h-8 rounded-lg flex items-center justify-center border border-white/5">{catIcon}</span>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest \${sev.bg} \${sev.border} \${sev.text}`}>
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
                  <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto pl-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      📍 {article.source || 'FSSAI Notification'}
                    </span>
                    {article.source_url && (
                      <a 
                        href={article.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-brand hover:text-brand-light uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        Read More <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
