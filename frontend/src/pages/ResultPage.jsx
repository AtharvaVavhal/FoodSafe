import { OC_STYLES, ScanBanner } from '../components/OverconsumptionBanner'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { useEffect, useRef, useState } from 'react'

const RISK_CONFIG = {
  LOW:      { bg: 'rgba(0,200,120,0.1)', text: '#00e09c', border: 'rgba(0,200,120,0.3)', accent: '#00c896', label: 'Low Risk',      bar: '#00c896' },
  MEDIUM:   { bg: 'rgba(245,180,40,0.1)', text: '#f5c842', border: 'rgba(245,180,40,0.3)', accent: '#e07c1a', label: 'Medium Risk',   bar: '#e07c1a' },
  HIGH:     { bg: 'rgba(255,80,60,0.1)',   text: '#ff6450', border: 'rgba(255,80,60,0.3)',   accent: '#c0392b', label: 'High Risk',     bar: '#c0392b' },
  CRITICAL: { bg: 'rgba(180,0,0,0.2)',     text: '#ff4040', border: 'rgba(180,0,0,0.4)',     accent: '#7F0000', label: 'Critical Risk', bar: '#7F0000' },
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

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, cfg.bg)
    grad.addColorStop(1, shiftColor(cfg.bg, 20))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Decorative circles
    ctx.beginPath()
    ctx.arc(W - 40, -20, 120, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W - 40, -20, 80, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()

    // Score ring
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

    // Food name
    ctx.fillStyle = cfg.text
    ctx.font = 'bold 26px serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const foodDisplay = food.length > 22 ? food.slice(0, 22) + '…' : food
    ctx.fillText(foodDisplay, 155, 110)

    // Risk badge
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

    // Summary
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

    // Top 2 adulterants
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

    // QR Code — bottom right
    try {
      const QRCode = await import('qrcode')
      const qrDataUrl = await QRCode.toDataURL('https://foodsafe.vercel.app', {
        width: 72,
        margin: 1,
        color: { dark: '#ffffff', light: '#00000000' },
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
    } catch (e) {
      console.warn('QR generation failed:', e)
    }

    // Footer divider
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button className="rp-btn-share" onClick={handleShare}>📤 {t(lang, 'share')}</button>
    </>
  )
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }
  .rp-root { font-family:'DM Sans',sans-serif; background:#0a0f16; min-height:100vh; display:flex; flex-direction:column; gap:10px; padding-bottom:80px; }
  .rp-hero { padding:20px 16px 28px; position:relative; overflow:hidden; }
  .rp-hero::after { content:''; position:absolute; bottom:0; left:0; right:0; height:18px; background:#0a0f16; border-radius:18px 18px 0 0; }
  .rp-back { background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:12px; display:flex; align-items:center; gap:5px; margin-bottom:16px; padding:0; transition:opacity 0.15s; }
  .rp-back:hover { opacity:0.7; }
  .rp-score-row { display:flex; align-items:center; gap:16px; }
  .rp-ring-wrap { position:relative; width:72px; height:72px; flex-shrink:0; }
  .rp-score-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:20px; font-weight:600; }
  .rp-food-name { font-family:'Playfair Display',serif; font-size:22px; font-weight:600; line-height:1.2; margin-bottom:6px; }
  .rp-risk-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:4px 12px; border-radius:20px; letter-spacing:0.04em; }
  .rp-risk-dot { width:6px; height:6px; border-radius:50%; }
  .rp-summary { font-size:12px; line-height:1.65; margin-top:14px; padding:12px 14px; background:rgba(255,255,255,0.15); border-radius:10px; border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(4px); }
  .rp-section { padding:0 16px; }
  .rp-section-label { font-size:9px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-bottom:6px; margin-left:2px; }
  .rp-card { background:rgba(255,255,255,0.04); border-radius:16px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 1px 4px rgba(0,0,0,0.2); overflow:hidden; backdrop-filter:blur(10px); transition:box-shadow 0.25s,transform 0.25s; }
  .rp-card-inner { padding:14px 16px; }
  .rp-adulterant-row { padding:10px 0; }
  .rp-adulterant-row + .rp-adulterant-row { border-top:1px solid rgba(255,255,255,0.06); }
  .rp-adulterant-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
  .rp-adulterant-name { font-size:13px; font-weight:600; color:rgba(255,255,255,0.9); }
  .rp-sev-badge { font-size:9px; padding:3px 9px; border-radius:20px; font-weight:600; letter-spacing:0.04em; }
  .rp-adulterant-risk { font-size:11px; color:rgba(255,255,255,0.5); line-height:1.5; }
  .rp-personal-risk { display:inline-block; font-size:10px; color:#ff6450; background:rgba(255,80,60,0.1); padding:3px 8px; border-radius:6px; margin-top:5px; border:1px solid rgba(255,80,60,0.3); }
  .rp-test-row { padding:10px 0; }
  .rp-test-row + .rp-test-row { border-top:1px solid rgba(255,255,255,0.06); }
  .rp-test-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .rp-test-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.9); }
  .rp-diff-badge { font-size:9px; color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); }
  .rp-test-steps { font-size:11px; color:rgba(255,255,255,0.5); line-height:1.55; margin-bottom:6px; }
  .rp-test-result { font-size:11px; color:#00e09c; background:rgba(0,200,150,0.1); padding:6px 10px; border-radius:8px; font-weight:500; border:1px solid rgba(0,200,150,0.2); }
  .rp-tip-row { display:flex; gap:8px; align-items:flex-start; font-size:12px; color:rgba(255,255,255,0.6); padding:6px 0; }
  .rp-tip-row + .rp-tip-row { border-top:1px solid rgba(255,255,255,0.06); }
  .rp-tip-arrow { color:#c9a84c; font-weight:700; flex-shrink:0; font-size:13px; }
  .rp-verdict { background:linear-gradient(135deg,#0d2818,#1a3d2b); border-radius:14px; padding:14px 16px; font-size:13px; color:#f5f0e8; font-weight:500; line-height:1.55; border:1px solid rgba(201,168,76,0.2); position:relative; overflow:hidden; }
  .rp-verdict::before { content:''; position:absolute; top:-30px; right:-30px; width:100px; height:100px; border-radius:50%; background:radial-gradient(circle,rgba(201,168,76,0.1) 0%,transparent 70%); pointer-events:none; }
  .rp-verdict-icon { color:#c9a84c; font-size:14px; margin-right:6px; }
  .rp-warning-bar { border-radius:0; padding:10px 16px; font-size:12px; line-height:1.5; border-left:3px solid; }
  .rp-collab-cities { font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:8px; display:flex; align-items:center; gap:4px; }
  .rp-also-flagged { font-size:11px; color:#f5c842; background:rgba(245,180,40,0.1); padding:8px 12px; border-radius:8px; border:1px solid rgba(245,180,40,0.2); }
  .rp-ml-block { padding:10px 12px; border-radius:10px; margin-bottom:8px; }
  .rp-ml-block:last-child { margin-bottom:0; }
  .rp-ml-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
  .rp-ml-label { font-size:11px; font-weight:600; color:rgba(255,255,255,0.9); }
  .rp-ml-badge { font-size:9px; padding:2px 8px; border-radius:10px; font-weight:600; }
  .rp-ml-text { font-size:11px; color:rgba(255,255,255,0.5); line-height:1.5; }
  .rp-ml-source { font-size:9px; color:rgba(255,255,255,0.25); margin-top:4px; }
  .rp-exposure-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .rp-auth-gauge-wrap { display:flex; align-items:center; gap:16px; margin-bottom:12px; }
  .rp-auth-gauge { position:relative; width:72px; height:72px; flex-shrink:0; }
  .rp-auth-gauge svg { transform:rotate(-90deg); }
  .rp-auth-gauge-num { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .rp-auth-split-track { height:14px; border-radius:7px; overflow:hidden; display:flex; background:#f0ede8; margin:8px 0 4px; }
  .rp-auth-split-real { height:100%; background:linear-gradient(90deg,#27500A,#639922); border-radius:7px 0 0 7px; transition:width .8s cubic-bezier(.4,0,.2,1); }
  .rp-auth-split-fake { height:100%; background:linear-gradient(90deg,#A32D2D,#E24B4A); border-radius:0 7px 7px 0; transition:width .8s cubic-bezier(.4,0,.2,1); }
  .rp-auth-legend { display:flex; gap:12px; }
  .rp-auth-legend-dot { width:7px; height:7px; border-radius:50%; display:inline-block; margin-right:4px; vertical-align:middle; }
  .rp-market-card { background:rgba(245,180,40,0.08); border:1px solid rgba(245,180,40,0.2); border-radius:10px; padding:10px 12px; margin-bottom:8px; }
  .rp-flag-item { display:flex; gap:8px; padding:7px 0; border-bottom:.5px solid rgba(255,255,255,0.06); }
  .rp-flag-item:last-child { border-bottom:none; }
  .rp-flag-sev { font-size:9px; font-weight:700; padding:2px 7px; border-radius:6px; flex-shrink:0; align-self:flex-start; margin-top:1px; }
  .rp-flag-high { background:rgba(255,80,60,0.1); color:#ff6450; border:1px solid rgba(255,80,60,0.3); }
  .rp-flag-medium { background:rgba(245,180,40,0.1); color:#f5c842; border:1px solid rgba(245,180,40,0.3); }
  .rp-flag-low { background:rgba(0,200,150,0.1); color:#00e09c; border:1px solid rgba(0,200,150,0.3); }
  .rp-boost-row { display:flex; justify-content:space-between; font-size:11px; padding:5px 0; border-bottom:.5px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); }
  .rp-boost-row:last-child { border-bottom:none; }
  .rp-exposure-ring { width:44px; height:44px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; border:2px solid; }
  .rp-actions { display:flex; gap:8px; }
  .rp-btn-primary { flex:2; padding:13px; border-radius:12px; border:none; background:linear-gradient(135deg,#c9a84c 0%,#e0c068 100%); color:#0d2818; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; box-shadow:0 3px 12px rgba(201,168,76,0.3); transition:opacity 0.15s,transform 0.1s; }
  .rp-btn-primary:active { transform:scale(0.98); }
  .rp-btn-share { flex:1; padding:13px; border-radius:12px; border:1.5px solid rgba(0,200,150,0.3); background:rgba(0,200,150,0.08); color:#00e09c; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:background 0.15s; }
  .rp-btn-share:hover { background:rgba(0,200,150,0.15); }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .rp-fade { animation:fadeUp 0.35s ease forwards; }
  .rp-fade-1 { animation-delay:0.05s; opacity:0; }
  .rp-fade-2 { animation-delay:0.10s; opacity:0; }
  .rp-fade-3 { animation-delay:0.15s; opacity:0; }
  .rp-fade-4 { animation-delay:0.20s; opacity:0; }
  .rp-fade-5 { animation-delay:0.25s; opacity:0; }
  .rp-fade-6 { animation-delay:0.30s; opacity:0; }
  .rp-fade-7 { animation-delay:0.35s; opacity:0; }
`

export default function ResultPage() {
  const { lastResult, lang, activeMember } = useStore()
  const nav = useNavigate()
  const [collab, setCollab] = useState(null)
  const [feedback, setFeedback] = useState(null)   // "accurate" | "inaccurate"
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
      <div style={{ textAlign:'center', padding:'60px 24px', fontFamily:"'DM Sans',sans-serif", background:'#f7f5f0', minHeight:'100vh' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
        <p style={{ color:'#888', fontSize:14, marginBottom:20, fontWeight:300 }}>{t(lang, 'noResult')}</p>
        <button onClick={() => nav('/')} style={{ padding:'11px 28px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1a3d2b,#2d6647)', color:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500 }}>
          {t(lang, 'backToScan')}
        </button>
      </div>
    )
  }

  const r = lastResult
  const risk = r.riskLevel || r.combinedRiskLevel || 'MEDIUM'
  const score = r.safetyScore ?? r.combinedScore ?? 50
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.MEDIUM

  const validHomeTests = (r.homeTests || []).filter(
    test => test.name?.trim() && test.steps?.trim() && test.result?.trim()
  )

  const circumference = 2 * Math.PI * 28
  const strokeDash = (score / 100) * circumference

  const heroBg = risk === 'LOW'
    ? 'linear-gradient(160deg,#0d2818 0%,#1a3d2b 100%)'
    : risk === 'MEDIUM'
    ? 'linear-gradient(160deg,#2a1a00 0%,#3d2800 100%)'
    : risk === 'HIGH'
    ? 'linear-gradient(160deg,#2a0808 0%,#3d1010 100%)'
    : 'linear-gradient(160deg,#1a0000 0%,#2d0000 100%)'

  return (
    <div className="rp-root">
      <style>{STYLES}{OC_STYLES}</style>

      {/* Hero */}
      <div className="rp-hero" style={{ background: heroBg }}>
        <button className="rp-back" onClick={() => nav('/')} style={{ color:'rgba(245,240,232,0.6)' }}>
          {t(lang, 'backToScan')}
        </button>
        <div className="rp-score-row rp-fade rp-fade-1">
          <div className="rp-ring-wrap">
            <svg width="72" height="72" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="36" cy="36" r="28" fill="none"
                stroke={cfg.bar} strokeWidth="5"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                style={{ transition:'stroke-dasharray 1.2s ease' }}
              />
            </svg>
            <div className="rp-score-num" style={{ color:cfg.bar }}>{score}</div>
          </div>
          <div style={{ flex:1 }}>
            <div className="rp-food-name" style={{ color:'#f5f0e8' }}>
              {r.foodName || r.productName || 'Food Item'}
            </div>
            {activeMember && (
              <div style={{ fontSize:10, color:'rgba(245,240,232,0.5)', marginBottom:6, fontWeight:300 }}>
                ⚕ {t(lang, 'personalizedFor')} {activeMember.name}
              </div>
            )}
            <span className="rp-risk-badge" style={{ background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}` }}>
              <span className="rp-risk-dot" style={{ background:cfg.accent }} />
              {cfg.label}
            </span>
          </div>
        </div>
        {r.summary && (
          <div className="rp-summary rp-fade rp-fade-2" style={{ color:'rgba(245,240,232,0.85)' }}>
            {r.summary}
          </div>
        )}
      </div>

      {/* Warnings */}
      {r.cookingWarning && (
        <div className="rp-warning-bar rp-fade rp-fade-2" style={{ background:'#fff0f0', borderLeftColor:'#c0392b', color:'#791F1F' }}>
          🔥 {r.cookingWarning}
        </div>
      )}
      {r.personalizedWarning && (
        <div className="rp-warning-bar rp-fade rp-fade-2" style={{ background:'#fff8ed', borderLeftColor:'#e07c1a', color:'#633806' }}>
          ⚕ {r.personalizedWarning}
        </div>
      )}

      {/* Adulterants */}
      {r.adulterants?.length > 0 && (
        <div className="rp-section rp-fade rp-fade-3">
          <div className="rp-section-label">{t(lang, 'adulterants')}</div>
          <div className="rp-card">
            <div className="rp-card-inner">
              {r.adulterants.map((a, i) => (
                <div key={i} className="rp-adulterant-row">
                  <div className="rp-adulterant-top">
                    <span className="rp-adulterant-name">{a.name}</span>
                    <span className="rp-sev-badge" style={{
                      background: RISK_CONFIG[a.severity]?.bg || '#eee',
                      color: RISK_CONFIG[a.severity]?.text || '#333',
                      border: `1px solid ${RISK_CONFIG[a.severity]?.border || '#ddd'}`,
                    }}>{a.severity}</span>
                  </div>
                  <div className="rp-adulterant-risk">{a.healthRisk}</div>
                  {a.isPersonalRisk && (
                    <div className="rp-personal-risk">⚠ {t(lang, 'highRiskProfile')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FSSAI Citations */}
      {r.fssaiCitations?.length > 0 && (
        <div className="rp-section rp-fade rp-fade-3">
          <div className="rp-section-label">
            {r.ragGrounded ? t(lang, 'fssaiVerified') : t(lang, 'fssaiRef')}
          </div>
          <div className="rp-card">
            <div className="rp-card-inner">
              {r.fssaiCitations.map((c, i) => (
                <div key={i} style={{
                  padding: '8px 0',
                  borderBottom: i < r.fssaiCitations.length - 1 ? '1px solid #f4f1eb' : 'none',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: '#eaf3de', color: '#27500A',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {Math.round(c.relevance * 100)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a3d2b', marginBottom: 2 }}>
                      {c.product}{c.brand ? ` · ${c.brand}` : ''}
                    </div>
                    <div style={{ fontSize: 10, color: '#888', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.state && <span>📍 {c.state}</span>}
                      {c.date && <span>📅 {c.date}</span>}
                      {c.source && (
                        <a href={c.source} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 500 }}>
                          {t(lang, 'viewSource')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 9, color: '#bbb', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f4f1eb' }}>
                {t(lang, 'relevanceNote')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home Tests */}
      {validHomeTests.length > 0 && (
        <div className="rp-section rp-fade rp-fade-4">
          <div className="rp-section-label">{t(lang, 'homeTests')}</div>
          <div className="rp-card">
            <div className="rp-card-inner">
              {validHomeTests.map((test, i) => (
                <div key={i} className="rp-test-row">
                  <div className="rp-test-top">
                    <span className="rp-test-name">{test.name}</span>
                    <span className="rp-diff-badge">{test.difficulty}</span>
                  </div>
                  <div className="rp-test-steps">{test.steps}</div>
                  <div className="rp-test-result">✓ {test.result}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Buying Tips */}
      {r.buyingTips?.length > 0 && (
        <div className="rp-section rp-fade rp-fade-4">
          <div className="rp-section-label">{t(lang, 'buyingTips')}</div>
          <div className="rp-card">
            <div className="rp-card-inner">
              {r.buyingTips.map((tip, i) => (
                <div key={i} className="rp-tip-row">
                  <span className="rp-tip-arrow">→</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verdict */}
      {r.verdict && (
        <div className="rp-section rp-fade rp-fade-5">
          <div className="rp-verdict">
            <span className="rp-verdict-icon">💡</span>
            {r.verdict}
          </div>
        </div>
      )}

      {/* Community Intelligence */}
      {collab && (
        <div className="rp-section rp-fade rp-fade-5">
          <div className="rp-section-label">{t(lang, 'communityIntel')}</div>
          <div className="rp-card">
            <div className="rp-card-inner">
              <div style={{ fontSize:13, color:'#1a3d2b', fontWeight:600, marginBottom:8 }}>{collab.message}</div>
              {collab.top_cities?.length > 0 && (
                <div className="rp-collab-cities">
                  📍 {t(lang, 'mostReported')}: {collab.top_cities.map(c => c.city).join(', ')}
                </div>
              )}
              {collab.also_flagged?.length > 0 && (
                <div className="rp-also-flagged">
                  ⚠ {t(lang, 'alsoFlagged')}: {collab.also_flagged.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Authenticity Panel — shown only for image scans ── */}
      {r.scanType === 'image' && (r.fake_probability !== undefined) && (() => {
        const fake = r.fake_probability ?? 50
        const real = r.authenticity_score ?? (100 - fake)
        const market = r.marketFakeRate || {}
        const flags = r.visual_red_flags || []
        const good  = r.authenticity_indicators || []
        const breakdown = r.scoreBreakdown || {}
        const gaugeColor = fake >= 60 ? '#E24B4A' : fake >= 40 ? '#E07C1A' : '#639922'
        const verdict = fake >= 70 ? 'Likely Fake' : fake >= 45 ? 'Suspicious' : 'Likely Genuine'
        const R = 30, circ = 2 * Math.PI * R
        const trendLabel = {rising:'↑ Rising',falling:'↓ Falling',stable:'→ Stable'}[market.trend] || ''
        const trendColor = market.trend === 'rising' ? '#A32D2D' : market.trend === 'falling' ? '#27500A' : '#888'
        return (
          <div className="rp-section rp-fade rp-fade-5">
            <div className="rp-section-label">🔬 {t(lang, 'authenticityAnalysis')}</div>
            <div className="rp-card">
              <div className="rp-card-inner">

                {/* Gauge + headline */}
                <div className="rp-auth-gauge-wrap">
                  <div className="rp-auth-gauge">
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r={R} fill="none" stroke="#f0ede8" strokeWidth="8"/>
                      <circle cx="36" cy="36" r={R} fill="none" stroke={gaugeColor} strokeWidth="8"
                        strokeDasharray={circ} strokeDashoffset={circ - (fake / 100) * circ}
                        strokeLinecap="round"/>
                    </svg>
                    <div className="rp-auth-gauge-num">
                      <span style={{ fontSize:16, fontWeight:700, color:gaugeColor, lineHeight:1 }}>{fake}%</span>
                      <span style={{ fontSize:8, color:'#aaa', marginTop:1 }}>FAKE</span>
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color: gaugeColor, marginBottom:2 }}>{verdict}</div>
                    <div style={{ fontSize:11, color:'#555', lineHeight:1.5 }}>
                      {fake >= 70
                        ? 'Multiple red flags detected. High risk of adulteration or counterfeiting.'
                        : fake >= 45
                        ? 'Some suspicious signs. Verify with a home test before consuming.'
                        : 'Appears genuine. Standard precautions still advised.'}
                    </div>
                  </div>
                </div>

                {/* Real vs Fake bar */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#aaa', marginBottom:4 }}>
                    <span>{t(lang, 'real')}</span><span>{t(lang, 'fake')}</span>
                  </div>
                  <div className="rp-auth-split-track">
                    <div className="rp-auth-split-real" style={{ width: real + '%' }}/>
                    <div className="rp-auth-split-fake" style={{ width: fake + '%' }}/>
                  </div>
                  <div className="rp-auth-legend" style={{ fontSize:10, color:'#666' }}>
                    <span><span className="rp-auth-legend-dot" style={{ background:'#639922' }}/> {t(lang, 'genuine')} {real}%</span>
                    <span><span className="rp-auth-legend-dot" style={{ background:'#E24B4A' }}/> {t(lang, 'fake')} {fake}%</span>
                  </div>
                </div>

                {/* Market fake rate */}
                {market.rate !== undefined && (
                  <div className="rp-market-card">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <span style={{ fontSize:10, fontWeight:600, color:'#854F0B', textTransform:'uppercase', letterSpacing:'.06em' }}>
                        {t(lang, 'marketAdultRate')}
                      </span>
                      <span style={{ fontFamily:'monospace', fontSize:20, fontWeight:700, color:'#854F0B', lineHeight:1 }}>
                        {market.rate}%
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'#633806', lineHeight:1.5 }}>
                      <strong>{market.rate}% of {r.foodName || 'this food'} in Indian markets</strong> fail quality tests.
                      {market.rate >= 60 ? ' High prevalence — your risk score is boosted.' : ''}
                    </div>
                    {market.source && (
                      <div style={{ fontSize:9, color:'#aaa', marginTop:4 }}>📊 {market.source}</div>
                    )}
                    {trendLabel && (
                      <span style={{ fontSize:9, fontWeight:700, color: trendColor, marginTop:5, display:'inline-block' }}>
                        {trendLabel} adulteration trend
                      </span>
                    )}
                  </div>
                )}

                {/* Score breakdown */}
                {breakdown.ai_visual_score !== undefined && (
                  <div style={{ background:'#f5f7f3', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#1a3d2b', marginBottom:6 }}>{t(lang, 'howScoreCalc')}</div>
                    <div className="rp-boost-row">
                      <span style={{ color:'#555' }}>{t(lang, 'aiVisualAnalysis')}</span>
                      <span style={{ color:'#E07C1A', fontWeight:600 }}>{breakdown.ai_visual_score}/100 authentic</span>
                    </div>
                    <div className="rp-boost-row">
                      <span style={{ color:'#555' }}>{t(lang, 'marketPenalty')}</span>
                      <span style={{ color:'#A32D2D', fontWeight:600 }}>+{breakdown.market_boost}% fake risk</span>
                    </div>
                    <div className="rp-boost-row" style={{ borderTop:'1px solid #e0e8da', marginTop:4, paddingTop:6 }}>
                      <span style={{ color:'#1a3d2b', fontWeight:600 }}>{t(lang, 'finalFakeProb')}</span>
                      <span style={{ color: gaugeColor, fontWeight:700, fontSize:13 }}>{fake}%</span>
                    </div>
                  </div>
                )}

                {/* Visual red flags */}
                {flags.length > 0 && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#A32D2D', marginBottom:6 }}>
                      🚩 {t(lang, 'visualRedFlags')} ({flags.length})
                    </div>
                    {flags.map((f, i) => (
                      <div key={i} className="rp-flag-item">
                        <span className={`rp-flag-sev rp-flag-${(f.severity||'medium').toLowerCase()}`}>
                          {f.severity}
                        </span>
                        <div>
                          <div style={{ fontSize:11, color:'#333', fontWeight:500 }}>{f.flag}</div>
                          {f.explanation && (
                            <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{f.explanation}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Positive indicators */}
                {good.length > 0 && (
                  <div style={{ background:'#eaf3de', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#27500A', marginBottom:4 }}>✓ {t(lang, 'genuineIndicators')}</div>
                    {good.map((g, i) => (
                      <div key={i} style={{ fontSize:11, color:'#3d5a24', padding:'3px 0', borderBottom: i < good.length-1 ? '.5px solid #c0dd97' : 'none' }}>
                        ✓ {g}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}

      {/* ML Insights */}
      {(r.seasonalRisk || r.personalizedScore) && (
        <div className="rp-section rp-fade rp-fade-6">
          <div className="rp-section-label">{t(lang, 'mlInsights')}</div>
          <div className="rp-card">
            <div className="rp-card-inner">
              {r.seasonalRisk && (
                <div className="rp-ml-block" style={{
                  background: r.seasonalRisk.seasonal_alert ? '#fff0f0' : '#f5f7f3',
                  border: `1px solid ${r.seasonalRisk.seasonal_alert ? '#f7c1c1' : '#e0e8da'}`,
                }}>
                  <div className="rp-ml-row">
                    <span className="rp-ml-label">📅 {t(lang, 'seasonalRisk')} — {r.seasonalRisk.month}</span>
                    <span className="rp-ml-badge" style={{
                      background: r.seasonalRisk.seasonal_alert ? '#fff0f0' : '#eaf3de',
                      color: r.seasonalRisk.seasonal_alert ? '#791F1F' : '#27500A',
                      border: `1px solid ${r.seasonalRisk.seasonal_alert ? '#f7c1c1' : '#c0dd97'}`,
                    }}>{r.seasonalRisk.risk_level}</span>
                  </div>
                  <div className="rp-ml-text">{r.seasonalRisk.reason}</div>
                  <div className="rp-ml-source">
                    {r.seasonalRisk.source === 'prophet_model' ? '🔬 Prophet Time-Series ML' : '📊 Rule-based fallback'}
                  </div>
                </div>
              )}
              {r.personalizedScore && (
                <div className="rp-ml-block" style={{ background:'#f5f7f3', border:'1px solid #e0e8da' }}>
                  <div className="rp-ml-label" style={{ marginBottom:8 }}>👤 {t(lang, 'personalToxin')}</div>
                  <div className="rp-exposure-row">
                    <div className="rp-exposure-ring" style={{
                      background: r.personalizedScore.exposure_level === 'HIGH' ? '#fff0f0' : r.personalizedScore.exposure_level === 'MEDIUM' ? '#fff8ed' : '#eaf3de',
                      color: r.personalizedScore.exposure_level === 'HIGH' ? '#c0392b' : r.personalizedScore.exposure_level === 'MEDIUM' ? '#e07c1a' : '#27500A',
                      borderColor: r.personalizedScore.exposure_level === 'HIGH' ? '#f7c1c1' : r.personalizedScore.exposure_level === 'MEDIUM' ? '#fac775' : '#c0dd97',
                    }}>
                      {r.personalizedScore.cumulative_score ?? 0}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#1a3d2b' }}>
                        {r.personalizedScore.exposure_level || 'LOW'} {t(lang, 'exposure')}
                      </div>
                      <div style={{ fontSize:10, color:'#888', fontWeight:300 }}>{t(lang, 'cumulativeToxin')}</div>
                    </div>
                  </div>
                  {r.personalizedScore.recommendation && (
                    <div className="rp-ml-text">{r.personalizedScore.recommendation}</div>
                  )}
                  <div className="rp-ml-source">🔬 Random Forest ML Model</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Overconsumption Warnings */}
      {r.overconsumptionWarnings && (
        <div className="rp-section rp-fade rp-fade-6">
          <div className="rp-section-label">{t(lang, 'overconsumptionCheck')}</div>
          <div className="rp-card">
            <div className="rp-card-inner" style={{ padding: '12px 14px' }}>
              <ScanBanner warnings={r.overconsumptionWarnings} />
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="rp-section rp-fade rp-fade-6">
        <div className="rp-section-label">{t(lang, 'wasAccurate')}</div>
        <div className="rp-card">
          <div className="rp-card-inner" style={{ textAlign: 'center', padding: '14px 16px' }}>
            {feedbackSent ? (
              <div style={{ fontSize: 13, color: '#27500A', fontWeight: 500 }}>
                {feedback === 'accurate' ? `👍 ${t(lang, 'thanksAccurate')}` : `👎 ${t(lang, 'thanksInaccurate')}`}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => submitFeedback('accurate')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                    border: '1.5px solid #c0dd97', background: '#eaf3de',
                    color: '#27500A', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans',sans-serif",
                  }}>
                  {t(lang, 'yesAccurate')}
                </button>
                <button
                  onClick={() => submitFeedback('inaccurate')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                    border: '1.5px solid #f7c1c1', background: '#fff0f0',
                    color: '#791F1F', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans',sans-serif",
                  }}>
                  {t(lang, 'noInaccurate')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rp-section rp-fade rp-fade-7">
        <div className="rp-actions">
          <button className="rp-btn-primary" onClick={() => nav('/brands')}>
            🛒 {t(lang, 'brandCompare')}
          </button>
          <ShareButton result={r} />
        </div>
      </div>
    </div>
  )
}