import { useState, useEffect } from 'react'
import { useStore } from '../store'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Fallback static coords for known Maharashtra cities
const CITY_COORDS = {
  'Mumbai':     { x: 112, y: 245 },
  'Pune':       { x: 162, y: 278 },
  'Nagpur':     { x: 388, y: 162 },
  'Nashik':     { x: 178, y: 178 },
  'Aurangabad': { x: 262, y: 218 },
  'Solapur':    { x: 238, y: 320 },
  'Kolhapur':   { x: 148, y: 358 },
  'Amravati':   { x: 338, y: 148 },
  'Nanded':     { x: 302, y: 288 },
  'Sangli':     { x: 178, y: 340 },
  'Jalgaon':    { x: 228, y: 138 },
  'Latur':      { x: 298, y: 318 },
  'Dhule':      { x: 188, y: 120 },
  'Akola':      { x: 312, y: 148 },
  'Chandrapur': { x: 408, y: 228 },
}

const RISK_CONFIG = {
  LOW:      { fill: '#eaf3de', stroke: '#639922', text: '#27500A', dot: '#639922',  label: 'Low Risk',      bar: '#639922' },
  MEDIUM:   { fill: '#fff8ed', stroke: '#854F0B', text: '#633806', dot: '#EF9F27',  label: 'Medium Risk',   bar: '#e07c1a' },
  HIGH:     { fill: '#fff0f0', stroke: '#A32D2D', text: '#791F1F', dot: '#E24B4A',  label: 'High Risk',     bar: '#c0392b' },
  CRITICAL: { fill: '#A32D2D', stroke: '#7F0000', text: '#fff',    dot: '#7F0000',  label: 'Critical Risk', bar: '#7F0000' },
}

