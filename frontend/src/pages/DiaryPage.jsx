import { OC_STYLES, DigestPanel } from '../components/OverconsumptionBanner'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useState } from 'react'
import { BookOpen, AlertTriangle, Download, FileText, PieChart, BarChart2, Lightbulb, UserCheck, ShieldAlert, Sparkles, RefreshCw, FileWarning } from 'lucide-react'

const API_URL = '/api'

const RISK_COLOR = { LOW: '#00e09c', MEDIUM: '#fac775', HIGH: '#f7c1c1', CRITICAL: '#ff7b7b' }
const RISK_BG = { LOW: 'bg-brand/10', MEDIUM: 'bg-orange-500/10', HIGH: 'bg-red-500/10', CRITICAL: 'bg-red-900/40' }
const RISK_BORDER = { LOW: 'border-brand/20', MEDIUM: 'border-orange-500/20', HIGH: 'border-red-500/20', CRITICAL: 'border-red-500/40' }
const RISK_TEXT = { LOW: 'text-brand', MEDIUM: 'text-orange-400', HIGH: 'text-red-400', CRITICAL: 'text-red-500' }

function DonutChart({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  let offset = 0
  const r = 46
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  const slices = data.map(d => {
    const pct = d.value / total
    const dash = pct * circumference
    const slice = { ...d, dash, offset: offset * circumference }
    offset += pct
    return slice
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="drop-shadow-lg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="16"
          strokeDasharray={`${s.dash} ${circumference}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      ))}
    </svg>
  )
}

export default function DiaryPage() {
  const { scanHistory, lang, token } = useStore()
  const [aiInsights, setAiInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [digest, setDigest] = useState(null)
  const [loadingDigest, setLoadingDigest] = useState(false)

  const total = scanHistory.length
  const high = scanHistory.filter(s => ['HIGH', 'CRITICAL'].includes(s.risk_level)).length
  const avg = total ? Math.round(scanHistory.reduce((a, s) => a + (s.safety_score || 50), 0) / total) : 0
  const grade = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 50 ? 'C' : avg >= 35 ? 'D' : 'F'

  const gradeConfig = grade === 'A' 
    ? { color: 'text-brand', bg: 'bg-brand/10', border: 'border-brand/30' } 
    : grade === 'B' 
    ? { color: 'text-brand-light', bg: 'bg-brand-light/10', border: 'border-brand-light/30' } 
    : grade === 'C' 
    ? { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' } 
    : { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }

  // Risk distribution
  const riskCounts = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(r => ({
    label: r,
    value: scanHistory.filter(s => s.risk_level === r).length,
    color: RISK_COLOR[r],
  })).filter(r => r.value > 0)

  // Last 7 days weekly breakdown
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)
    const dateStr = d.toDateString()
    const scans = scanHistory.filter(s => new Date(s.date).toDateString() === dateStr)
    const avgScore = scans.length ? Math.round(scans.reduce((a, s) => a + (s.safety_score || 50), 0) / scans.length) : 0
    return { label, scans: scans.length, avgScore }
  })
  const maxScans = Math.max(...weekDays.map(d => d.scans), 1)

  // Most scanned foods
  const foodFreq = scanHistory.reduce((acc, s) => {
    acc[s.food_name] = (acc[s.food_name] || 0) + 1
    return acc
  }, {})
  const topFoods = Object.entries(foodFreq).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // Fetch AI insights
  useEffect(() => {
    if (scanHistory.length < 3) return
    setLoadingInsights(true)
    const summary = scanHistory.slice(0, 10).map(s => ({ food: s.food_name, risk: s.risk_level, score: s.safety_score }))
    fetch(`${API_URL}/diary/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_history: summary, lang }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.main) {
          setAiInsights({
            main: data.main, warning: data.warning || null, tip: data.tip || null,
            pattern: data.riskPattern || null, swap: data.safeSwap || null,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInsights(false))
  }, [scanHistory.length, token])

  // Fetch weekly digest
  useEffect(() => {
    if (!token) return
    setLoadingDigest(true)
    fetch(`${API_URL}/diary/overconsumption`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.categories) setDigest(data) })
      .catch(() => {})
      .finally(() => setLoadingDigest(false))
  }, [scanHistory.length, token])

  return (
    <div className="flex flex-col animate-fade-up px-4 md:px-8 py-6 max-w-4xl mx-auto w-full pb-32">
      <style>{OC_STYLES}</style>

      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-8 backdrop-blur-xl">
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-brand/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex flex-col items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">{t(lang, 'foodDiary')}</h1>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.15em]">{t(lang, 'diarySub')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4 w-full md:w-auto">
            <div className="bg-surface-200/50 border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-2xl font-serif font-bold text-white leading-none mb-1">{total}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">{t(lang, 'totalScans')}</span>
            </div>
            <div className="bg-surface-200/50 border border-white/5 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center backdrop-blur-md relative overflow-hidden">
              {high > 0 && <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/20 blur-xl rounded-full" />}
              <span className={`text-2xl font-serif font-bold leading-none mb-1 \${high > 0 ? 'text-red-400' : 'text-white'}`}>{high}</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center flex items-center gap-1">
                {high > 0 && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />} {t(lang, 'highRisk')}
              </span>
            </div>
            <div className={`bg-surface-200/50 border \${gradeConfig.border} rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center backdrop-blur-md relative overflow-hidden`}>
              <div className={`absolute inset-0 \${gradeConfig.bg} opacity-50`} />
              <span className={`relative z-10 text-3xl font-serif font-bold \${gradeConfig.color} leading-none mb-0.5`}>{total ? grade : '—'}</span>
              <span className="relative z-10 text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">{t(lang, 'reportGrade')}</span>
            </div>
          </div>
        </div>
      </div>

      {total > 0 && (
        <button 
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 w-full md:w-auto md:ml-auto mb-6 px-6 py-3 rounded-xl bg-surface-100 border border-white/10 hover:border-white/20 hover:bg-surface-200 text-white/70 hover:text-white transition-all text-sm font-bold shadow-sm"
        >
          <Download className="w-4 h-4" /> {t(lang, 'downloadPDF')}
        </button>
      )}

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-white/10 rounded-[32px] bg-surface-100/30">
          <FileText className="w-16 h-16 text-white/10 mb-6" />
          <p className="text-white/50 text-[15px] leading-relaxed max-w-sm font-medium">
            {t(lang, 'noScansYet')}<br />
            <span className="text-white/30 text-sm mt-2 block">{t(lang, 'startScanning')}</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          
          <div className="flex flex-col gap-6">
            {/* Risk Distribution */}
            <div className="animate-fade-up">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5" /> {t(lang, 'riskDistribution')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden p-6 shadow-xl relative backdrop-blur-sm">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                  <div className="shrink-0 relative">
                    <DonutChart data={riskCounts} size={130} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-serif font-bold text-white leading-none">{total}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    {riskCounts.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px \${r.color}` }} />
                          <span className="text-white/60 font-medium">{r.label}</span>
                        </div>
                        <span className="font-bold text-white/90 bg-surface-200 px-2 py-0.5 rounded-md border border-white/5">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {(aiInsights || loadingInsights) && (
              <div className="animate-fade-up">
                <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-gold" /> {t(lang, 'aiInsights')}
                </h3>
                <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden p-5 shadow-xl">
                  {loadingInsights ? (
                    <div className="flex items-center justify-center py-6 text-white/30 text-xs gap-2 font-bold uppercase tracking-widest">
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t(lang, 'analyzingHistory')}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {aiInsights?.main && (
                        <div className="p-4 rounded-xl bg-surface-200 border border-white/5 text-[13px] text-white/80 leading-relaxed flex gap-3">
                          <Lightbulb className="w-4 h-4 text-brand shrink-0 mt-0.5" /> <p>{aiInsights.main}</p>
                        </div>
                      )}
                      {aiInsights?.warning && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 leading-relaxed flex gap-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{aiInsights.warning}</p>
                        </div>
                      )}
                      {aiInsights?.pattern && (
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[13px] text-orange-400 leading-relaxed flex gap-3">
                          <BarChart2 className="w-4 h-4 shrink-0 mt-0.5" /> <p><span className="font-bold text-orange-300 mr-2">{t(lang, 'pattern')}</span>{aiInsights.pattern}</p>
                        </div>
                      )}
                      {aiInsights?.swap && (
                        <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 text-[13px] text-brand leading-relaxed flex gap-3">
                          <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" /> <p><span className="font-bold text-brand-light mr-2">{t(lang, 'saferSwap')}</span>{aiInsights.swap}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* Weekly Activity */}
            <div className="animate-fade-up">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5" /> {t(lang, 'last7Days')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden p-6 shadow-xl flex items-end justify-between h-[160px] pb-4">
                {weekDays.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                    {d.scans > 0 && (
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-300 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 z-20 pointer-events-none whitespace-nowrap">
                        {d.scans} scans ({d.avgScore}/100)
                      </div>
                    )}
                    <div className="w-full px-1.5 flex justify-center">
                      <div 
                        className={`w-full max-w-[24px] rounded-t-lg transition-all duration-1000 ease-in-out hover:brightness-125 hover:shadow-[0_0_12px_rgba(0,224,156,0.3)]
                          \${d.scans ? 'bg-gradient-to-t from-brand/40 to-brand border-t border-brand-light/50' : 'bg-surface-200'}`}
                        style={{ height: d.scans ? `${Math.max((d.scans / maxScans) * 100, 4)}px` : '4px' }} 
                      />
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-white/40 font-bold group-hover:text-white/80 transition-colors">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overconsumption Digest */}
            <div className="animate-fade-up">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <FileWarning className="w-3.5 h-3.5" /> {t(lang, 'weeklyOverconsumption')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden p-5 shadow-xl">
                 <DigestPanel digest={digest} loading={loadingDigest} />
              </div>
            </div>

            {/* Top Foods */}
            {topFoods.length > 0 && (
              <div className="animate-fade-up">
                <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5" /> {t(lang, 'mostScanned')}
                </h3>
                <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/5 shadow-xl">
                  {topFoods.map(([food, count], i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-surface-200/50 transition-colors">
                      <div className="text-sm font-bold text-white/90">{food}</div>
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest bg-surface-300 px-2.5 py-1 rounded-lg border border-white/5">
                        {count}×
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Scan History Fill */}
          <div className="md:col-span-2 animate-fade-up">
             <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> {t(lang, 'recentScans')}
             </h3>
             <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden shadow-xl">
               <div className="divide-y divide-white/5">
                 {scanHistory.slice(0, 10).map((s, i) => {
                   const rCfg = { bg: RISK_BG[s.risk_level] || RISK_BG.LOW, text: RISK_TEXT[s.risk_level] || RISK_TEXT.LOW, border: RISK_BORDER[s.risk_level] || RISK_BORDER.LOW }
                   const barColor = RISK_COLOR[s.risk_level] || RISK_COLOR.LOW

                   return (
                    <div key={s.id || i} className="p-4 sm:p-5 flex justify-between items-center hover:bg-surface-200/50 transition-colors">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white/90 mb-0.5">{s.food_name}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest font-medium mb-2.5">
                          {new Date(s.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </div>
                        <div className="h-1.5 w-full max-w-[120px] bg-surface-300 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.safety_score || 50}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border shrink-0 \${rCfg.bg} \${rCfg.text} \${rCfg.border}`}>
                          {s.risk_level || '?'}
                        </span>
                        <span className="text-[11px] font-medium text-white/30">
                          {s.safety_score || 50} / 100
                        </span>
                      </div>
                    </div>
                   )
                 })}
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  )
}