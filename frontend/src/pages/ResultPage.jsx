import { OC_STYLES, ScanBanner } from '../components/OverconsumptionBanner'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, AlertTriangle, ShieldCheck, FileText, Beaker, Lightbulb, MapPin, Activity, HelpCircle, Share, ExternalLink, ThumbsUp, ThumbsDown, ArrowLeft } from 'lucide-react'

const RISK_CONFIG = {
  LOW:      { bg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/30', accent: '#00c896', label: 'Low Risk',      bar: '#00c896' },
  MEDIUM:   { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', accent: '#e07c1a', label: 'Medium Risk',   bar: '#e07c1a' },
  HIGH:     { bg: 'bg-red-500/10',   text: 'text-red-400', border: 'border-red-500/30',   accent: '#c0392b', label: 'High Risk',     bar: '#c0392b' },
  CRITICAL: { bg: 'bg-red-900/40',     text: 'text-red-500', border: 'border-red-600/50',     accent: '#7F0000', label: 'Critical Risk', bar: '#7F0000' },
}

const SHARE_COLORS = {
  LOW:      { bg: '#1a3d2b', accent: '#c9a84c', text: '#f5f0e8' },
  MEDIUM:   { bg: '#3d2800', accent: '#e07c1a', text: '#f5f0e8' },
  HIGH:     { bg: '#3d0808', accent: '#c0392b', text: '#f5f0e8' },
  CRITICAL: { bg: '#2d0000', accent: '#7F0000', text: '#f5f0e8' },
}

const API_URL = '/api'

function shiftColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function ShareButton({ result }) {
  const canvasRef = useRef()
  const { lang } = useStore()

  async function generateCard() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = 600, H = 340
    canvas.width = W
    canvas.height = H

    const risk  = result.riskLevel || result.combinedRiskLevel || 'MEDIUM'
    const score = result.safetyScore ?? result.combinedScore ?? 50
    const food  = result.foodName || result.productName || 'Food Item'
    const cfg   = SHARE_COLORS[risk] || SHARE_COLORS.MEDIUM

    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, cfg.bg)
    grad.addColorStop(1, shiftColor(cfg.bg, 20))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(W - 40, -20, 120, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W - 40, -20, 80, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()

    const ringX = 80, ringY = 130, ringR = 52
    const circumference = 2 * Math.PI * ringR
    ctx.beginPath()
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 10
    ctx.stroke()
    const scoreAngle = (score / 100) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.arc(ringX, ringY, ringR, -Math.PI / 2, scoreAngle)
    ctx.strokeStyle = cfg.accent
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.fillStyle = cfg.accent
    ctx.font = 'bold 28px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(score, ringX, ringY)
    ctx.fillStyle = 'rgba(245,240,232,0.5)'
    ctx.font = '10px sans-serif'
    ctx.fillText('SAFETY SCORE', ringX, ringY + 38)

    ctx.fillStyle = cfg.text
    ctx.font = 'bold 26px serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const foodDisplay = food.length > 22 ? food.slice(0, 22) + '…' : food
    ctx.fillText(foodDisplay, 155, 110)

    const badgeX = 155, badgeY = 125
    const badgeW = risk.length * 9 + 40, badgeH = 26
    ctx.fillStyle = cfg.accent + '30'
    ctx.strokeStyle = cfg.accent + '60'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = cfg.accent
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${risk} RISK`, badgeX + badgeW / 2, badgeY + 17)

    if (result.summary) {
      ctx.fillStyle = 'rgba(245,240,232,0.65)'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      const words = result.summary.split(' ')
      let line = '', lines = []
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > 340 && line) {
          lines.push(line.trim())
          line = word + ' '
          if (lines.length >= 2) break
        } else { line = test }
      }
      if (lines.length < 2 && line) lines.push(line.trim())
      lines.forEach((l, i) => ctx.fillText(l, 155, 168 + i * 18))
    }

    const adulterants = result.adulterants?.slice(0, 2) || []
    if (adulterants.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.roundRect(155, 205, 330, adulterants.length * 32 + 12, 10)
      ctx.fill()
      adulterants.forEach((a, i) => {
        const aY = 225 + i * 32
        ctx.fillStyle = 'rgba(245,240,232,0.9)'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`⚠ ${a.name}`, 168, aY)
        ctx.fillStyle = 'rgba(245,240,232,0.5)'
        ctx.font = '10px sans-serif'
        const riskText = (a.healthRisk || '').slice(0, 40) + ((a.healthRisk?.length || 0) > 40 ? '…' : '')
        ctx.fillText(riskText, 168, aY + 14)
      })
    }

    try {
      const QRCode = await import('qrcode')
      const qrDataUrl = await QRCode.toDataURL('https://foodsafe.vercel.app', {
        width: 72, margin: 1, color: { dark: '#ffffff', light: '#00000000' },
      })
      const qrImg = new Image()
      await new Promise(resolve => { qrImg.onload = resolve; qrImg.src = qrDataUrl })
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.roundRect(W - 96, H - 104, 80, 80, 8)
      ctx.fill()
      ctx.drawImage(qrImg, W - 92, H - 100, 72, 72)
      ctx.fillStyle = 'rgba(245,240,232,0.4)'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('SCAN TO VERIFY', W - 52, H - 16)
    } catch (e) { console.warn('QR generation failed:', e) }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, H - 52)
    ctx.lineTo(W - 110, H - 52)
    ctx.stroke()
    ctx.fillStyle = 'rgba(245,240,232,0.4)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🌿 FoodSafe — Protect your family\'s plate', 24, H - 28)

    return canvas
  }

  async function handleShare() {
    const canvas = await generateCard()
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const file = new File([blob], 'foodsafe-report.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `FoodSafe: ${result.foodName || 'Food Scan'}`,
        text: `Risk: ${result.riskLevel} | Score: ${result.safetyScore}/100\n${result.verdict || ''}`,
        files: [file],
      })
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `foodsafe-${(result.foodName || 'scan').toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button 
        className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-surface-100 hover:bg-surface-200 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-bold text-sm transition-all duration-300 shadow-sm w-full md:w-auto mt-4 md:mt-0"
        onClick={handleShare}
      >
        <Share className="w-4 h-4" /> {t(lang, 'share') || 'Share Result'}
      </button>
    </>
  )
}

export default function ResultPage() {
  const { lastResult, lang, activeMember } = useStore()
  const nav = useNavigate()
  const [collab, setCollab] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  async function submitFeedback(value) {
    setFeedback(value)
    if (!r.scanId) { setFeedbackSent(true); return }
    try {
      await fetch(`${API_URL}/scan/${r.scanId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: value }),
      })
    } catch (e) { console.warn('Feedback failed:', e) }
    setFeedbackSent(true)
  }

  useEffect(() => {
    if (!lastResult) return
    const foodName = lastResult.foodName || lastResult.productName
    if (!foodName) return
    fetch(`${API_URL}/recommendations/similar-users/${encodeURIComponent(foodName)}`)
      .then(r => r.json())
      .then(data => { if (data.flag_rate_percent > 0) setCollab(data) })
      .catch(() => {})
  }, [lastResult])

  if (!lastResult) {
    return (
      <div className="min-h-screen bg-deep flex flex-col items-center justify-center p-6 text-center animate-fade-up">
        <ShieldAlert className="w-16 h-16 text-white/20 mb-4" />
        <p className="text-white/40 text-sm mb-6">{t(lang, 'noResult')}</p>
        <button 
          onClick={() => nav('/scan')}
          className="px-6 py-3 rounded-xl bg-surface-100 border border-white/10 text-white hover:bg-surface-200 transition-colors text-sm font-semibold"
        >
          {t(lang, 'backToScan')}
        </button>
      </div>
    )
  }

  const r = lastResult
  const risk = r.riskLevel || r.combinedRiskLevel || 'MEDIUM'
  const score = r.safetyScore ?? r.combinedScore ?? 50
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.MEDIUM

  const validHomeTests = (r.homeTests || []).filter(test => test.name?.trim() && test.steps?.trim() && test.result?.trim())
  
  const circumference = 2 * Math.PI * 36
  const strokeDash = (score / 100) * circumference

  const heroGradientClass = risk === 'LOW' 
    ? 'from-brand/20 to-brand/5 border-brand/20' 
    : risk === 'MEDIUM' 
    ? 'from-orange-500/20 to-orange-500/5 border-orange-500/20' 
    : 'from-red-500/20 to-red-500/5 border-red-500/20'

  return (
    <div className="flex flex-col min-h-screen animate-fade-up pb-24 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
      <style>{OC_STYLES}</style>
      
      {/* Back navigation */}
      <button 
        onClick={() => nav('/scan')} 
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> {t(lang, 'backToScan')}
      </button>

      {/* Hero Overview */}
      <div className={`relative p-6 md:p-8 rounded-[32px] bg-gradient-to-br ${heroGradientClass} border shadow-2xl overflow-hidden mb-6 backdrop-blur-xl`}>
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="48" cy="48" r="36" fill="none" stroke={cfg.bar} strokeWidth="6" 
                      strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-serif text-3xl font-bold ${cfg.text}`}>{score}</div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2 leading-tight">
              {r.foodName || r.productName || 'Analyzed Item'}
            </h1>
            {activeMember && (
              <div className="text-xs text-white/50 mb-3 flex items-center justify-center md:justify-start gap-1.5">
                <Activity className="w-3.5 h-3.5" /> {t(lang, 'personalizedFor')} <span className="text-white font-medium">{activeMember.name}</span>
              </div>
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border}`}>
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.accent }} />
              <span className={`text-[11px] font-bold tracking-widest uppercase ${cfg.text}`}>{cfg.label}</span>
            </div>
          </div>

        </div>

        {r.summary && (
          <div className="mt-6 p-4 rounded-xl bg-black/20 border border-white/5 backdrop-blur-md text-sm leading-relaxed text-white/80">
            {r.summary}
          </div>
        )}
      </div>

      {/* Warnings */}
      <div className="flex flex-col gap-3 mb-6">
        {r.cookingWarning && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-snug">{r.cookingWarning}</p>
          </div>
        )}
        {r.personalizedWarning && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
            <Activity className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-snug">{r.personalizedWarning}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="flex flex-col gap-6">

          {/* Adulterants Matrix */}
          {r.adulterants?.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2 pl-1">
                <ShieldAlert className="w-3.5 h-3.5" /> {t(lang, 'adulterants') || 'Detected Risks'}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden">
                <div className="divide-y divide-white/5">
                  {r.adulterants.map((a, i) => {
                    const sev = RISK_CONFIG[a.severity] || RISK_CONFIG.MEDIUM;
                    return (
                      <div key={i} className="p-4 md:p-5 hover:bg-surface-200/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm text-white/90">{a.name}</h4>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${sev.bg} ${sev.text} ${sev.border}`}>
                            {a.severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">{a.healthRisk}</p>
                        {a.isPersonalRisk && (
                          <div className="inline-flex mt-3 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md">
                            ⚠ {t(lang, 'highRiskProfile') || 'Flagged for your profile'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FSSAI Citations */}
          {r.fssaiCitations?.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2 pl-1">
                <FileText className="w-3.5 h-3.5" /> {r.ragGrounded ? t(lang, 'fssaiVerified') : t(lang, 'fssaiRef')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] p-4 space-y-3">
                {r.fssaiCitations.map((c, i) => (
                  <div key={i} className={`flex gap-3 pb-3 ${i < r.fssaiCitations.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {Math.round(c.relevance * 100)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white/90 truncate">{c.product}{c.brand && ` · ${c.brand}`}</div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-white/40">
                        {c.state && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.state}</span>}
                        {c.source && (
                          <a href={c.source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                            Source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        <div className="flex flex-col gap-6">

          {/* Home Tests */}
          {validHomeTests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2 pl-1">
                <Beaker className="w-3.5 h-3.5" /> {t(lang, 'homeTests')}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] overflow-hidden divide-y divide-white/5">
                {validHomeTests.map((test, i) => (
                  <div key={i} className="p-4 md:p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-white/90">{test.name}</h4>
                      <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">{test.difficulty}</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mb-3">{test.steps}</p>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1.5 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" /> {test.result}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buying Tips */}
          {r.buyingTips?.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2 pl-1">
                <Lightbulb className="w-3.5 h-3.5" /> {t(lang, 'buyingTips') || 'Buying Advice'}
              </h3>
              <div className="bg-surface-100 border border-white/10 rounded-[24px] p-5">
                <ul className="space-y-3">
                  {r.buyingTips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-xs text-white/60 leading-relaxed">
                      <span className="text-gold shrink-0 mt-0.5 flex-none font-bold">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Verification Verdict Banner */}
      {r.verdict && (
        <div className="mt-6 w-full relative overflow-hidden rounded-[24px] bg-glass-gradient border border-surface-200 shadow-2xl p-6">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold/20 blur-[50px] rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-surface-200 border border-white/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-gold" />
            </div>
            <p className="text-sm text-white/90 leading-relaxed md:pt-2">{r.verdict}</p>
          </div>
        </div>
      )}

      {/* Image Authenticity Panel */}
      {r.scanType === 'image' && (r.fake_probability !== undefined) && (() => {
        const fake = r.fake_probability ?? 50
        const real = r.authenticity_score ?? (100 - fake)
        const gaugeColor = fake >= 60 ? '#E24B4A' : fake >= 40 ? '#E07C1A' : '#00e09c'
        const verdict = fake >= 70 ? 'Likely Fake' : fake >= 45 ? 'Suspicious' : 'Likely Genuine'
        
        return (
          <div className="mt-8 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1">🔬 {t(lang, 'authenticityAnalysis')}</h3>
            <div className="bg-surface-100 border border-white/10 rounded-[24px] p-6 lg:p-8 shadow-xl">
              
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="36" cy="36" r="30" fill="none" stroke={gaugeColor} strokeWidth="6" strokeDasharray="188.5" strokeDashoffset={188.5 - (fake / 100) * 188.5} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none" style={{ color: gaugeColor }}>{fake}%</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Fake</span>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-xl font-bold mb-2" style={{ color: gaugeColor }}>{verdict}</h4>
                  <p className="text-sm text-white/50 leading-relaxed max-w-lg">
                    {fake >= 70 ? 'Multiple visual red flags detected. High risk of adulteration or counterfeiting.' : fake >= 45 ? 'Some suspicious visual signs. Verify with a home test before consuming.' : 'Product packaging and contents appear visually genuine. Standard precautions advised.'}
                  </p>
                </div>
              </div>

              {/* Breakdown split */}
              <div className="w-full mb-8 max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">
                  <span>Genuine {real}%</span><span>Fake {fake}%</span>
                </div>
                <div className="h-2 flex rounded-full overflow-hidden bg-surface-300">
                  <div className="h-full bg-brand transition-all" style={{ width: `${real}%` }} />
                  <div className="h-full bg-red-500 transition-all" style={{ width: `${fake}%` }} />
                </div>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Action Footer */}
      <div className="mt-10 flex flex-col md:flex-row gap-4 items-center">
        <button 
          onClick={() => nav('/brands')}
          className="w-full md:w-auto flex-1 bg-brand hover:bg-brand-light text-deep font-bold text-sm py-4 px-6 rounded-2xl transition-all duration-300 shadow-[0_4px_24px_rgba(0,224,156,0.2)] hover:shadow-[0_8px_32px_rgba(0,224,156,0.4)] flex items-center justify-center gap-2"
        >
          {t(lang, 'brandCompare') || 'Compare Brands'}
        </button>
        <ShareButton result={r} />
      </div>

    </div>
  )
}