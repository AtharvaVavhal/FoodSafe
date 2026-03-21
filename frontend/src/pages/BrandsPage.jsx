import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }
  .bp-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .bp-header { background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%); padding:20px 16px 28px; position:relative; overflow:hidden; }
  .bp-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#f7f5f0; border-radius:18px 18px 0 0; }
  .bp-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .bp-sub { font-size:11px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.04em; margin-bottom:14px; }
  .bp-search-wrap { position:relative; }
  .bp-search { width:100%; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:12px 16px; font-size:13px; font-family:'DM Sans',sans-serif; color:#f5f0e8; outline:none; transition:border-color 0.2s; }
  .bp-search::placeholder { color:rgba(245,240,232,0.4); }
  .bp-search:focus { border-color:rgba(201,168,76,0.5); }
  .bp-searching { font-size:10px; color:rgba(245,240,232,0.4); margin-top:8px; font-weight:300; letter-spacing:0.04em; }
  .bp-section { padding:0 16px; }
  .bp-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#999; margin-bottom:6px; margin-left:2px; }
  .bp-card { background:#fff; border-radius:16px; border:1px solid #ece8df; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .bp-row { display:flex; justify-content:space-between; align-items:flex-start; padding:12px 16px; border-bottom:1px solid #f4f1eb; transition:background 0.12s; }
  .bp-row:last-child { border-bottom:none; }
  .bp-row:hover { background:#faf8f4; }
  .bp-food-cat { font-size:9px; color:#aaa; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
  .bp-brand-name { font-size:14px; font-weight:600; color:#1a3d2b; }
  .bp-price { font-size:11px; color:#999; font-weight:300; margin-top:2px; }
  .bp-why { font-size:10px; color:#aaa; font-weight:300; margin-top:3px; line-height:1.4; max-width:200px; }
  .bp-score-wrap { text-align:right; flex-shrink:0; margin-left:12px; }
  .bp-score { font-family:'Playfair Display',serif; font-size:22px; font-weight:600; line-height:1; }
  .bp-fssai { font-size:9px; background:#eaf3de; color:#27500A; padding:2px 7px; border-radius:6px; margin-top:4px; display:inline-block; border:1px solid #c0dd97; }
  .bp-empty { text-align:center; padding:32px 16px; color:#aaa; font-size:13px; font-weight:300; }
  .bp-loading { text-align:center; padding:40px 16px; color:#aaa; font-size:12px; font-weight:300; line-height:1.8; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .bp-fade { animation:fadeUp 0.3s ease forwards; }
`

export default function BrandsPage() {
  const [brands, setBrands]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [searching, setSearching] = useState(false)
  const [search, setSearch]     = useState('')

  // Initial load
  useEffect(() => {
    fetch(`${API_URL}/brands/all`)
      .then(r => r.json())
      .then(data => setBrands(data.brands || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounced search — longer delay since Groq takes ~2s
  useEffect(() => {
    const q = search.trim()
    if (!q) return
    setSearching(true)
    const timer = setTimeout(() => {
      fetch(`${API_URL}/brands/all?search=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => setBrands(data.brands || []))
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [search])

  // Group by food category
  const grouped = brands.reduce((acc, b) => {
    if (!acc[b.food]) acc[b.food] = []
    acc[b.food].push(b)
    return acc
  }, {})

  const scoreColor = (s) => s >= 85 ? '#27500A' : s >= 75 ? '#854F0B' : '#A32D2D'

  return (
    <div className="bp-root">
      <style>{STYLES}</style>

      <div className="bp-header">
        <div className="bp-title">Safe Brand Finder</div>
        <div className="bp-sub">AI-powered FSSAI verified brand recommendations</div>
        <div className="bp-search-wrap">
          <input
            className="bp-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search food or brand — turmeric, Amul, honey…"
          />
        </div>
        {searching && (
          <div className="bp-searching">⏳ Finding best brands via AI…</div>
        )}
      </div>

      {loading || searching ? (
        <div className="bp-loading">
          🤖 Asking AI for safe brand recommendations…<br />
          <span style={{ fontSize:10 }}>This takes a few seconds</span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bp-section">
          <div className="bp-empty">No brands found. Try searching a specific food.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div className="bp-section bp-fade" key={category}>
            <div className="bp-section-label">{category}</div>
            <div className="bp-card">
              {items
                .sort((a, b) => b.score - a.score)
                .map((b, i) => (
                  <div key={i} className="bp-row">
                    <div style={{ flex: 1 }}>
                      <div className="bp-food-cat">{b.food}</div>
                      <div className="bp-brand-name">{b.brand}</div>
                      <div className="bp-price">{b.price}</div>
                      {b.why && <div className="bp-why">{b.why}</div>}
                    </div>
                    <div className="bp-score-wrap">
                      <div className="bp-score" style={{ color: scoreColor(b.score) }}>{b.score}</div>
                      {b.fssai && <div className="bp-fssai">FSSAI ✓</div>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}