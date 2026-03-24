import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Stethoscope, Clock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react'

const API_URL = '/api'

const URGENCY_CONFIG = {
  MONITOR:        { bg:'bg-brand/10', color:'text-brand', border:'border-brand/30', icon: '🟢', label:'Monitor at home' },
  CONSULT_DOCTOR: { bg:'bg-orange-500/10', color:'text-orange-400', border:'border-orange-500/30', icon: '🟡', label:'Visit a doctor' },
  EMERGENCY:      { bg:'bg-red-500/10', color:'text-red-400', border:'border-red-500/30', icon: '🔴', label:'Seek emergency care' },
}

const CONF_COLOR = {
  HIGH:   'bg-red-500/10 text-red-400 border-red-500/20',
  MEDIUM: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  LOW:    'bg-brand/10 text-brand border-brand/20',
}

export default function SymptomPage() {
  const { scanHistory, lang } = useStore()
  const [symptoms, setSymptoms] = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const recentFoods = [...new Set(scanHistory.slice(0, 5).map(s => s.food_name))]

  async function analyze() {
    if (!symptoms.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptoms.trim(), recent_foods: recentFoods, lang }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const urgencyCfg = result?.urgency ? (URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.MONITOR) : null

  return (
    <div className="flex flex-col animate-fade-up px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
      
      {/* Header Form */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-6 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[50px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-0.5">{t(lang, 'symptomChecker')}</h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">{t(lang, 'symptomSub')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <textarea
              className="w-full bg-surface-200/50 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all shadow-inner block"
              rows={4}
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder={t(lang, 'symptomPlaceholder') || "E.g. I have a stomach ache after eating outside paneer..."}
            />

            {recentFoods.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-white/40 p-3 bg-surface-100 rounded-xl border border-white/5">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
                <div>
                  <span className="font-bold uppercase tracking-wider">{t(lang, 'recentFoods')}:</span> <span className="text-white/70">{recentFoods.join(', ')}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {error}
              </div>
            )}

            <button
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex justify-center items-center gap-2 mt-2
                \${!symptoms.trim() || loading 
                  ? 'bg-surface-200 text-white/30 border border-white/5 cursor-not-allowed' 
                  : 'bg-brand text-background hover:scale-[1.02] shadow-[0_4px_24px_rgba(0,224,156,0.3)] hover:shadow-[0_8px_32px_rgba(0,224,156,0.5)] border border-brand-light'}`}
              onClick={analyze}
              disabled={loading || !symptoms.trim()}
            >
              {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              {loading ? t(lang, 'analyzingSymptoms') : t(lang, 'analyzeSymptoms')}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {result && !result.error && (
        <div className="flex flex-col gap-6 animate-fade-up">
          
          {/* Urgency banner */}
          {urgencyCfg && (
            <div className={`flex items-center gap-4 p-5 rounded-[20px] border \${urgencyCfg.bg} \${urgencyCfg.border} \${urgencyCfg.color} shadow-lg`}>
              <span className="text-2xl">{urgencyCfg.icon}</span>
              <span className="font-serif text-lg font-bold">{urgencyCfg.label}</span>
            </div>
          )}

          {/* Possible causes */}
          {result.possibleCauses?.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> {t(lang, 'possibleCauses')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/5">
                {result.possibleCauses.map((c, i) => (
                  <div key={i} className="p-4 md:p-5 hover:bg-surface-200/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-white/90">{c.adulterant}</h4>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border \${CONF_COLOR[c.confidence]}`}>
                        {c.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Typically found in <strong className="text-white/70">{c.food}</strong> — {c.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div>
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t(lang, 'recommendation')}
              </h3>
              <div className="p-5 rounded-[24px] bg-black/20 border border-white/5 backdrop-blur-md">
                <p className="text-[13px] text-white/80 leading-relaxed flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  {result.recommendation}
                </p>
              </div>
            </div>
          )}

          {result.disclaimer && (
            <p className="text-[10px] text-white/30 text-center uppercase tracking-widest px-4 leading-relaxed mt-2">
              {result.disclaimer}
            </p>
          )}

        </div>
      )}
    </div>
  )
}