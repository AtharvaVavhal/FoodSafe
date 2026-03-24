import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { ShieldCheck, ArrowRight, Zap, CheckCircle2, AlertTriangle, XCircle, Beaker, Lightbulb, RefreshCcw, ThumbsUp, ThumbsDown, Info } from 'lucide-react'

const API_URL = '/api'

const scoreColor = s => s >= 85 ? 'text-brand' : s >= 75 ? 'text-gold' : 'text-red-400'
const scoreBg    = s => s >= 85 ? 'bg-brand' : s >= 75 ? 'bg-orange-400' : 'bg-red-500'

export default function BrandsPage() {
  const { lang } = useStore()
  const [brands, setBrands]       = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat]   = useState('')
  const [selected,  setSelected]    = useState([])
  const [compared,  setCompared]    = useState(null)
  const [loading,   setLoading]     = useState(true)
  const [comparing, setComparing]   = useState(false)
  const [source, setSource]         = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/brands/all`)
      .then(r => r.json())
      .then(data => {
        const b = data.brands || []
        setBrands(b)
        setSource(data.source || '')
        const cats = [...new Set(b.map(br => br.food))]
        setCategories(cats)
        if (cats.length > 0 && !activeCat) setActiveCat(cats[0])
      })
      .catch(() => setBrands([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = brands.filter(b => b.food === activeCat)
  const winner   = compared?.comparison
    ? [...compared.comparison].sort((a,b) => (b.score||0) - (a.score||0))[0]
    : null

  function toggleBrand(brand) {
    setCompared(null)
    if (selected.find(b => b.brand === brand.brand)) {
      setSelected(s => s.filter(b => b.brand !== brand.brand))
    } else if (selected.length < 4) {
      setSelected(s => [...s, brand])
    }
  }

  async function handleCompare() {
    if (selected.length < 2) return
    setComparing(true)
    try {
      const res = await fetch(`${API_URL}/brands/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brands: selected.map(b => b.brand),
          food_category: activeCat,
        }),
      })
      const json = await res.json()
      setCompared(json.data || {})
      setSource(json.source || 'ai')
      setTimeout(() => {
        document.getElementById('bc-result')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch {
      setCompared(null)
    } finally {
      setComparing(false)
    }
  }

  function reset() {
    setSelected([])
    setCompared(null)
  }

  function handleCatChange(cat) {
    setActiveCat(cat)
    setSelected([])
    setCompared(null)
  }

  const items = compared?.comparison || []
  const colCount = items.length || 1
  const gridCols = `repeat(${colCount}, minmax(0, 1fr))`

  return (
    <div className="flex flex-col min-h-screen animate-fade-up px-4 md:px-8 py-6">
      
      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-gradient-to-br from-surface-100 to-surface-200 border border-white/5 shadow-2xl overflow-hidden mb-6">
        <div className="absolute -right-8 -top-12 text-[140px] font-black italic text-white/[0.02] tracking-tighter pointer-events-none select-none">
          VS
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
              <ShieldCheck className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-tight">{t(lang, 'brandCompare')}</h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em] mt-0.5">{t(lang, 'brandCompareSub')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 border
              ${activeCat === cat 
                ? 'bg-brand text-background border-brand shadow-[0_4px_16px_rgba(0,224,156,0.3)] scale-105' 
                : 'bg-surface-100 text-white/60 border-white/10 hover:bg-surface-200 hover:text-white hover:border-white/20'}`}
            onClick={() => handleCatChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Brand Selection Grid */}
      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4 pl-1">
          Select Brands to Compare {selected.length > 0 && <span className="text-brand">({selected.length}/4)</span>}
        </h3>
        
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-100/50 animate-pulse border border-white/5" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {filtered.map((b, idx) => {
              const isSel = !!selected.find(s => s.brand === b.brand)
              const isDisabled = !isSel && selected.length >= 4
              return (
                <div
                  key={`${b.brand}-${idx}`}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group
                    ${isSel 
                      ? 'bg-brand/10 border-brand/50 shadow-[0_4px_20px_rgba(0,224,156,0.15)] scale-[1.02]' 
                      : isDisabled 
                        ? 'opacity-40 cursor-not-allowed bg-surface-50 border-white/5' 
                        : 'bg-surface-100 border-white/10 hover:bg-surface-200 hover:border-white/20 hover:-translate-y-1'}`}
                  onClick={() => toggleBrand(b)}
                >
                  {isSel && (
                    <div className="absolute top-3 right-3 text-brand">
                      <CheckCircle2 className="w-5 h-5 fill-brand/20" />
                    </div>
                  )}
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-medium">{b.food}</div>
                  <div className="text-sm font-bold text-white mb-2 leading-tight pr-6">{b.brand}</div>
                  <div className={`font-mono text-xl tracking-tight ${scoreColor(b.score)}`}>
                    {b.score}<span className="text-[10px] text-white/30 ml-1">/100</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">{b.price}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Compare Action */}
      <div className="sticky bottom-[90px] md:bottom-6 z-40 mb-10 w-full max-w-md mx-auto">
        <button
          className={`w-full relative py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden
            ${selected.length < 2 || comparing
              ? 'bg-surface-200 text-white/30 border border-white/5 cursor-not-allowed'
              : 'bg-glass-gradient text-white border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:scale-[1.02] before:absolute before:inset-0 before:bg-brand/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity'}`}
          disabled={selected.length < 2 || comparing}
          onClick={handleCompare}
        >
          {comparing ? (
            <>
              <RefreshCcw className="w-4 h-4 animate-spin text-brand" />
              <span className="text-brand">{t(lang, 'buildingComparison')}</span>
            </>
          ) : selected.length < 2 ? (
            <span className="opacity-70">{t(lang, 'selectMore')} ({2 - selected.length})</span>
          ) : (
            <>
              <span>{t(lang, 'compareBrands')} ({selected.length})</span>
              <ArrowRight className="w-4 h-4 text-brand group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Comparison Results Panel */}
      {compared && items.length > 0 && (
        <div id="bc-result" className="animate-fade-up scroll-mt-24 mt-4">
          <div className="flex items-center gap-4 mb-4 pl-1">
            <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">{t(lang, 'comparison')}</h3>
            {compared.category_risk && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border
                ${compared.category_risk.toLowerCase() === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : compared.category_risk.toLowerCase() === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-brand/10 text-brand border-brand/20'}`}>
                {compared.category_risk} RISK
              </span>
            )}
          </div>

          <div className="bg-surface-100 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Headers */}
            <div className="grid border-b border-white/10 bg-surface-200/50" style={{ gridTemplateColumns: gridCols }}>
              {items.map((b, i) => (
                <div key={i} className={`p-4 md:p-6 pb-5 relative ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                  {(b.brand === compared.winner || b.brand === winner?.brand) && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold to-brand" />
                  )}
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-medium">{activeCat}</div>
                  <div className="text-sm md:text-base font-bold text-white leading-tight mb-2">{b.brand}</div>
                  <div className="text-[11px] text-white/50">{b.price}</div>
                  
                  {(b.brand === compared.winner || b.brand === winner?.brand) && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 border border-gold/30 rounded-lg">
                      <Zap className="w-3.5 h-3.5 fill-gold text-gold" />
                      <span className="text-[10px] font-bold text-gold tracking-widest uppercase">Top Pick</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Matrix Data */}
            <div className="divide-y divide-white/5">
              
              {/* Safety Score Row */}
              <div className="bg-white/[0.02] pt-4 pb-1 group">
                <div className="px-4 md:px-6 mb-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Safety Score
                </div>
                <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => (
                    <div key={i} className={`px-4 md:px-6 pb-4 ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                      <div className={`font-mono text-3xl font-light tracking-tighter ${scoreColor(b.score)}`}>
                        {b.score}<span className="text-[12px] text-white/30 ml-1 font-sans tracking-normal">/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-300 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBg(b.score)} transition-all duration-1000 ease-out`} style={{ width: `${b.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FSSAI Certification */}
              <div className="pt-4 pb-1 group">
                <div className="px-4 md:px-6 mb-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">FSSAI Certified</div>
                <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => (
                    <div key={i} className={`px-4 md:px-6 pb-4 flex items-start ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                        ${b.fssai ? 'bg-brand/10 text-brand border-brand/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {b.fssai ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {b.fssai ? t(lang, 'fssaiYes') : t(lang, 'notVerified')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Rationale (Why) */}
              <div className="pt-4 pb-1 group">
                <div className="px-4 md:px-6 mb-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">Safety Analysis</div>
                <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                  {items.map((b, i) => (
                    <div key={i} className={`px-4 md:px-6 pb-4 ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                      <p className="text-[11px] leading-relaxed text-white/60">{b.why}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              {items.some(b => b.pros?.length > 0 || b.cons?.length > 0) && (
                <div className="pt-4 pb-1 bg-white/[0.01]">
                  <div className="px-4 md:px-6 mb-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">Pros & Cons</div>
                  <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className={`px-4 md:px-6 pb-4 space-y-2 ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                        {b.pros?.map((p, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-[11px] text-white/70">
                            <ThumbsUp className="w-3 h-3 text-brand shrink-0 mt-0.5" />
                            <span className="leading-snug">{p}</span>
                          </div>
                        ))}
                        {b.cons?.map((c, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-[11px] text-white/70">
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
              {items.some(b => b.adulterants?.length > 0) && (
                <div className="pt-4 pb-1">
                  <div className="px-4 md:px-6 mb-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-orange-400" /> Adulterants to Watch
                  </div>
                  <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className={`px-4 md:px-6 pb-4 ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                        <div className="space-y-1.5">
                          {(b.adulterants || []).map((a, j) => (
                            <div key={j} className="flex items-center gap-2 text-[11px] text-white/60 bg-surface-200 px-2.5 py-1.5 rounded-lg border border-white/5">
                              <div className={`w-1.5 h-1.5 rounded-full ${j===0 ? 'bg-red-500' : 'bg-orange-500'}`} />
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Home Test */}
              {items.some(b => b.home_test) && (
                <div className="pt-4 pb-2 bg-surface-200/30">
                  <div className="px-4 md:px-6 mb-3 text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">DIY Home Test</div>
                  <div className="grid border-b border-transparent" style={{ gridTemplateColumns: gridCols }}>
                    {items.map((b, i) => (
                      <div key={i} className={`px-4 md:px-6 pb-4 ${i !== items.length - 1 ? 'border-r border-white/5' : ''}`}>
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                          <div className="flex items-center gap-1.5 mb-1 text-blue-400">
                            <Beaker className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Test Method</span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed">{b.home_test || 'No home test available'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Tip & Source */}
            <div className="bg-surface-200 p-4 border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
              {compared.tip && (
                <div className="flex items-center gap-2 text-[11px] text-gold bg-gold/5 border border-gold/20 px-4 py-2 rounded-xl">
                  <Lightbulb className="w-4 h-4 fill-gold/20" />
                  <span>{compared.tip}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[9px] text-white/30 uppercase tracking-widest ml-auto">
                <Info className="w-3 h-3" />
                {source === 'ai' ? 'AI-Generated Analysis' : 'Curated Safety Data'}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button 
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 text-[11px] font-bold text-white/40 hover:text-white hover:bg-surface-200 hover:border-white/20 transition-all uppercase tracking-widest"
              onClick={reset}
            >
              <XCircle className="w-4 h-4" />
              {t(lang, 'clearComparison')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}