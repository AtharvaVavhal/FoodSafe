import jsPDF from 'jspdf'

// ── Logo base64 ───────────────────────────────────────────────────────────────
const LOGO_FALLBACK = 'data:image/webp;base64,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'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  brand:      '#00b37a',
  brandDark:  '#008f61',
  brandLight: '#e6f9f3',
  red:        '#c0392b',
  redLight:   '#fdf0ef',
  orange:     '#d35400',
  orangeLight:'#fef5ec',
  gold:       '#b7791f',
  goldLight:  '#fffff0',
  ink:        '#0f172a',
  ink2:       '#1e293b',
  slate:      '#475569',
  muted:      '#94a3b8',
  border:     '#e2e8f0',
  borderDark: '#cbd5e1',
  surface:    '#f8fafc',
  white:      '#ffffff',
}

const RISK = {
  LOW:      { fg: '#166534', bg: '#f0fdf4', bar: '#22c55e', label: 'Low'      },
  MEDIUM:   { fg: '#92400e', bg: '#fffbeb', bar: '#f59e0b', label: 'Medium'   },
  HIGH:     { fg: '#991b1b', bg: '#fef2f2', bar: '#ef4444', label: 'High'     },
  CRITICAL: { fg: '#7f1d1d', bg: '#fff1f2', bar: '#dc2626', label: 'Critical' },
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const rgb   = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
const fill  = (doc, hex) => doc.setFillColor(...rgb(hex))
const draw  = (doc, hex) => doc.setDrawColor(...rgb(hex))
const textC = (doc, hex) => doc.setTextColor(...rgb(hex))

function rect(doc, x, y, w, h, r = 0, style = 'F') {
  if (r) doc.roundedRect(x, y, w, h, r, r, style)
  else doc.rect(x, y, w, h, style)
}

function pill(doc, x, y, w, h, bg, fg, label, fontSize = 6.5) {
  fill(doc, bg)
  rect(doc, x, y, w, h, h / 2)
  textC(doc, fg)
  doc.setFontSize(fontSize).setFont(undefined, 'bold')
  doc.text(label, x + w / 2, y + h * 0.68, { align: 'center' })
}

function scoreBar(doc, x, y, w, h, score, color) {
  fill(doc, C.border)
  rect(doc, x, y, w, h, h / 2)
  if (score > 0) {
    fill(doc, color)
    rect(doc, x, y, Math.max(w * (score / 100), h), h, h / 2)
  }
}

function divider(doc, x, y, w) {
  draw(doc, C.border)
  doc.setLineWidth(0.25)
  doc.line(x, y, x + w, y)
}

// ── Layout constants ──────────────────────────────────────────────────────────
const PW = 210
const PH = 297
const ML = 16
const MR = 16
const CW = PW - ML - MR

// ── Page header (reusable for page 2+) ───────────────────────────────────────
function drawPageHeader(doc, page, total) {
  fill(doc, C.ink)
  rect(doc, 0, 0, PW, 12)
  textC(doc, '#ffffff')
  doc.setFontSize(7).setFont(undefined, 'bold')
  doc.text('FOODSAFE', ML, 7.8)
  textC(doc, C.muted)
  doc.setFontSize(6.5).setFont(undefined, 'normal')
  doc.text(`Scan History  ·  Page ${page} of ${total}`, PW - MR, 7.8, { align: 'right' })
}

// ── Hero header (page 1 only) ─────────────────────────────────────────────────
function drawHeroHeader(doc, userName, LOGO_BASE64) {
  fill(doc, C.ink)
  rect(doc, 0, 0, PW, 52)

  // Accent stripe
  fill(doc, C.brand)
  rect(doc, 0, 48, PW, 4)

  // Logo
  if (LOGO_BASE64) {
    doc.addImage(LOGO_BASE64, 'WEBP', ML - 2, 11, 52, 17)
  } else {
    fill(doc, C.brand)
    rect(doc, ML, 14, 28, 9, 4.5)
    textC(doc, '#ffffff')
    doc.setFontSize(8.5).setFont(undefined, 'bold')
    doc.text('FoodSafe', ML + 14, 19.8, { align: 'center' })
  }

  // Tagline
  textC(doc, '#64748b')
  doc.setFontSize(7).setFont(undefined, 'normal')
  doc.text("PROTECT YOUR FAMILY'S PLATE", ML, 32)

  // Report title block (right)
  textC(doc, '#e2e8f0')
  doc.setFontSize(13).setFont(undefined, 'bold')
  doc.text('Food Safety Diary', PW - MR, 17, { align: 'right' })
  textC(doc, '#64748b')
  doc.setFontSize(7.5).setFont(undefined, 'normal')
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(dateStr, PW - MR, 24, { align: 'right' })
  if (userName) {
    doc.text(`Prepared for ${userName}`, PW - MR, 30, { align: 'right' })
  }
}

// ── Table header row ──────────────────────────────────────────────────────────
const TABLE_COLS = [
  { label: 'Food Item',  x: ML,       w: 65 },
  { label: 'Date',       x: ML + 65,  w: 32 },
  { label: 'Risk Level', x: ML + 97,  w: 26 },
  { label: 'Score',      x: ML + 123, w: 18 },
  { label: 'Safety',     x: ML + 141, w: 45 },
]

function drawTableHeader(doc, y) {
  fill(doc, C.ink2)
  rect(doc, ML, y, CW, 7)
  textC(doc, '#94a3b8')
  doc.setFontSize(6.5).setFont(undefined, 'bold')
  TABLE_COLS.forEach(c => doc.text(c.label.toUpperCase(), c.x + 2, y + 4.5))
  return y + 7
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
export async function generateDiaryPDF({ scanHistory, aiInsights, digest, userName, logoBase64 }) {
  const LOGO_BASE64 = logoBase64 || LOGO_FALLBACK
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  // ── Compute stats ──────────────────────────────────────────────────────────
  const total = scanHistory.length
  const high  = scanHistory.filter(s => ['HIGH','CRITICAL'].includes(s.risk_level)).length
  const avg   = total
    ? Math.round(scanHistory.reduce((a, s) => a + (s.safety_score || 50), 0) / total)
    : 0
  const grade = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 50 ? 'C' : avg >= 35 ? 'D' : 'F'
  const gradeColor = ['A','B'].includes(grade) ? C.brand : grade === 'C' ? C.orange : C.red

  const riskCounts = ['LOW','MEDIUM','HIGH','CRITICAL'].map(r => ({
    ...RISK[r], key: r,
    value: scanHistory.filter(s => s.risk_level === r).length,
  })).filter(r => r.value > 0)

  const foodFreq = scanHistory.reduce((acc, s) => {
    const name = (s.food_name || '').replace(/[^\w\s\-]/g, '').trim()
    if (name) acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})
  const topFoods = Object.entries(foodFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3)
    const count = scanHistory.filter(s => new Date(s.date).toDateString() === d.toDateString()).length
    return { label, count }
  })
  const maxScans = Math.max(...weekDays.map(d => d.count), 1)

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════════════════════

  let y = 0

  // ── Hero header ───────────────────────────────────────────────────────────
  drawHeroHeader(doc, userName, LOGO_BASE64)

  y = 60

  // ── Stat cards ────────────────────────────────────────────────────────────
  const cardData = [
    { label: 'Total Scans', value: String(total), color: C.ink,      note: 'foods analysed' },
    { label: 'High Risk',   value: String(high),  color: high > 0 ? C.red : C.ink, note: 'flagged items' },
    { label: 'Avg Score',   value: `${avg}`,      color: avg >= 65 ? C.brandDark : C.orange, note: 'out of 100' },
    { label: 'Grade',       value: grade,         color: gradeColor, note: 'overall safety' },
  ]

  const cW = (CW - 9) / 4

  cardData.forEach((c, i) => {
    const cx = ML + i * (cW + 3)

    fill(doc, C.border)
    rect(doc, cx + 0.5, y + 0.7, cW, 24, 4)

    fill(doc, C.white)
    draw(doc, C.border)
    doc.setLineWidth(0.3)
    rect(doc, cx, y, cW, 24, 4, 'FD')

    fill(doc, c.color)
    rect(doc, cx, y, 2.5, 24, 0)
    fill(doc, c.color)
    rect(doc, cx, y, 4, 24, 4)

    textC(doc, c.color)
    doc.setFontSize(18).setFont(undefined, 'bold')
    doc.text(c.value, cx + cW / 2 + 1, y + 13, { align: 'center' })

    textC(doc, C.ink2)
    doc.setFontSize(7).setFont(undefined, 'bold')
    doc.text(c.label.toUpperCase(), cx + cW / 2 + 1, y + 19, { align: 'center' })

    textC(doc, C.muted)
    doc.setFontSize(6).setFont(undefined, 'normal')
    doc.text(c.note, cx + cW / 2 + 1, y + 22.5, { align: 'center' })
  })

  y += 32

  // ── Two-column section: Risk + Activity ───────────────────────────────────
  const halfW = (CW - 5) / 2
  const col1  = ML
  const col2  = ML + halfW + 5

  function sectionTitle(label, lx, ly, width = CW) {
    textC(doc, C.ink2)
    doc.setFontSize(8).setFont(undefined, 'bold')
    doc.text(label, lx, ly)
    fill(doc, C.brand)
    rect(doc, lx, ly + 2, 18, 1.2)
    fill(doc, C.border)
    rect(doc, lx + 19, ly + 2, width - 19, 0.5)
  }

  // -- Risk Distribution --
  sectionTitle('Risk Breakdown', col1, y, halfW)
  y += 8

  const riskBoxH = Math.max(riskCounts.length * 13 + 10, 42)
  fill(doc, C.surface)
  draw(doc, C.border)
  doc.setLineWidth(0.3)
  rect(doc, col1, y, halfW, riskBoxH, 4, 'FD')

  riskCounts.forEach((r, i) => {
    const ry   = y + 6 + i * 13
    const barW = halfW - 52

    pill(doc, col1 + 4, ry - 0.5, 22, 6, r.bg, r.fg, r.label.toUpperCase(), 5.5)

    fill(doc, C.border)
    rect(doc, col1 + 30, ry + 1, barW, 4, 2)

    fill(doc, r.bar)
    const pct = total ? r.value / total : 0
    rect(doc, col1 + 30, ry + 1, Math.max(barW * pct, 4), 4, 2)

    textC(doc, C.slate)
    doc.setFontSize(7).setFont(undefined, 'bold')
    doc.text(`${Math.round(pct * 100)}%`, col1 + halfW - 5, ry + 4.5, { align: 'right' })

    textC(doc, C.muted)
    doc.setFontSize(6).setFont(undefined, 'normal')
    doc.text(`${r.value}`, col1 + 29, ry + 4.5, { align: 'right' })
  })

  // -- Weekly Activity --
  const actY   = y - 8
  sectionTitle('Last 7 Days', col2, actY, halfW)
  const chartY = actY + 8
  const chartH = riskBoxH

  fill(doc, C.surface)
  draw(doc, C.border)
  doc.setLineWidth(0.3)
  rect(doc, col2, chartY, halfW, chartH, 4, 'FD')

  const bAreaH = chartH - 16
  const bAreaW = halfW - 10
  const bSlotW = bAreaW / 7

  doc.setLineWidth(0.2)
  draw(doc, C.border)
  ;[0.25, 0.5, 0.75, 1].forEach(pct => {
    const lineY = chartY + 5 + bAreaH * (1 - pct)
    doc.line(col2 + 5, lineY, col2 + halfW - 5, lineY)
  })

  weekDays.forEach((d, i) => {
    const bx = col2 + 5 + i * bSlotW + bSlotW * 0.18
    const bw = bSlotW * 0.64
    const bh = d.count ? Math.max((d.count / maxScans) * bAreaH, 3) : 1.5
    const by = chartY + 5 + bAreaH - bh

    fill(doc, d.count ? C.brand : C.border)
    rect(doc, bx, by, bw, bh, 1.5)

    textC(doc, C.muted)
    doc.setFontSize(5.5).setFont(undefined, 'normal')
    doc.text(d.label, bx + bw / 2, chartY + chartH - 2.5, { align: 'center' })

    if (d.count) {
      textC(doc, C.brandDark)
      doc.setFontSize(6).setFont(undefined, 'bold')
      doc.text(String(d.count), bx + bw / 2, by - 1.5, { align: 'center' })
    }
  })

  y += riskBoxH + 10

  // ── Top Foods ─────────────────────────────────────────────────────────────
  sectionTitle('Most Scanned Foods', ML, y)
  y += 8

  topFoods.forEach(([food, count], i) => {
    const rowH = 10
    fill(doc, i % 2 === 0 ? C.surface : C.white)
    rect(doc, ML, y, CW, rowH, i === 0 ? 3 : 0)
    if (i === topFoods.length - 1) {
      fill(doc, i % 2 === 0 ? C.surface : C.white)
      rect(doc, ML, y, CW, rowH, 0)
      fill(doc, i % 2 === 0 ? C.surface : C.white)
      rect(doc, ML, y + rowH / 2, CW, rowH / 2)
    }

    fill(doc, i === 0 ? C.brand : C.border)
    rect(doc, ML + 3, y + 2.5, 5, 5, 2.5)
    textC(doc, i === 0 ? C.white : C.muted)
    doc.setFontSize(6).setFont(undefined, 'bold')
    doc.text(String(i + 1), ML + 5.5, y + 6.4, { align: 'center' })

    textC(doc, C.ink2)
    doc.setFontSize(8.5).setFont(undefined, 'bold')
    const foodTrunc = food.length > 30 ? food.slice(0, 28) + '…' : food
    doc.text(foodTrunc, ML + 12, y + 6.5)

    const fbW = 52
    const fbX = PW - MR - fbW - 18
    fill(doc, C.border)
    rect(doc, fbX, y + 3.5, fbW, 3, 1.5)
    fill(doc, C.brand)
    rect(doc, fbX, y + 3.5, Math.max(fbW * (count / (topFoods[0][1] || 1)), 4), 3, 1.5)

    textC(doc, C.slate)
    doc.setFontSize(7.5).setFont(undefined, 'bold')
    doc.text(`${count}×`, PW - MR, y + 6.5, { align: 'right' })

    y += rowH
  })

  y += 10

  // ── AI Insights ────────────────────────────────────────────────────────────
  if (aiInsights?.main) {
    sectionTitle('AI Insights', ML, y)
    y += 8

    const insights = [
      aiInsights.main    && { text: aiInsights.main,    icon: '●', color: C.brandDark,  bg: C.brandLight,  border: C.brand  },
      aiInsights.warning && { text: aiInsights.warning, icon: '▲', color: C.red,        bg: C.redLight,    border: C.red    },
      aiInsights.swap    && { text: aiInsights.swap,    icon: '⟳', color: C.orange,     bg: C.orangeLight, border: C.orange },
    ].filter(Boolean)

    insights.forEach(ins => {
      const lines = doc.splitTextToSize(ins.text, CW - 22)
      const bh = lines.length * 4.8 + 9
      fill(doc, ins.bg)
      draw(doc, ins.border)
      doc.setLineWidth(0.5)
      rect(doc, ML, y, CW, bh, 3, 'FD')
      fill(doc, ins.border)
      rect(doc, ML, y, 3, bh, 0)
      fill(doc, ins.border)
      rect(doc, ML, y, 3.5, bh, 3)
      textC(doc, ins.color)
      doc.setFontSize(7.5).setFont(undefined, 'bold')
      doc.text(lines, ML + 9, y + 6)
      y += bh + 3
    })
    y += 2
  }

  // ── Overconsumption Digest ─────────────────────────────────────────────────
  if (digest?.categories?.length) {
    if (y > PH - 55) { doc.addPage(); y = 18 }
    sectionTitle('Overconsumption Alerts', ML, y)
    y += 8

    digest.categories.forEach(cat => {
      const text = `${cat.name} — scanned ${cat.count}× this week (recommended limit: ${cat.limit}×/week)${cat.advice ? '. ' + cat.advice : ''}`
      const lines = doc.splitTextToSize(text, CW - 18)
      const bh = lines.length * 4.8 + 9
      fill(doc, C.goldLight)
      draw(doc, C.gold)
      doc.setLineWidth(0.5)
      rect(doc, ML, y, CW, bh, 3, 'FD')
      fill(doc, C.gold)
      rect(doc, ML, y, 3, bh, 0)
      fill(doc, C.gold)
      rect(doc, ML, y, 3.5, bh, 3)
      textC(doc, C.gold)
      doc.setFontSize(7.5).setFont(undefined, 'normal')
      doc.text(lines, ML + 9, y + 6)
      y += bh + 3
    })
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Scan History Table
  // ════════════════════════════════════════════════════════════════════════════
  if (scanHistory.length > 0) {
    doc.addPage()
    y = 16

    sectionTitle(`Complete Scan History`, ML, y)
    textC(doc, C.muted)
    doc.setFontSize(7).setFont(undefined, 'normal')
    doc.text(`${scanHistory.length} records`, PW - MR, y, { align: 'right' })
    y += 8

    y = drawTableHeader(doc, y)

    scanHistory.forEach((s, i) => {
      if (y > PH - 18) {
        doc.addPage()
        y = 16
        y = drawTableHeader(doc, y)
      }

      const rowH = 7.5
      fill(doc, i % 2 === 0 ? C.white : C.surface)
      rect(doc, ML, y, CW, rowH)

      textC(doc, C.ink2)
      doc.setFontSize(8).setFont(undefined, 'bold')
      const name = s.food_name.length > 28 ? s.food_name.slice(0, 26) + '…' : s.food_name
      doc.text(name, TABLE_COLS[0].x + 2, y + 4.8)

      textC(doc, C.muted)
      doc.setFontSize(7).setFont(undefined, 'normal')
      const d = s.date
        ? new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
        : '—'
      doc.text(d, TABLE_COLS[1].x + 2, y + 4.8)

      const r = RISK[s.risk_level] || { fg: C.muted, bg: C.surface, label: s.risk_level || '?' }
      pill(doc, TABLE_COLS[2].x + 1, y + 1.5, 22, 4.5, r.bg, r.fg, r.label.toUpperCase(), 5.5)

      textC(doc, C.ink2)
      doc.setFontSize(8).setFont(undefined, 'bold')
      doc.text(`${s.safety_score ?? '—'}`, TABLE_COLS[3].x + 2, y + 4.8)

      scoreBar(doc, TABLE_COLS[4].x + 2, y + 2.5, TABLE_COLS[4].w - 4, 2.5, s.safety_score || 0, r.bar || C.brand)

      divider(doc, ML, y + rowH, CW)

      y += rowH
    })
  }

  // ── Footer + page 2+ mini-headers on all pages ────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)

    // Page 2+ mini-header bar only (page 1 keeps its hero)
    if (p > 1) drawPageHeader(doc, p, pageCount)

    // Footer bar
    fill(doc, C.ink)
    rect(doc, 0, PH - 10, PW, 10)

    textC(doc, '#475569')
    doc.setFontSize(6.5).setFont(undefined, 'normal')
    doc.text('FoodSafe · foodsafe.app', ML, PH - 3.5)

    textC(doc, '#475569')
    doc.text(
      `Report generated ${new Date().toLocaleString('en-IN')}`,
      PW / 2, PH - 3.5, { align: 'center' }
    )

    textC(doc, '#64748b')
    doc.setFont(undefined, 'bold')
    doc.text(`${p} / ${pageCount}`, PW - MR, PH - 3.5, { align: 'right' })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`FoodSafe_Diary_${new Date().toISOString().slice(0, 10)}.pdf`)
}