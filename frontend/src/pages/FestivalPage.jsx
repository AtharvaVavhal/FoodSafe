import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Calendar, AlertTriangle, ShieldAlert, FileWarning, ArrowRight } from 'lucide-react'

const API_URL = '/api'

const RISK_CONFIG = {
  LOW:      { bg:'bg-brand/10', text:'text-brand', border:'border-brand/20' },
  MEDIUM:   { bg:'bg-orange-500/10', text:'text-orange-400', border:'border-orange-500/20' },
  HIGH:     { bg:'bg-red-500/10', text:'text-red-400', border:'border-red-500/20' },
  CRITICAL: { bg:'bg-red-900/40', text:'text-red-500', border:'border-red-600/30' },
}

export default function FestivalPage() {
  const { lang } = useStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/festival/current?lang=${lang}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lang])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen animate-pulse p-6">
        <Calendar className="w-12 h-12 text-white/10 mb-4" />
        <div className="text-[13px] text-white/30 font-medium uppercase tracking-widest">{t(lang, 'loadingFestival')}</div>
      </div>
    )
  }

  if (!data) return null

  const cfg = RISK_CONFIG[data.risk] || RISK_CONFIG.MEDIUM

  const heroBg = data.risk === 'LOW'
    ? 'from-brand/20 to-brand/5 border-brand/20'
    : data.risk === 'MEDIUM'
    ? 'from-orange-500/20 to-orange-500/5 border-orange-500/20'
    : 'from-red-500/20 to-red-500/5 border-red-500/20'

  return (
    <div className="flex flex-col animate-fade-up px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
      
      {/* Hero */}
      <div className={`relative p-6 md:p-8 rounded-[32px] bg-gradient-to-br ${heroBg} border shadow-2xl overflow-hidden mb-8 backdrop-blur-xl`}>
        <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 blur-sm pointer-events-none select-none">{data.icon}</div>
        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-white mb-1">{t(lang, 'festivalSafetyGuide')}</h1>
            <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">{t(lang, 'festivalSafetySub')}</p>
          </div>
          
          <div className="bg-black/20 border border-white/10 rounded-[20px] p-5 backdrop-blur-md inline-block max-w-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl bg-surface-200/50 w-12 h-12 rounded-full flex items-center justify-center border border-white/5">{data.icon}</span>
              <div>
                <h2 className="font-serif text-xl font-bold text-white leading-tight">{data.festival}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase border mt-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  <ShieldAlert className="w-2.5 h-2.5" />
                  {data.risk} {t(lang, 'riskSeason')}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-white/70 leading-relaxed">{data.headline}</p>
          </div>
        </div>
      </div>

      {/* Risky foods */}
      {data.riskyFoods?.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
            <FileWarning className="w-3.5 h-3.5 text-orange-400" /> {t(lang, 'riskyFoodsSeason')}
          </h3>
          <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/5">
            {data.riskyFoods.map((f, i) => {
              const sev = RISK_CONFIG[f.severity] || RISK_CONFIG.MEDIUM
              return (
                <div key={i} className="p-4 md:p-5 flex justify-between items-center hover:bg-surface-200/50 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-white/90">{f.name}</h4>
                    <p className="text-[11px] text-white/40 mt-1">{f.concern}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border shrink-0 ${sev.bg} ${sev.text} ${sev.border}`}>
                    {f.severity}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {data.tips?.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3">{t(lang, 'safetyTips')}</h3>
          <div className="bg-surface-100 border border-white/10 rounded-[24px] p-5">
            <ul className="space-y-3">
              {data.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-[13px] text-white/60 leading-relaxed">
                  <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* All seasons */}
      {data.allSeasons?.length > 0 && (
        <div className="mb-8 animate-fade-up">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> {t(lang, 'yearRoundCalendar')}
          </h3>
          <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/5">
            {data.allSeasons.map((s, i) => {
              const sCfg = RISK_CONFIG[s.risk] || RISK_CONFIG.MEDIUM
              return (
                <div key={i} className="p-4 md:p-5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-surface-200 w-10 h-10 rounded-xl flex flex-col items-center justify-center border border-white/5">{s.icon}</span>
                    <div>
                      <h4 className="text-[13px] font-bold text-white/90">{s.name}</h4>
                      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{s.months}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border mb-1.5 ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>
                      {s.risk}
                    </span>
                    <p className="text-[11px] text-white/50">{s.topConcern}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}