const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }

  .mp-root {
    font-family: 'DM Sans', sans-serif;
    background: #f7f5f0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 80px;
  }

  .mp-header {
    background: linear-gradient(160deg, #0d2818 0%, #1a3d2b 100%);
    padding: 20px 16px 28px;
    position: relative;
    overflow: hidden;
  }

  .mp-header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 18px;
    background: #f7f5f0;
    border-radius: 18px 18px 0 0;
  }

  .mp-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: #f5f0e8;
    margin-bottom: 2px;
  }

  .mp-subtitle {
    font-size: 11px;
    color: rgba(245,240,232,0.5);
    font-weight: 300;
    letter-spacing: 0.04em;
    margin-bottom: 14px;
  }

  .mp-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .mp-stat {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 8px 10px;
    backdrop-filter: blur(4px);
  }

  .mp-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: #c9a84c;
    line-height: 1;
    margin-bottom: 2px;
  }

  .mp-stat-label {
    font-size: 9px;
    color: rgba(245,240,232,0.5);
    font-weight: 300;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .mp-section { padding: 0 16px; }

  .mp-section-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #999;
    margin-bottom: 6px;
    margin-left: 2px;
  }

  .mp-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .mp-pill {
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    transition: all 0.15s;
    border: 1px solid;
  }

  .mp-map-wrap {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #ece8df;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .mp-city-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #ece8df;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .mp-city-header {
    padding: 12px 16px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f4f1eb;
  }

  .mp-city-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 600;
    color: #1a3d2b;
  }

  .mp-risk-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0.04em;
    border: 1px solid;
  }

  .mp-city-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  .mp-city-stat {
    padding: 10px 16px;
  }

  .mp-city-stat + .mp-city-stat {
    border-left: 1px solid #f4f1eb;
  }

  .mp-city-stat-label {
    font-size: 9px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 3px;
  }

  .mp-city-stat-val {
    font-size: 22px;
    font-family: 'Playfair Display', serif;
    font-weight: 600;
    color: #1a3d2b;
    line-height: 1;
  }

  .mp-city-stat-food {
    font-size: 14px;
    font-weight: 600;
    color: #1a3d2b;
    line-height: 1;
  }

  .mp-list-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #ece8df;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .mp-list-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.12s;
    border-bottom: 1px solid #f4f1eb;
  }

  .mp-list-row:last-child { border-bottom: none; }
  .mp-list-row:hover { background: #faf8f4; }
  .mp-list-row.active { background: #f4f1eb; }

  .mp-list-city { font-size: 13px; font-weight: 600; color: #1a3d2b; }
  .mp-list-food  { font-size: 11px; color: #999; font-weight: 300; margin-top: 1px; }

  .mp-list-right { display: flex; align-items: center; gap: 8px; }
  .mp-list-count { font-size: 12px; color: #888; font-weight: 300; }

  .mp-sev {
    font-size: 9px;
    padding: 3px 8px;
    border-radius: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    border: 1px solid;
  }

  .mp-empty {
    text-align: center;
    padding: 32px 16px;
    color: #aaa;
    font-size: 13px;
    font-weight: 300;
  }

  .mp-loading {
    text-align: center;
    padding: 20px;
    color: #aaa;
    font-size: 12px;
    font-weight: 300;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .mp-fade { animation: fadeUp 0.3s ease forwards; }
`

export default function MapPage() {
  const { lang } = useStore()
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch(`${API_URL}/community/city-risk`)
      .then(r => r.json())
      .then(data => {
        if (data.cities?.length > 0) setCities(data.cities)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Merge DB data with known coords; skip cities without coords
  const mappedCities = cities
    .map(c => ({ ...c, ...(CITY_COORDS[c.city] || {}) }))
    .filter(c => c.x && c.y)

  const filtered = filter === 'ALL' ? mappedCities : mappedCities.filter(c => c.risk === filter)
  const sel = selected ? mappedCities.find(c => c.city === selected) : null

  const totalReports = cities.reduce((s, c) => s + c.reports, 0)
  const criticalCount = cities.filter(c => c.risk === 'CRITICAL').length
  const highCount = cities.filter(c => c.risk === 'HIGH').length

  return (
    <div className="mp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="mp-header">
        <div className="mp-title">Maharashtra Risk Map</div>
        <div className="mp-subtitle">Live community adulteration reports</div>
        <div className="mp-stats-row">
          <div className="mp-stat">
            <div className="mp-stat-num">{totalReports}</div>
            <div className="mp-stat-label">Total Reports</div>
          </div>
          <div className="mp-stat">
            <div className="mp-stat-num">{cities.length}</div>
            <div className="mp-stat-label">Cities</div>
          </div>
          <div className="mp-stat">
            <div className="mp-stat-num" style={{ color: '#E24B4A' }}>{criticalCount + highCount}</div>
            <div className="mp-stat-label">High Risk</div>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="mp-section">
        <div className="mp-pills">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => {
            const active = filter === f
            const cfg = f !== 'ALL' ? RISK_CONFIG[f] : null
            return (
              <button key={f} className="mp-pill" onClick={() => setFilter(f)} style={{
                background: active ? (cfg?.dot || '#1a3d2b') : '#fff',
                color: active ? '#fff' : '#666',
                borderColor: active ? (cfg?.dot || '#1a3d2b') : '#ece8df',
              }}>
                {f === 'ALL' ? 'All Cities' : cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Map */}
      <div className="mp-section">
        <div className="mp-map-wrap">
          {loading ? (
            <div className="mp-loading">Loading map data…</div>
          ) : (
            <svg width="100%" viewBox="0 0 520 430" style={{ display: 'block' }}>
              {/* Maharashtra outline */}
              <polygon
                points="80,200 90,160 120,120 160,90 210,80 270,90 330,80 390,90 440,110 470,150 460,200 450,240 420,270 400,300 360,330 310,360 270,380 230,390 190,380 160,370 130,350 100,320 80,280 70,240"
                fill="#f8f6f1" stroke="#ece8df" strokeWidth="1.5"
              />

              {/* City dots */}
              {mappedCities.map(city => {
                const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
                const isFiltered = filter !== 'ALL' && city.risk !== filter
                const isSel = selected === city.city
                const r = isSel ? 10 : city.reports > 25 ? 8 : city.reports > 15 ? 6 : 5
                return (
                  <g key={city.city} style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(isSel ? null : city.city)}>
                    {city.risk === 'CRITICAL' && !isFiltered && (
                      <circle cx={city.x} cy={city.y} r={16} fill={cfg.dot} opacity={0.15} />
                    )}
                    {isSel && (
                      <circle cx={city.x} cy={city.y} r={r + 5} fill={cfg.dot} opacity={0.15} />
                    )}
                    <circle
                      cx={city.x} cy={city.y} r={r}
                      fill={isFiltered ? '#e0ddd8' : cfg.dot}
                      stroke={isFiltered ? '#ccc' : isSel ? '#0d2818' : cfg.stroke}
                      strokeWidth={isSel ? 2.5 : 1.5}
                      opacity={isFiltered ? 0.35 : 1}
                    />
                    {!isFiltered && (
                      <text
                        x={city.x + 12} y={city.y + 4}
                        fontSize={10} fill="#555"
                        fontFamily="'DM Sans', system-ui, sans-serif"
                        fontWeight={isSel ? '600' : '400'}
                      >
                        {city.city}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Legend */}
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r, i) => (
                <g key={r}>
                  <circle cx={22} cy={350 + i * 16} r={5} fill={RISK_CONFIG[r].dot} />
                  <text x={33} y={354 + i * 16} fontSize={10} fill="#888"
                    fontFamily="'DM Sans', system-ui, sans-serif">
                    {RISK_CONFIG[r].label}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Selected city card */}
      {sel && (
        <div className="mp-section mp-fade">
          <div className="mp-city-card" style={{ borderColor: RISK_CONFIG[sel.risk]?.border || '#ece8df' }}>
            <div className="mp-city-header">
              <div className="mp-city-name">📍 {sel.city}</div>
              <span className="mp-risk-badge" style={{
                background: RISK_CONFIG[sel.risk].fill,
                color: RISK_CONFIG[sel.risk].text,
                borderColor: RISK_CONFIG[sel.risk].stroke,
              }}>
                {sel.risk} RISK
              </span>
            </div>
            <div className="mp-city-stats">
              <div className="mp-city-stat">
                <div className="mp-city-stat-label">Reports</div>
                <div className="mp-city-stat-val">{sel.reports}</div>
              </div>
              <div className="mp-city-stat">
                <div className="mp-city-stat-label">Top Risky Food</div>
                <div className="mp-city-stat-food">{sel.topFood || 'Various'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* City list */}
      <div className="mp-section">
        <div className="mp-section-label">{filtered.length} cities</div>
        {loading ? (
          <div className="mp-loading">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mp-empty">No reports yet for this filter.</div>
        ) : (
          <div className="mp-list-card">
            {[...filtered]
              .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk))
              .map(city => (
                <div
                  key={city.city}
                  className={`mp-list-row ${selected === city.city ? 'active' : ''}`}
                  onClick={() => setSelected(selected === city.city ? null : city.city)}
                >
                  <div>
                    <div className="mp-list-city">{city.city}</div>
                    <div className="mp-list-food">{city.topFood || 'Various'}</div>
                  </div>
                  <div className="mp-list-right">
                    <span className="mp-list-count">{city.reports} reports</span>
                    <span className="mp-sev" style={{
                      background: RISK_CONFIG[city.risk].fill,
                      color: RISK_CONFIG[city.risk].text,
                      borderColor: RISK_CONFIG[city.risk].stroke,
                    }}>
                      {city.risk}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}