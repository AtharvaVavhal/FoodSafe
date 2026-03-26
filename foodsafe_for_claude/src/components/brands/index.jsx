export function BrandCard({ brand }) {
  const { category, name: brandName, score, price } = brand
  const scoreColor = score >= 85 ? '#27500A' : score >= 70 ? '#854F0B' : '#A32D2D'
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 14,
      border: '0.5px solid #e0e0d8', display: 'flex', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#888' }}>{category}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{brandName}</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{price}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: scoreColor }}>{score}</div>
        <div style={{ fontSize: 9, background: '#EAF3DE', color: '#27500A', padding: '1px 5px', borderRadius: 6, marginTop: 4 }}>
          FSSAI ✓
        </div>
      </div>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 8,
        border: '1px solid #ddd', fontSize: 13,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
      }}
    />
  )
}