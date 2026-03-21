import { useRef } from 'react'

const RISK_COLORS = {
  LOW:      { bg: '#1a3d2b', accent: '#c9a84c', text: '#f5f0e8', badge: '#eaf3de', badgeText: '#27500A' },
  MEDIUM:   { bg: '#3d2800', accent: '#e07c1a', text: '#f5f0e8', badge: '#fff8ed', badgeText: '#633806' },
  HIGH:     { bg: '#3d0808', accent: '#c0392b', text: '#f5f0e8', badge: '#fff0f0', badgeText: '#791F1F' },
  CRITICAL: { bg: '#2d0000', accent: '#7F0000', text: '#f5f0e8', badge: '#FCEBEB', badgeText: '#501313' },
}

export default function ShareCard({ result }) {
  const canvasRef = useRef()

  function generateCard() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = 600, H = 340
    canvas.width = W
    canvas.height = H

    const risk  = result.riskLevel || result.combinedRiskLevel || 'MEDIUM'
    const score = result.safetyScore ?? result.combinedScore ?? 50
    const food  = result.foodName || result.productName || 'Food Item'
    const cfg   = RISK_COLORS[risk] || RISK_COLORS.MEDIUM

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, cfg.bg)
    grad.addColorStop(1, shiftColor(cfg.bg, 20))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Decorative circle top-right
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

    // Score number
    ctx.fillStyle = cfg.accent
    ctx.font = 'bold 28px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(score, ringX, ringY)

    // Score label
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

    // Summary (2 lines max)
    if (result.summary) {
      ctx.fillStyle = 'rgba(245,240,232,0.65)'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      const words = result.summary.split(' ')
      let line = '', lines = [], y = 168
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > 380 && line) {
          lines.push(line.trim())
          line = word + ' '
          if (lines.length >= 2) break
        } else {
          line = test
        }
      }
      if (lines.length < 2 && line) lines.push(line.trim())
      lines.forEach((l, i) => ctx.fillText(l, 155, y + i * 18))
    }

    // Adulterants (top 2)
    const adulterants = result.adulterants?.slice(0, 2) || []
    if (adulterants.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.roundRect(155, 205, 390, adulterants.length * 32 + 12, 10)
      ctx.fill()

      adulterants.forEach((a, i) => {
        const aY = 225 + i * 32
        ctx.fillStyle = 'rgba(245,240,232,0.9)'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`⚠ ${a.name}`, 168, aY)
        ctx.fillStyle = 'rgba(245,240,232,0.5)'
        ctx.font = '10px sans-serif'
        const risk_text = a.healthRisk?.slice(0, 45) + (a.healthRisk?.length > 45 ? '…' : '') || ''
        ctx.fillText(risk_text, 168, aY + 14)
      })
    }

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, H - 52)
    ctx.lineTo(W - 24, H - 52)
    ctx.stroke()

    // Footer
    ctx.fillStyle = 'rgba(245,240,232,0.4)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🌿 FoodSafe — Protect your family\'s plate', 24, H - 28)

    ctx.fillStyle = cfg.accent
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('foodsafe.vercel.app', W - 24, H - 28)

    return canvas
  }

  async function handleShare() {
    const canvas = generateCard()
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

    if (navigator.share && navigator.canShare({ files: [new File([blob], 'foodsafe.png', { type: 'image/png' })] })) {
      // Native share (mobile)
      await navigator.share({
        title: `FoodSafe: ${result.foodName || 'Food Scan'}`,
        text: `Risk: ${result.riskLevel} | Score: ${result.safetyScore}/100\n${result.verdict || ''}`,
        files: [new File([blob], 'foodsafe-report.png', { type: 'image/png' })],
      })
    } else {
      // Fallback: download
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
      <button onClick={handleShare} style={{
        flex: 1,
        padding: 13,
        borderRadius: 12,
        border: '1.5px solid #25D366',
        background: '#f0fff4',
        color: '#128C7E',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.15s',
      }}>
        📤 Share
      </button>
    </>
  )
}

// Utility: lighten a hex color
function shiftColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}