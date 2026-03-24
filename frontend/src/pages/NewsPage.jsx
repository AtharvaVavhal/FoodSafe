import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const SEVERITY_COLORS = {
  HIGH:   { bg: 'rgba(255,80,60,0.1)',  border: 'rgba(255,80,60,0.3)',   text: '#ff6450', dot: '#ff6450', label: 'High' },
  MEDIUM: { bg: 'rgba(245,180,40,0.1)', border: 'rgba(245,180,40,0.3)',  text: '#f5c842', dot: '#f5c842', label: 'Medium' },
  LOW:    { bg: 'rgba(0,200,120,0.1)',   border: 'rgba(0,200,120,0.3)',   text: '#00e09c', dot: '#00e09c', label: 'Low' },
}

const TABS = [
  { key: null,     label: 'All' },
  { key: 'HIGH',   label: '🔴 High' },
  { key: 'MEDIUM', label: '🟡 Medium' },
  { key: 'LOW',    label: '🟢 Low' },
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
      // Try static fallback after 2s
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
    <div style={{
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      minHeight: '100vh',
      padding: '0 0 90px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .news-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px 16px;
          backdrop-filter: blur(12px);
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .news-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          border-color: rgba(255,255,255,0.15);
        }
        .news-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          border-radius: 0 3px 3px 0;
        }
        .news-tab {
          padding: 8px 18px;
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .news-tab:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
        }
        .news-tab.active {
          background: rgba(0,200,150,0.15);
          border-color: rgba(0,200,150,0.3);
          color: #00e09c;
          font-weight: 600;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .news-skeleton {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 10px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '24px 16px 16px',
        background: 'linear-gradient(180deg, rgba(0,200,150,0.06) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
              margin: 0, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              📰 Food Safety News
              <div className="live-dot" />
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#00e09c',
                background: 'rgba(0,224,156,0.12)',
                padding: '3px 10px', borderRadius: 20,
                border: '1px solid rgba(0,224,156,0.2)',
              }}>LIVE</span>
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontWeight: 300 }}>
              Real-time FSSAI alerts & Indian food safety updates
            </p>
          </div>
          <button onClick={() => fetchNews(true)} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '8px 14px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}>
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}>🔄</span>
            Refresh
          </button>
        </div>

        {lastUpdated && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
            Last updated: {lastUpdated.toLocaleTimeString('en-IN')}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '0 16px 16px',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.label}
            className={`news-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="news-skeleton" style={{ height: 110, opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            padding: 20, textAlign: 'center',
            background: 'rgba(255,80,60,0.08)',
            border: '1px solid rgba(255,80,60,0.2)',
            borderRadius: 14, color: '#ff6450', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Articles */}
        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {articles.length === 0 && (
              <div style={{
                textAlign: 'center', padding: 40,
                color: 'rgba(255,255,255,0.3)', fontSize: 14,
              }}>
                No news found for this filter.
              </div>
            )}
            {articles.map((article, i) => {
              const sev = SEVERITY_COLORS[article.severity] || SEVERITY_COLORS.MEDIUM
              const catIcon = CATEGORY_ICONS[article.category] || '📰'
              return (
                <div key={i} className="news-card" style={{
                  animation: `slideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both`,
                  borderLeftColor: sev.border,
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: sev.dot, borderRadius: '0 3px 3px 0' }} />

                  {/* Top row: category + severity + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>{catIcon}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 10px', borderRadius: 20,
                        background: sev.bg, border: `1px solid ${sev.border}`,
                        color: sev.text, letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>{sev.label} Risk</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
                      {article.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: 14, fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.45, margin: '0 0 6px',
                  }}>
                    {article.title}
                  </h3>

                  {/* Summary */}
                  {article.summary && (
                    <p style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.5, margin: '0 0 10px', fontWeight: 300,
                    }}>
                      {article.summary}
                    </p>
                  )}

                  {/* Footer: source + link */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>
                      📍 {article.source}
                    </span>
                    {article.source_url && (
                      <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                        style={{
                          fontSize: 10, color: '#00c896', textDecoration: 'none',
                          fontWeight: 600, letterSpacing: '0.03em',
                          transition: 'opacity 0.15s',
                        }}>
                        Read More →
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
