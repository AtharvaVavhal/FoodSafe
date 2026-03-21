// BrandComparison.jsx
// Drop this into frontend/src/pages/BrandComparison.jsx
// Add route in App.jsx: <Route path="/compare" element={<BrandComparison />} />

import { useState, useEffect } from 'react'

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api'

// ── Seed data (mirrors backend seed.py) ─────────────────────────────────────
const ALL_BRANDS = [
  { id:1,  food:'Turmeric',      brand:'Everest Turmeric',      score:88, price:'₹80–120/100g',  fssai:true,  why:'Third-party heavy metal tested, no lead chromate detected in 3 independent lab reports.' },
  { id:2,  food:'Turmeric',      brand:'MDH Turmeric',           score:82, price:'₹70–100/100g',  fssai:true,  why:'Good track record but flagged for pesticide residue in 2024 EU export batch.' },
  { id:3,  food:'Turmeric',      brand:'Catch Turmeric',         score:79, price:'₹60–90/100g',   fssai:true,  why:'Budget-friendly, passes FSSAI testing but fewer independent audits.' },
  { id:4,  food:'Mustard Oil',   brand:'Fortune Mustard Oil',    score:85, price:'₹120–160/L',    fssai:true,  why:'Fortified with Vitamin A & D, no argemone oil detected in spot checks.' },
  { id:5,  food:'Mustard Oil',   brand:'Dhara Mustard Oil',      score:83, price:'₹110–150/L',    fssai:true,  why:'Government-backed cooperative, consistent purity, good rural availability.' },
  { id:6,  food:'Milk',          brand:'Amul Milk',              score:91, price:'₹56–72/L',      fssai:true,  why:'Largest cooperative, continuous cold chain, tested for urea & detergent.' },
  { id:7,  food:'Milk',          brand:'Mother Dairy Milk',      score:89, price:'₹54–70/L',      fssai:true,  why:'Delhi-NCR cooperative with state-monitored quality labs.' },
  { id:8,  food:'Milk',          brand:'Nandini Milk',           score:86, price:'₹52–68/L',      fssai:true,  why:'Karnataka cooperative, good fat content, low adulteration reports.' },
  { id:9,  food:'Honey',         brand:'Dabur Honey',            score:78, price:'₹180–250/500g', fssai:true,  why:'Fails NMR test in some batches (HFCS mixing) — buy only sealed jars.' },
  { id:10, food:'Honey',         brand:'Patanjali Honey',        score:74, price:'₹150–200/500g', fssai:true,  why:'NMR test failures reported in 2021 CSE study. Cheaper but riskier.' },
  { id:11, food:'Honey',         brand:'24 Mantra Organic Honey',score:88, price:'₹300–400/500g', fssai:true,  why:'Organic certified, NMR tested, traceable to source hives.' },
  { id:12, food:'Ghee',          brand:'Amul Ghee',              score:88, price:'₹550–650/500g', fssai:true,  why:'High butyric acid content, no vanaspati detected in independent tests.' },
  { id:13, food:'Ghee',          brand:'Patanjali Ghee',         score:80, price:'₹400–500/500g', fssai:true,  why:'Lower price, but some batches show adulteration with vegetable fat.' },
  { id:14, food:'Chilli Powder', brand:'Everest Chilli Powder',  score:85, price:'₹60–90/100g',   fssai:true,  why:'No Sudan Red dye in tested batches, bright colour from natural capsicum.' },
  { id:15, food:'Chilli Powder', brand:'Catch Chilli Powder',    score:81, price:'₹55–80/100g',   fssai:true,  why:'Passes colour tests, no brick powder detected.' },
  { id:16, food:'Paneer',        brand:'Amul Paneer',            score:87, price:'₹85–110/200g',  fssai:true,  why:'No starch or skimmed milk powder, fat content verified.' },
  { id:17, food:'Paneer',        brand:'Mother Dairy Paneer',    score:84, price:'₹80–105/200g',  fssai:true,  why:'Fresh, minimal processing, passes iodine starch test.' },
]

