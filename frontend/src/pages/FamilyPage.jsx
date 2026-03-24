import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Users, Plus, X, HeartPulse, UserCircle } from 'lucide-react'

const CONDITIONS = ['diabetic','pregnant','child','kidney disease','hypertensive','elderly','lactose intolerant','heart disease']

const AV_PALETTE = [
  { bg:'bg-brand/20', text:'text-brand', border:'border-brand/30' },
  { bg:'bg-blue-500/20', text:'text-blue-400', border:'border-blue-500/30' },
  { bg:'bg-gold/20', text:'text-gold', border:'border-gold/30' },
  { bg:'bg-purple-500/20', text:'text-purple-400', border:'border-purple-500/30' },
  { bg:'bg-orange-500/20', text:'text-orange-400', border:'border-orange-500/30' },
]

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
    <div className="flex flex-col animate-fade-up px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-8 backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-brand/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">{t(lang, 'familyProfiles')}</h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">{t(lang, 'familySub')}</p>
            </div>
          </div>
          <button 
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-100 hover:bg-surface-200 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/70 hover:text-white"
            onClick={() => setAdding(!adding)}
          >
            {adding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {adding ? t(lang, 'cancel') : t(lang, 'addMember')}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 md:hidden">
        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1">
          {family.length} {family.length !== 1 ? t(lang, 'members') : t(lang, 'member')}
        </h3>
        <button 
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 border border-white/10 rounded-lg text-[10px] font-bold text-white/70"
          onClick={() => setAdding(!adding)}
        >
          {adding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {adding ? t(lang, 'cancel') : t(lang, 'addMember')}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-8 p-6 bg-surface-100 border border-white/10 rounded-[24px] shadow-lg animate-fade-up">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">{t(lang, 'name')}</label>
              <input 
                className="w-full bg-surface-200 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all"
                value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aai, Baba, Dada…" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">{t(lang, 'age')}</label>
              <input 
                className="w-full bg-surface-200 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 transition-all"
                value={age} onChange={e => setAge(e.target.value)} placeholder={t(lang, 'age')} type="number" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{t(lang, 'healthConditions')}</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button 
                    key={c} 
                    onClick={() => toggleCondition(c)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border
                      \${selected.includes(c) 
                        ? 'bg-brand/20 text-brand border-brand/30' 
                        : 'bg-surface-200 text-white/40 border-white/5 hover:bg-surface-300 hover:text-white/70'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button 
              className="w-full mt-2 py-3.5 rounded-xl bg-brand text-deep font-bold text-sm shadow-[0_4px_16px_rgba(0,224,156,0.2)] hover:shadow-[0_4px_24px_rgba(0,224,156,0.3)] transition-all flex justify-center items-center"
              onClick={save}
            >
              <Plus className="w-4 h-4 mr-1.5" /> {t(lang, 'saveMember')}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {family.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-[24px]">
          <UserCircle className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/40 text-[13px] leading-relaxed max-w-xs">{t(lang, 'noMembers')}<br />{t(lang, 'addMemberHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {family.map((m, i) => {
            const pal = AV_PALETTE[i % AV_PALETTE.length]
            return (
              <div key={m.id} className="p-5 rounded-[20px] bg-surface-100 border border-white/10 hover:border-white/20 hover:bg-surface-200 transition-all group flex items-start gap-4 shadow-sm relative overflow-hidden">
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 \${pal.bg} \${pal.text} \${pal.border}`}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <h3 className="text-base font-bold text-white/90 truncate">{m.name}</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">{m.age ? `${t(lang, 'ageLabel')} ${m.age}` : t(lang, 'ageNotSet')}</p>
                  
                  {m.conditions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.conditions.map(c => (
                        <span key={c} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                          <HeartPulse className="w-2.5 h-2.5" /> {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors bg-surface-200 hover:bg-red-500/10 p-2 rounded-lg"
                  onClick={() => removeMember(m.id)}
                  title={t(lang, 'remove')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}