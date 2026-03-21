// FestivalPage
export function FestivalPage() {
  const now = new Date()
  const month = now.getMonth() + 1

  const FESTIVALS = [
    { months:[10,11], name:'Diwali Season', icon:'🪔', risk:'CRITICAL',
      foods:['Mawa/Khoya','Sweets','Dry Fruits','Ghee'],
      tips:['Buy khoya only from certified dairies','Check FSSAI license of sweet shops',
            'Avoid loose mawa — 70%+ is adulterated','Prefer packaged branded sweets'] },
    { months:[3],     name:'Holi', icon:'🎨', risk:'HIGH',
      foods:['Thandai','Dry Fruits','Colours in food'],
      tips:['Synthetic colors may be added to thandai mixes','Buy dry fruits in sealed packs',
            'Avoid artificially colored food items'] },
    { months:[6,7,8], name:'Monsoon Season', icon:'🌧', risk:'HIGH',
      foods:['Milk','Vegetables','Leafy Greens','Fish'],
      tips:['Boil milk before use — adulteration spikes in monsoon',
            'Wash vegetables with potassium permanganate solution',
            'Avoid cut fruits from roadside stalls'] },
    { months:[1,2],   name:'Makar Sankranti / Pongal', icon:'🌾', risk:'MEDIUM',
      foods:['Til (Sesame)','Jaggery','Rice'],
      tips:['Jaggery may have soda ash / chemicals for colour',
            'Buy til from sealed FSSAI-certified packs'] },
  ]

  const RISK_COLOR = { CRITICAL:'#A32D2D', HIGH:'#854F0B', MEDIUM:'#639922' }
  const RISK_BG    = { CRITICAL:'#FCEBEB', HIGH:'#FAEEDA', MEDIUM:'#EAF3DE' }

  const current = FESTIVALS.find(f => f.months.includes(month))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:15, fontWeight:500 }}>Festival Safety Guide</div>

      {current && (
        <div style={{ background: RISK_BG[current.risk], borderRadius:12, padding:14,
                       border:`1px solid ${RISK_COLOR[current.risk]}22` }}>
          <div style={{ fontSize:16 }}>{current.icon} {current.name} Alert</div>
          <div style={{ fontSize:11, color: RISK_COLOR[current.risk], marginTop:4, fontWeight:500 }}>
            {current.risk} RISK SEASON — Be extra cautious
          </div>
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#555', marginBottom:6 }}>Watch out for:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {current.foods.map(f => (
                <span key={f} style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                                        background:'rgba(255,255,255,0.7)', color:'#333' }}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#555', marginBottom:6 }}>Safety tips:</div>
            {current.tips.map((tip,i) => (
              <div key={i} style={{ fontSize:12, color:'#444', padding:'3px 0' }}>→ {tip}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize:11, fontWeight:500, color:'#666' }}>All Season Alerts</div>
      {FESTIVALS.map((f,i) => (
        <div key={i} style={{ background:'#fff', borderRadius:12, padding:12, border:'0.5px solid #e0e0d8' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>{f.icon} {f.name}</div>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10,
                            background:RISK_BG[f.risk], color:RISK_COLOR[f.risk] }}>
              {f.risk}
            </span>
          </div>
          <div style={{ fontSize:11, color:'#888', marginTop:4 }}>
            Risky foods: {f.foods.join(', ')}
          </div>
        </div>
      ))}
    </div>
  )
}

