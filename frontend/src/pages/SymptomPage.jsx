import { useState } from 'react'
import { useStore } from '../store'
import { analyzeSymptoms } from '../services/claude'

const URGENCY_STYLE = {
  MONITOR:        { bg:'#EAF3DE', color:'#27500A', label:'Monitor at home' },
  CONSULT_DOCTOR: { bg:'#FAEEDA', color:'#633806', label:'Visit a doctor' },
  EMERGENCY:      { bg:'#FCEBEB', color:'#791F1F', label:'Seek emergency care' },
}

export default function SymptomPage() {
  const { scanHistory, lang } = useStore()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  const recentFoods = [...new Set(scanHistory.slice(0,5).map(s=>s.food_name))]

  async function analyze() {
    if (!symptoms.trim()) return
    setLoading(true)
    try {
      const r = await analyzeSymptoms({ symptoms, recentFoods, lang })
      setResult(r)
    } catch { setResult({ error: true }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:15, fontWeight:500 }}>Symptom Checker</div>
      <p style={{ fontSize:12, color:'#666', lineHeight:1.5 }}>
        Describe your symptoms — we'll check if recent food adulteration exposure could be related.
      </p>

      <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)}
        placeholder="e.g. stomach pain, nausea, skin rash since yesterday..."
        rows={4}
        style={{ padding:'10px 12px', borderRadius:10, border:'1px solid #ddd', fontSize:13,
                  fontFamily:'inherit', resize:'none', outline:'none' }} />

      {recentFoods.length > 0 && (
        <div style={{ fontSize:11, color:'#666' }}>
          Recent foods from your diary: {recentFoods.join(', ')}
        </div>
      )}

      <button onClick={analyze} disabled={loading || !symptoms.trim()}
        style={{ padding:10, borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                  background: loading||!symptoms.trim()?'#ccc':'#1a3d2b', color:'#fff', fontSize:13 }}>
        {loading ? 'Analyzing...' : 'Analyze Symptoms'}
      </button>

      {result && !result.error && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Urgency */}
          {result.urgency && (() => {
            const s = URGENCY_STYLE[result.urgency] || URGENCY_STYLE.MONITOR
            return (
              <div style={{ background:s.bg, borderRadius:10, padding:'10px 14px', color:s.color, fontSize:13, fontWeight:500 }}>
                ⚕ {s.label}
              </div>
            )
          })()}

          {/* Possible causes */}
          {result.possibleCauses?.length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, padding:14, border:'0.5px solid #e0e0d8' }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#666', marginBottom:10 }}>Possible Causes</div>
              {result.possibleCauses.map((c,i) => (
                <div key={i} style={{ padding:'8px 0', borderBottom:i<result.possibleCauses.length-1?'0.5px solid #f0f0e8':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{c.adulterant}</span>
                    <span style={{ fontSize:10, color: c.confidence==='HIGH'?'#A32D2D':c.confidence==='MEDIUM'?'#854F0B':'#639922' }}>
                      {c.confidence}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'#666', marginTop:2 }}>via {c.food} — {c.explanation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div style={{ background:'#E6F1FB', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#0C447C' }}>
              💡 {result.recommendation}
            </div>
          )}

          <div style={{ fontSize:10, color:'#aaa', lineHeight:1.5 }}>{result.disclaimer}</div>
        </div>
      )}
    </div>
  )
}