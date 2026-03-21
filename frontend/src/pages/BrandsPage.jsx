import { useState } from 'react'
const BRANDS = [
  { category:'Turmeric',    name:'Everest Turmeric',   score:88, price:'₹80–120/100g' },
  { category:'Turmeric',    name:'MDH Turmeric',        score:82, price:'₹70–100/100g' },
  { category:'Milk',        name:'Amul Milk',           score:91, price:'₹56–72/L' },
  { category:'Honey',       name:'Dabur Honey',         score:78, price:'₹180–250/500g' },
  { category:'Ghee',        name:'Amul Ghee',           score:88, price:'₹550–650/500g' },
]
export default function BrandsPage() {
  const [f, setF] = useState('')
  const list = BRANDS.filter(b => !f || b.name.toLowerCase().includes(f.toLowerCase()) || b.category.toLowerCase().includes(f.toLowerCase()))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:15,fontWeight:500}}>Safe Brand Finder</div>
      <input value={f} onChange={e=>setF(e.target.value)} placeholder="Search..."
        style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:13,fontFamily:'inherit',outline:'none'}} />
      {list.map((b,i) => (
        <div key={i} style={{background:'#fff',borderRadius:12,padding:14,border:'0.5px solid #e0e0d8',
                              display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'#888'}}>{b.category}</div>
            <div style={{fontSize:14,fontWeight:500}}>{b.name}</div>
            <div style={{fontSize:11,color:'#666'}}>{b.price}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:18,fontWeight:500,color:b.score>=85?'#27500A':'#854F0B'}}>{b.score}</div>
            <div style={{fontSize:9,background:'#EAF3DE',color:'#27500A',padding:'1px 5px',borderRadius:6,marginTop:4}}>FSSAI ✓</div>
          </div>
        </div>
      ))}
    </div>
  )
}
