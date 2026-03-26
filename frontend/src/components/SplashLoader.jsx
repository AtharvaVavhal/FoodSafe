/**
 * FoodSafe SplashLoader — "Typographic Deconstruction"
 *
 * Architecture:
 *  - All motion via transform + opacity only (GPU composited, zero layout thrash)
 *  - Framer Motion AnimatePresence for mount/unmount lifecycle
 *  - Spring physics: stiffness 280, damping 20 (elastic snap, physically grounded)
 *  - Four-act structure: Scatter → Scan → Converge → Confirm → Exit
 *  - willChange only on high-frequency animated nodes
 *
 * Dependencies: framer-motion (already in your stack)
 */

import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#060a07',
  green:     '#00c878',
  greenDim:  'rgba(0, 200, 120, 0.35)',
  greenGlow: 'rgba(0, 200, 120, 0.09)',
  cream:     '#e8f0eb',
  creamDim:  'rgba(232, 240, 235, 0.42)',
  mono:      "'IBM Plex Mono', 'Courier New', monospace",
  serif:     "'Cormorant Garamond', Georgia, serif",
}

// ─── Letter scatter positions (deterministic — same every render) ─────────────
const LETTERS = [
  { char: 'F', dx: -190, dy: -95,  rot: -44, s: 0.28 },
  { char: 'o', dx:  -65, dy: -148, rot:  26, s: 0.38 },
  { char: 'o', dx:   85, dy: -115, rot: -20, s: 0.34 },
  { char: 'd', dx:  168, dy:  -72, rot:  52, s: 0.29 },
  { char: 'S', dx: -145, dy:   84, rot: -58, s: 0.33 },
  { char: 'a', dx:  -22, dy:  128, rot:  24, s: 0.40 },
  { char: 'f', dx:  105, dy:   96, rot: -28, s: 0.36 },
  { char: 'e', dx:  195, dy:   52, rot:  44, s: 0.29 },
]

// ─── Ambient particles (no runtime random) ────────────────────────────────────
const PARTICLES = [
  { x:  7, y: 13, s: 1.5, d: 0.2,  dur: 4.1 },
  { x: 22, y: 79, s: 2,   d: 0.8,  dur: 5.3 },
  { x: 68, y: 14, s: 1,   d: 0.4,  dur: 3.8 },
  { x: 83, y: 63, s: 2.5, d: 1.1,  dur: 4.7 },
  { x: 14, y: 46, s: 1,   d: 0.6,  dur: 6.0 },
  { x: 92, y: 27, s: 1.8, d: 0.0,  dur: 4.4 },
  { x: 45, y: 89, s: 1.2, d: 0.9,  dur: 5.1 },
  { x: 76, y: 91, s: 2,   d: 0.3,  dur: 3.6 },
  { x: 36, y:  4, s: 1.5, d: 0.7,  dur: 4.9 },
  { x:  4, y: 86, s: 2.2, d: 0.1,  dur: 4.2 },
  { x: 97, y: 73, s: 1,   d: 0.5,  dur: 3.9 },
  { x: 59, y: 56, s: 1,   d: 1.4,  dur: 5.5 },
]

// ─── Motion presets ───────────────────────────────────────────────────────────
const SPRING   = { type: 'spring', stiffness: 280, damping: 20, mass: 1.1 }
const SPRING_S = { type: 'spring', stiffness: 120, damping: 18 }
const EXPO     = [0.16, 1, 0.3, 1]

// ─── AnimLetter ───────────────────────────────────────────────────────────────
const AnimLetter = memo(({ char, dx, dy, rot, s, delay, active }) => (
  <motion.span
    style={{
      display: 'inline-block',
      fontFamily: T.serif,
      fontSize: 'clamp(34px, 7.5vw, 54px)',
      fontWeight: 500,
      color: T.cream,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      willChange: 'transform, opacity, filter',
    }}
    initial={{ opacity: 0, x: dx, y: dy, rotate: rot, scale: s, filter: 'blur(7px)' }}
    animate={active
      ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' }
      : { opacity: 0, x: dx, y: dy, rotate: rot, scale: s, filter: 'blur(7px)' }
    }
    transition={{ ...SPRING, delay, filter: { duration: 0.3, delay }, opacity: { duration: 0.22, delay } }}
  >
    {char}
  </motion.span>
))

// ─── ScanLine ─────────────────────────────────────────────────────────────────
const ScanLine = memo(({ active }) => (
  <motion.div
    style={{
      position: 'absolute', top: '50%', left: 0, right: 0,
      height: 1,
      background: `linear-gradient(90deg, transparent 0%, ${T.greenDim} 15%, ${T.green} 50%, ${T.greenDim} 85%, transparent 100%)`,
      boxShadow: `0 0 18px ${T.greenDim}, 0 0 4px ${T.green}`,
      willChange: 'transform, opacity',
      transformOrigin: 'left center',
    }}
    initial={{ scaleX: 0, opacity: 0 }}
    animate={active
      ? { scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0], originX: [0, 0, 1, 1] }
      : { scaleX: 0, opacity: 0 }
    }
    transition={{ duration: 0.85, times: [0, 0.38, 0.62, 1], ease: EXPO }}
  />
))

