import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Map as MapIcon, Database, AlertCircle, AlertOctagon, MapPin, Search, ChevronRight, CheckCircle2 } from 'lucide-react'

const API_URL = '/api'

const MH_BOUNDS = { latMin:15.6, latMax:22.1, lngMin:72.6, lngMax:80.9 }
const SVG_W = 560, SVG_H = 460

function latLngToXY(lat, lng) {
  const x = ((lng - MH_BOUNDS.lngMin) / (MH_BOUNDS.lngMax - MH_BOUNDS.lngMin)) * (SVG_W - 80) + 40
  const y = ((MH_BOUNDS.latMax - lat) / (MH_BOUNDS.latMax - MH_BOUNDS.latMin)) * (SVG_H - 80) + 40
  return { x: Math.round(x), y: Math.round(y) }
}

const _geoCache = {}
async function geocodeCity(cityName) {
  if (_geoCache[cityName]) return _geoCache[cityName]
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(cityName + ', Maharashtra, India')}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (data?.[0]) {
      const coords = latLngToXY(parseFloat(data[0].lat), parseFloat(data[0].lon))
      _geoCache[cityName] = coords
      return coords
    }
  } catch {}
  return null
}

const RISK_CONFIG = {
  LOW:      { bg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/30', dot: '#00e09c', label: 'Low Risk' },
  MEDIUM:   { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: '#fac775', label: 'Medium Risk' },
  HIGH:     { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: '#f7c1c1', label: 'High Risk' },
  CRITICAL: { bg: 'bg-red-900/40', text: 'text-red-500', border: 'border-red-600/50', dot: '#ff7b7b', label: 'Critical Risk' },
}

const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function MapPage() {
  const { lang, token } = useStore()
  const [cities, setCities] = useState([])
  const [mappedCities, setMappedCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [reportFood, setReportFood] = useState('')
  const [reportCity, setReportCity] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportBrand, setReportBrand] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/community/city-risk`)
      .then(r => r.json())
      .then(data => { if (data.cities?.length > 0) setCities(data.cities) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function submitReport() {
    if (!reportFood.trim() || !reportCity.trim() || !reportDesc.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/community/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ food_name: reportFood.trim(), city: reportCity.trim(), description: reportDesc.trim(), brand: reportBrand.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmitMsg(t(lang, 'reportSuccess') || 'Report submitted secretly.')
      setReportFood(''); setReportCity(''); setReportDesc(''); setReportBrand('')
      setTimeout(() => { setShowForm(false); setSubmitMsg('') }, 2000)
      
      const r2 = await fetch(`${API_URL}/community/city-risk`)
      const d2 = await r2.json()
      if (d2.cities) setCities(d2.cities)
    } catch {
      setSubmitMsg(t(lang, 'reportFailed') || 'Failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (cities.length === 0) return
    let cancelled = false
    async function geocodeAll() {
      const results = await Promise.all(
        cities.map(async city => {
          const coords = await geocodeCity(city.city)
          return coords ? { ...city, ...coords } : null
        })
      )
      if (!cancelled) setMappedCities(results.filter(Boolean))
    }
    geocodeAll()
    return () => { cancelled = true }
  }, [cities])

  const filtered = filter === 'ALL' ? mappedCities : mappedCities.filter(c => c.risk === filter)
  const sel = selected ? mappedCities.find(c => c.city === selected) : null

  const totalReports = cities.reduce((s, c) => s + c.reports, 0)
  const criticalCount = cities.filter(c => c.risk === 'CRITICAL').length
  const highCount = cities.filter(c => c.risk === 'HIGH').length

  return (
    <div className="flex flex-col animate-fade-up px-3 md:px-8 py-6 max-w-5xl mx-auto w-full pb-32">
      
      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-6 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-200 text-white border border-white/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
              <MapIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">{t(lang, 'riskMap')}</h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">{t(lang, 'riskMapSub')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-surface-200/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-xl font-serif font-bold text-brand leading-none mb-1">{totalReports}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">{t(lang, 'totalReports')}</span>
            </div>
            <div className="bg-surface-200/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-xl font-serif font-bold text-white leading-none mb-1">{cities.length}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">{t(lang, 'cities')}</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-xl font-serif font-bold text-red-400 leading-none mb-1 flex items-center gap-1">
                {criticalCount + highCount > 0 && <AlertOctagon className="w-3.5 h-3.5 text-red-500/80" />} {criticalCount + highCount}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">{t(lang, 'highRisk')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        
        {/* Map Area */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2 w-full">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => {
              const active = filter === f
              const cfg = f !== 'ALL' ? RISK_CONFIG[f] : null
              return (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border
                    \${active 
                      ? (cfg ? \`\${cfg.bg} \${cfg.text} \${cfg.border}\` : 'bg-surface-300 text-white border-white/20')
                      : 'bg-surface-100/50 text-white/40 border-white/5 hover:bg-surface-200 hover:text-white/80'}`}
                >
                  {f === 'ALL' ? t(lang, 'allCities') || 'All Cities' : cfg.label}
                </button>
              )
            })}
          </div>

          <div className="bg-surface-100 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative p-4 flex justify-center backdrop-blur-sm min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full absolute inset-0 text-white/30 text-xs font-bold uppercase tracking-widest gap-3">
                 <MapPin className="w-8 h-8 animate-bounce opacity-50" /> {t(lang, 'loadingMap') || 'Loading Map...'}
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 560 460" className="drop-shadow-2xl">
                {/* Simplified Maharashtra Outline Geometry (unchanged conceptually) */}
                <polygon
                  points="90,210 100,170 130,130 170,100 220,90 280,100 340,90 400,100 450,120 480,160 470,210 460,250 430,280 410,310 370,340 320,370 280,390 240,400 200,390 170,380 140,360 110,330 90,290 80,250"
                  fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinejoin="round"
                />

                {/* City nodes */}
                {mappedCities.map(city => {
                  const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
                  const isFiltered = filter !== 'ALL' && city.risk !== filter
                  const isSel = selected === city.city
                  const r = isSel ? 12 : city.reports > 25 ? 9 : city.reports > 15 ? 7 : 5

                  return (
                    <g key={city.city} style={{ cursor: 'pointer' }} onClick={() => setSelected(isSel ? null : city.city)} className="transition-all duration-300">
                      {city.risk === 'CRITICAL' && !isFiltered && (
                        <circle cx={city.x} cy={city.y} r={20} fill={cfg.dot} opacity={0.2} className="animate-pulse-slow" />
                      )}
                      {isSel && (
                        <circle cx={city.x} cy={city.y} r={r + 8} fill={cfg.dot} opacity={0.3} />
                      )}
                      
                      <circle
                        cx={city.x} cy={city.y} r={r}
                        fill={isFiltered ? '#333' : cfg.dot}
                        stroke={isFiltered ? '#444' : isSel ? '#fff' : 'rgba(0,0,0,0.5)'}
                        strokeWidth={isSel ? 3 : 1.5}
                        opacity={isFiltered ? 0.2 : 1}
                        className="transition-all duration-300"
                        style={!isFiltered ? { filter: `drop-shadow(0 0 8px \${cfg.dot})` } : {}}
                      />
                      
                      {!isFiltered && (
                        <text
                          x={city.x + 14} y={city.y + 4}
                          fontSize={11} fill={isSel ? '#fff' : 'rgba(255,255,255,0.6)'}
                          fontFamily="Inter, sans-serif"
                          fontWeight={isSel ? '700' : '500'}
                          className="transition-all duration-300 drop-shadow-md"
                        >
                          {city.city}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Internal Legend overlay */}
                <g transform="translate(20, 360)">
                  <rect x="-10" y="-10" width="120" height="90" fill="rgba(0,0,0,0.4)" rx="12" stroke="rgba(255,255,255,0.05)" backdropFilter="blur(8px)" />
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r, i) => (
                    <g key={r} transform={`translate(0, \${i * 20})`}>
                      <circle cx="8" cy="8" r="4" fill={RISK_CONFIG[r].dot} />
                      <text x="20" y="12" fontSize={10} fill="rgba(255,255,255,0.6)" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.05em">
                        {RISK_CONFIG[r].label}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            )}
          </div>
        </div>

        {/* Sidebar Info & List */}
        <div className="flex flex-col gap-6 w-full">
          {sel && (
             <div className={`p-6 bg-surface-100 border \${RISK_CONFIG[sel.risk]?.border || 'border-white/10'} rounded-[24px] shadow-2xl animate-fade-up flex flex-col gap-4 relative overflow-hidden backdrop-blur-md`}>
                <div className={`absolute top-0 right-0 w-32 h-32 \${RISK_CONFIG[sel.risk]?.bg || 'bg-white/5'} blur-[40px] rounded-full pointer-events-none`} />
                
                <div className="flex justify-between items-start relative z-10">
                  <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-white/50" /> {sel.city}
                  </h3>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border shrink-0 \${RISK_CONFIG[sel.risk]?.bg} \${RISK_CONFIG[sel.risk]?.text} \${RISK_CONFIG[sel.risk]?.border}`}>
                    {sel.risk} RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
                  <div className="bg-surface-200/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">{t(lang, 'reports')}</div>
                    <div className="text-2xl font-serif font-bold text-white">{sel.reports}</div>
                  </div>
                  <div className="bg-surface-200/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">{t(lang, 'topRiskyFood')}</div>
                    <div className="text-base font-bold text-white/90 truncate pr-2">{sel.topFood || 'Various'}</div>
                  </div>
                </div>
             </div>
          )}

          <div className="flex flex-col">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> {filtered.length} {t(lang, 'cities') || 'Cities'}
            </h3>
            
            <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden shadow-xl min-h-[200px] flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-white/30 text-[11px] font-bold uppercase tracking-wider">{t(lang, 'loading')}</div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                  <Search className="w-8 h-8 text-white/10" />
                  <p className="text-white/40 text-sm font-medium">{t(lang, 'noReports') || 'No reports found for this filter.'}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {[...filtered].sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk)).map(city => {
                    const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
                    return (
                      <div
                        key={city.city}
                        onClick={() => setSelected(selected === city.city ? null : city.city)}
                        className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-surface-200/50
                          \${selected === city.city ? 'bg-surface-200' : ''}`}
                      >
                        <div className="min-w-0 pr-4">
                          <h4 className="text-[13px] font-bold text-white/90 truncate">{city.city}</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium mt-0.5 truncate">{city.topFood || 'Various'}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-bold text-white/30">{city.reports} <span className="hidden sm:inline">{t(lang, 'reports') || 'reps'}</span></span>
                          <span className={`w-3 h-3 rounded-full shrink-0 border border-black/20`} style={{ background: cfg.dot }} />
                          <ChevronRight className={`w-4 h-4 text-white/20 transition-transform \${selected === city.city ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowForm(!showForm)}
        className={`fixed bottom-24 md:bottom-10 right-6 z-[100] w-14 h-14 rounded-full bg-brand hover:bg-brand-light text-deep border border-brand-light/50 flex items-center justify-center shadow-[0_0_24px_rgba(0,224,156,0.4)] hover:shadow-[0_0_32px_rgba(0,224,156,0.6)] hover:scale-105 transition-all duration-300 \${showForm ? 'rotate-45 !bg-surface-300 !text-white !border-white/20 !shadow-lg' : ''}`}
      >
        <span className="text-3xl leading-none font-light mb-1">+</span>
      </button>

      {/* Report Form Modal / Overlay */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-deep/80 backdrop-blur-sm z-[90] animate-fade-up opacity-100" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-24 md:bottom-28 right-6 left-6 md:left-auto md:w-[420px] z-[95] animate-fade-up">
            <div className="bg-surface-100 border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">{t(lang, 'reportAdulteration')}</h3>
              </div>

              {submitMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold \${submitMsg.includes('Failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand/10 text-brand border border-brand/20'}`}>
                  {submitMsg.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} {submitMsg}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <input
                  value={reportFood} onChange={e => setReportFood(e.target.value)}
                  placeholder={t(lang, 'foodNameLabel') || 'Food Name *'}
                  className="w-full bg-surface-200 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all font-medium"
                />
                <div className="flex gap-3">
                  <input
                    value={reportCity} onChange={e => setReportCity(e.target.value)}
                    placeholder={t(lang, 'city') || 'City *'}
                     className="w-full bg-surface-200 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all font-medium flex-1"
                  />
                  <input
                    value={reportBrand} onChange={e => setReportBrand(e.target.value)}
                    placeholder={`${t(lang, 'brands')} (opt)`}
                    className="w-full bg-surface-200 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all font-medium flex-1"
                  />
                </div>
                <textarea
                  value={reportDesc} onChange={e => setReportDesc(e.target.value)}
                  placeholder={t(lang, 'descriptionLabel') || 'Describe the issue... *'}
                  rows={3}
                  className="w-full bg-surface-200 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all font-medium resize-none"
                />
              </div>

              <button
                onClick={submitReport}
                disabled={submitting || !reportFood.trim() || !reportCity.trim() || !reportDesc.trim()}
                className={`w-full py-4 mt-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex justify-center items-center gap-2
                  \${submitting || !reportFood.trim() || !reportCity.trim() || !reportDesc.trim() 
                    ? 'bg-surface-200 text-white/30 border border-white/5 cursor-not-allowed' 
                    : 'bg-red-500 hover:bg-red-400 text-white shadow-[0_4px_24px_rgba(239,68,68,0.3)] border border-red-400'}`}
              >
                {submitting ? '⏳...' : `📢 ${t(lang, 'submitReport')}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}