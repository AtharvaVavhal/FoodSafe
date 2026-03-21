// components/family/MemberCard.jsx
const AV_COLORS = ['#E1F5EE','#E6F1FB','#FAEEDA','#FBEAF0','#EEEDFE','#FAECE7']
const AV_TEXT   = ['#0F6E56','#185FA5','#854F0B','#993556','#534AB7','#993C1D']

export function MemberCard({ member, index, onRemove }) {
  const { id, name, age, conditions } = member
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 14,
      border: '0.5px solid #e0e0d8', display: 'flex',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: AV_COLORS[index % 6], color: AV_TEXT[index % 6],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 500,
      }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: '#888' }}>Age: {age || '?'}</div>
        {conditions?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {conditions.map(c => (
              <span key={c} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8,
                background: '#FCEBEB', color: '#A32D2D',
              }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => onRemove(id)}
        style={{ fontSize: 11, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer' }}>
        Remove
      </button>
    </div>
  )
}

// components/family/AddMemberForm.jsx
import { useState } from 'react'

const CONDITIONS = ['diabetic','pregnant','child','kidney disease','hypertensive','elderly']

export function AddMemberForm({ onSave, onCancel }) {
  const [name, setName]         = useState('')
  const [age, setAge]           = useState('')
  const [selected, setSelected] = useState([])

  function save() {
    if (!name.trim()) return
    onSave({ id: Date.now().toString(), name: name.trim(), age: +age, conditions: selected })
  }

  const toggle = c => setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c])

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e0e0d8' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 10 }}>New Member</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd',
                 fontSize: 13, marginBottom: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      <input value={age} onChange={e => setAge(e.target.value)} placeholder="Age" type="number"
        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd',
                 fontSize: 13, marginBottom: 10, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Health conditions:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {CONDITIONS.map(c => (
          <button key={c} onClick={() => toggle(c)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${selected.includes(c) ? '#1a3d2b' : '#ddd'}`,
              background: selected.includes(c) ? '#EAF3DE' : '#fff',
              color: selected.includes(c) ? '#27500A' : '#666',
            }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save}
          style={{ flex: 2, padding: 9, borderRadius: 8, border: 'none', background: '#1a3d2b',
                   color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Save Member
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid #ddd', background: '#fff',
                   color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}