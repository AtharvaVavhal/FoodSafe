// DiaryPage
import { useStore } from '../store'
import { t } from '../i18n/translations'

const RISK_COLOR = { LOW:'#639922', MEDIUM:'#854F0B', HIGH:'#A32D2D', CRITICAL:'#7F0000' }
const RISK_BG    = { LOW:'#EAF3DE', MEDIUM:'#FAEEDA', HIGH:'#FCEBEB', CRITICAL:'#F7C1C1' }

export default function DiaryPage() {
  const { scanHistory, lang } = useStore()

  const total = scanHistory.length
  const high  = scanHistory.filter(s => ['HIGH','CRITICAL'].includes(s.risk_level)).length
  const avg   = total ? Math.round(scanHistory.reduce((a,s) => a+(s.safety_score||50),0)/total) : 0
  const grade = avg>=80?'A':avg>=65?'B':avg>=50?'C':avg>=35?'D':'F'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:15, fontWeight:500 }}>Food Safety Diary</div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { val:total, lbl:'Total Scans' },
          { val:high,  lbl:'High Risk', color:'#A32D2D' },
          { val:`${grade}`, lbl:'Safety Grade', color:grade<='B'?'#27500A':'#854F0B' },
        ].map((s,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:10, padding:'10px 8px',
                                 textAlign:'center', border:'0.5px solid #e0e0d8' }}>
            <div style={{ fontSize:22, fontWeight:500, color:s.color||'#1a1a1a' }}>{s.val}</div>
            <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* History */}
      <div style={{ background:'#fff', borderRadius:12, padding:14, border:'0.5px solid #e0e0d8' }}>
        <div style={{ fontSize:11, fontWeight:500, color:'#666', marginBottom:10 }}>Recent Scans</div>
        {scanHistory.length === 0 ? (
          <p style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:20 }}>
            {t(lang,'noHistory')}
          </p>
        ) : scanHistory.slice(0,20).map((s,i) => (
          <div key={s.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                       padding:'7px 0', borderBottom: i<scanHistory.length-1?'0.5px solid #f0f0e8':'none' }}>
            <div>
              <div style={{ fontSize:13 }}>{s.food_name}</div>
              <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>
                {new Date(s.date).toLocaleDateString()}
              </div>
            </div>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:500,
                            background:RISK_BG[s.risk_level]||'#eee',
                            color:RISK_COLOR[s.risk_level]||'#666' }}>
              {s.risk_level||'?'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
