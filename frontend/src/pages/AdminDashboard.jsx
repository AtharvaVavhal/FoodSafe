import { useState, useEffect } from 'react'
import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
})

function Bar({ value, max, color = '#1a3d2b' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#f0f0e8', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, minWidth: 28, textAlign: 'right', color: '#555' }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, sub, color = '#1a1a1a' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #e0e0d8' }}>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div style={{ flex: 1, height: 6, background: '#f0f0e8', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,      setStats]      = useState(null)
  const [scans,      setScans]      = useState([])
  const [reports,    setReports]    = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [mlStatus,   setMlStatus]   = useState({})
  const [scraper,    setScraper]    = useState(null)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [tab,        setTab]        = useState('overview')
  const [lastRefresh, setLastRefresh] = useState(null)

  async function load() {
    try {
      setError(null)
      const [statsRes, scansRes, repsRes, altsRes, mlRes, scraperRes] = await Promise.all([
        API.get('/admin/stats').then(r => r.data),
        API.get('/admin/recent-scans?limit=20').then(r => r.data),
        API.get('/community/reports').then(r => r.data).catch(() => ({ reports: [] })),
        API.get('/fssai/alerts').then(r => r.data).catch(() => ({ alerts: [] })),
        API.get('/admin/ml-status').then(r => r.data).catch(() => ({ models: {} })),
        API.get('/admin/scraper-stats').then(r => r.data).catch(() => null),
      ])
      setStats(statsRes)
      setScans(scansRes.scans || [])
      setReports(repsRes.reports || repsRes || [])
      setAlerts(altsRes.alerts || altsRes || [])
      setMlStatus(mlRes.models || {})
      setScraper(scraperRes)
      setLastRefresh(new Date())
    } catch (e) {
      console.error('Admin load error:', e)
      setError('Failed to load admin data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  async function triggerScraper() {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res = await API.post('/admin/scraper/trigger')
      setTriggerMsg(res.data.success
        ? { type: 'ok', text: `✅ Task queued — ID: ${res.data.task_id}. Check back in ~2 min.` }
        : { type: 'err', text: `❌ ${res.data.error}` }
      )
    } catch (e) {
      setTriggerMsg({ type: 'err', text: `❌ Request failed: ${e.message}` })
    } finally {
      setTriggering(false)
    }
  }

  const RISK_COLOR = { LOW: '#639922', MEDIUM: '#854F0B', HIGH: '#A32D2D', CRITICAL: '#7F0000', UNKNOWN: '#888' }
  const RISK_BG    = { LOW: '#EAF3DE', MEDIUM: '#FAEEDA', HIGH: '#FCEBEB', CRITICAL: '#F7C1C1', UNKNOWN: '#f0f0e8' }
  const TABS = ['overview', 'scans', 'community', 'fssai', 'ml', 'scraper']

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', color: '#666', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 24 }}>🌿</div>
      Loading FoodSafe Admin...
    </div>
  )

  if (error && !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#A32D2D', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 14 }}>{error}</div>
      <button onClick={load} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a3d2b', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
        Retry
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8f9f6', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{ background: '#0d2318', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>🌿 FoodSafe Admin</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {lastRefresh && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#95d5b2' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Live</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#FCEBEB', border: '1px solid #f7c1c1', padding: '8px 24px', fontSize: 12, color: '#A32D2D' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e0e0d8', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                     fontSize: 12, fontWeight: tab === t ? 500 : 400, whiteSpace: 'nowrap',
                     color: tab === t ? '#1a3d2b' : '#888',
                     borderBottom: tab === t ? '2px solid #1a3d2b' : '2px solid transparent' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'scans' && scans.length > 0 && (
              <span style={{ marginLeft: 5, fontSize: 9, padding: '1px 5px', borderRadius: 6, background: '#EAF3DE', color: '#27500A' }}>
                {scans.length}
              </span>
            )}
            {t === 'scraper' && scraper && (
              <span style={{ marginLeft: 5, fontSize: 9, padding: '1px 5px', borderRadius: 6,
                background: scraper.rag?.status === 'healthy' ? '#EAF3DE' : '#FAEEDA',
                color: scraper.rag?.status === 'healthy' ? '#27500A' : '#854F0B' }}>
                {scraper.rag?.indexed || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Overview ── */}
        {tab === 'overview' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <StatCard label="Total Scans"     value={stats.totalScans?.toLocaleString() ?? '0'} sub="all time" />
              <StatCard label="Today"           value={stats.todayScans ?? 0}  sub="scans today" color='#1a3d2b' />
              <StatCard label="High Risk Scans" value={stats.highRiskScans ?? 0}
                sub={`${stats.totalScans ? Math.round((stats.highRiskScans / stats.totalScans) * 100) : 0}% of total`}
                color='#A32D2D' />
              <StatCard label="Active Users"    value={stats.activeUsers ?? 0} sub="scanned at least once" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <StatCard label="Total Users"      value={stats.totalUsers ?? 0} sub="registered" />
              <StatCard label="Avg Safety Score" value={`${stats.avgScore ?? 0}/100`} sub="across all scans" color='#854F0B' />
              <StatCard label="Top Scanned Food" value={stats.topFood ?? '—'} sub="most popular" />
              <StatCard label="Top City"         value={stats.topCity ?? '—'} sub="most scans" />
            </div>

            {/* Weekly trend */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Scans — Last 7 Days</div>
              {(stats.weeklyTrend || []).length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 16 }}>No scan data yet</p>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                  {(stats.weeklyTrend || []).map((d, i) => {
                    const max = Math.max(...(stats.weeklyTrend || []).map(x => x.count), 1)
                    const h = Math.max((d.count / max) * 52, 2)
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9, color: '#aaa' }}>{d.count || ''}</span>
                        <div style={{ width: '100%', height: h, background: '#1a3d2b', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                        <span style={{ fontSize: 9, color: '#aaa' }}>{d.day}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Risk breakdown */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Risk Breakdown</div>
              {Object.entries(stats.riskBreakdown || {}).length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 12 }}>No scan data yet</p>
              ) : (
                Object.entries(stats.riskBreakdown || {}).map(([level, count]) => (
                  <div key={level} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: RISK_COLOR[level], fontWeight: 500 }}>{level}</span>
                    <Bar value={count} max={stats.totalScans || 1} color={RISK_COLOR[level]} />
                    <span style={{ fontSize: 10, color: '#aaa', textAlign: 'right' }}>
                      {stats.totalScans ? Math.round((count / stats.totalScans) * 100) : 0}%
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Extra stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Community Reports" value={stats.communityReports ?? 0} sub="user submissions" color='#185FA5' />
              <StatCard label="FSSAI Violations"  value={stats.fssaiViolations ?? 0} sub="in database" color='#854F0B' />
            </div>
          </div>
        )}

        {/* ── Scans ── */}
        {tab === 'scans' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '0.5px solid #e0e0d8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Recent Scans (Live)</div>
              <span style={{ fontSize: 11, color: '#888' }}>{scans.length} records</span>
            </div>
            {scans.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: 30, fontSize: 13 }}>No scans yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0e8' }}>
                      {['Food', 'Risk', 'Score', 'City', 'Type', 'Time'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#888', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid #f8f8f4' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{s.food}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10,
                                          background: RISK_BG[s.risk] || '#f0f0e8',
                                          color: RISK_COLOR[s.risk] || '#555' }}>
                            {s.risk}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{s.score ?? '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{s.city}</td>
                        <td style={{ padding: '8px 10px', color: '#aaa', fontSize: 11 }}>{s.scan_type}</td>
                        <td style={{ padding: '8px 10px', color: '#aaa' }}>{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Community ── */}
        {tab === 'community' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '0.5px solid #e0e0d8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Community Reports</div>
              <span style={{ fontSize: 11, color: '#888' }}>{reports.length} reports</span>
            </div>
            {reports.length === 0
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 30 }}>No community reports yet.</p>
              : reports.map((r, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < reports.length - 1 ? '0.5px solid #f0f0e8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{r.food_name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.verified && <span style={{ fontSize: 10, background: '#EAF3DE', color: '#27500A', padding: '1px 6px', borderRadius: 8 }}>Verified</span>}
                      <span style={{ fontSize: 11, color: '#888' }}>👍 {r.upvotes}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {r.city} · {r.brand || 'Unknown brand'}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{r.description}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── FSSAI ── */}
        {tab === 'fssai' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '0.5px solid #e0e0d8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>FSSAI Alerts</div>
              <span style={{ fontSize: 11, color: '#888' }}>{alerts.length} alerts</span>
            </div>
            {alerts.length === 0
              ? <p style={{ color: '#aaa', textAlign: 'center', padding: 30 }}>No FSSAI alerts yet.</p>
              : alerts.map((a, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < alerts.length - 1 ? '0.5px solid #f0f0e8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{a.product || a.title || 'Unknown'}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#FAEEDA', color: '#854F0B' }}>
                      {a.state || '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{a.violation || a.description || '—'}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{a.date}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── ML ── */}
        {tab === 'ml' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>ML Model Status</div>
              <div style={{ fontSize: 11, color: '#888' }}>Real-time status of all AI/ML components</div>
            </div>
            {Object.entries(mlStatus).map(([key, m]) => (
              <div key={key} style={{ background: '#fff', borderRadius: 10, padding: 14, border: '0.5px solid #e0e0d8',
                                       display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {m.classes ? `${m.classes} food classes` :
                     m.mappings ? `${m.mappings} Hindi/Marathi mappings` :
                     m.categories ? `${m.categories} food categories` : 'ML model'}
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10,
                  background: m.loaded ? '#EAF3DE' : '#FAEEDA',
                  color:      m.loaded ? '#27500A' : '#854F0B' }}>
                  {m.loaded ? '✓ Running' : '✗ Not loaded'}
                </span>
              </div>
            ))}
            {[
              { name: 'Groq LLaMA 3.1 (Vision + Text)', metric: 'llama-3.1-8b-instant + llama-4-scout', ok: true },
              { name: 'FastAPI Backend', metric: import.meta.env.VITE_API_URL || 'http://localhost:8000/api', ok: true },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 14, border: '0.5px solid #e0e0d8',
                                     display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.metric}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: '#EAF3DE', color: '#27500A' }}>
                  ✓ Running
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Scraper ── */}
        {tab === 'scraper' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {scraper === null ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '0.5px solid #e0e0d8', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🕷️</div>
                <div style={{ fontSize: 13, color: '#888' }}>Scraper stats unavailable — scraper may not have run yet.</div>
              </div>
            ) : (
              <>
                {/* Top stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <StatCard label="Total DB Records"  value={scraper?.totalRecords ?? '—'} sub="FSSAI violations" color='#1a3d2b' />
                  <StatCard label="RAG Indexed"        value={scraper?.rag?.indexed ?? '—'} sub={`${scraper?.rag?.coverage ?? 0}% coverage`} color='#185FA5' />
                  <StatCard label="RAG Status"         value={scraper?.rag?.status ?? '—'}
                    color={scraper?.rag?.status === 'healthy' ? '#27500A' : '#A32D2D'} sub="ChromaDB" />
                  <StatCard label="Last Scrape"
                    value={scraper?.lastScrapeAt ? new Date(scraper.lastScrapeAt).toLocaleDateString('en-IN') : 'Never'}
                    sub={scraper?.lastScrapeAt ? new Date(scraper.lastScrapeAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'} />
                </div>

                {/* Manual trigger */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Manual Scraper Trigger</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        Queues a full scrape + LLM parse + RAG index run via Celery. Takes ~3 minutes.
                      </div>
                    </div>
                    <button onClick={triggerScraper} disabled={triggering}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: triggering ? 'not-allowed' : 'pointer',
                               background: triggering ? '#ccc' : '#1a3d2b', color: '#fff', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {triggering ? 'Queuing…' : '▶ Run Scraper'}
                    </button>
                  </div>
                  {triggerMsg && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                      background: triggerMsg.type === 'ok' ? '#EAF3DE' : '#FCEBEB',
                      color: triggerMsg.type === 'ok' ? '#27500A' : '#A32D2D' }}>
                      {triggerMsg.text}
                    </div>
                  )}
                </div>

                {/* Records added per day */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Records Added — Last 7 Days</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                    {(scraper?.dailyAdds || []).map((d, i) => {
                      const max = Math.max(...(scraper?.dailyAdds || []).map(x => x.count), 1)
                      const h = Math.max((d.count / max) * 52, 2)
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 9, color: '#aaa' }}>{d.count || ''}</span>
                          <div style={{ width: '100%', height: h, background: '#185FA5', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                          <span style={{ fontSize: 9, color: '#aaa' }}>{d.day}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Top products */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Top Flagged Products</div>
                    {(scraper?.topProducts || []).map((p, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{p.product}</div>
                          <MiniBar value={p.count} max={(scraper?.topProducts?.[0]?.count || 1)} color='#A32D2D' />
                        </div>
                        <span style={{ fontSize: 11, color: '#A32D2D', fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{p.count}</span>
                      </div>
                    ))}
                    {!scraper?.topProducts?.length && <p style={{ color: '#aaa', fontSize: 12 }}>No data yet</p>}
                  </div>

                  {/* Top states */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Top States with Violations</div>
                    {(scraper?.topStates || []).map((s, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{s.state}</div>
                          <MiniBar value={s.count} max={(scraper?.topStates?.[0]?.count || 1)} color='#EF9F27' />
                        </div>
                        <span style={{ fontSize: 11, color: '#854F0B', fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{s.count}</span>
                      </div>
                    ))}
                    {!scraper?.topStates?.length && <p style={{ color: '#aaa', fontSize: 12 }}>No data yet</p>}
                  </div>
                </div>

                {/* Active sources */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Data Sources</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(scraper?.sources || {}).map(([key, label]) => (
                      <div key={key} style={{ padding: '5px 10px', borderRadius: 8, background: '#f0f8ff',
                                              border: '0.5px solid #b5d4f4', fontSize: 11, color: '#185FA5' }}>
                        ✓ {label}
                      </div>
                    ))}
                    {!Object.keys(scraper?.sources || {}).length && (
                      <p style={{ color: '#aaa', fontSize: 12 }}>No sources configured</p>
                    )}
                  </div>
                </div>

                {/* Recent records */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '0.5px solid #e0e0d8' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 12 }}>Recent Violations (Last 10)</div>
                  {(scraper?.recentRecords || []).length === 0
                    ? <p style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 16 }}>No records yet — run the scraper</p>
                    : (scraper?.recentRecords || []).map((r, i) => (
                      <div key={i} style={{ padding: '9px 0', borderBottom: i < (scraper?.recentRecords?.length - 1) ? '0.5px solid #f0f0e8' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 500, fontSize: 12 }}>{r.product}</span>
                            {r.brand && r.brand !== 'Unknown' && (
                              <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>· {r.brand}</span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#FAEEDA', color: '#854F0B', whiteSpace: 'nowrap' }}>
                            {r.state}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{r.date}</div>
                      </div>
                    ))
                  }
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}