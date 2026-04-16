import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import {
  Map as MapIcon, Database, AlertCircle, AlertOctagon,
  MapPin, Search, ChevronRight, CheckCircle2, X, Send,
  TrendingUp, Shield, Flame
} from 'lucide-react'

const API_URL = '/api'

// ── Risk config ────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  LOW:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: '#34d399', glow: 'rgba(52,211,153,0.4)',  label: 'Low Risk',      icon: Shield },
  MEDIUM:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: '#fbbf24', glow: 'rgba(251,191,36,0.4)',  label: 'Medium Risk',   icon: TrendingUp },
  HIGH:     { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: '#fb923c', glow: 'rgba(251,146,60,0.4)',  label: 'High Risk',     icon: AlertCircle },
  CRITICAL: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',     dot: '#f87171', glow: 'rgba(248,113,113,0.4)', label: 'Critical Risk', icon: Flame },
}
const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

// ── Leaflet map component (lazy-loads leaflet from CDN) ────────────────────
function LeafletMap({ cities, selected, onSelect, filter }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef = useRef({})
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || leafletMapRef.current) return
    const L = window.L

    leafletMapRef.current = L.map(mapRef.current, {
      center: [19.2, 76.5],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    })

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(leafletMapRef.current)

    // Subtle attribution
    L.control.attribution({ position: 'bottomleft', prefix: '' })
      .addAttribution('<span style="opacity:0.3;font-size:9px">© OpenStreetMap © CARTO</span>')
      .addTo(leafletMapRef.current)

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMapRef.current)
  }, [leafletLoaded])

  // Update markers when cities change
  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current) return
    const L = window.L
    const map = leafletMapRef.current

    // Remove old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    cities.forEach(city => {
      if (!city.lat || !city.lng) return
      const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
      const isFiltered = filter !== 'ALL' && city.risk !== filter
      if (isFiltered) return

      const isSel = selected === city.city
      const size = isSel ? 22 : city.reports > 25 ? 18 : city.reports > 15 ? 14 : 11

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:${size}px; height:${size}px;
            background:${cfg.dot};
            border-radius:50%;
            border: ${isSel ? '3px solid #fff' : '2px solid rgba(0,0,0,0.4)'};
            box-shadow: 0 0 ${isSel ? 20 : 10}px ${cfg.glow};
            transition: all 0.3s;
            ${city.risk === 'CRITICAL' ? 'animation: pulse 1.8s ease-in-out infinite;' : ''}
          "></div>
          <style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }</style>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([city.lat, city.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect(selected === city.city ? null : city.city))

      marker.bindTooltip(`
        <div style="background:#1a1a2e;border:1px solid ${cfg.dot}40;border-radius:10px;padding:8px 12px;color:#fff;font-family:sans-serif;min-width:120px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${city.city}</div>
          <div style="font-size:10px;color:${cfg.dot};text-transform:uppercase;letter-spacing:0.1em">${cfg.label}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">${city.reports} reports · ${city.topFood}</div>
        </div>
      `, { permanent: false, direction: 'top', offset: [0, -size / 2], opacity: 1, className: 'custom-tooltip' })

      markersRef.current[city.city] = marker
    })
  }, [cities, selected, filter, leafletLoaded])

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-[24px] overflow-hidden" style={{ zIndex: 0 }}>
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-100 gap-3" style={{ zIndex: 1 }}>
          <MapPin className="w-8 h-8 text-white/20 animate-bounce" />
          <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Loading Map…</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 420, background: '#0d0d1a', zIndex: 0 }} />
      {/* Vignette overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px]"
        style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)', zIndex: 1 }} />
    </div>
  )
}

// ── City Card ───────────────────────────────────────────────────────────────
function CityCard({ city, selected, onSelect, index }) {
  const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
  const Icon = cfg.icon
  const isSel = selected === city.city

  return (
    <div
      onClick={() => onSelect(isSel ? null : city.city)}
      className={`group relative flex items-center gap-3 p-3.5 cursor-pointer transition-all duration-300 rounded-2xl mx-2 my-1
        ${isSel
          ? `${cfg.bg} border ${cfg.border}`
          : 'hover:bg-white/5 border border-transparent'
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Risk dot */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${cfg.dot}18`, border: `1px solid ${cfg.dot}40` }}>
          <Icon className={`w-4 h-4 ${cfg.text}`} />
        </div>
        {city.risk === 'CRITICAL' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-[13px] font-bold truncate ${isSel ? 'text-white' : 'text-white/80'}`}>{city.city}</span>
          <span className="text-[10px] font-bold text-white/25 ml-2 shrink-0">{city.reports}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] text-white/30 truncate">{city.topFood}</span>
        </div>
      </div>

      <ChevronRight className={`w-3.5 h-3.5 text-white/20 shrink-0 transition-transform duration-200
        ${isSel ? 'rotate-90 text-white/50' : 'group-hover:translate-x-0.5'}`} />
    </div>
  )
}

