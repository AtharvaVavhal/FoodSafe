import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Users, Search, AlertOctagon, BarChart2, Database, Cpu, Globe, RefreshCcw, BellRing } from 'lucide-react'

const API_BASE = '/api'

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function StatCard({ label, value, sub, icon: Icon, colorClass = 'text-white' }) {
  return (
    <div className="bg-surface-100 border border-white/10 rounded-[24px] p-5 shadow-xl relative overflow-hidden group hover:bg-surface-200/50 transition-colors">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors pointer-events-none" />
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">{label}</div>
        {Icon && <div className="p-2 rounded-xl bg-surface-300/50 border border-white/5 text-white/50 group-hover:text-brand transition-colors"><Icon className="w-4 h-4" /></div>}
      </div>
      <div className={`relative z-10 text-3xl font-serif font-bold \${colorClass} leading-none mb-2`}>{value}</div>
      {sub && <div className="relative z-10 text-[11px] font-medium text-white/40">{sub}</div>}
    </div>
  )
}

function RiskBadge({ risk }) {
  const styles = {
    LOW:      'bg-brand/10 text-brand border-brand/20',
    MEDIUM:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
    HIGH:     'bg-red-500/10 text-red-400 border-red-500/20',
    CRITICAL: 'bg-red-900/40 text-red-500 border-red-500/40',
    UNKNOWN:  'bg-surface-300 text-white/50 border-white/10',
  }
  const s = styles[risk] || styles.UNKNOWN
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-widest \${s}`}>
      {risk}
    </span>
  )
}

function MiniChart({ data }) {
  if (!data?.length) return <div className="text-white/30 text-xs text-center py-6 font-medium tracking-wide">No data available</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex gap-2 items-end h-16 w-full">
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * 100, 10)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[9px] font-bold text-white/30 group-hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100">{d.count || 0}</span>
            <div 
              className="w-full max-w-[12px] rounded-t-sm transition-all duration-500 group-hover:brightness-125 bg-gradient-to-t from-brand/20 to-brand"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] font-bold text-white/30 uppercase">{d.day.charAt(0)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, max, colorClass = 'bg-brand' }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div className="flex-1 h-1.5 bg-surface-300 rounded-full overflow-hidden">
      <div className={`h-full \${colorClass} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const TABS = [
  { key: 'overview',  label: 'Overview',  Icon: BarChart2 },
  { key: 'scans',     label: 'Scans',     Icon: Search },
  { key: 'community', label: 'Community', Icon: Users },
  { key: 'fssai',     label: 'FSSAI',     Icon: ShieldCheck },
  { key: 'ml',        label: 'AI Core',   Icon: Cpu },
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
  const [refreshing,  setRefreshing]  = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
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
      setError('Cannot reach API backend — is the server running?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t) }, [])

  const RISK_COLORS = { LOW: 'text-brand bg-brand', MEDIUM: 'text-orange-400 bg-orange-400', HIGH: 'text-red-400 bg-red-400', CRITICAL: 'text-red-500 bg-red-500' }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center relative shadow-[0_0_32px_rgba(0,224,156,0.15)]">
        <Activity className="w-8 h-8 text-brand animate-pulse" />
      </div>
      <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] animate-pulse">Initializing System</div>
    </div>
  )

  if (error && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 animate-fade-up max-w-sm mx-auto text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center relative shadow-[0_0_32px_rgba(239,68,68,0.15)]">
        <AlertOctagon className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-red-400 text-sm font-medium">{error}</div>
      <button 
        onClick={() => load(true)} 
        className="px-6 py-3 rounded-xl bg-surface-200 border border-white/10 text-white/70 hover:text-white hover:bg-surface-300 transition-all font-bold text-[11px] uppercase tracking-wider"
      >
        Retry Connection
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen pb-32 animate-fade-up">
      
      {/* Top App Bar */}
      <div className="sticky top-0 z-40 bg-deep/80 backdrop-blur-xl border-b border-white/5 py-4 px-4 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-gold" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white font-serif tracking-wide leading-tight">FoodSafe Cortex</h1>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Command Center</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          {lastRefresh && (
            <span className="hidden md:inline text-[10px] text-white/30 font-bold uppercase tracking-widest">
              Live • {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button 
            onClick={() => load(true)} 
            disabled={refreshing}
            className={`p-2 border border-white/10 rounded-lg transition-all flex items-center justify-center
              \${refreshing ? 'bg-surface-300 text-white/30' : 'bg-surface-100 hover:bg-surface-200 text-white/60 hover:text-white'}`}
          >
            <RefreshCcw className={`w-4 h-4 \${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 md:mx-8 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 md:px-8 mt-6">
        <div className="flex gap-2 p-1.5 bg-surface-100/50 border border-white/5 rounded-2xl overflow-x-auto hide-scrollbar custom-scrollbar w-full sm:w-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shrink-0
                \${tab === t.key 
                  ? 'bg-surface-300 text-white shadow-md border border-white/10' 
                  : 'text-white/40 hover:text-white/80 hover:bg-surface-200/50'}`}
            >
              <t.Icon className={`w-4 h-4 \${tab === t.key ? 'text-gold' : ''}`} />
              {t.label}
              {t.key === 'scans' && scans.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[9px] border border-brand/20">{scans.length}</span>}
              {t.key === 'community' && reports.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] border border-blue-500/20">{reports.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 mt-6 max-w-6xl w-full mx-auto">

        {/* ── Overview Tab ── */}
        {tab === 'overview' && stats && (
          <div className="flex flex-col gap-6 animate-fade-up">
            
            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Search} label="Total Scans" value={stats.totalScans?.toLocaleString() || '0'} sub="All time" colorClass="text-brand" />
              <StatCard icon={Activity} label="Active Today" value={stats.todayScans || 0} sub="Scans in last 24h" colorClass="text-white" />
              <StatCard icon={AlertOctagon} label="High Risk (%)" value={`${stats.totalScans ? Math.round(((stats.highRiskScans || 0) / stats.totalScans) * 100) : 0}%`} sub={`${stats.highRiskScans || 0} critical scans`} colorClass="text-red-400" />
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers || 0} sub={`${stats.activeUsers || 0} active recently`} colorClass="text-white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <div className="bg-surface-100 border border-white/10 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-8 relative z-10 flex items-center gap-2">
                   <BarChart2 className="w-3.5 h-3.5" /> Scan Volume (7 Days)
                 </h3>
                 <div className="relative z-10 mt-auto">
                   <MiniChart data={stats.weeklyTrend} />
                 </div>
              </div>

              {/* Risk Breakdown */}
              <div className="bg-surface-100 border border-white/10 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                 <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-6 relative z-10 flex items-center gap-2">
                   <AlertOctagon className="w-3.5 h-3.5" /> Risk Distribution
                 </h3>
                 <div className="relative z-10 flex flex-col gap-4">
                   {Object.entries(stats.riskBreakdown || {}).length === 0 ? (
                     <div className="text-white/30 text-xs text-center py-4 font-medium">No distribution data</div>
                   ) : (
                     Object.entries(stats.riskBreakdown || {}).sort((a,b) => b[1]-a[1]).map(([level, count]) => {
                       const colorCls = RISK_COLORS[level] || 'text-white/50 bg-white/20'
                       const [textColor, bgColor] = colorCls.split(' ')
                       return (
                         <div key={level} className="flex items-center gap-3 group">
                           <div className={`w-14 text-[9px] font-bold uppercase tracking-wider \${textColor}`}>
                             {level}
                           </div>
                           <ProgressBar value={count} max={stats.totalScans || 1} colorClass={bgColor} />
                           <div className="w-10 text-right text-[10px] font-bold text-white/50 group-hover:text-white/80 transition-colors">
                             {stats.totalScans ? Math.round((count / stats.totalScans) * 100) : 0}%
                           </div>
                         </div>
                       )
                     })
                   )}
                 </div>
              </div>
            </div>

            {/* Minor Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-200/50 border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Avg Score</span>
                <span className="text-xl font-serif font-bold text-gold">{stats.avgScore || 0}</span>
                <span className="text-[9px] font-medium text-white/30 mt-1">/ 100</span>
              </div>
              <div className="bg-surface-200/50 border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Top Food</span>
                <span className="text-sm font-bold text-white/90 truncate w-full px-2">{stats.topFood || '—'}</span>
              </div>
              <div className="bg-surface-200/50 border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Top City</span>
                <span className="text-sm font-bold text-white/90 truncate w-full px-2">{stats.topCity || '—'}</span>
              </div>
              <div className="bg-surface-200/50 border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">FSSAI Reports</span>
                <span className="text-xl font-serif font-bold text-orange-400">{stats.fssaiViolations || 0}</span>
              </div>
            </div>

          </div>
        )}

        {/* ── Scans Tab ── */}
        {tab === 'scans' && (
          <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden shadow-xl animate-fade-up">
            <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-surface-200/30">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-white/50" /> Global Scans Live Feed
              </h3>
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded-md border border-brand/20">
                Latest {scans.length}
              </span>
            </div>
            
            {scans.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4 border-t border-white/5 bg-surface-100/30">
                <Search className="w-10 h-10 text-white/10" />
                <span className="text-xs font-medium text-white/30 uppercase tracking-widest">No scans recorded</span>
              </div>
            ) : (
              <div className="overflow-x-auto hide-scrollbar custom-scrollbar pb-2">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-200/50 border-b border-white/5">
                      {['Product / Food', 'Risk Assessment', 'Score', 'Location', 'Scanner Mode', 'Timestamp'].map(h => (
                        <th key={h} className="py-3.5 px-6 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scans.map((s, i) => (
                      <tr key={i} className="hover:bg-surface-200/30 transition-colors group">
                        <td className="py-4 px-6 font-bold text-white/90 text-sm">{s.food}</td>
                        <td className="py-4 px-6"><RiskBadge risk={s.risk} /></td>
                        <td className="py-4 px-6 text-xs font-bold text-white/50 group-hover:text-white/80">{s.score || '—'}</td>
                        <td className="py-4 px-6 text-xs font-medium text-white/60">{s.city || 'Unknown'}</td>
                        <td className="py-4 px-6 text-[10px] font-bold text-white/40 uppercase tracking-wider">{s.scan_type}</td>
                        <td className="py-4 px-6 text-[10px] font-medium text-white/30 whitespace-nowrap">{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Community Tab ── */}
        {tab === 'community' && (
          <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden shadow-xl animate-fade-up">
            <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-surface-200/30">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-white/50" /> Crowdsourced Reports
              </h3>
            </div>
            
            {reports.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <Users className="w-10 h-10 text-white/10" />
                <span className="text-xs font-medium text-white/30 uppercase tracking-widest">No reports submitted</span>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {reports.map((r, i) => (
                  <div key={i} className="p-5 md:p-6 hover:bg-surface-200/30 transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white/90 text-[15px]">{r.food_name}</span>
                          {r.brand && <span className="text-[10px] font-bold text-white/40 bg-surface-300 px-2 py-0.5 rounded-md border border-white/5">{r.brand}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                          📍 {r.city || 'Unknown Location'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.verified && <span className="text-[9px] font-bold uppercase tracking-widest bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-md">✓ Verified</span>}
                        <span className="text-[10px] font-bold text-white/50 bg-surface-300 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                          👍 {r.upvotes || 0}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-white/60 leading-relaxed mt-3">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FSSAI Tab ── */}
        {tab === 'fssai' && (
          <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden shadow-xl animate-fade-up">
            <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-surface-200/30">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white/50" /> Official Violations Database
              </h3>
            </div>
            
            {alerts.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <ShieldCheck className="w-10 h-10 text-white/10" />
                <span className="text-xs font-medium text-white/30 uppercase tracking-widest">No FSSAI alerts aggregated</span>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {alerts.map((a, i) => (
                  <div key={i} className="p-5 md:p-6 hover:bg-surface-200/30 transition-colors flex flex-col md:flex-row gap-4 md:items-center">
                     <div className="w-10 h-10 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                       <AlertOctagon className="w-5 h-5" />
                     </div>
                     <div className="flex-1 flex flex-col gap-1.5">
                       <div className="flex justify-between items-start md:items-center gap-3">
                         <h4 className="font-bold text-white/90 text-[14px]">{a.product || a.title || 'Regulatory Alert'}</h4>
                         <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap shrink-0">
                           {a.state || 'National'}
                         </span>
                       </div>
                       <p className="text-xs font-medium text-white/50 leading-relaxed">{a.violation || a.description || 'Details unavailable'}</p>
                       <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mt-1">{a.date}</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ML Tab ── */}
        {tab === 'ml' && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Core Nodes */}
              {[
                { id: 'llm_core', icon: Cpu, name: 'Groq LLaMA 3.1 (8B)', detail: 'Text/Ingredients analysis engine' },
                { id: 'llm_vision', icon: Globe, name: 'Groq LLaMA 4 Scout', detail: 'Optical Character/Logic parser' },
                { id: 'backend', icon: Database, name: 'FastAPI Router', detail: 'Traffic Director & DB Cache' },
              ].map((m) => (
                <div key={m.id} className="bg-surface-100 border border-white/10 rounded-[24px] p-5 flex items-start gap-4 shadow-md group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 blur-xl rounded-full group-hover:bg-brand/10 transition-colors pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col flex-1 z-10">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-[13px] font-bold text-white/90 leading-tight">{m.name}</h4>
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                         <span className="text-[8px] font-bold text-brand uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">{m.detail}</p>
                  </div>
                </div>
              ))}

              {/* Dynamic Models */}
              {Object.entries(mlStatus).map(([key, m]) => {
                const Icon = key === 'yolov8' ? Search : key === 'indicbert' ? Globe : key === 'prophet' ? BarChart2 : key === 'random_forest' ? Database : Activity
                const isLoaded = Boolean(m.loaded)
                const desc = m.classes ? `${m.classes} classes` : m.mappings ? `${m.mappings} mappings` : m.categories ? `${m.categories} categories` : 'Sub-process'

                return (
                  <div key={key} className={`bg-surface-100 border \${isLoaded ? 'border-brand/20' : 'border-white/10'} rounded-[24px] p-5 flex items-start gap-4 shadow-md group relative overflow-hidden transition-colors`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 blur-xl rounded-full group-hover:bg-brand/10 transition-colors pointer-events-none" />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border \${isLoaded ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-surface-300 border-white/5 text-white/30'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col flex-1 z-10">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="text-[13px] font-bold text-white/90 leading-tight">{m.label || key}</h4>
                        <div className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border \${isLoaded ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-surface-300 border-white/5 text-white/30'}`}>
                           {isLoaded && <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />}
                           <span className="text-[8px] font-bold uppercase tracking-widest">{isLoaded ? 'Active' : 'Offline'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">{desc}</p>
                    </div>
                  </div>
                )
              })}

            </div>
          </div>
        )}

      </div>
    </div>
  )
}