import { OC_STYLES, ScanBanner } from '../components/OverconsumptionBanner'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useRef, useState } from 'react'
import {
  ShieldAlert, AlertTriangle, ShieldCheck, FileText, Beaker,
  Lightbulb, MapPin, Activity, Share, ExternalLink,
  ThumbsUp, ThumbsDown, ArrowLeft, CheckCircle2, XCircle,
  TrendingUp, Info, RefreshCw, Star
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ── Risk config — derived from risk level string, not hardcoded per item ──
function getRiskConfig(risk) {
  const configs = {
    LOW:      { bg: 'bg-brand/10',      text: 'text-brand',       border: 'border-brand/30',       accent: '#00c896', label: 'Low Risk',      bar: '#00c896',  glow: 'rgba(0,200,150,0.15)'   },
    MEDIUM:   { bg: 'bg-orange-500/10', text: 'text-orange-400',  border: 'border-orange-500/30',  accent: '#e07c1a', label: 'Medium Risk',   bar: '#e07c1a',  glow: 'rgba(224,124,26,0.15)'  },
    HIGH:     { bg: 'bg-red-500/10',    text: 'text-red-400',     border: 'border-red-500/30',     accent: '#c0392b', label: 'High Risk',     bar: '#c0392b',  glow: 'rgba(192,57,43,0.15)'   },
    CRITICAL: { bg: 'bg-red-900/40',    text: 'text-red-500',     border: 'border-red-600/50',     accent: '#7F0000', label: 'Critical Risk', bar: '#7F0000',  glow: 'rgba(127,0,0,0.2)'      },
  }
  return configs[risk?.toUpperCase()] || configs.MEDIUM
}

function getShareColors(risk) {
  const map = {
    LOW:      { bg: '#1a3d2b', accent: '#c9a84c', text: '#f5f0e8' },
    MEDIUM:   { bg: '#3d2800', accent: '#e07c1a', text: '#f5f0e8' },
    HIGH:     { bg: '#3d0808', accent: '#c0392b', text: '#f5f0e8' },
    CRITICAL: { bg: '#2d0000', accent: '#7F0000', text: '#f5f0e8' },
  }
  return map[risk?.toUpperCase()] || map.MEDIUM
}

function shiftColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ── Nutrition bar ──────────────────────────────────────────────────────────
function NutritionBar({ label, value, max, unit, warn }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = warn ? '#e07c1a' : '#00c896'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-wider">
        <span>{label}</span>
        <span style={{ color: warn ? '#e07c1a' : 'inherit' }}>{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ score, accent, size = 96 }) {
  const r = size * 0.375
  const circumference = 2 * Math.PI * r
  const strokeDash = (score / 100) * circumference
  const cx = size / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.063} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={accent} strokeWidth={size * 0.063}
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif font-bold leading-none" style={{ fontSize: size * 0.3, color: accent }}>{score}</span>
        <span className="text-white/30 font-bold uppercase tracking-widest" style={{ fontSize: size * 0.09 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Share card generator ───────────────────────────────────────────────────
function ShareButton({ result }) {
  const canvasRef = useRef()
  const { lang } = useStore()
  const [sharing, setSharing] = useState(false)

  async function generateCard() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = 600, H = 340
    canvas.width = W
    canvas.height = H

    const risk  = result.riskLevel || result.combinedRiskLevel || 'MEDIUM'
    const score = result.safetyScore ?? result.combinedScore ?? 50
    const food  = result.foodName || result.productName || 'Food Item'
    const cfg   = getShareColors(risk)

    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, cfg.bg)
    grad.addColorStop(1, shiftColor(cfg.bg, 20))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Decorative circles
    ctx.beginPath(); ctx.arc(W - 40, -20, 120, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill()
    ctx.beginPath(); ctx.arc(W - 40, -20, 80, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill()

    // Score ring
    const ringX = 80, ringY = 130, ringR = 52
    const circumference = 2 * Math.PI * ringR
    ctx.beginPath(); ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 10; ctx.stroke()
    const scoreAngle = (score / 100) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath(); ctx.arc(ringX, ringY, ringR, -Math.PI / 2, scoreAngle)
    ctx.strokeStyle = cfg.accent; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke()
    ctx.fillStyle = cfg.accent; ctx.font = 'bold 28px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(score, ringX, ringY)
    ctx.fillStyle = 'rgba(245,240,232,0.5)'; ctx.font = '10px sans-serif'
    ctx.fillText('SAFETY SCORE', ringX, ringY + 38)

    // Food name
    ctx.fillStyle = cfg.text; ctx.font = 'bold 26px serif'
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText(food.length > 22 ? food.slice(0, 22) + '…' : food, 155, 110)

    // Risk badge
    const badgeX = 155, badgeY = 125, badgeW = risk.length * 9 + 40, badgeH = 26
    ctx.fillStyle = cfg.accent + '30'; ctx.strokeStyle = cfg.accent + '60'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13); ctx.fill(); ctx.stroke()
    ctx.fillStyle = cfg.accent; ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${risk} RISK`, badgeX + badgeW / 2, badgeY + 17)

    if (result.summary) {
      ctx.fillStyle = 'rgba(245,240,232,0.65)'; ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      const words = result.summary.split(' ')
      let line = '', lines = []
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > 340 && line) {
          lines.push(line.trim()); line = word + ' '
          if (lines.length >= 2) break
        } else { line = test }
      }
      if (lines.length < 2 && line) lines.push(line.trim())
      lines.forEach((l, i) => ctx.fillText(l, 155, 168 + i * 18))
    }

    const adulterants = result.adulterants?.slice(0, 2) || []
    if (adulterants.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath(); ctx.roundRect(155, 205, 330, adulterants.length * 32 + 12, 10); ctx.fill()
      adulterants.forEach((a, i) => {
        const aY = 225 + i * 32
        ctx.fillStyle = 'rgba(245,240,232,0.9)'; ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'left'; ctx.fillText(`⚠ ${a.name}`, 168, aY)
        ctx.fillStyle = 'rgba(245,240,232,0.5)'; ctx.font = '10px sans-serif'
        ctx.fillText((a.healthRisk || '').slice(0, 40) + ((a.healthRisk?.length || 0) > 40 ? '…' : ''), 168, aY + 14)
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
      ctx.beginPath(); ctx.roundRect(W - 96, H - 104, 80, 80, 8); ctx.fill()
      ctx.drawImage(qrImg, W - 92, H - 100, 72, 72)
      ctx.fillStyle = 'rgba(245,240,232,0.4)'; ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'; ctx.fillText('SCAN TO VERIFY', W - 52, H - 16)
    } catch (e) { console.warn('QR generation failed:', e) }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(24, H - 52); ctx.lineTo(W - 110, H - 52); ctx.stroke()
    ctx.fillStyle = 'rgba(245,240,232,0.4)'; ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🌿 FoodSafe — Protect your family\'s plate', 24, H - 28)

    return canvas
  }

  async function handleShare() {
    setSharing(true)
    try {
      const canvas = await generateCard()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], 'foodsafe-report.png', { type: 'image/png' })
      const foodName = result.foodName || result.productName || 'scan'

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `FoodSafe: ${foodName}`,
          text: `Risk: ${result.riskLevel || 'MEDIUM'} | Score: ${result.safetyScore ?? 50}/100\n${result.verdict || ''}`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `foodsafe-${foodName.toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.warn('Share failed:', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-bold text-sm transition-all duration-300 w-full md:w-auto mt-4 md:mt-0 disabled:opacity-50"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {sharing
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
          : <><Share className="w-4 h-4" /> {t(lang, 'share') || 'Share Result'}</>
        }
      </button>
    </>
  )
}

// ── Feedback row ───────────────────────────────────────────────────────────
function FeedbackRow({ scanId, lang }) {
  const [feedback, setFeedback] = useState(null)
  const [sent, setSent]         = useState(false)

  async function submit(value) {
    setFeedback(value)
    if (scanId) {
      try {
        await fetch(`${API_URL}/scan/${scanId}/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ feedback: value }),
        })
      } catch (e) {
        console.warn('Feedback submit failed:', e)
      }
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-xs text-brand/70">
        <CheckCircle2 className="w-4 h-4 text-brand" />
        {t(lang, 'feedbackThanks') || 'Thanks for your feedback!'}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
        {t(lang, 'wasHelpful') || 'Was this helpful?'}
      </span>
      <button
        onClick={() => submit('up')}
        className={`p-2 rounded-xl border transition-all ${feedback === 'up' ? 'bg-brand/20 border-brand/40 text-brand' : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'}`}
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => submit('down')}
        className={`p-2 rounded-xl border transition-all ${feedback === 'down' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'}`}
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] flex items-center gap-2 pl-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </h3>
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ResultPage() {
  const { lastResult, lang, activeMember } = useStore()
  const nav = useNavigate()
  const [collab, setCollab] = useState(null)

  // Fetch collaborative signal after mount
  useEffect(() => {
    if (!lastResult) return
    const foodName = lastResult.foodName || lastResult.productName
    if (!foodName) return
    fetch(`${API_URL}/recommendations/similar-users/${encodeURIComponent(foodName)}`)
      .then(r => r.json())
      .then(data => { if (data?.flag_rate_percent > 0) setCollab(data) })
      .catch(() => {})
  }, [lastResult])

  // ── Empty state ──
  if (!lastResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-up">
        <ShieldAlert className="w-16 h-16 text-white/20 mb-4" />
        <p className="text-white/40 text-sm mb-6">{t(lang, 'noResult')}</p>
        <button
          onClick={() => nav('/scan')}
          className="px-6 py-3 rounded-xl border border-white/10 text-white font-semibold text-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {t(lang, 'backToScan')}
        </button>
      </div>
    )
  }

  const r     = lastResult
  const risk  = r.riskLevel || r.combinedRiskLevel || 'MEDIUM'
  const score = r.safetyScore ?? r.combinedScore ?? 50
  const cfg   = getRiskConfig(risk)

  const validHomeTests = (r.homeTests || []).filter(
    test => test.name?.trim() && test.steps?.trim() && test.result?.trim()
  )

  const hasNutrition = r.nutrition && Object.keys(r.nutrition).length > 0
  const hasIngredients = r.ingredients?.length > 0
  const hasAllergens = r.allergens?.length > 0

  return (
    <div className="flex flex-col min-h-screen animate-fade-up pb-24 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
      <style>{OC_STYLES}</style>

      {/* ── Back ── */}
      <button
        onClick={() => nav('/scan')}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> {t(lang, 'backToScan')}
      </button>

      {/* ── Hero ── */}
      <div
        className="relative p-6 md:p-8 rounded-[32px] border shadow-2xl overflow-hidden mb-6 backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, ${cfg.glow}, rgba(255,255,255,0.02))`,
          borderColor: cfg.accent + '33',
          boxShadow: `0 0 60px ${cfg.glow}`,
        }}
      >
        {/* Glow orb */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: cfg.glow, filter: 'blur(60px)' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={score} accent={cfg.accent} size={96} />

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2 leading-tight">
              {r.foodName || r.productName || 'Analyzed Item'}
            </h1>

            {activeMember && (
              <div className="text-xs text-white/40 mb-3 flex items-center justify-center md:justify-start gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                {t(lang, 'personalizedFor')} <span className="text-white font-semibold ml-1">{activeMember.name}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border}`}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.accent }} />
                <span className={`text-[11px] font-bold tracking-widest uppercase ${cfg.text}`}>{cfg.label}</span>
              </div>

              {r.scanType && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                    {r.scanType === 'image' ? '📷 Image Scan' : r.scanType === 'barcode' ? '📦 Barcode' : '💬 Text Scan'}
                  </span>
                </div>
              )}

              {r.ragGrounded && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand/20 bg-brand/5">
                  <ShieldCheck className="w-3 h-3 text-brand" />
                  <span className="text-[11px] font-bold text-brand/70 uppercase tracking-widest">FSSAI Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {r.summary && (
          <div className="mt-6 p-4 rounded-xl border border-white/5 backdrop-blur-md text-sm leading-relaxed text-white/70"
            style={{ background: 'rgba(0,0,0,0.25)' }}>
            {r.summary}
          </div>
        )}
      </div>

      {/* ── Warnings ── */}
      {(r.cookingWarning || r.personalizedWarning) && (
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
      )}

      {/* ── Collaborative signal ── */}
      {collab && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border border-white/10 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <TrendingUp className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
          <p className="text-white/60 leading-snug">
            <span className="text-white font-semibold">{collab.flag_rate_percent}%</span> of users who scanned{' '}
            <span className="text-white font-semibold">{r.foodName || r.productName}</span> flagged it as a concern.
          </p>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

        {/* LEFT column */}
        <div className="flex flex-col gap-6">

          {/* Adulterants */}
          {r.adulterants?.length > 0 && (
            <Section icon={ShieldAlert} label={t(lang, 'adulterants') || 'Detected Risks'}>
              <div className="rounded-[24px] overflow-hidden border border-white/10 divide-y divide-white/5"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {r.adulterants.map((a, i) => {
                  const sev = getRiskConfig(a.severity)
                  return (
                    <div key={i} className="p-4 md:p-5 hover:bg-white/5 transition-colors">
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
            </Section>
          )}

          {/* FSSAI Citations */}
          {r.fssaiCitations?.length > 0 && (
            <Section icon={FileText} label={r.ragGrounded ? t(lang, 'fssaiVerified') : t(lang, 'fssaiRef')}>
              <div className="rounded-[24px] border border-white/10 p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {r.fssaiCitations.map((c, i) => (
                  <div key={i} className={`flex gap-3 pb-3 ${i < r.fssaiCitations.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {Math.round(c.relevance * 100)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white/90 truncate">
                        {c.product}{c.brand && ` · ${c.brand}`}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-white/40">
                        {c.state && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {c.state}
                          </span>
                        )}
                        {c.source && (
                          <a href={c.source} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-brand hover:underline">
                            Source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Allergens */}
          {hasAllergens && (
            <Section icon={AlertTriangle} label={t(lang, 'allergens') || 'Allergens'}>
              <div className="rounded-[24px] border border-orange-500/20 p-4 flex flex-wrap gap-2"
                style={{ background: 'rgba(224,124,26,0.05)' }}>
                {r.allergens.map((a, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-orange-400 border border-orange-500/20 bg-orange-500/10">
                    {a}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Ingredients */}
          {hasIngredients && (
            <Section icon={Info} label={t(lang, 'ingredients') || 'Ingredients'}>
              <div className="rounded-[24px] border border-white/10 p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-white/50 leading-relaxed">
                  {r.ingredients.join(', ')}
                </p>
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-6">

          {/* Nutrition */}
          {hasNutrition && (
            <Section icon={TrendingUp} label={t(lang, 'nutrition') || 'Nutrition'}>
              <div className="rounded-[24px] border border-white/10 p-5 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {r.nutrition.calories !== undefined && (
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-xs font-bold text-white/60">Calories</span>
                    <span className="text-lg font-serif font-bold text-white">{r.nutrition.calories}
                      <span className="text-xs text-white/30 ml-1">kcal</span>
                    </span>
                  </div>
                )}
                {r.nutrition.fat      !== undefined && <NutritionBar label="Fat"      value={r.nutrition.fat}      max={65}  unit="g" warn={r.nutrition.fat > 20} />}
                {r.nutrition.carbs    !== undefined && <NutritionBar label="Carbs"    value={r.nutrition.carbs}    max={300} unit="g" warn={r.nutrition.carbs > 80} />}
                {r.nutrition.sugar    !== undefined && <NutritionBar label="Sugar"    value={r.nutrition.sugar}    max={50}  unit="g" warn={r.nutrition.sugar > 20} />}
                {r.nutrition.protein  !== undefined && <NutritionBar label="Protein"  value={r.nutrition.protein}  max={50}  unit="g" warn={false} />}
                {r.nutrition.sodium   !== undefined && <NutritionBar label="Sodium"   value={r.nutrition.sodium}   max={2300} unit="mg" warn={r.nutrition.sodium > 600} />}
                {r.nutrition.fiber    !== undefined && <NutritionBar label="Fiber"    value={r.nutrition.fiber}    max={30}  unit="g" warn={false} />}
              </div>
            </Section>
          )}

          {/* Home Tests */}
          {validHomeTests.length > 0 && (
            <Section icon={Beaker} label={t(lang, 'homeTests')}>
              <div className="rounded-[24px] border border-white/10 overflow-hidden divide-y divide-white/5"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {validHomeTests.map((test, i) => (
                  <div key={i} className="p-4 md:p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-white/90">{test.name}</h4>
                      {test.difficulty && (
                        <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
                          {test.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mb-3">{test.steps}</p>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1.5 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" /> {test.result}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Buying Tips */}
          {r.buyingTips?.length > 0 && (
            <Section icon={Lightbulb} label={t(lang, 'buyingTips') || 'Buying Advice'}>
              <div className="rounded-[24px] border border-white/10 p-5"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <ul className="space-y-3">
                  {r.buyingTips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-xs text-white/60 leading-relaxed">
                      <span className="text-gold shrink-0 mt-0.5 font-bold">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* Alternatives */}
          {r.alternatives?.length > 0 && (
            <Section icon={Star} label={t(lang, 'alternatives') || 'Safer Alternatives'}>
              <div className="rounded-[24px] border border-white/10 p-5 flex flex-col gap-2"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {r.alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-white/60">
                    <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ── Verdict Banner ── */}
      {r.verdict && (
        <div className="mt-6 w-full relative overflow-hidden rounded-[24px] border border-surface-200 shadow-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Lightbulb className="w-5 h-5 text-gold" />
            </div>
            <p className="text-sm text-white/80 leading-relaxed md:pt-2">{r.verdict}</p>
          </div>
        </div>
      )}

      {/* ── Image Authenticity ── */}
      {r.scanType === 'image' && r.fake_probability !== undefined && (() => {
        const fake       = r.fake_probability ?? 50
        const real       = r.authenticity_score ?? (100 - fake)
        const gaugeColor = fake >= 60 ? '#E24B4A' : fake >= 40 ? '#E07C1A' : '#00e09c'
        const verdict    = fake >= 70 ? 'Likely Fake' : fake >= 45 ? 'Suspicious' : 'Likely Genuine'
        const desc       = fake >= 70
          ? 'Multiple visual red flags detected. High risk of adulteration or counterfeiting.'
          : fake >= 45
          ? 'Some suspicious visual signs. Verify with a home test before consuming.'
          : 'Product packaging and contents appear visually genuine. Standard precautions advised.'

        return (
          <div className="mt-8 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] pl-1">
              🔬 {t(lang, 'authenticityAnalysis')}
            </h3>
            <div className="rounded-[24px] border border-white/10 p-6 lg:p-8 shadow-xl"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                <ScoreRing score={fake} accent={gaugeColor} size={96} />
                <div className="text-center md:text-left">
                  <h4 className="text-xl font-bold mb-2" style={{ color: gaugeColor }}>{verdict}</h4>
                  <p className="text-sm text-white/50 leading-relaxed max-w-lg">{desc}</p>
                </div>
              </div>
              <div className="w-full max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">
                  <span>Genuine {real}%</span><span>Fake {fake}%</span>
                </div>
                <div className="h-2 flex rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full bg-brand transition-all duration-700" style={{ width: `${real}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${fake}%` }} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Action Footer ── */}
      <div className="mt-10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => nav('/brands')}
            className="flex-1 md:flex-none font-bold text-sm py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2"
            style={{
              background: cfg.accent,
              color: '#04090e',
              boxShadow: `0 4px 24px ${cfg.glow}`,
            }}
          >
            {t(lang, 'brandCompare') || 'Compare Brands'}
          </button>
          <ShareButton result={r} />
        </div>

        <FeedbackRow scanId={r.scanId} lang={lang} />
      </div>
    </div>
  )
}