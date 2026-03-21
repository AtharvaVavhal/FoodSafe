import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const CONDITIONS = ['diabetic','pregnant','child','kidney disease','hypertensive','elderly']
const AV_COLORS  = ['#E1F5EE','#E6F1FB','#FAEEDA','#FBEAF0','#EEEDFE','#FAECE7']
const AV_TEXT    = ['#0F6E56','#185FA5','#854F0B','#993556','#534AB7','#993C1D']

export default function FamilyPage() {
  const { family, addMember, removeMember, lang } = useStore()
  const [name, setName]       = useState('')
  const [age, setAge]         = useState('')
  const [selected, setSelected] = useState([])
  const [adding, setAdding]   = useState(false)

  function save() {
    if (!name.trim()) return
    addMember({ id: Date.now().toString(), name: name.trim(), age: +age, conditions: selected })
    setName(''); setAge(''); setSelected([]); setAdding(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:15, fontWeight:500 }}>Family Profiles</div>
        <button onClick={() => setAdding(!adding)}
          style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #1a3d2b',
                   background:'#1a3d2b', color:'#fff', cursor:'pointer' }}>
          {t(lang,'addMember')}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background:'#fff', borderRadius:12, padding:14, border:'0.5px solid #e0e0d8' }}>
          <div style={{ fontSize:11, fontWeight:500, color:'#666', marginBottom:10 }}>New Member</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name"
            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #ddd',
                     fontSize:13, marginBottom:8, fontFamily:'inherit', boxSizing:'border-box' }} />
          <input value={age} onChange={e=>setAge(e.target.value)} placeholder="Age" type="number"
            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #ddd',
                     fontSize:13, marginBottom:10, fontFamily:'inherit', boxSizing:'border-box' }} />
          <div style={{ fontSize:11, color:'#666', marginBottom:6 }}>Health conditions:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setSelected(s => s.includes(c)?s.filter(x=>x!==c):[...s,c])}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                          border:`1px solid ${selected.includes(c)?'#1a3d2b':'#ddd'}`,
                          background:selected.includes(c)?'#EAF3DE':'#fff',
                          color:selected.includes(c)?'#27500A':'#666' }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={save}
            style={{ width:'100%', padding:9, borderRadius:8, border:'none', background:'#1a3d2b',
                     color:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Save Member
          </button>
        </div>
      )}

      {/* Members list */}
      {family.length === 0 && !adding ? (
        <p style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:30 }}>
          No family members yet. Add one to get personalized scan results!
        </p>
      ) : family.map((m,i) => (
        <div key={m.id} style={{ background:'#fff', borderRadius:12, padding:14,
                                  border:'0.5px solid #e0e0d8', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
                         background:AV_COLORS[i%6], color:AV_TEXT[i%6],
                         display:'flex', alignItems:'center', justifyContent:'center',
                         fontSize:13, fontWeight:500 }}>
            {m.name.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500 }}>{m.name}</div>
            <div style={{ fontSize:11, color:'#888' }}>Age: {m.age||'?'}</div>
            {m.conditions?.length > 0 && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                {m.conditions.map(c => (
                  <span key={c} style={{ fontSize:10, padding:'1px 6px', borderRadius:8,
                                          background:'#FCEBEB', color:'#A32D2D' }}>
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => removeMember(m.id)}
            style={{ fontSize:11, color:'#A32D2D', background:'none', border:'none', cursor:'pointer' }}>
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