// ─── Checkmark ────────────────────────────────────────────────────────────────
const Checkmark = memo(({ visible }) => (
  <motion.div
    style={{ position: 'absolute', top: '50%', left: '50%' }}
    initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
    animate={visible
      ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' }
      : { opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }
    }
    transition={SPRING_S}
  >
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ overflow: 'visible' }}>
      <motion.circle
        cx="26" cy="26" r="22"
        stroke={T.green} strokeWidth="1" strokeOpacity="0.35" fill="none"
        initial={{ pathLength: 0 }}
        animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.55, ease: EXPO }}
      />
      <motion.path
        d="M15 26L22 33L37 18"
        stroke={T.green} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }}
        animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.4, ease: EXPO, delay: 0.18 }}
      />
    </svg>
  </motion.div>
))

// ─── Particle ─────────────────────────────────────────────────────────────────
const Particle = memo(({ x, y, s, d, dur }) => (
  <motion.div
    style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: s, height: s, borderRadius: '50%',
      background: T.green, willChange: 'transform, opacity',
    }}
    initial={{ opacity: 0, y: 0, scale: 0 }}
    animate={{ opacity: [0, 0.22, 0.08, 0.18, 0], y: [0, -18, -7, -22, -38], scale: [0, 1, 0.8, 1.1, 0] }}
    transition={{ duration: dur, delay: d, repeat: Infinity, repeatDelay: dur * 0.25, ease: 'easeInOut' }}
  />
))

// ─── CornerBrackets ───────────────────────────────────────────────────────────
const CornerBrackets = memo(() => (
  <>
    {[
      { top: 18, left: 18,   bt: 1, bl: 1 },
      { top: 18, right: 18,  bt: 1, br: 1 },
      { bottom: 18, left: 18,  bb: 1, bl: 1 },
      { bottom: 18, right: 18, bb: 1, br: 1 },
    ].map((c, i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          top: c.top, left: c.left, right: c.right, bottom: c.bottom,
          width: 22, height: 22,
          borderTop:    c.bt ? `1px solid ${T.greenDim}` : 'none',
          borderBottom: c.bb ? `1px solid ${T.greenDim}` : 'none',
          borderLeft:   c.bl ? `1px solid ${T.greenDim}` : 'none',
          borderRight:  c.br ? `1px solid ${T.greenDim}` : 'none',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 + i * 0.04, ...SPRING_S }}
      />
    ))}
  </>
))

// ─── StatusBar ────────────────────────────────────────────────────────────────
const STATUS = {
  scatter:  ['INITIALIZING',              0.05],
  scan:     ['SCANNING SAFETY DATABASE',  0.52],
  converge: ['ASSEMBLING RESULTS',        0.82],
  confirm:  ['ALL CLEAR  ✓',              1.00],
  exit:     ['ALL CLEAR  ✓',              1.00],
}

