import { useState } from 'react'

export function SymptomForm({ onAnalyze, loading, recentFoods }) {
  const [symptoms, setSymptoms] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea
        value={symptoms}
        onChange={e => setSymptoms(e.target.value)}
        placeholder="e.g. stomach pain, nausea, skin rash since yesterday..."
        rows={4}
        style={{
          padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd',
          fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none',
        }}
      />
      {recentFoods?.length > 0 && (
        <div style={{ fontSize: 11, color: '#666' }}>
          Recent foods from diary: {recentFoods.join(', ')}
        </div>
      )}
      <button
        onClick={() => onAnalyze(symptoms)}
        disabled={loading || !symptoms.trim()}
        style={{
          padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13,
          background: loading || !symptoms.trim() ? '#ccc' : '#1a3d2b',
          color: '#fff',
        }}>
        {loading ? 'Analyzing...' : 'Analyze Symptoms'}
      </button>
    </div>
  )
}

export function CauseCard({ cause, isLast }) {
  const { adulterant, food, confidence, explanation } = cause
  const confColor = confidence === 'HIGH' ? '#A32D2D' : confidence === 'MEDIUM' ? '#854F0B' : '#639922'
  return (
    <div style={{ padding: '8px 0', borderBottom: isLast ? 'none' : '0.5px solid #f0f0e8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{adulterant}</span>
        <span style={{ fontSize: 10, color: confColor }}>{confidence}</span>
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
        via {food} — {explanation}
      </div>
    </div>
  )
}