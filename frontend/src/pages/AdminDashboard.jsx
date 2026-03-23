import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function StatCard({ label, value, sub, color = '#1a1a1a', icon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px',
      border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: '#999', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color, marginTop: 6, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function RiskBadge({ risk }) {
  const colors = {
    LOW:      { bg: '#EAF3DE', color: '#27500A' },
    MEDIUM:   { bg: '#FAEEDA', color: '#854F0B' },
    HIGH:     { bg: '#FCEBEB', color: '#A32D2D' },
    CRITICAL: { bg: '#F7C1C1', color: '#7F0000' },
    UNKNOWN:  { bg: '#f0f0e8', color: '#888' },
  }
  const s = colors[risk] || colors.UNKNOWN
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600 }}>
      {risk}
    </span>
  )
}

function MiniChart({ data, color = '#1a3d2b' }) {
  if (!data?.length) return <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', padding: 16 }}>No data</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 64 }}>
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * 56, 2)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9, color: '#bbb' }}>{d.count || ''}</span>
            <div style={{ width: '100%', height: h, background: color, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
            <span style={{ fontSize: 9, color: '#bbb' }}>{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, max, color }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div style={{ flex: 1, height: 6, background: '#f0f0e8', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: '📊' },
  { key: 'scans',     label: 'Scans',     icon: '🔍' },
  { key: 'community', label: 'Community', icon: '👥' },
  { key: 'fssai',     label: 'FSSAI',     icon: '🏛️' },
  { key: 'ml',        label: 'AI / ML',   icon: '🤖' },
]

export default function AdminDashboard() {
  const [tab,         setTab]         = useState('overview')
  const [stats,       setStats]       = useState(null)
  const [scans,       setScans]       = useState([])
  const [reports,     setReports]     = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [mlStatus,    setMlStatus]    = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  async function load() {
    try {
      setError(null)
      const [s, sc, rep, alt, ml] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/recent-scans?limit=30'),
        apiFetch('/community/reports').catch(() => ({ reports: [] })),
        apiFetch('/fssai/alerts').catch(() => ({ alerts: [] })),
        apiFetch('/admin/ml-status').catch(() => ({ models: {} })),
      ])
      setStats(s)
      setScans(sc.scans || [])
      setReports(rep.reports || rep || [])
      setAlerts(alt.alerts || alt || [])
      setMlStatus(ml.models || {})
      setLastRefresh(new Date())
    } catch (e) {
      setError('Cannot reach backend — is it running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  const RISK_COLOR = { LOW: '#639922', MEDIUM: '#854F0B', HIGH: '#A32D2D', CRITICAL: '#7F0000' }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 36 }}>🌿</div>
      <div style={{ color: '#888', fontSize: 14 }}>Loading FoodSafe Admin...</div>
    </div>
  )

  if (error && !stats) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ color: '#A32D2D', fontSize: 14 }}>{error}</div>
      <button onClick={load} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1a3d2b', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f7f5f0', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2818 0%, #1a3d2b 100%)',
        padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌿</div>
          <div>
            <div style={{ color: '#f5f0e8', fontSize: 15, fontWeight: 600 }}>FoodSafe Admin</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.06em' }}>DASHBOARD</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastRefresh && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#95d5b2' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Live</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', borderBottom: '1px solid #f7c1c1', padding: '8px 24px', fontSize: 12, color: '#A32D2D' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ece8df', padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.key ? 600 : 400, whiteSpace: 'nowrap',
            color: tab === t.key ? '#1a3d2b' : '#999',
            borderBottom: tab === t.key ? '2px solid #1a3d2b' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
            {t.key === 'scans' && scans.length > 0 && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: '#EAF3DE', color: '#27500A' }}>{scans.length}</span>
            )}
            {t.key === 'community' && reports.length > 0 && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: '#f0f8ff', color: '#185FA5' }}>{reports.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Overview ── */}
        {tab === 'overview' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <StatCard icon="🔍" label="Total Scans"   value={stats.totalScans?.toLocaleString() ?? '0'} sub="all time" />
              <StatCard icon="📅" label="Today"         value={stats.todayScans ?? 0} sub="scans today" color='#1a3d2b' />
              <StatCard icon="⚠️" label="High Risk"     value={stats.highRiskScans ?? 0} sub={`${stats.totalScans ? Math.round((stats.highRiskScans / stats.totalScans) * 100) : 0}% of total`} color='#A32D2D' />
              <StatCard icon="👤" label="Active Users"  value={stats.activeUsers ?? 0} sub="scanned at least once" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <StatCard icon="👥" label="Total Users"      value={stats.totalUsers ?? 0} sub="registered" />
              <StatCard icon="⭐" label="Avg Safety Score" value={`${stats.avgScore ?? 0}/100`} sub="across all scans" color='#854F0B' />
              <StatCard icon="🥘" label="Top Food"         value={stats.topFood ?? '—'} sub="most scanned" />
              <StatCard icon="📍" label="Top City"         value={stats.topCity ?? '—'} sub="most scans" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Scans — Last 7 Days</div>
                <MiniChart data={stats.weeklyTrend} color='#1a3d2b' />
              </div>
              <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Risk Breakdown</div>
                {Object.entries(stats.riskBreakdown || {}).map(([level, count]) => (
                  <div key={level} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 60px', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: RISK_COLOR[level], fontWeight: 600 }}>{level}</span>
                    <ProgressBar value={count} max={stats.totalScans || 1} color={RISK_COLOR[level]} />
                    <span style={{ fontSize: 10, color: '#aaa', textAlign: 'right' }}>{count} ({stats.totalScans ? Math.round((count / stats.totalScans) * 100) : 0}%)</span>
                  </div>
                ))}
                {!Object.keys(stats.riskBreakdown || {}).length && <p style={{ color: '#ccc', fontSize: 12 }}>No data yet</p>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <StatCard icon="📋" label="Community Reports" value={stats.communityReports ?? 0} sub="user submissions" color='#185FA5' />
              <StatCard icon="🏛️" label="FSSAI Violations"  value={stats.fssaiViolations ?? 0} sub="in database" color='#854F0B' />
            </div>
          </div>
        )}

        {/* ── Scans ── */}
        {tab === 'scans' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ece8df', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f3ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Scans</div>
              <span style={{ fontSize: 11, color: '#999', background: '#f7f5f0', padding: '3px 10px', borderRadius: 10 }}>{scans.length} records</span>
            </div>
            {scans.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No scans yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#faf9f7' }}>
                      {['Food', 'Risk', 'Score', 'City', 'Type', 'Time'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#999', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #ece8df' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #faf9f7' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1a1a1a' }}>{s.food}</td>
                        <td style={{ padding: '10px 16px' }}><RiskBadge risk={s.risk} /></td>
                        <td style={{ padding: '10px 16px', color: '#666' }}>{s.score ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#888' }}>{s.city}</td>
                        <td style={{ padding: '10px 16px', color: '#aaa', fontSize: 11 }}>{s.scan_type}</td>
                        <td style={{ padding: '10px 16px', color: '#bbb', fontSize: 11 }}>{s.time}</td>
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
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ece8df', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f3ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Community Reports</div>
              <span style={{ fontSize: 11, color: '#999', background: '#f7f5f0', padding: '3px 10px', borderRadius: 10 }}>{reports.length} reports</span>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No community reports yet</div>
            ) : (
              <div style={{ padding: '0 20px' }}>
                {reports.map((r, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < reports.length - 1 ? '1px solid #f5f3ee' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.food_name}</span>
                        {r.brand && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>· {r.brand}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.verified && <span style={{ fontSize: 10, background: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>✓ Verified</span>}
                        <span style={{ fontSize: 11, color: '#aaa' }}>👍 {r.upvotes}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>📍 {r.city}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.5 }}>{r.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FSSAI ── */}
        {tab === 'fssai' && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ece8df', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f3ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>FSSAI Alerts</div>
              <span style={{ fontSize: 11, color: '#999', background: '#f7f5f0', padding: '3px 10px', borderRadius: 10 }}>{alerts.length} alerts</span>
            </div>
            {alerts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#ccc', fontSize: 13 }}>No FSSAI alerts yet</div>
            ) : (
              <div style={{ padding: '0 20px' }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < alerts.length - 1 ? '1px solid #f5f3ee' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{a.product || a.title || 'Unknown'}</span>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, background: '#FAEEDA', color: '#854F0B', whiteSpace: 'nowrap', fontWeight: 600 }}>{a.state || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 5, lineHeight: 1.5 }}>{a.violation || a.description || '—'}</div>
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>{a.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ML / AI ── */}
        {tab === 'ml' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>AI & ML Components</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>Real-time status of all models and services</div>
            </div>

            {Object.entries(mlStatus).map(([key, m]) => (
              <div key={key} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: m.loaded ? '#EAF3DE' : '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {key === 'yolov8' ? '👁️' : key === 'indicbert' ? '🗣️' : key === 'prophet' ? '📈' : key === 'random_forest' ? '🌲' : '⚡'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {m.classes ? `${m.classes} food classes` : m.mappings ? `${m.mappings} Hindi/Marathi mappings` : m.categories ? `${m.categories} seasonal categories` : 'AI service'}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 600, background: m.loaded ? '#EAF3DE' : '#f5f5f0', color: m.loaded ? '#27500A' : '#bbb' }}>
                  {m.loaded ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
            ))}

            {[
              { icon: '⚡', name: 'Groq LLaMA 3.1 (8B)', detail: 'Text scanning & food safety analysis' },
              { icon: '👁️', name: 'Groq LLaMA 4 Scout',  detail: 'Image & label analysis (vision)' },
              { icon: '🌐', name: 'FastAPI Backend',       detail: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ece8df', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{m.detail}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 600, background: '#EAF3DE', color: '#27500A' }}>✓ Active</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}