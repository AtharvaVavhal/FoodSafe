import { useState } from 'react'
import { useStore } from '../store'

const CITIES = [
  { name: 'Mumbai',      x: 112, y: 245, risk: 'HIGH',     reports: 34, topFood: 'Milk' },
  { name: 'Pune',        x: 162, y: 278, risk: 'HIGH',     reports: 28, topFood: 'Turmeric' },
  { name: 'Nagpur',      x: 388, y: 162, risk: 'CRITICAL', reports: 41, topFood: 'Mustard Oil' },
  { name: 'Nashik',      x: 178, y: 178, risk: 'MEDIUM',   reports: 19, topFood: 'Honey' },
  { name: 'Aurangabad',  x: 262, y: 218, risk: 'HIGH',     reports: 22, topFood: 'Ghee' },
  { name: 'Solapur',     x: 238, y: 320, risk: 'MEDIUM',   reports: 14, topFood: 'Dal' },
  { name: 'Kolhapur',    x: 148, y: 358, risk: 'LOW',      reports: 8,  topFood: 'Paneer' },
  { name: 'Amravati',    x: 338, y: 148, risk: 'HIGH',     reports: 17, topFood: 'Turmeric' },
  { name: 'Nanded',      x: 302, y: 288, risk: 'MEDIUM',   reports: 11, topFood: 'Chilli' },
  { name: 'Sangli',      x: 178, y: 340, risk: 'LOW',      reports: 6,  topFood: 'Jaggery' },
  { name: 'Jalgaon',     x: 228, y: 138, risk: 'MEDIUM',   reports: 13, topFood: 'Wheat' },
  { name: 'Latur',       x: 298, y: 318, risk: 'MEDIUM',   reports: 9,  topFood: 'Turmeric' },
  { name: 'Dhule',       x: 188, y: 120, risk: 'LOW',      reports: 5,  topFood: 'Oil' },
  { name: 'Akola',       x: 312, y: 148, risk: 'HIGH',     reports: 15, topFood: 'Mustard Oil' },
  { name: 'Chandrapur',  x: 408, y: 228, risk: 'MEDIUM',   reports: 10, topFood: 'Rice' },
]

const RISK_CONFIG = {
  LOW:      { fill: '#EAF3DE', stroke: '#639922', text: '#27500A', dot: '#639922', label: 'Low Risk' },
  MEDIUM:   { fill: '#FAEEDA', stroke: '#854F0B', text: '#633806', dot: '#EF9F27', label: 'Medium Risk' },
  HIGH:     { fill: '#FCEBEB', stroke: '#A32D2D', text: '#791F1F', dot: '#E24B4A', label: 'High Risk' },
  CRITICAL: { fill: '#A32D2D', stroke: '#7F0000', text: '#fff',    dot: '#7F0000', label: 'Critical Risk' },
}

export default function MapPage() {
  const { lang } = useStore()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL' ? CITIES : CITIES.filter(c => c.risk === filter)
  const sel = selected ? CITIES.find(c => c.name === selected) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>Maharashtra Risk Map</div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', border: `1px solid ${filter === f ? '#1a3d2b' : '#ddd'}`,
              background: filter === f ? '#1a3d2b' : '#fff',
              color: filter === f ? '#fff' : '#666',
            }}>
            {f === 'ALL' ? 'All Cities' : RISK_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Map SVG */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e0e0d8', overflow: 'hidden' }}>
        <svg width="100%" viewBox="0 0 520 430" style={{ display: 'block' }}>
          {/* Maharashtra outline (simplified polygon) */}
          <polygon
            points="80,200 90,160 120,120 160,90 210,80 270,90 330,80 390,90 440,110 470,150 460,200 450,240 420,270 400,300 360,330 310,360 270,380 230,390 190,380 160,370 130,350 100,320 80,280 70,240"
            fill="#f8f9f6" stroke="#e0e0d8" strokeWidth="1.5" />

          {/* City dots */}
          {CITIES.map(city => {
            const cfg = RISK_CONFIG[city.risk]
            const isFiltered = filter !== 'ALL' && city.risk !== filter
            const isSel = selected === city.name
            return (
              <g key={city.name} style={{ cursor: 'pointer' }}
                onClick={() => setSelected(isSel ? null : city.name)}>
                {/* Pulse ring for critical */}
                {city.risk === 'CRITICAL' && !isFiltered && (
                  <circle cx={city.x} cy={city.y} r={14} fill={cfg.dot} opacity={0.15} />
                )}
                <circle
                  cx={city.x} cy={city.y}
                  r={isSel ? 10 : city.reports > 25 ? 8 : city.reports > 15 ? 6 : 5}
                  fill={isFiltered ? '#e0e0d8' : cfg.dot}
                  stroke={isFiltered ? '#ccc' : isSel ? '#1a3d2b' : cfg.stroke}
                  strokeWidth={isSel ? 2 : 1}
                  opacity={isFiltered ? 0.4 : 1}
                />
                {/* City label */}
                {!isFiltered && (
                  <text
                    x={city.x + 12} y={city.y + 4}
                    fontSize={10} fill={isFiltered ? '#ccc' : '#555'}
                    fontFamily="system-ui, sans-serif">
                    {city.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Legend */}
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r, i) => (
            <g key={r}>
              <circle cx={22} cy={350 + i * 16} r={5} fill={RISK_CONFIG[r].dot} />
              <text x={32} y={354 + i * 16} fontSize={10} fill="#666" fontFamily="system-ui, sans-serif">
                {RISK_CONFIG[r].label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Selected city card */}
      {sel && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: 14,
          border: `1px solid ${RISK_CONFIG[sel.risk].stroke}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>📍 {sel.name}</div>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 500,
              background: RISK_CONFIG[sel.risk].fill,
              color: RISK_CONFIG[sel.risk].text,
              border: `1px solid ${RISK_CONFIG[sel.risk].stroke}`,
            }}>
              {sel.risk} RISK
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#f8f9f6', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#888' }}>Community Reports</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#1a3d2b' }}>{sel.reports}</div>
            </div>
            <div style={{ background: '#f8f9f6', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#888' }}>Top Risky Food</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{sel.topFood}</div>
            </div>
          </div>
        </div>
      )}

      {/* City list */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 10 }}>
          {filtered.length} cities
        </div>
        {filtered
          .sort((a, b) => ['CRITICAL','HIGH','MEDIUM','LOW'].indexOf(a.risk) - ['CRITICAL','HIGH','MEDIUM','LOW'].indexOf(b.risk))
          .map((city, i) => (
            <div key={city.name}
              onClick={() => setSelected(selected === city.name ? null : city.name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0', cursor: 'pointer',
                borderBottom: i < filtered.length - 1 ? '0.5px solid #f0f0e8' : 'none',
                background: selected === city.name ? '#f8f9f6' : 'transparent',
                borderRadius: 6, paddingLeft: selected === city.name ? 8 : 0,
              }}>
              <div>
                <span style={{ fontSize: 13 }}>{city.name}</span>
                <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>— {city.topFood}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#888' }}>{city.reports} reports</span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                  background: RISK_CONFIG[city.risk].fill,
                  color: RISK_CONFIG[city.risk].text,
                }}>
                  {city.risk}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}