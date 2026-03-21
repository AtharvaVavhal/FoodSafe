export default function FestivalPage() {
  const month = new Date().getMonth() + 1
  const FESTIVALS = [
    { months:[10,11], name:'Diwali Season', icon:'🪔', risk:'CRITICAL',
      foods:['Mawa/Khoya','Sweets','Dry Fruits','Ghee'],
      tips:['Buy khoya only from certified dairies','Check FSSAI license of sweet shops',
            'Avoid loose mawa','Prefer packaged branded sweets'] },
    { months:[3], name:'Holi', icon:'🎨', risk:'HIGH',
      foods:['Thandai','Dry Fruits'],
      tips:['Synthetic colors in thandai mixes','Buy dry fruits in sealed packs'] },
    { months:[6,7,8], name:'Monsoon Season', icon:'🌧', risk:'HIGH',
      foods:['Milk','Vegetables','Fish'],
      tips:['Boil milk before use','Wash vegetables with salt water'] },
    { months:[1,2], name:'Makar Sankranti', icon:'🌾', risk:'MEDIUM',
      foods:['Til','Jaggery'],
      tips:['Jaggery may have chemicals','Buy from sealed FSSAI packs'] },
  ]
  const RISK_COLOR = { CRITICAL:'#A32D2D', HIGH:'#854F0B', MEDIUM:'#639922' }
  const RISK_BG    = { CRITICAL:'#FCEBEB', HIGH:'#FAEEDA', MEDIUM:'#EAF3DE' }
  const current = FESTIVALS.find(f => f.months.includes(month))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:15,fontWeight:500}}>Festival Safety Guide</div>
      {current && (
        <div style={{background:RISK_BG[current.risk],borderRadius:12,padding:14}}>
          <div style={{fontSize:16}}>{current.icon} {current.name} Alert</div>
          <div style={{fontSize:11,color:RISK_COLOR[current.risk],marginTop:4,fontWeight:500}}>
            {current.risk} RISK SEASON
          </div>
          <div style={{marginTop:8}}>
            {current.tips.map((tip,i) => (
              <div key={i} style={{fontSize:12,color:'#444',padding:'3px 0'}}>→ {tip}</div>
            ))}
          </div>
        </div>
      )}
      {FESTIVALS.map((f,i) => (
        <div key={i} style={{background:'#fff',borderRadius:12,padding:12,border:'0.5px solid #e0e0d8'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:500}}>{f.icon} {f.name}</div>
            <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                            background:RISK_BG[f.risk],color:RISK_COLOR[f.risk]}}>{f.risk}</span>
          </div>
          <div style={{fontSize:11,color:'#888',marginTop:4}}>
            Risky foods: {f.foods.join(', ')}
          </div>
        </div>
      ))}
    </div>
  )
}