const ADULTERANTS = {
  'Turmeric':      ['Lead chromate (colour)', 'Metanil yellow (dye)', 'Chalk powder'],
  'Mustard Oil':   ['Argemone oil (toxic)', 'Mineral oil', 'Palm oil blending'],
  'Milk':          ['Urea', 'Detergent', 'Synthetic milk', 'Water dilution'],
  'Honey':         ['HFCS (corn syrup)', 'Sugar syrup', 'Water blending'],
  'Ghee':          ['Vanaspati', 'Animal fat', 'Vegetable oil'],
  'Chilli Powder': ['Sudan Red dye', 'Brick powder', 'Synthetic colour'],
  'Paneer':        ['Starch', 'Skimmed milk powder', 'Non-dairy fat'],
}

const HOME_TESTS = {
  'Turmeric':      'Add ½ tsp to warm water. Saffron-yellow = pure. Bright yellow cloud = lead chromate.',
  'Mustard Oil':   'Mix equal parts oil + nitric acid (or lemon juice as proxy). Pink tint = argemone.',
  'Milk':          'Drop milk on an inclined surface. Pure milk flows slowly leaving white trail.',
  'Honey':         'Dip a lit matchstick in honey. Pure honey burns. Adulterated sputters.',
  'Ghee':          'Heat a spoon of ghee. Turns golden brown quickly = pure. Pale = adulterated.',
  'Chilli Powder': 'Mix in water. Sudan Red settles as oily film. Pure chilli disperses evenly.',
  'Paneer':        'Add iodine drops. Blue-black colour = starch present. No change = pure.',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Mono:wght@300;400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --green:#1a3d2b; --gold:#c9a84c; --cream:#f7f5f0;
    --red:#A32D2D; --amber:#854F0B; --ok:#27500A;
    --border:#ece8df;
  }
  .bc-root{font-family:'Syne',sans-serif;background:var(--cream);min-height:100vh;padding-bottom:80px;}

  /* ── Header ── */
  .bc-header{background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%);padding:20px 16px 28px;position:relative;overflow:hidden;}
  .bc-header::before{content:'VS';position:absolute;right:-10px;top:-16px;font-size:130px;font-weight:700;color:rgba(201,168,76,0.06);letter-spacing:-8px;pointer-events:none;}
  .bc-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:18px;background:var(--cream);border-radius:18px 18px 0 0;}
  .bc-title{font-size:22px;font-weight:700;color:#f5f0e8;letter-spacing:-0.02em;margin-bottom:2px;}
  .bc-sub{font-size:11px;color:rgba(245,240,232,0.45);font-weight:400;letter-spacing:0.06em;text-transform:uppercase;}

  /* ── Category pills ── */
  .bc-cats{display:flex;gap:6px;flex-wrap:wrap;padding:14px 16px 8px;}
  .bc-cat{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1.5px solid var(--border);background:#fff;color:#555;cursor:pointer;transition:all .15s;letter-spacing:0.04em;}
  .bc-cat.active{background:var(--green);color:#fff;border-color:var(--green);}

  /* ── Brand picker grid ── */
  .bc-section{padding:0 16px;margin-bottom:12px;}
  .bc-label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#aaa;margin-bottom:8px;}
  .bc-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .bc-pick-card{background:#fff;border:2px solid var(--border);border-radius:14px;padding:12px;cursor:pointer;transition:all .15s;position:relative;}
  .bc-pick-card.selected{border-color:var(--green);background:#f0f9f0;}
  .bc-pick-card.selected::after{content:'✓';position:absolute;top:8px;right:10px;font-size:12px;color:var(--ok);font-weight:700;}
  .bc-pick-card.disabled{opacity:.4;pointer-events:none;}
  .bc-pick-food{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;}
  .bc-pick-name{font-size:13px;font-weight:600;color:var(--green);line-height:1.2;}
  .bc-pick-score{font-family:'DM Mono',monospace;font-size:20px;font-weight:400;margin-top:4px;}

  /* ── Compare CTA ── */
  .bc-cta-wrap{padding:0 16px 12px;}
  .bc-cta{width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#c9a84c,#e0c068);color:#0d2818;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.02em;box-shadow:0 4px 16px rgba(201,168,76,.35);transition:opacity .15s,transform .1s;}
  .bc-cta:disabled{background:rgba(0,0,0,.08);color:#bbb;box-shadow:none;cursor:not-allowed;}
  .bc-cta:not(:disabled):active{transform:scale(.98);}

  /* ── Compare panel ── */
  .bc-panel{margin:0 16px;background:#fff;border-radius:20px;border:1px solid var(--border);overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);}
  .bc-panel-header{display:grid;gap:0;border-bottom:1px solid var(--border);}
  .bc-panel-col{padding:14px 12px;border-right:1px solid var(--border);}
  .bc-panel-col:last-child{border-right:none;}
  .bc-col-food{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;}
  .bc-col-name{font-size:13px;font-weight:700;color:var(--green);line-height:1.3;}
  .bc-col-price{font-size:10px;color:#aaa;margin-top:3px;}

  /* ── Score row ── */
  .bc-row{display:grid;border-bottom:.5px solid #f4f1eb;}
  .bc-row:last-child{border-bottom:none;}
  .bc-row-label{padding:12px 12px 0;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#aaa;grid-column:1/-1;}
  .bc-cell{padding:6px 12px 12px;border-right:.5px solid #f4f1eb;}
  .bc-cell:last-child{border-right:none;}

  /* ── Score bar ── */
  .bc-score-num{font-family:'DM Mono',monospace;font-size:26px;font-weight:400;line-height:1;}
  .bc-bar-track{height:5px;background:#f0ede8;border-radius:3px;margin-top:6px;overflow:hidden;}
  .bc-bar-fill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1);}

  /* ── FSSAI tag ── */
  .bc-tag{display:inline-block;font-size:9px;padding:2px 8px;border-radius:6px;font-weight:600;margin-top:2px;}
  .bc-tag-ok{background:#eaf3de;color:var(--ok);border:1px solid #c0dd97;}
  .bc-tag-warn{background:#fff8ed;color:var(--amber);border:1px solid #fac775;}

  /* ── Adulterant dots ── */
  .bc-adult{font-size:10px;color:#666;line-height:1.7;padding-top:2px;}
  .bc-dot{display:inline-block;width:5px;height:5px;border-radius:50%;margin-right:4px;vertical-align:middle;}
  .bc-dot-red{background:var(--red);}
  .bc-dot-amber{background:#E07C1A;}

  /* ── Home test ── */
  .bc-test{font-size:10px;color:#555;line-height:1.6;background:#f7f5f0;border-radius:8px;padding:8px;margin-top:2px;}

  /* ── Why safe text ── */
  .bc-why{font-size:10px;color:#555;line-height:1.6;padding-top:2px;}

  /* ── Winner badge ── */
  .bc-winner{display:inline-block;background:linear-gradient(135deg,#c9a84c,#e0c068);color:#0d2818;font-size:9px;font-weight:700;padding:2px 8px;border-radius:6px;letter-spacing:.06em;margin-top:4px;}

  /* ── Clear btn ── */
  .bc-clear{width:100%;margin-top:12px;padding:11px;border-radius:10px;border:1.5px solid var(--border);background:none;color:#aaa;font-family:'Syne',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;}
  .bc-clear:hover{border-color:var(--red);color:var(--red);}

  @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .bc-animate{animation:slideUp .35s ease forwards;}
`

// ── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = s => s >= 85 ? '#27500A' : s >= 75 ? '#854F0B' : '#A32D2D'
const scoreBg    = s => s >= 85 ? '#639922' : s >= 75 ? '#E07C1A' : '#A32D2D'
const ALL_CATS   = [...new Set(ALL_BRANDS.map(b => b.food))]

export default function BrandComparison() {
  const [activeCat, setActiveCat]   = useState('Turmeric')
  const [selected,  setSelected]    = useState([])
  const [compared,  setCompared]    = useState(null)
  const [loading,   setLoading]     = useState(false)

  const filtered = ALL_BRANDS.filter(b => b.food === activeCat)
  const winner   = compared ? [...compared].sort((a,b) => b.score - a.score)[0] : null

  function toggleBrand(brand) {
    setCompared(null)
    if (selected.find(b => b.id === brand.id)) {
      setSelected(s => s.filter(b => b.id !== brand.id))
    } else if (selected.length < 4) {
      setSelected(s => [...s, brand])
    }
  }

  async function handleCompare() {
    if (selected.length < 2) return
    setLoading(true)
    // Small delay for UX feel, then show comparison
    await new Promise(r => setTimeout(r, 600))
    setCompared(selected)
    setLoading(false)
    setTimeout(() => {
      document.getElementById('bc-result')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  function reset() {
    setSelected([])
    setCompared(null)
  }

  // Switch category → reset selection
  function handleCatChange(cat) {
    setActiveCat(cat)
    setSelected([])
    setCompared(null)
  }

  const colCount = compared?.length || 1
  const gridCols = `repeat(${colCount}, 1fr)`

  return (
    <div className="bc-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="bc-header">
        <div className="bc-title">Brand Compare</div>
        <div className="bc-sub">Pick up to 4 brands · compare side by side</div>
      </div>

      {/* Category pills */}
      <div className="bc-cats">
        {ALL_CATS.map(cat => (
          <button
            key={cat}
            className={`bc-cat${activeCat === cat ? ' active' : ''}`}
            onClick={() => handleCatChange(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* Brand picker */}
      <div className="bc-section">
        <div className="bc-label">
          {activeCat} brands — select 2 to 4 to compare
          {selected.length > 0 && ` (${selected.length} selected)`}
        </div>
        <div className="bc-picker-grid">
          {filtered.map(b => {
            const isSel = !!selected.find(s => s.id === b.id)
            const isDisabled = !isSel && selected.length >= 4
            return (
              <div
                key={b.id}
                className={`bc-pick-card${isSel ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                onClick={() => toggleBrand(b)}
              >
                <div className="bc-pick-food">{b.food}</div>
                <div className="bc-pick-name">{b.brand}</div>
                <div className="bc-pick-score" style={{ color: scoreColor(b.score) }}>
                  {b.score}<span style={{ fontSize:11, color:'#aaa', marginLeft:2 }}>/100</span>
                </div>
                <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{b.price}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bc-cta-wrap">
        <button
          className="bc-cta"
          disabled={selected.length < 2 || loading}
          onClick={handleCompare}
        >
          {loading
            ? '⏳ Building comparison…'
            : selected.length < 2
              ? `Select ${2 - selected.length} more brand${selected.length === 1 ? '' : 's'}`
              : `Compare ${selected.length} brands →`
          }
        </button>
      </div>

      {/* Comparison Panel */}
      {compared && (
        <div id="bc-result" className="bc-section bc-animate">
          <div className="bc-label">Comparison — {activeCat}</div>
          <div className="bc-panel">

            {/* Column headers */}
            <div className="bc-panel-header" style={{ gridTemplateColumns: gridCols }}>
              {compared.map(b => (
                <div key={b.id} className="bc-panel-col">
                  <div className="bc-col-food">{b.food}</div>
                  <div className="bc-col-name">{b.brand}</div>
                  <div className="bc-col-price">{b.price}</div>
                  {b.id === winner?.id && (
                    <div className="bc-winner">⭐ TOP PICK</div>
                  )}
                </div>
              ))}
            </div>

            {/* Safety Score */}
            <div className="bc-row">
              <div className="bc-row-label">Safety score</div>
              {compared.map(b => (
                <div key={b.id} className="bc-cell">
                  <div className="bc-score-num" style={{ color: scoreColor(b.score) }}>
                    {b.score}
                    <span style={{ fontSize:12, color:'#ccc', marginLeft:2 }}>/100</span>
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
            <div className="bc-row">
              <div className="bc-row-label">FSSAI certified</div>
              {compared.map(b => (
                <div key={b.id} className="bc-cell">
                  <span className={`bc-tag ${b.fssai ? 'bc-tag-ok' : 'bc-tag-warn'}`}>
                    {b.fssai ? 'FSSAI ✓' : 'Not verified'}
                  </span>
                </div>
              ))}
            </div>

            {/* Why safe */}
            <div className="bc-row">
              <div className="bc-row-label">Why it's safe / not</div>
              {compared.map(b => (
                <div key={b.id} className="bc-cell">
                  <div className="bc-why">{b.why}</div>
                </div>
              ))}
            </div>

            {/* Adulterants to watch */}
            <div className="bc-row">
              <div className="bc-row-label">Common adulterants to watch</div>
              {compared.map(b => (
                <div key={b.id} className="bc-cell">
                  <div className="bc-adult">
                    {(ADULTERANTS[b.food] || []).map((a, i) => (
                      <div key={i}>
                        <span className={`bc-dot ${i === 0 ? 'bc-dot-red' : 'bc-dot-amber'}`} />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Home test */}
            <div className="bc-row">
              <div className="bc-row-label">Home test — {activeCat}</div>
              {compared.map(b => (
                <div key={b.id} className="bc-cell">
                  <div className="bc-test">🧪 {HOME_TESTS[b.food] || 'No home test available.'}</div>
                </div>
              ))}
            </div>

          </div>

          <button className="bc-clear" onClick={reset}>✕ Clear comparison</button>
        </div>
      )}
    </div>
  )
}