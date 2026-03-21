import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const CONDITIONS = ['diabetic','pregnant','child','kidney disease','hypertensive','elderly','lactose intolerant','heart disease']

const AV_PALETTE = [
  { bg:'#E1F5EE', text:'#0F6E56' },
  { bg:'#E6F1FB', text:'#185FA5' },
  { bg:'#FAEEDA', text:'#854F0B' },
  { bg:'#FBEAF0', text:'#993556' },
  { bg:'#EEEDFE', text:'#534AB7' },
  { bg:'#FAECE7', text:'#993C1D' },
]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; }
  .fp-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .fp-header { background:linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%); padding:20px 16px 28px; position:relative; overflow:hidden; }
  .fp-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#f7f5f0; border-radius:18px 18px 0 0; }
  .fp-header-row { display:flex; justify-content:space-between; align-items:flex-start; }
  .fp-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:600; color:#f5f0e8; margin-bottom:2px; }
  .fp-sub { font-size:11px; color:rgba(245,240,232,0.5); font-weight:300; letter-spacing:0.04em; }
  .fp-add-btn { background:rgba(201,168,76,0.2); border:1px solid rgba(201,168,76,0.4); border-radius:10px; padding:8px 14px; color:#c9a84c; font-size:12px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:background 0.15s; flex-shrink:0; }
  .fp-add-btn:hover { background:rgba(201,168,76,0.3); }
  .fp-section { padding:0 16px; }
  .fp-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#999; margin-bottom:6px; margin-left:2px; }
  .fp-form { background:#fff; border-radius:16px; border:1px solid #ece8df; padding:16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .fp-form-label { font-size:10px; color:#aaa; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; }
  .fp-input { width:100%; padding:10px 12px; border-radius:10px; border:1px solid #ece8df; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; background:#faf8f4; color:#1a3d2b; margin-bottom:10px; transition:border-color 0.15s; }
  .fp-input:focus { border-color:#c9a84c; }
  .fp-conditions-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
  .fp-cond-btn { font-size:11px; padding:5px 12px; border-radius:20px; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; border:1px solid; }
  .fp-save-btn { width:100%; padding:12px; border-radius:12px; border:none; background:linear-gradient(135deg,#c9a84c,#e0c068); color:#0d2818; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; box-shadow:0 3px 12px rgba(201,168,76,0.3); }
  .fp-save-btn:active { transform:scale(0.98); }
  .fp-member-card { background:#fff; border-radius:16px; border:1px solid #ece8df; padding:14px 16px; box-shadow:0 1px 4px rgba(0,0,0,0.04); display:flex; align-items:center; gap:12px; }
  .fp-avatar { width:48px; height:48px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; }
  .fp-member-name { font-size:15px; font-weight:600; color:#1a3d2b; font-family:'Playfair Display',serif; }
  .fp-member-age { font-size:11px; color:#aaa; font-weight:300; margin-top:1px; }
  .fp-cond-tag { font-size:10px; padding:2px 8px; border-radius:8px; background:#fff0f0; color:#A32D2D; border:1px solid #f7c1c1; }
  .fp-remove-btn { font-size:11px; color:#aaa; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:color 0.15s; flex-shrink:0; }
  .fp-remove-btn:hover { color:#A32D2D; }
  .fp-empty { text-align:center; padding:40px 16px; color:#aaa; font-size:13px; font-weight:300; line-height:1.6; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fp-fade { animation:fadeUp 0.3s ease forwards; }
`

export default function FamilyPage() {
  const { family, addMember, removeMember, lang } = useStore()
  const [name, setName]         = useState('')
  const [age, setAge]           = useState('')
  const [selected, setSelected] = useState([])
  const [adding, setAdding]     = useState(false)

  function save() {
    if (!name.trim()) return
    addMember({ id: Date.now().toString(), name: name.trim(), age: +age, conditions: selected })
    setName(''); setAge(''); setSelected([]); setAdding(false)
  }

  function toggleCondition(c) {
    setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c])
  }

  return (
    <div className="fp-root">
      <style>{STYLES}</style>

      <div className="fp-header">
        <div className="fp-header-row">
          <div>
            <div className="fp-title">Family Profiles</div>
            <div className="fp-sub">Personalized safety for every member</div>
          </div>
          <button className="fp-add-btn" onClick={() => setAdding(!adding)}>
            {adding ? '✕ Cancel' : '+ Add Member'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="fp-section fp-fade">
          <div className="fp-form">
            <div className="fp-form-label">Name</div>
            <input className="fp-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aai, Baba, Dada…" />
            <div className="fp-form-label">Age</div>
            <input className="fp-input" value={age} onChange={e => setAge(e.target.value)} placeholder="Age" type="number" />
            <div className="fp-form-label" style={{ marginBottom:8 }}>Health Conditions</div>
            <div className="fp-conditions-wrap">
              {CONDITIONS.map(c => (
                <button key={c} className="fp-cond-btn" onClick={() => toggleCondition(c)} style={{
                  background: selected.includes(c) ? '#eaf3de' : '#faf8f4',
                  color: selected.includes(c) ? '#27500A' : '#888',
                  borderColor: selected.includes(c) ? '#c0dd97' : '#ece8df',
                }}>
                  {c}
                </button>
              ))}
            </div>
            <button className="fp-save-btn" onClick={save}>Save Member</button>
          </div>
        </div>
      )}

      {/* Members */}
      {family.length === 0 && !adding ? (
        <div className="fp-empty">
          No family members yet.<br />
          Add members to get personalized<br />scan results for each person.
        </div>
      ) : (
        <div className="fp-section">
          <div className="fp-section-label">{family.length} member{family.length !== 1 ? 's' : ''}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {family.map((m, i) => {
              const pal = AV_PALETTE[i % AV_PALETTE.length]
              return (
                <div key={m.id} className="fp-member-card fp-fade">
                  <div className="fp-avatar" style={{ background: pal.bg, color: pal.text }}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div className="fp-member-name">{m.name}</div>
                    <div className="fp-member-age">{m.age ? `Age ${m.age}` : 'Age not set'}</div>
                    {m.conditions?.length > 0 && (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                        {m.conditions.map(c => (
                          <span key={c} className="fp-cond-tag">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="fp-remove-btn" onClick={() => removeMember(m.id)}>Remove</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}