// ── Selected City Detail Panel ──────────────────────────────────────────────
function CityDetail({ city, onClose }) {
  const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
  const Icon = cfg.icon

  return (
    <div className={`relative overflow-hidden rounded-[24px] border ${cfg.border} p-5 animate-fade-up`}
      style={{ background: 'rgba(15,15,30,0.9)', backdropFilter: 'blur(20px)' }}>

      {/* Glow bg */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] pointer-events-none"
        style={{ background: cfg.glow, opacity: 0.15 }} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `${cfg.dot}20`, border: `1px solid ${cfg.dot}40` }}>
              <Icon className={`w-5 h-5 ${cfg.text}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{city.city}</h3>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1.5">Reports</div>
            <div className="text-2xl font-black text-white tabular-nums">{city.reports}</div>
          </div>
          <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1.5">Top Risk</div>
            <div className="text-sm font-bold text-white/90 leading-tight">{city.topFood || 'Various'}</div>
          </div>
        </div>

        {/* Risk bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Risk Level</span>
            <span className={`text-[9px] font-bold uppercase ${cfg.text}`}>{city.risk}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${{ LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 }[city.risk]}%`,
                background: cfg.dot,
                boxShadow: `0 0 8px ${cfg.glow}`,
              }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Report Form ─────────────────────────────────────────────────────────────
