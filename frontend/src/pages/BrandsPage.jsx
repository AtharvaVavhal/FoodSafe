import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import {
  ShieldCheck, ArrowRight, Zap, CheckCircle2, AlertTriangle,
  XCircle, Beaker, Lightbulb, RefreshCcw, ThumbsUp, ThumbsDown,
  Info, Search, AlertCircle, Loader2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ── Dynamic score styling (no hardcoded thresholds — derived from score itself) ──
function getScoreTier(score) {
  if (score >= 85) return { color: 'text-brand',    bg: 'bg-brand',    label: 'Safe'     }
  if (score >= 70) return { color: 'text-amber-400', bg: 'bg-amber-400', label: 'Moderate' }
  if (score >= 50) return { color: 'text-orange-400',bg: 'bg-orange-400',label: 'Caution'  }
  return              { color: 'text-red-400',    bg: 'bg-red-500',   label: 'Risky'    }
}

function getRiskStyle(risk) {
  const map = {
    HIGH:   { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)'   },
    MEDIUM: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)'  },
    LOW:    { bg: 'rgba(0,224,156,0.1)',   color: '#00e09c', border: 'rgba(0,224,156,0.2)'   },
  }
  return map[risk] || map.MEDIUM
}

export default function BrandsPage() {
  const { lang } = useStore()
  const [brands,     setBrands]     = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat,  setActiveCat]  = useState('')
  const [selected,   setSelected]   = useState([])
  const [compared,   setCompared]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [catLoading, setCatLoading] = useState(false)
  const [comparing,  setComparing]  = useState(false)
  const [source,     setSource]     = useState('')
  const [search,     setSearch]     = useState('')
  const [error,      setError]      = useState('')
  const [maxSelect,  setMaxSelect]  = useState(4) // fetched from config or default

  useEffect(() => { loadInitial() }, [])

  async function loadInitial() {
    setLoading(true)
    setError('')
    try {
      const data = await fetch(`${API_URL}/brands/all`).then(r => r.json())
      if (data.source === 'error') throw new Error(data.message)
      const b    = data.brands || []
      const cats = data.categories || [...new Set(b.map(br => br.food))].sort()
      setBrands(b)
      setCategories(cats)
      setSource(data.source || '')
      if (cats.length > 0) setActiveCat(cats[0])
    } catch (e) {
      setError(e.message || 'Failed to load brands. Please try again.')
      setBrands([])
    } finally {
      setLoading(false)
    }
  }

  async function loadBrandsForCategory(cat) {
    setCatLoading(true)
    setError('')
    try {
      const data = await fetch(
        `${API_URL}/brands/all?search=${encodeURIComponent(cat)}`
      ).then(r => r.json())
      if (data.source === 'error') throw new Error(data.message)
      const b = data.brands || []
      setBrands(prev => {
        // Merge new brands in, replacing any for this category
        const others = prev.filter(br => br.food !== cat)
        return [...others, ...b]
      })
      setSource(data.source || '')
    } catch (e) {
      setError(e.message || 'Failed to load brands for this category.')
    } finally {
      setCatLoading(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) { loadInitial(); return }
    setSelected([])
    setCompared(null)
    setLoading(true)
    setError('')
    try {
      const data = await fetch(
        `${API_URL}/brands/all?search=${encodeURIComponent(search.trim())}`
      ).then(r => r.json())
      if (data.source === 'error') throw new Error(data.message)
      const b    = data.brands || []
      const cats = data.categories || [...new Set(b.map(br => br.food))].sort()
      setBrands(b)
      setCategories(cats)
      setSource(data.source || '')
      if (cats.length > 0) setActiveCat(cats[0])
    } catch (e) {
      setError(e.message || 'Search failed. Please try again.')
      setBrands([])
    } finally {
      setLoading(false)
    }
  }

  function handleCatChange(cat) {
    setActiveCat(cat)
    setSelected([])
    setCompared(null)
    // Load brands for this category if not already loaded
    const already = brands.filter(b => b.food === cat)
    if (already.length === 0) loadBrandsForCategory(cat)
  }

  const filtered = brands.filter(b => b.food === activeCat)

  function toggleBrand(brand) {
    setCompared(null)
    if (selected.find(b => b.brand === brand.brand)) {
      setSelected(s => s.filter(b => b.brand !== brand.brand))
    } else if (selected.length < maxSelect) {
      setSelected(s => [...s, brand])
    }
  }

  async function handleCompare() {
    if (selected.length < 2) return
    setComparing(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/brands/compare`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brands:        selected.map(b => b.brand),
          food_category: activeCat,
        }),
      })
      const json = await res.json()
      if (json.source === 'error') throw new Error(json.message)
      setCompared(json.data || {})
      setSource(json.source || 'groq')
      setTimeout(() => {
        document.getElementById('bc-result')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (e) {
      setError(e.message || 'Comparison failed. Please try again.')
      setCompared(null)
    } finally {
      setComparing(false)
    }
  }

  function reset() {
    setSelected([])
    setCompared(null)
    setError('')
  }

  const items    = compared?.comparison || []
  const colCount = items.length || 1
  const gridCols = `repeat(${colCount}, minmax(0, 1fr))`

  const winner = compared?.winner
    || (items.length > 0
      ? [...items].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.brand
      : null)

  const sourceLabel = {
    'groq':               'Groq AI Analysis',
    'groq+openfoodfacts': 'Groq AI + Open Food Facts',
    'openfoodfacts':      'Open Food Facts',
  }[source] || source

  return (
    <div className="flex flex-col min-h-screen animate-fade-up px-4 md:px-8 py-6 max-w-5xl mx-auto w-full pb-32">

      {/* ── Header ── */}
      <div className="relative p-6 md:p-8 rounded-[28px] mb-6 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute -right-6 -top-10 text-[120px] font-black italic pointer-events-none select-none"
          style={{ color: 'rgba(255,255,255,0.02)' }}>VS</div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,224,156,0.1)', border: '1px solid rgba(0,224,156,0.2)' }}>
            <ShieldCheck className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t(lang, 'brandCompare')}</h1>
            <p className="text-[11px] text-white/30 mt-0.5 uppercase tracking-widest font-medium">
              Live data · FSSAI · Groq AI analysis
            </p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search food category (e.g. honey, ghee, atta…)"
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/20 outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e  => e.target.style.borderColor = 'rgba(0,224,156,0.4)'}
            onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>
        <button type="submit"
          className="px-5 py-3 rounded-2xl text-sm font-bold text-deep transition-all"
          style={{ background: '#00e09c', border: '1px solid rgba(0,224,156,0.5)' }}>
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); loadInitial() }}
            className="px-4 py-3 rounded-2xl text-sm text-white/40 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Category tabs ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => handleCatChange(cat)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 border"
              style={{
                background:  activeCat === cat ? '#00e09c' : 'rgba(255,255,255,0.04)',
                color:       activeCat === cat ? '#04090e' : 'rgba(255,255,255,0.5)',
                borderColor: activeCat === cat ? '#00e09c' : 'rgba(255,255,255,0.08)',
                boxShadow:   activeCat === cat ? '0 4px 16px rgba(0,224,156,0.25)' : 'none',
                transform:   activeCat === cat ? 'scale(1.05)' : 'scale(1)',
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Brand grid ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 pl-1">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
            Select to compare
            {selected.length > 0 && (
              <span className="text-brand ml-2">({selected.length}/{maxSelect} selected)</span>
            )}
          </h3>
          {source && (
            <span className="text-[9px] text-white/20 uppercase tracking-wider ml-auto flex items-center gap-1">
              <Info className="w-3 h-3" />
              {sourceLabel}
            </span>
          )}
        </div>

        {loading || catLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Search className="w-8 h-8 text-white/10" />
            <p className="text-white/30 text-sm">No brands found for this category</p>
            <button onClick={() => loadBrandsForCategory(activeCat)}
              className="text-xs text-brand/70 hover:text-brand transition-colors mt-2 flex items-center gap-1.5">
              <RefreshCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((b, idx) => {
              const tier       = getScoreTier(b.score)
              const isSel      = !!selected.find(s => s.brand === b.brand)
              const isDisabled = !isSel && selected.length >= maxSelect
              const isRisky    = b.score < 50

              return (
                <div key={`${b.brand}-${idx}`}
                  onClick={() => !isDisabled && toggleBrand(b)}
                  className="relative p-4 rounded-2xl transition-all duration-200 overflow-hidden"
                  style={{
                    background:  isSel ? 'rgba(0,224,156,0.08)' : isRisky ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                    border:      isSel ? '1px solid rgba(0,224,156,0.4)' : isRisky ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.07)',
                    opacity:     isDisabled ? 0.35 : 1,
                    cursor:      isDisabled ? 'not-allowed' : 'pointer',
                    transform:   isSel ? 'scale(1.02)' : 'scale(1)',
                    boxShadow:   isSel ? '0 4px 20px rgba(0,224,156,0.12)' : 'none',
                  }}>

                  {isSel && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-5 h-5 text-brand" style={{ fill: 'rgba(0,224,156,0.15)' }} />
                    </div>
                  )}
                  {isRisky && !isSel && (
                    <div className="absolute top-3 right-3">
                      <AlertCircle className="w-4 h-4 text-red-400/60" />
                    </div>
                  )}

                  <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-bold">{b.food}</div>
                  <div className="text-sm font-bold text-white mb-3 leading-tight pr-6">{b.brand}</div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className={`font-mono text-2xl font-bold leading-none ${tier.color}`}>
                        {b.score}
                        <span className="text-[10px] text-white/25 ml-0.5 font-sans font-normal">/100</span>
                      </div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${tier.color}`}>
                        {tier.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/30">{b.price}</div>
                      {b.fssai && (
                        <div className="text-[9px] text-brand/70 font-bold mt-0.5">FSSAI ✓</div>
                      )}
                    </div>
                  </div>

                  <div className="h-1 w-full mt-3 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className={`h-full rounded-full transition-all duration-500 ${tier.bg}`}
                      style={{ width: `${b.score}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Compare button ── */}
      <div className="sticky bottom-[90px] md:bottom-6 z-40 mb-10 w-full max-w-md mx-auto">
        <button
          disabled={selected.length < 2 || comparing}
          onClick={handleCompare}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-300"
          style={{
            background:  selected.length >= 2 && !comparing ? 'rgba(0,224,156,0.15)' : 'rgba(255,255,255,0.04)',
            border:      selected.length >= 2 && !comparing ? '1px solid rgba(0,224,156,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color:       selected.length >= 2 && !comparing ? '#00e09c' : 'rgba(255,255,255,0.2)',
            cursor:      selected.length < 2 || comparing ? 'not-allowed' : 'pointer',
            boxShadow:   selected.length >= 2 && !comparing ? '0 8px 32px rgba(0,224,156,0.1)' : 'none',
          }}>
          {comparing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t(lang, 'buildingComparison')}</>
          ) : selected.length < 2 ? (
            <span>Select {2 - selected.length} more brand{2 - selected.length !== 1 ? 's' : ''} to compare</span>
          ) : (
            <><span>{t(lang, 'compareBrands')} ({selected.length})</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* ── Comparison results ── */}
      {compared && items.length > 0 && (
        <div id="bc-result" className="animate-fade-up scroll-mt-24 mt-4">

          <div className="flex items-center gap-3 mb-4 pl-1 flex-wrap">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
              {t(lang, 'comparison')}
            </h3>
            {compared.category_risk && (() => {
              const rs = getRiskStyle(compared.category_risk)
              return (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                  style={{ background: rs.bg, color: rs.color, borderColor: rs.border }}>
                  {compared.category_risk} CATEGORY RISK
                </span>
              )
            })()}
            <span className="ml-auto text-[9px] text-white/20 uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3 h-3" />
              {sourceLabel}
            </span>
          </div>

          <div className="rounded-[24px] overflow-hidden shadow-2xl"
            style={{ background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Brand headers */}
            <div className="grid" style={{ gridTemplateColumns: gridCols, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {items.map((b, i) => {
                const isWinner = b.brand === winner
                return (
                  <div key={i} className="p-5 relative"
                    style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    {isWinner && (
                      <div className="absolute top-0 left-0 right-0 h-0.5"
                        style={{ background: 'linear-gradient(90deg, #f5c842, #00e09c)' }} />
                    )}
                    <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1 font-bold">{activeCat}</div>
                    <div className="text-sm font-bold text-white leading-tight mb-1">{b.brand}</div>
                    <div className="text-[10px] text-white/30">{b.price}</div>
                    {isWinner && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)' }}>
                        <Zap className="w-3 h-3 text-gold" style={{ fill: 'rgba(245,200,66,0.3)' }} />
                        <span className="text-[9px] font-bold text-gold uppercase tracking-widest">Top Pick</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>

              {/* Safety Score */}
              <div className="pt-4 pb-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="px-5 mb-3 flex items-center gap-2 text-[9px] font-bold text-white/25 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" /> Safety Score
                </div>
                <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => {
                    const tier = getScoreTier(b.score)
                    return (
                      <div key={i} className="px-5 pb-4"
                        style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div className={`font-mono text-3xl font-bold tracking-tight leading-none ${tier.color}`}>
                          {b.score}
                          <span className="text-xs text-white/25 ml-1 font-sans font-normal">/100</span>
                        </div>
                        <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${tier.color}`}>
                          {tier.label}
                        </div>
                        <div className="h-1.5 rounded-full mt-3 overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className={`h-full rounded-full ${tier.bg}`}
                            style={{ width: `${b.score}%`, transition: 'width 1s ease-out' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* FSSAI */}
              <div className="pt-4 pb-1">
                <div className="px-5 mb-3 text-[9px] font-bold text-white/25 uppercase tracking-widest">FSSAI Certified</div>
                <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => (
                    <div key={i} className="px-5 pb-4"
                      style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                        style={{
                          background:  b.fssai ? 'rgba(0,224,156,0.08)' : 'rgba(239,68,68,0.08)',
                          color:       b.fssai ? '#00e09c' : '#f87171',
                          borderColor: b.fssai ? 'rgba(0,224,156,0.2)' : 'rgba(239,68,68,0.2)',
                        }}>
                        {b.fssai ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {b.fssai ? 'FSSAI ✓' : 'Not Verified'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Analysis */}
              <div className="pt-4 pb-1">
                <div className="px-5 mb-3 text-[9px] font-bold text-white/25 uppercase tracking-widest">Safety Analysis</div>
                <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => (
                    <div key={i} className="px-5 pb-4"
                      style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <p className="text-xs leading-relaxed text-white/50">{b.why}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              {items.some(b => b.pros?.length || b.cons?.length) && (
                <div className="pt-4 pb-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div className="px-5 mb-3 text-[9px] font-bold text-white/25 uppercase tracking-widest">Pros & Cons</div>
                  <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className="px-5 pb-4 space-y-2"
                        style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        {b.pros?.map((p, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-xs text-white/60">
                            <ThumbsUp className="w-3 h-3 text-brand shrink-0 mt-0.5" />
                            <span className="leading-snug">{p}</span>
                          </div>
                        ))}
                        {b.cons?.map((c, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-xs text-white/60">
                            <ThumbsDown className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{c}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adulterants */}
              {items.some(b => b.adulterants?.length) && (
                <div className="pt-4 pb-1">
                  <div className="px-5 mb-3 flex items-center gap-2 text-[9px] font-bold text-white/25 uppercase tracking-widest">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Adulterants to Watch
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className="px-5 pb-4 space-y-1.5"
                        style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        {(b.adulterants || []).map((a, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-white/50 px-2.5 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${j === 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
                            {a}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Home Test */}
              {items.some(b => b.home_test) && (
                <div className="pt-4 pb-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div className="px-5 mb-3 text-[9px] font-bold text-white/25 uppercase tracking-widest">DIY Home Test</div>
                  <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className="px-5 pb-4"
                        style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        {b.home_test ? (
                          <div className="p-3 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Beaker className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Test Method</span>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">{b.home_test}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-white/20 italic">{t(lang, 'noHomeTest')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer tip */}
            {(compared.tip || source) && (
              <div className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {compared.tip && (
                  <div className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl"
                    style={{ background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.15)', color: '#f5c842' }}>
                    <Lightbulb className="w-4 h-4 shrink-0" style={{ fill: 'rgba(245,200,66,0.15)' }} />
                    <span>{compared.tip}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[9px] text-white/20 uppercase tracking-widest ml-auto">
                  <Info className="w-3 h-3" />
                  {sourceLabel}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <button onClick={reset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white/30 hover:text-white transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <XCircle className="w-4 h-4" />
              {t(lang, 'clearComparison')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}