const StatusBar = memo(({ phase }) => {
  const [label, progress] = STATUS[phase] || STATUS.scatter
  return (
    <motion.div
      style={{
        position: 'absolute', bottom: 44,
        left: '50%', width: 220,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}
      initial={{ opacity: 0, y: 10, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={{ delay: 0.25, duration: 0.4, ease: EXPO }}
    >
      <div style={{ width: '100%', height: 1, background: 'rgba(0,200,120,0.1)', borderRadius: 1, overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%', borderRadius: 1,
            background: `linear-gradient(90deg, ${T.greenDim}, ${T.green})`,
            boxShadow: `0 0 8px ${T.green}`,
            transformOrigin: 'left center',
            willChange: 'transform',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.55, ease: EXPO }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: phase === 'confirm' || phase === 'exit' ? T.green : 'rgba(0,200,120,0.42)',
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
        >
          {label}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
})

// ─── Main export ──────────────────────────────────────────────────────────────
export default function SplashLoader({ onDone }) {
  /**
   * Phase timeline:
   *  0ms    → scatter   letters scattered, invisible
   *  180ms  → scan      scanline sweeps
   *  860ms  → converge  letters spring into final positions
   *  1520ms → confirm   checkmark draws, "all clear"
   *  2380ms → exit      AnimatePresence unmount (blur + scale + fade)
   *  2750ms → onDone()
   */
  const [phase, setPhase]   = useState('scatter')
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const schedule = [
      [180,  () => setPhase('scan')],
      [860,  () => setPhase('converge')],
      [1520, () => setPhase('confirm')],
      [2380, () => setPhase('exit')],
      [2400, () => setMounted(false)],
      [2780, () => onDone?.()],
    ]
    const timers = schedule.map(([ms, fn]) => setTimeout(fn, ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  const lettersActive = phase === 'converge' || phase === 'confirm' || phase === 'exit'

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          key="splash"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: T.bg, overflow: 'hidden',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.035, filter: 'blur(10px)' }}
          transition={{ duration: 0.38, ease: EXPO }}
        >
          {/* Font import */}
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=IBM+Plex+Mono:wght@300;400&display=swap');`}</style>

          {/* Grid background */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(rgba(0,200,120,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,120,0.035) 1px,transparent 1px)`,
              backgroundSize: '42px 42px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
          />

          {/* Radial glow */}
          <motion.div
            style={{
              position: 'absolute',
              width: '55vmax', height: '55vmax',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${T.greenGlow} 0%, transparent 70%)`,
              top: '50%', left: '50%',
              willChange: 'transform, opacity',
            }}
            initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
            animate={{
              opacity: lettersActive ? 1 : 0.5,
              scale:   lettersActive ? 1.1 : 0.8,
              x: '-50%', y: '-50%',
            }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Particles */}
          {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

          {/* Corner brackets */}
          <CornerBrackets />

          {/* Scan line */}
          <ScanLine active={phase === 'scan'} />

          {/* ── Central composition ─────────────────────────────────── */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>

            {/* Shield + checkmark */}
            <div style={{ position: 'relative', width: 64, height: 72, marginBottom: 22 }}>
              <motion.svg
                width="64" height="72" viewBox="0 0 64 72"
                style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.3 }}
              >
                <motion.path
                  d="M32 3L5 14V36C5 52 17 65 32 69C47 65 59 52 59 36V14L32 3Z"
                  fill="rgba(0,200,100,0.055)"
                  stroke="rgba(0,200,100,0.48)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.85, ease: EXPO, delay: 0.18 }}
                />
                <motion.path
                  d="M32 13L13 21V36C13 47 21 57 32 60C43 57 51 47 51 36V21L32 13Z"
                  fill="none"
                  stroke="rgba(0,200,100,0.18)"
                  strokeWidth="0.75"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.65, ease: EXPO, delay: 0.42 }}
                />
              </motion.svg>
              <Checkmark visible={phase === 'confirm' || phase === 'exit'} />
            </div>

            {/* Letters */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.015em' }}>
              {LETTERS.map((l, i) => (
                <AnimLetter key={i} {...l} delay={0.03 + i * 0.052} active={lettersActive} />
              ))}
            </div>

            {/* Divider */}
            <motion.div
              style={{
                height: 1, width: '100%', marginTop: 10,
                background: `linear-gradient(90deg, transparent, ${T.greenDim} 25%, ${T.greenDim} 75%, transparent)`,
                transformOrigin: 'center',
                willChange: 'transform, opacity',
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={lettersActive ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
              transition={{ delay: 0.08, duration: 0.52, ease: EXPO }}
            />

            {/* Tagline */}
            <motion.p
              style={{
                fontFamily: T.mono, fontSize: 'clamp(8px, 1.4vw, 10px)',
                fontWeight: 300, letterSpacing: '0.22em',
                textTransform: 'uppercase', color: T.creamDim,
                margin: '12px 0 0', willChange: 'transform, opacity, filter',
              }}
              initial={{ opacity: 0, y: 7, filter: 'blur(5px)' }}
              animate={phase === 'confirm' || phase === 'exit'
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : { opacity: 0, y: 7, filter: 'blur(5px)' }
              }
              transition={{ delay: 0.18, duration: 0.48, ease: EXPO }}
            >
              Know What You Eat
            </motion.p>
          </div>

          {/* Status bar */}
          <StatusBar phase={phase} />

          {/* Top-left badge */}
          <motion.div
            style={{ position: 'absolute', top: 18, left: 24, fontFamily: T.mono, fontSize: 8, color: 'rgba(0,200,120,0.2)', letterSpacing: '0.1em' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          >FSSAI CERTIFIED</motion.div>

          {/* Top-right version */}
          <motion.div
            style={{ position: 'absolute', top: 18, right: 24, fontFamily: T.mono, fontSize: 8, color: 'rgba(0,200,120,0.2)', letterSpacing: '0.1em' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          >v2.0</motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * ── USAGE in main.jsx ──────────────────────────────────────────────────────────
 *
 *  import { useState } from 'react'
 *  import SplashLoader from './components/SplashLoader'
 *  import App from './App'
 *
 *  function Root() {
 *    const [done, setDone] = useState(false)
 *    return (
 *      <>
 *        {!done && <SplashLoader onDone={() => setDone(true)} />}
 *        <App />
 *      </>
 *    )
 *  }
 *
 *  ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
 */