function ReportForm({ lang, token, onClose, onSuccess }) {
  const [food, setFood] = useState('')
  const [city, setCity] = useState('')
  const [brand, setBrand] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [step, setStep] = useState(1)

  const valid1 = food.trim() && city.trim()
  const valid2 = desc.trim().length >= 10

  async function submit() {
    if (!valid1 || !valid2) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/community/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ food_name: food.trim(), city: city.trim(), description: desc.trim(), brand: brand.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setMsg('success')
      setTimeout(() => { onSuccess?.(); onClose() }, 1800)
    } catch {
      setMsg('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md rounded-[28px] overflow-hidden animate-fade-up"
        style={{ background: 'rgba(14,14,28,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="relative p-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(239,68,68,0.08) 0%, transparent 70%)' }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Report Adulteration</h3>
                <p className="text-[10px] text-white/30 mt-0.5">Submitted anonymously · Helps the community</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mt-4 relative z-10">
            {[1, 2].map(s => (
              <div key={s} className="h-0.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: step >= s ? '#f87171' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {msg === 'success' && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-up">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm text-emerald-300 font-medium">Report submitted! Thank you 🙏</span>
            </div>
          )}
          {msg === 'error' && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-sm text-red-300 font-medium">Failed to submit. Try again.</span>
            </div>
          )}

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Food Name *</span>
                <input value={food} onChange={e => setFood(e.target.value)}
                  placeholder="e.g. Turmeric Powder, Buffalo Milk…"
                  className="w-full rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">City *</span>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Brand <span className="text-white/15">(opt)</span></span>
                  <input value={brand} onChange={e => setBrand(e.target.value)}
                    placeholder="Brand name"
                    className="w-full rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </label>
              </div>
              <button onClick={() => valid1 && setStep(2)} disabled={!valid1}
                className="mt-1 w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: valid1 ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.05)',
                  color: valid1 ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: valid1 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: valid1 ? '0 4px 20px rgba(239,68,68,0.25)' : 'none',
                  cursor: valid1 ? 'pointer' : 'not-allowed',
                }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <MapPin className="w-3.5 h-3.5 text-white/25" />
                <span className="text-xs text-white/50">{food} · {city}{brand && ` · ${brand}`}</span>
                <button onClick={() => setStep(1)} className="ml-auto text-[10px] text-red-400/70 hover:text-red-400 font-bold transition-colors">Edit</button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Describe the issue *</span>
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="What did you notice? Unusual smell, color, texture, or taste? Any symptoms after eating?"
                  rows={4}
                  className="w-full rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 outline-none transition-all resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <span className="text-[10px] text-white/20 text-right">{desc.length} chars · min 10</span>
              </label>

              <button onClick={submit} disabled={submitting || !valid2 || msg === 'success'}
                className="mt-1 w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: (!submitting && valid2) ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.05)',
                  color: (!submitting && valid2) ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: (!submitting && valid2) ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: (!submitting && valid2) ? '0 4px 20px rgba(239,68,68,0.25)' : 'none',
                  cursor: (!submitting && valid2) ? 'pointer' : 'not-allowed',
                }}>
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                  : <><Send className="w-4 h-4" /> Submit Report</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main MapPage ─────────────────────────────────────────────────────────────
export default function MapPage() {
  const { lang, token } = useStore()
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/community/city-risk`)
      .then(r => r.json())
      .then(d => { if (d.cities?.length) setCities(d.cities) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function refresh() {
    const r = await fetch(`${API_URL}/community/city-risk`)
    const d = await r.json()
    if (d.cities) setCities(d.cities)
  }

  const totalReports = cities.reduce((s, c) => s + c.reports, 0)
  const criticalCount = cities.filter(c => c.risk === 'CRITICAL').length
  const highCount = cities.filter(c => c.risk === 'HIGH').length
  const sel = selected ? cities.find(c => c.city === selected) : null

  const filtered = cities
    .filter(c => filter === 'ALL' || c.risk === filter)
    .filter(c => !search || c.city.toLowerCase().includes(search.toLowerCase()) || c.topFood?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk))

  return (
    <div className="flex flex-col animate-fade-up px-3 md:px-8 py-6 max-w-6xl mx-auto w-full pb-32">

      {/* ── Header ── */}
      <div className="relative p-6 md:p-8 rounded-[28px] mb-6 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <MapIcon className="w-6 h-6 text-white/70" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{t(lang, 'riskMap') || 'Adulteration Risk Map'}</h1>
              <p className="text-[11px] text-white/30 mt-0.5 uppercase tracking-widest font-medium">Maharashtra · Live Reports</p>
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { label: 'Total Reports', value: totalReports, color: 'text-white' },
              { label: 'Cities Tracked', value: cities.length, color: 'text-white' },
              { label: 'High Risk', value: criticalCount + highCount, color: 'text-red-400', icon: AlertOctagon },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl min-w-[80px]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className={`text-xl font-black leading-none mb-1 ${color} flex items-center gap-1`}>
                  {Icon && <Icon className="w-4 h-4" />}{value}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">

        {/* ── Map ── */}
        <div className="flex flex-col gap-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {['ALL', ...RISK_ORDER].map(f => {
              const cfg = f !== 'ALL' ? RISK_CONFIG[f] : null
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border"
                  style={{
                    background: active ? (cfg ? `${cfg.dot}20` : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.04)',
                    color: active ? (cfg ? cfg.dot : '#fff') : 'rgba(255,255,255,0.3)',
                    borderColor: active ? (cfg ? `${cfg.dot}50` : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)',
                  }}>
                  {f === 'ALL' ? 'All Cities' : cfg.label}
                </button>
              )
            })}
          </div>

          {/* Leaflet map */}
          <div className="rounded-[24px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', height: 460 }}>
            <LeafletMap cities={cities} selected={selected} onSelect={setSelected} filter={filter} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-1 flex-wrap">
            {RISK_ORDER.map(r => {
              const cfg = RISK_CONFIG[r]
              return (
                <div key={r} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.glow}` }} />
                  <span className="text-[10px] text-white/30 font-medium">{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Selected city detail */}
          {sel && <CityDetail city={sel} onClose={() => setSelected(null)} />}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search city or food…"
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
          </div>

          {/* City list */}
          <div className="rounded-[24px] overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 200 }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Database className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                {filtered.length} {filtered.length === 1 ? 'City' : 'Cities'}
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-12 text-white/20 text-xs font-bold uppercase tracking-wider">
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                <Search className="w-7 h-7 text-white/10" />
                <p className="text-white/25 text-sm">No cities found</p>
              </div>
            ) : (
              <div className="overflow-y-auto py-2" style={{ maxHeight: 380 }}>
                {filtered.map((city, i) => (
                  <CityCard key={city.city} city={city} selected={selected} onSelect={setSelected} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 md:bottom-10 right-6 flex items-center gap-2.5 pl-4 pr-5 h-12 rounded-full font-bold text-sm tracking-wide transition-all duration-300 group"
        style={{
          zIndex: 1500,
          background: 'rgba(239,68,68,0.9)',
          border: '1px solid rgba(239,68,68,0.5)',
          boxShadow: '0 4px 24px rgba(239,68,68,0.35)',
          color: '#fff',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 32px rgba(239,68,68,0.55)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(239,68,68,0.35)'}>
        <AlertCircle className="w-4 h-4" />
        Report
      </button>

      {/* ── Report Form Modal ── */}
      {showForm && (
        <ReportForm
          lang={lang}
          token={token}
          onClose={() => setShowForm(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}