import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const API_URL = '/api'

// ── Styles ──────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}

  .bc-root{font-family:'Syne',sans-serif;background:#0a0f16;min-height:100vh;padding-bottom:80px;}

  .bc-header{background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%);padding:20px 16px 28px;position:relative;overflow:hidden;}
  .bc-header::before{content:'VS';position:absolute;right:-10px;top:-16px;font-size:130px;font-weight:700;color:rgba(201,168,76,0.06);letter-spacing:-8px;pointer-events:none;}
  .bc-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:18px;background:#0a0f16;border-radius:18px 18px 0 0;}
  .bc-title{font-size:22px;font-weight:700;color:#f5f0e8;letter-spacing:-0.02em;margin-bottom:2px;}
  .bc-sub{font-size:11px;color:rgba(245,240,232,0.45);font-weight:400;letter-spacing:0.06em;text-transform:uppercase;}

  .bc-cats{display:flex;gap:6px;flex-wrap:wrap;padding:14px 16px 8px;}
  .bc-cat{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);cursor:pointer;transition:all .15s;letter-spacing:0.04em;}
  .bc-cat.active{background:#00c896;color:#0a0f16;border-color:#00c896;}

  .bc-section{padding:0 16px;margin-bottom:12px;}
  .bc-label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:8px;}
  .bc-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .bc-pick-card{background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;cursor:pointer;transition:all .2s;position:relative;backdrop-filter:blur(10px);}
  .bc-pick-card:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);}
  .bc-pick-card.selected{border-color:#00c896;background:rgba(0,200,150,0.08);}
  .bc-pick-card.selected::after{content:'✓';position:absolute;top:8px;right:10px;font-size:12px;color:#00c896;font-weight:700;}
  .bc-pick-card.disabled{opacity:.35;pointer-events:none;}
  .bc-pick-food{font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;}
  .bc-pick-name{font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1.2;}
  .bc-pick-score{font-family:'DM Mono',monospace;font-size:20px;font-weight:400;margin-top:4px;}

  .bc-cta-wrap{padding:0 16px 12px;}
  .bc-cta{width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#c9a84c,#e0c068);color:#0d2818;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.02em;box-shadow:0 4px 16px rgba(201,168,76,.35);transition:opacity .15s,transform .1s;}
  .bc-cta:disabled{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.25);box-shadow:none;cursor:not-allowed;}
  .bc-cta:not(:disabled):active{transform:scale(.98);}

  .bc-panel{margin:0;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.3);backdrop-filter:blur(10px);}
  .bc-panel-header{display:grid;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);}
  .bc-panel-col{padding:14px 12px;border-right:1px solid rgba(255,255,255,0.06);}
  .bc-panel-col:last-child{border-right:none;}
  .bc-col-food{font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;}
  .bc-col-name{font-size:13px;font-weight:700;color:rgba(255,255,255,0.9);line-height:1.3;}
  .bc-col-price{font-size:10px;color:rgba(255,255,255,0.4);margin-top:3px;}

  .bc-row{display:grid;border-bottom:.5px solid rgba(255,255,255,0.06);}
  .bc-row:last-child{border-bottom:none;}
  .bc-row-label{padding:12px 12px 0;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);grid-column:1/-1;}
  .bc-cell{padding:6px 12px 12px;border-right:.5px solid rgba(255,255,255,0.06);}
  .bc-cell:last-child{border-right:none;}

  .bc-score-num{font-family:'DM Mono',monospace;font-size:26px;font-weight:400;line-height:1;}
  .bc-bar-track{height:5px;background:rgba(255,255,255,0.06);border-radius:3px;margin-top:6px;overflow:hidden;}
  .bc-bar-fill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1);}

  .bc-tag{display:inline-block;font-size:9px;padding:2px 8px;border-radius:6px;font-weight:600;margin-top:2px;}
  .bc-tag-ok{background:rgba(0,200,150,0.12);color:#00e09c;border:1px solid rgba(0,200,150,0.25);}
  .bc-tag-warn{background:rgba(245,180,40,0.1);color:#f5c842;border:1px solid rgba(245,180,40,0.25);}

  .bc-adult{font-size:10px;color:rgba(255,255,255,0.5);line-height:1.7;padding-top:2px;}
  .bc-dot{display:inline-block;width:5px;height:5px;border-radius:50%;margin-right:4px;vertical-align:middle;}
  .bc-dot-red{background:#ff6450;}
  .bc-dot-amber{background:#e07c1a;}

  .bc-test{font-size:10px;color:rgba(255,255,255,0.5);line-height:1.6;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px;margin-top:2px;border:1px solid rgba(255,255,255,0.06);}
  .bc-why{font-size:10px;color:rgba(255,255,255,0.5);line-height:1.6;padding-top:2px;}
  .bc-pros{font-size:10px;color:#00e09c;line-height:1.6;padding-top:2px;}
  .bc-cons{font-size:10px;color:#ff6450;line-height:1.6;padding-top:2px;}
  .bc-winner{display:inline-block;background:linear-gradient(135deg,#c9a84c,#e0c068);color:#0d2818;font-size:9px;font-weight:700;padding:2px 8px;border-radius:6px;letter-spacing:.06em;margin-top:4px;}
  .bc-tip-bar{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);font-size:11px;color:#c9a84c;line-height:1.5;}
  .bc-source{font-size:8px;color:rgba(255,255,255,0.2);text-align:right;padding:8px 12px 12px;letter-spacing:0.08em;text-transform:uppercase;}

  .bc-clear{width:100%;margin-top:12px;padding:11px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.08);background:none;color:rgba(255,255,255,0.4);font-family:'Syne',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;}
  .bc-clear:hover{border-color:#ff6450;color:#ff6450;}

  .bc-skeleton{background:rgba(255,255,255,0.04);border-radius:14px;height:90px;animation:skPulse 1.4s ease infinite;}
  @keyframes skPulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .bc-animate{animation:slideUp .35s ease forwards;}
  .bc-risk-badge{display:inline-block;font-size:9px;font-weight:700;padding:3px 10px;border-radius:6px;margin-left:8px;}
  .bc-risk-low{background:rgba(0,200,150,0.12);color:#00e09c;border:1px solid rgba(0,200,150,0.2);}
  .bc-risk-medium{background:rgba(245,180,40,0.1);color:#f5c842;border:1px solid rgba(245,180,40,0.2);}
  .bc-risk-high{background:rgba(255,80,60,0.1);color:#ff6450;border:1px solid rgba(255,80,60,0.2);}
`

const scoreColor = s => s >= 85 ? '#00e09c' : s >= 75 ? '#f5c842' : '#ff6450'
const scoreBg    = s => s >= 85 ? '#00c896' : s >= 75 ? '#e07c1a' : '#c0392b'

export default function BrandComparison() {
  const { lang } = useStore()
  const [brands, setBrands]       = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat]   = useState('')
  const [selected,  setSelected]    = useState([])
  const [compared,  setCompared]    = useState(null)
  const [loading,   setLoading]     = useState(true)
  const [comparing, setComparing]   = useState(false)
  const [source, setSource]         = useState('')

  // ── Fetch brands on mount ──
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
  const gridCols = `repeat(${colCount}, 1fr)`

  return (
    <div className="bc-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="bc-header">
        <div className="bc-title">{t(lang, 'brandCompare')}</div>
        <div className="bc-sub">{t(lang, 'brandCompareSub')}</div>
      </div>

      {/* Category pills */}
      <div className="bc-cats">
        {categories.map(cat => (
          <button
            key={cat}
            className={`bc-cat${activeCat === cat ? ' active' : ''}`}
            onClick={() => handleCatChange(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* Brand picker — loading skeleton */}
      {loading ? (
        <div className="bc-section">
          <div className="bc-label">Loading brands...</div>
          <div className="bc-picker-grid">
            {[1,2,3,4].map(i => <div key={i} className="bc-skeleton" />)}
          </div>
        </div>
      ) : (
        <div className="bc-section">
          <div className="bc-label">
            {activeCat} {t(lang, 'brandsSelect')}
            {selected.length > 0 && ` (${selected.length} ${t(lang, 'selected')})`}
          </div>
          <div className="bc-picker-grid">
            {filtered.map((b, idx) => {
              const isSel = !!selected.find(s => s.brand === b.brand)
              const isDisabled = !isSel && selected.length >= 4
              return (
                <div
                  key={`${b.brand}-${idx}`}
                  className={`bc-pick-card${isSel ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                  onClick={() => toggleBrand(b)}
                >
                  <div className="bc-pick-food">{b.food}</div>
                  <div className="bc-pick-name">{b.brand}</div>
                  <div className="bc-pick-score" style={{ color: scoreColor(b.score) }}>
                    {b.score}<span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:2 }}>/100</span>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{b.price}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bc-cta-wrap">
        <button
          className="bc-cta"
          disabled={selected.length < 2 || comparing}
          onClick={handleCompare}
        >
          {comparing
            ? `⏳ ${t(lang, 'buildingComparison')}`
            : selected.length < 2
              ? `${t(lang, 'selectMore')} (${2 - selected.length})`
              : `${t(lang, 'compareBrands')} (${selected.length}) →`
          }
        </button>
      </div>

      {/* Comparison Panel */}
      {compared && items.length > 0 && (
        <div id="bc-result" className="bc-section bc-animate">
          <div className="bc-label">
            {t(lang, 'comparison')} — {activeCat}
            {compared.category_risk && (
              <span className={`bc-risk-badge bc-risk-${(compared.category_risk || '').toLowerCase()}`}>
                {compared.category_risk} RISK
              </span>
            )}
          </div>
          <div className="bc-panel">

            {/* Column headers */}
            <div className="bc-panel-header" style={{ gridTemplateColumns: gridCols }}>
              {items.map((b, i) => (
                <div key={i} className="bc-panel-col">
                  <div className="bc-col-food">{activeCat}</div>
                  <div className="bc-col-name">{b.brand}</div>
                  <div className="bc-col-price">{b.price}</div>
                  {(b.brand === compared.winner || b.brand === winner?.brand) && (
                    <div className="bc-winner">⭐ {t(lang, 'topPick')}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Safety Score */}
            <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
              <div className="bc-row-label">{t(lang, 'safetyScore')}</div>
              {items.map((b, i) => (
                <div key={i} className="bc-cell">
                  <div className="bc-score-num" style={{ color: scoreColor(b.score) }}>
                    {b.score}
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginLeft:2 }}>/100</span>
                  </div>
                  <div className="bc-bar-track">
                    <div
                      className="bc-bar-fill"
                      style={{ width: b.score + '%', background: scoreBg(b.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* FSSAI */}
            <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
              <div className="bc-row-label">{t(lang, 'fssaiCertified')}</div>
              {items.map((b, i) => (
                <div key={i} className="bc-cell">
                  <span className={`bc-tag ${b.fssai ? 'bc-tag-ok' : 'bc-tag-warn'}`}>
                    {b.fssai ? t(lang, 'fssaiYes') : t(lang, 'notVerified')}
                  </span>
                </div>
              ))}
            </div>

            {/* Why safe */}
            <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
              <div className="bc-row-label">{t(lang, 'whySafe')}</div>
              {items.map((b, i) => (
                <div key={i} className="bc-cell">
                  <div className="bc-why">{b.why}</div>
                </div>
              ))}
            </div>

            {/* Pros & Cons (AI-generated) */}
            {items.some(b => b.pros?.length > 0 || b.cons?.length > 0) && (
              <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
                <div className="bc-row-label">Pros & Cons</div>
                {items.map((b, i) => (
                  <div key={i} className="bc-cell">
                    {(b.pros || []).map((p, j) => (
                      <div key={j} className="bc-pros">✅ {p}</div>
                    ))}
                    {(b.cons || []).map((c, j) => (
                      <div key={j} className="bc-cons">⚠️ {c}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Adulterants to watch */}
            {items.some(b => b.adulterants?.length > 0) && (
              <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
                <div className="bc-row-label">{t(lang, 'adulterantsWatch')}</div>
                {items.map((b, i) => (
                  <div key={i} className="bc-cell">
                    <div className="bc-adult">
                      {(b.adulterants || []).map((a, j) => (
                        <div key={j}>
                          <span className={`bc-dot ${j === 0 ? 'bc-dot-red' : 'bc-dot-amber'}`} />
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Home test */}
            {items.some(b => b.home_test) && (
              <div className="bc-row" style={{ gridTemplateColumns: gridCols }}>
                <div className="bc-row-label">{t(lang, 'homeTest')} — {activeCat}</div>
                {items.map((b, i) => (
                  <div key={i} className="bc-cell">
                    <div className="bc-test">🧪 {b.home_test || 'No home test available.'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Buying tip */}
            {compared.tip && (
              <div className="bc-tip-bar">💡 {compared.tip}</div>
            )}

            {/* Source indicator */}
            <div className="bc-source">
              {source === 'ai' ? '🤖 AI-generated comparison' : '📋 Curated data'}
            </div>
          </div>

          <button className="bc-clear" onClick={reset}>✕ {t(lang, 'clearComparison')}</button>
        </div>
      )}
    </div>
  )
}