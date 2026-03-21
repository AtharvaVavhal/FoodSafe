const RISK_DOT = {
  LOW: '#639922', MEDIUM: '#EF9F27', HIGH: '#E24B4A', CRITICAL: '#A32D2D'
}
const RISK_STROKE = {
  LOW: '#3B6D11', MEDIUM: '#854F0B', HIGH: '#A32D2D', CRITICAL: '#7F0000'
}

export function CityDot({ city, isSelected, isFiltered, onClick }) {
  const { x, y, risk, reports } = city
  const r = isSelected ? 10 : reports > 25 ? 8 : reports > 15 ? 6 : 5
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      {risk === 'CRITICAL' && !isFiltered && (
        <circle cx={x} cy={y} r={14} fill={RISK_DOT[risk]} opacity={0.15} />
      )}
      <circle
        cx={x} cy={y} r={r}
        fill={isFiltered ? '#e0e0d8' : RISK_DOT[risk]}
        stroke={isFiltered ? '#ccc' : isSelected ? '#1a3d2b' : RISK_STROKE[risk]}
        strokeWidth={isSelected ? 2 : 1}
        opacity={isFiltered ? 0.4 : 1}
      />
      {!isFiltered && (
        <text x={x + 12} y={y + 4} fontSize={10} fill="#555" fontFamily="system-ui, sans-serif">
          {city.name}
        </text>
      )}
    </g>
  )
}

const LEGEND = [
  { risk: 'LOW',      dot: '#639922', label: 'Low Risk' },
  { risk: 'MEDIUM',   dot: '#EF9F27', label: 'Medium Risk' },
  { risk: 'HIGH',     dot: '#E24B4A', label: 'High Risk' },
  { risk: 'CRITICAL', dot: '#A32D2D', label: 'Critical Risk' },
]

export function RiskLegend({ offsetY = 350 }) {
  return (
    <g>
      {LEGEND.map((l, i) => (
        <g key={l.risk}>
          <circle cx={22} cy={offsetY + i * 16} r={5} fill={l.dot} />
          <text x={32} y={offsetY + 4 + i * 16} fontSize={10} fill="#666" fontFamily="system-ui, sans-serif">
            {l.label}
          </text>
        </g>
      ))}
    </g>
  )
}