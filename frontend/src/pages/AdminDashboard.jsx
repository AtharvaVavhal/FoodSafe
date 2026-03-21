import { useState, useEffect } from 'react'
import axios from 'axios'

const API = axios.create({ baseURL: '/api' })

// ── Mini chart bar ────────────────────────────────────────
function Bar({ value, max, color = '#1a3d2b' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#f0f0e8', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, minWidth: 28, textAlign: 'right', color: '#555' }}>{value}</span>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#1a1a1a' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #e0e0d8' }}>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null)
  const [scans,    setScans]    = useState([])
  const [reports,  setReports]  = useState([])
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('overview')

  useEffect(() => {
    async function load() {
      try {
        const [reps, alts] = await Promise.all([
          API.get('/community/reports').then(r => r.data),
          API.get('/fssai/alerts').then(r => r.data),
        ])
        setReports(reps)
        setAlerts(alts)

        // Mock aggregate stats (in production: dedicated /admin/stats endpoint)
        setStats({
          totalScans:    1284,
          todayScans:    47,
          highRiskScans: 312,
          activeUsers:   203,
          whatsappMsgs:  891,
          avgScore:      62,
          topFood:       'Turmeric',
          topCity:       'Nagpur',
        })
        setScans([
          { food: 'Turmeric Powder', risk: 'HIGH',   city: 'Nagpur',  time: '2m ago' },
          { food: 'Buffalo Milk',    risk: 'MEDIUM', city: 'Pune',    time: '5m ago' },
          { food: 'Mustard Oil',     risk: 'HIGH',   city: 'Nagpur',  time: '11m ago' },
          { food: 'Honey',           risk: 'MEDIUM', city: 'Mumbai',  time: '18m ago' },
          { food: 'Basmati Rice',    risk: 'LOW',    city: 'Nashik',  time: '24m ago' },
          { food: 'Paneer',          risk: 'HIGH',   city: 'Aurangabad', time: '31m ago' },
        ])
      } finally { setLoading(false) }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const RISK_COLOR = { LOW:'#639922', MEDIUM:'#854F0B', HIGH:'#A32D2D', CRITICAL:'#7F0000' }
  const RISK_BG    = { LOW:'#EAF3DE', MEDIUM:'#FAEEDA', HIGH:'#FCEBEB', CRITICAL:'#F7C1C1' }
  const TABS = ['overview', 'scans', 'community', 'fssai', 'ml']

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'monospace', color:'#666' }}>
      Loading FoodSafe Admin...
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8f9f6', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{ background: '#0d2318', padding: '12px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ color:'#fff', fontSize:16, fontWeight:500 }}>🌿 FoodSafe Admin</div>
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#95d5b2', marginTop:4 }} />
          <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid #e0e0d8', padding:'0 24px', display:'flex', gap:4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 14px', border:'none', background:'none', cursor:'pointer',
                     fontSize:12, fontWeight: tab===t?500:400,
                     color: tab===t?'#1a3d2b':'#888',
                     borderBottom: tab===t?'2px solid #1a3d2b':'2px solid transparent' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px 24px', maxWidth:1100, margin:'0 auto' }}>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <StatCard label="Total Scans"       value={stats.totalScans.toLocaleString()} sub="all time" />
              <StatCard label="Today"             value={stats.todayScans}  sub="scans today" color='#1a3d2b' />
              <StatCard label="High Risk Scans"   value={stats.highRiskScans} sub={`${Math.round(stats.highRiskScans/stats.totalScans*100)}% of total`} color='#A32D2D' />
              <StatCard label="Active Users"      value={stats.activeUsers} sub="last 7 days" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <StatCard label="WhatsApp Messages" value={stats.whatsappMsgs} sub="all time" color='#25D366' />
              <StatCard label="Avg Safety Score"  value={`${stats.avgScore}/100`} sub="across all scans" color='#854F0B' />
              <StatCard label="Top Scanned Food"  value={stats.topFood}  sub="this week" />
              <StatCard label="Top City"          value={stats.topCity}  sub="most scans" />
            </div>

            {/* Risk distribution */}
            <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'0.5px solid #e0e0d8' }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#666', marginBottom:12 }}>Risk Distribution — Top Foods</div>
              {[
                { food:'Turmeric Powder', high:48, medium:32, low:20 },
                { food:'Mustard Oil',     high:41, medium:38, low:21 },
                { food:'Buffalo Milk',    high:29, medium:44, low:27 },
                { food:'Honey',           high:35, medium:40, low:25 },
                { food:'Paneer',          high:52, medium:31, low:17 },
              ].map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr 1fr', gap:8, marginBottom:8, alignItems:'center' }}>
                  <span style={{ fontSize:12 }}>{item.food}</span>
                  <Bar value={item.high}   max={60} color='#A32D2D' />
                  <Bar value={item.medium} max={60} color='#EF9F27' />
                  <Bar value={item.low}    max={60} color='#639922' />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr 1fr', gap:8, marginTop:4 }}>
                <span />
                {['High','Medium','Low'].map((l,i) => (
                  <span key={i} style={{ fontSize:10, color:['#A32D2D','#854F0B','#639922'][i], textAlign:'center' }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent scans tab */}
        {tab === 'scans' && (
          <div style={{ background:'#fff', borderRadius:12, padding:16, border:'0.5px solid #e0e0d8' }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Recent Scans (Live)</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #f0f0e8' }}>
                  {['Food','Risk','City','Time'].map(h => (
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#888', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((s,i) => (
                  <tr key={i} style={{ borderBottom:'0.5px solid #f8f8f4' }}>
                    <td style={{ padding:'8px 10px', fontWeight:500 }}>{s.food}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10,
                                      background:RISK_BG[s.risk], color:RISK_COLOR[s.risk] }}>
                        {s.risk}
                      </span>
                    </td>
                    <td style={{ padding:'8px 10px', color:'#666' }}>{s.city}</td>
                    <td style={{ padding:'8px 10px', color:'#aaa' }}>{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Community reports tab */}
        {tab === 'community' && (
          <div style={{ background:'#fff', borderRadius:12, padding:16, border:'0.5px solid #e0e0d8' }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Community Reports</div>
            {reports.length === 0
              ? <p style={{ color:'#aaa', textAlign:'center', padding:30 }}>No community reports yet.</p>
              : reports.map((r,i) => (
                <div key={i} style={{ padding:'10px 0', borderBottom:i<reports.length-1?'0.5px solid #f0f0e8':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:500, fontSize:13 }}>{r.food_name}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {r.verified && <span style={{ fontSize:10, background:'#EAF3DE', color:'#27500A', padding:'1px 6px', borderRadius:8 }}>Verified</span>}
                      <span style={{ fontSize:11, color:'#888' }}>👍 {r.upvotes}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>📍 {r.city} · {r.brand || 'Unknown brand'}</div>
                  <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{r.description}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* FSSAI tab */}
        {tab === 'fssai' && (
          <div style={{ background:'#fff', borderRadius:12, padding:16, border:'0.5px solid #e0e0d8' }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>FSSAI Violations Database</div>
            {alerts.length === 0
              ? <p style={{ color:'#aaa', textAlign:'center', padding:30 }}>No FSSAI data yet. Run seed.py to populate.</p>
              : alerts.map((a,i) => (
                <div key={i} style={{ padding:'10px 0', borderBottom:i<alerts.length-1?'0.5px solid #f0f0e8':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:500, fontSize:13 }}>{a.brand || 'Unknown'} — {a.product}</span>
                    <span style={{ fontSize:11, color:'#888' }}>{a.state}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#666', marginTop:3 }}>{a.violation}</div>
                  <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{a.date?.slice(0,10)}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* ML Status tab */}
        {tab === 'ml' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { name:'YOLOv8 Food Detection',     status:'Ready',    metric:'mAP50: 0.91',   color:'#27500A', bg:'#EAF3DE' },
              { name:'MuRIL NLP (HI/MR/EN)',       status:'Ready',    metric:'Acc: 91%',      color:'#27500A', bg:'#EAF3DE' },
              { name:'Prophet Seasonal Model',      status:'Ready',    metric:'MAE: 2.3',      color:'#27500A', bg:'#EAF3DE' },
              { name:'Risk Weight Model',           status:'Pending',  metric:'Needs retraining', color:'#854F0B', bg:'#FAEEDA' },
              { name:'Celery Worker',               status:'Running',  metric:'2 tasks scheduled', color:'#185FA5', bg:'#E6F1FB' },
              { name:'FSSAI Scraper (weekly)',      status:'Scheduled',metric:'Next: Monday 6am IST', color:'#534AB7', bg:'#EEEDFE' },
            ].map((m,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, padding:14, border:'0.5px solid #e0e0d8',
                                     display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{m.metric}</div>
                </div>
                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:10, background:m.bg, color:m.color }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