// BrandsPage
export function BrandsPage() {
  const BRANDS = [
    { category:'Turmeric',    name:'Everest Turmeric',  score:88, fssai:'10016011002695', price:'₹80–120/100g' },
    { category:'Turmeric',    name:'MDH Turmeric',       score:82, fssai:'10014048000107', price:'₹70–100/100g' },
    { category:'Mustard Oil', name:'Fortune Mustard Oil',score:85, fssai:'10014022000365', price:'₹120–160/L' },
    { category:'Milk',        name:'Amul Milk',          score:91, fssai:'10015022000038', price:'₹56–72/L' },
    { category:'Honey',       name:'Dabur Honey',        score:78, fssai:'10016054001834', price:'₹180–250/500g' },
    { category:'Ghee',        name:"Mother Dairy Ghee",  score:86, fssai:'10015022000039', price:'₹450–600/500g' },
  ]
  const [filter, setFilter] = useState('')

  const filtered = BRANDS.filter(b =>
    !filter || b.category.toLowerCase().includes(filter.toLowerCase()) || b.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:15, fontWeight:500 }}>Safe Brand Finder</div>
      <input value={filter} onChange={e=>setFilter(e.target.value)}
        placeholder="Search food or brand..."
        style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:13,
                  fontFamily:'inherit', outline:'none' }} />
      {filtered.map((b,i) => (
        <div key={i} style={{ background:'#fff', borderRadius:12, padding:14, border:'0.5px solid #e0e0d8' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>{b.category}</div>
              <div style={{ fontSize:14, fontWeight:500 }}>{b.name}</div>
              <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{b.price}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:18, fontWeight:500, color: b.score>=85?'#27500A':b.score>=70?'#854F0B':'#A32D2D' }}>
                {b.score}
              </div>
              <div style={{ fontSize:9, color:'#888' }}>/ 100</div>
              <div style={{ fontSize:9, marginTop:4, background:'#EAF3DE', color:'#27500A',
                             padding:'1px 5px', borderRadius:6 }}>FSSAI ✓</div>
            </div>
          </div>
          <div style={{ fontSize:10, color:'#aaa', marginTop:6 }}>
            License: {b.fssai}
          </div>
        </div>
      ))}
    </div>
  )
}

// MapPage - simple city risk map without Leaflet for now
export function MapPage() {
  const CITY_DATA = [
    { city:'Nagpur',  risk:'HIGH',   reports:47, top:'Turmeric, Mustard Oil' },
    { city:'Pune',    risk:'HIGH',   reports:38, top:'Milk, Paneer' },
    { city:'Mumbai',  risk:'MEDIUM', reports:29, top:'Spices, Ghee' },
    { city:'Nashik',  risk:'MEDIUM', reports:21, top:'Grapes, Vegetables' },
    { city:'Aurangabad',risk:'HIGH', reports:33, top:'Turmeric, Sweets' },
  ]
  const RISK_BG    = { HIGH:'#FCEBEB', MEDIUM:'#FAEEDA', LOW:'#EAF3DE' }
  const RISK_COLOR = { HIGH:'#A32D2D', MEDIUM:'#854F0B', LOW:'#27500A' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:15, fontWeight:500 }}>City Risk Map</div>
      <div style={{ background:'#E1F5EE', borderRadius:12, padding:20, textAlign:'center',
                     color:'#0F6E56', fontSize:13 }}>
        🗺 Maharashtra Risk Overview
        <div style={{ fontSize:11, marginTop:6, opacity:0.8 }}>
          Based on FSSAI reports + community submissions
        </div>
      </div>
      {CITY_DATA.map((c,i) => (
        <div key={i} style={{ background:'#fff', borderRadius:12, padding:14, border:'0.5px solid #e0e0d8' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>📍 {c.city}</div>
              <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Most reported: {c.top}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:500,
                              background:RISK_BG[c.risk], color:RISK_COLOR[c.risk] }}>
                {c.risk}
              </span>
              <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>{c.reports} reports</div>
            </div>
          </div>
        </div>
      ))}
      <button style={{ padding:10, borderRadius:8, border:'1px solid #1a3d2b', background:'#fff',
                        color:'#1a3d2b', fontSize:12, cursor:'pointer' }}>
        + Report Adulteration in My Area
      </button>
    </div>
  )
}

import { useState } from 'react'
export default FestivalPage
