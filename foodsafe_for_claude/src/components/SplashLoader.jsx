/**
 * FoodSafe SplashLoader — "Ingredient Reveal"
 * ─────────────────────────────────────────────────────────────────────────────
 * Concept: A scan beam sweeps the screen. Where it passes, the brand
 * crystallizes from noise into clarity — like UV light revealing what's hidden.
 * A shield draws. A checkmark confirms. The app is safe to enter.
 *
 * Architecture:
 *   • State machine with 8 phases (no boolean soup)
 *   • Every animated property is transform/opacity/filter (compositor thread)
 *   • Zero layout-triggering properties change after mount
 *   • memo() on every sub-component — only phase-relevant nodes re-render
 *   • willChange applied surgically, not globally
 *
 * Dependencies: framer-motion (npm install framer-motion)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, memo, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  bg:           '#05080a',
  green:        '#00d07a',
  greenBright:  '#00ff96',
  greenDim:     'rgba(0, 208, 122, 0.32)',
  greenGlow:    'rgba(0, 208, 122, 0.08)',
  greenTrace:   'rgba(0, 208, 122, 0.15)',
  cream:        '#dfe8e1',
  creamFaint:   'rgba(223, 232, 225, 0.38)',
  beamColor:    'rgba(0, 255, 150, 0.9)',
  gridColor:    'rgba(0, 208, 122, 0.032)',
  mono:         "'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace",
  serif:        "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
}

// ─── Phase machine ────────────────────────────────────────────────────────────
const PHASES = ['idle', 'glow', 'scan', 'crystallize', 'shield', 'confirm', 'hold', 'exit']

// ─── Letter data — deterministic scatter positions ────────────────────────────
// dx/dy are the *scattered* positions before crystallization
const WORDMARK = [
  { char: 'F', dx: -200, dy: -100, rot: -48, blur: 14, delay: 0     },
  { char: 'o', dx:  -72, dy: -155, rot:  30, blur: 12, delay: 0.048 },
  { char: 'o', dx:   88, dy: -122, rot: -22, blur: 13, delay: 0.096 },
  { char: 'd', dx:  175, dy:  -78, rot:  55, blur: 11, delay: 0.144 },
  { char: 'S', dx: -155, dy:   88, rot: -62, blur: 14, delay: 0.192 },
  { char: 'a', dx:  -25, dy:  135, rot:  26, blur: 12, delay: 0.240 },
  { char: 'f', dx:  110, dy:  100, rot: -32, blur: 13, delay: 0.288 },
  { char: 'e', dx:  200, dy:   55, rot:  48, blur: 11, delay: 0.336 },
]

// ─── Ambient particles ────────────────────────────────────────────────────────
const PARTICLES = [
  { x:  6, y: 11, r: 1.4, d: 0.3,  t: 4.2 },
  { x: 21, y: 77, r: 2.0, d: 0.9,  t: 5.4 },
  { x: 69, y: 13, r: 1.0, d: 0.5,  t: 3.9 },
  { x: 84, y: 64, r: 2.2, d: 1.2,  t: 4.8 },
  { x: 13, y: 47, r: 1.1, d: 0.7,  t: 6.1 },
  { x: 93, y: 26, r: 1.7, d: 0.1,  t: 4.5 },
  { x: 46, y: 87, r: 1.3, d: 1.0,  t: 5.2 },
  { x: 77, y: 92, r: 1.9, d: 0.4,  t: 3.7 },
  { x: 37, y:  3, r: 1.5, d: 0.8,  t: 5.0 },
  { x:  3, y: 84, r: 2.1, d: 0.2,  t: 4.3 },
  { x: 96, y: 71, r: 1.0, d: 0.6,  t: 4.0 },
  { x: 58, y: 54, r: 1.2, d: 1.5,  t: 5.6 },
  { x: 30, y: 60, r: 1.6, d: 0.0,  t: 4.7 },
  { x: 62, y: 38, r: 1.0, d: 1.3,  t: 3.6 },
]

// ─── Easing curves ────────────────────────────────────────────────────────────
const E = {
  expo:    [0.16, 1, 0.3, 1],
  spring:  { type: 'spring', stiffness: 300, damping: 22, mass: 1.0 },
  springS: { type: 'spring', stiffness: 140, damping: 18 },
  springL: { type: 'spring', stiffness: 80,  damping: 16 },
  snap:    { type: 'spring', stiffness: 420, damping: 28 },
}

// ─── Status copy ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  idle:        { text: '',                      progress: 0,    color: B.greenDim  },
  glow:        { text: 'INITIALIZING',          progress: 0.08, color: B.greenDim  },
  scan:        { text: 'SCANNING DATABASE',     progress: 0.45, color: B.greenDim  },
  crystallize: { text: 'PARSING INGREDIENTS',   progress: 0.72, color: B.greenDim  },
  shield:      { text: 'VERIFYING SAFETY',      progress: 0.88, color: B.greenDim  },
  confirm:     { text: 'ALL CLEAR',             progress: 1.00, color: B.green     },
  hold:        { text: 'ALL CLEAR',             progress: 1.00, color: B.green     },
  exit:        { text: 'ALL CLEAR',             progress: 1.00, color: B.green     },
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (all memoized)
// ─────────────────────────────────────────────────────────────────────────────

/** Ambient floating particle — handed off to compositor after first paint */
const Particle = memo(({ x, y, r, d, t }) => (
  <motion.div
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: `${x}%`,
      top:  `${y}%`,
      width: r * 2,
      height: r * 2,
      borderRadius: '50%',
      background: B.green,
      willChange: 'transform, opacity',
      pointerEvents: 'none',
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.28, 0.10, 0.22, 0],
      scale:   [0, 1, 0.75, 1.15, 0],
      y:       [0, -16, -6, -20, -36],
    }}
    transition={{
      duration: t,
      delay: d,
      repeat: Infinity,
      repeatDelay: t * 0.2,
      ease: 'easeInOut',
    }}
  />
))

/** Corner bracket — 4 instances, spring snap on mount */
const Bracket = memo(({ pos, delay }) => {
  const style = {
    position: 'absolute',
    width: 20,
    height: 20,
    ...pos,
    borderTop:    pos.top    !== undefined ? `1px solid ${B.greenDim}` : 'none',
    borderBottom: pos.bottom !== undefined ? `1px solid ${B.greenDim}` : 'none',
    borderLeft:   pos.left   !== undefined ? `1px solid ${B.greenDim}` : 'none',
    borderRight:  pos.right  !== undefined ? `1px solid ${B.greenDim}` : 'none',
  }
  return (
    <motion.div
      aria-hidden="true"
      style={style}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...E.snap, delay }}
    />
  )
})

/** The scan beam — translateY only, never top/left */
const ScanBeam = memo(({ active }) => (
  <motion.div
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      willChange: 'transform, opacity',
      pointerEvents: 'none',
      zIndex: 10,
    }}
    initial={{ opacity: 0, scaleX: 0.8, y: '-50vh' }}
    animate={active ? {
      opacity: [0, 1, 1, 0.6, 0],
      y: ['-50vh', '0vh', '0vh', '25vh', '50vh'],
      scaleX: [0.8, 1, 1, 0.95, 0.7],
    } : { opacity: 0, y: '-50vh' }}
    transition={{
      duration: 0.75,
      times: [0, 0.25, 0.5, 0.75, 1],
      ease: 'easeInOut',
    }}
  >
    {/* Beam line */}
    <div style={{
      width: '100%',
      height: 1,
      background: `linear-gradient(90deg,
        transparent 0%,
        ${B.greenDim} 10%,
        ${B.greenBright} 40%,
        ${B.beamColor} 50%,
        ${B.greenBright} 60%,
        ${B.greenDim} 90%,
        transparent 100%
      )`,
    }} />
    {/* Glow halo above beam */}
    <div style={{
      position: 'absolute',
      top: -8,
      left: 0,
      right: 0,
      height: 16,
      background: `linear-gradient(180deg, transparent, rgba(0,255,150,0.08) 50%, transparent)`,
      filter: 'blur(3px)',
    }} />
  </motion.div>
))

/** Single wordmark letter — crystallizes from scattered blur on cue */
const Letter = memo(({ char, dx, dy, rot, blur, delay, active }) => (
  <motion.span
    style={{
      display: 'inline-block',
      fontFamily: B.serif,
      fontSize: 'clamp(32px, 7.2vw, 52px)',
      fontWeight: 500,
      color: B.cream,
      letterSpacing: '-0.015em',
      lineHeight: 1,
      willChange: 'transform, opacity, filter',
      userSelect: 'none',
    }}
    initial={{
      opacity: 0,
      x: dx,
      y: dy,
      rotate: rot,
      scale: 0.5,
      filter: `blur(${blur}px)`,
    }}
    animate={active ? {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      filter: 'blur(0px)',
    } : {
      opacity: 0,
      x: dx,
      y: dy,
      rotate: rot,
      scale: 0.5,
      filter: `blur(${blur}px)`,
    }}
    transition={{
      ...E.spring,
      delay,
      filter:  { duration: 0.32, ease: E.expo, delay },
      opacity: { duration: 0.20, ease: 'easeOut', delay },
    }}
  >
    {char}
  </motion.span>
))

/** Shield SVG — outer + inner paths draw sequentially */
const Shield = memo(({ drawOuter, drawInner }) => (
  <div style={{ position: 'relative', width: 64, height: 74, marginBottom: 20 }}>
    <motion.svg
      width="64"
      height="74"
      viewBox="0 0 64 74"
      fill="none"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      {/* Outer shield */}
      <motion.path
        d="M32 2L4 13.5V37C4 53.5 16.5 67 32 71C47.5 67 60 53.5 60 37V13.5L32 2Z"
        fill="rgba(0, 208, 122, 0.055)"
        stroke={B.green}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={drawOuter
          ? { pathLength: 1, opacity: 1 }
          : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.65, ease: E.expo }}
      />
      {/* Inner shield */}
      <motion.path
        d="M32 13L13 21.5V36C13 47.5 21 57.5 32 61C43 57.5 51 47.5 51 36V21.5L32 13Z"
        fill="none"
        stroke="rgba(0, 208, 122, 0.22)"
        strokeWidth="0.8"
        strokeDasharray="3 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={drawInner
          ? { pathLength: 1, opacity: 1 }
          : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.5, ease: E.expo, delay: 0.2 }}
      />
    </motion.svg>
  </div>
))

/** Checkmark ring + tick */
const Checkmark = memo(({ visible }) => (
  <motion.div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      willChange: 'transform, opacity',
    }}
    initial={{ opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }}
    animate={visible
      ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' }
      : { opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }
    }
    transition={E.springS}
  >
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ overflow: 'visible' }}>
      {/* Ring */}
      <motion.circle
        cx="28" cy="28" r="24"
        stroke={B.green}
        strokeWidth="1"
        strokeOpacity="0.4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.55, ease: E.expo }}
      />
      {/* Tick */}
      <motion.path
        d="M16 28L24 36L40 20"
        stroke={B.greenBright}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.38, ease: E.expo, delay: 0.22 }}
      />
      {/* Glow dot at center */}
      <motion.circle
        cx="28" cy="28" r="3"
        fill={B.green}
        fillOpacity="0"
        initial={{ r: 3, fillOpacity: 0 }}
        animate={visible
          ? { r: [3, 18, 0], fillOpacity: [0, 0.15, 0] }
          : { r: 3, fillOpacity: 0 }
        }
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  </motion.div>
))

/** Status bar — progress fill + animated label */
const StatusBar = memo(({ phase }) => {
  const { text, progress, color } = STATUS_MAP[phase] || STATUS_MAP.idle
  const visible = phase !== 'idle'

  return (
    <motion.div
      aria-label={`Loading status: ${text}`}
      style={{
        position: 'absolute',
        bottom: 44,
        left: '50%',
        width: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
      }}
      initial={{ opacity: 0, y: 8, x: '-50%' }}
      animate={visible
        ? { opacity: 1, y: 0, x: '-50%' }
        : { opacity: 0, y: 8, x: '-50%' }
      }
      transition={{ duration: 0.4, ease: E.expo, delay: 0.2 }}
    >
      {/* Track */}
      <div style={{
        width: '100%',
        height: 1,
        background: 'rgba(0,208,122,0.1)',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            height: '100%',
            borderRadius: 1,
            background: `linear-gradient(90deg, ${B.greenDim}, ${B.green})`,
            boxShadow: `0 0 6px ${B.green}`,
            transformOrigin: 'left center',
            willChange: 'transform',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.6, ease: E.expo }}
        />
      </div>

      {/* Label — AnimatePresence for smooth text crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={text}
          style={{
            fontFamily: B.mono,
            fontSize: 8,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color,
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {text}
          {(phase === 'confirm' || phase === 'hold' || phase === 'exit') && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              style={{ color: B.greenBright, marginLeft: 4 }}
            >
              ✓
            </motion.span>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
})

/** Tagline */
const Tagline = memo(({ visible }) => (
  <motion.p
    style={{
      fontFamily: B.mono,
      fontSize: 'clamp(7.5px, 1.3vw, 9.5px)',
      fontWeight: 300,
      letterSpacing: '0.24em',
      textTransform: 'uppercase',
      color: B.creamFaint,
      margin: '13px 0 0',
      willChange: 'transform, opacity, filter',
    }}
    initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
    animate={visible
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 0, y: 8, filter: 'blur(6px)' }
    }
    transition={{ duration: 0.5, ease: E.expo, delay: 0.12 }}
  >
    Know What You Eat
  </motion.p>
))

/** Horizontal divider line */
const Divider = memo(({ visible }) => (
  <motion.div
    aria-hidden="true"
    style={{
      height: 1,
      width: '100%',
      marginTop: 10,
      background: `linear-gradient(90deg,
        transparent 0%,
        ${B.greenDim} 20%,
        ${B.greenDim} 80%,
        transparent 100%
      )`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
    }}
    initial={{ scaleX: 0, opacity: 0 }}
    animate={visible ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
    transition={{ duration: 0.55, ease: E.expo, delay: 0.05 }}
  />
))

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SplashLoader({ onDone }) {
  const [phase, setPhase] = useState('idle')
  const [mounted, setMounted] = useState(true)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    // Respect prefers-reduced-motion — skip animation, go straight to done
    if (prefersReduced) {
      const t = setTimeout(() => onDone?.(), 400)
      return () => clearTimeout(t)
    }

    /**
     * PHASE TIMELINE
     * ─────────────────────────────────────────────────────────
     *   0ms   idle       black screen
     *  80ms   glow       radial bloom + grid + brackets
     * 300ms   scan       beam sweeps (750ms duration)
     * 860ms   crystallize letters spring into place (staggered)
     * 1480ms  shield     shield path draws
     * 1820ms  confirm    checkmark draws, status = ALL CLEAR
     * 2200ms  hold       beat of silence
     * 2560ms  exit       scale+blur+opacity exit (380ms)
     * 2940ms  unmount    → onDone()
     * ─────────────────────────────────────────────────────────
     */
    const timeline = [
      [80,   'glow'],
      [300,  'scan'],
      [860,  'crystallize'],
      [1480, 'shield'],
      [1820, 'confirm'],
      [2200, 'hold'],
      [2560, 'exit'],
      [2580, null],   // unmount trigger
      [2960, 'done'],
    ]

    const timers = timeline.map(([ms, p]) =>
      setTimeout(() => {
        if (p === null)    setMounted(false)
        else if (p === 'done') onDone?.()
        else setPhase(p)
      }, ms)
    )

    return () => timers.forEach(clearTimeout)
  }, [prefersReduced, onDone])

  // Derived booleans — computed from phase, never stored in state
  const showGlow        = ['glow','scan','crystallize','shield','confirm','hold','exit'].includes(phase)
  const showScan        = phase === 'scan'
  const lettersActive   = ['crystallize','shield','confirm','hold','exit'].includes(phase)
  const shieldOuter     = ['shield','confirm','hold','exit'].includes(phase)
  const shieldInner     = ['confirm','hold','exit'].includes(phase)
  const checkVisible    = ['confirm','hold','exit'].includes(phase)
  const dividerVisible  = lettersActive
  const taglineVisible  = checkVisible

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          key="foodsafe-splash"
          role="status"
          aria-label="FoodSafe loading"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: B.bg,
            overflow: 'hidden',
          }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.038,
            filter: 'blur(10px)',
          }}
          transition={{ duration: 0.38, ease: E.expo }}
        >
          {/* ── Fonts ─────────────────────────────────────────────────── */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=IBM+Plex+Mono:wght@300;400&display=swap');
          `}</style>

          {/* ── L0: Grid ──────────────────────────────────────────────── */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${B.gridColor} 1px, transparent 1px),
                linear-gradient(90deg, ${B.gridColor} 1px, transparent 1px)
              `,
              backgroundSize: '44px 44px',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showGlow ? 1 : 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />

          {/* ── L0: Radial bloom ──────────────────────────────────────── */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '62vmax',
              height: '62vmax',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${B.greenGlow} 0%, transparent 68%)`,
              top: '50%',
              left: '50%',
              willChange: 'transform, opacity',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }}
            animate={{
              opacity: showGlow ? (checkVisible ? 1.6 : 0.85) : 0,
              scale:   showGlow ? (checkVisible ? 1.15 : 0.9)  : 0.4,
              x: '-50%',
              y: '-50%',
            }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* ── L1: Particles ─────────────────────────────────────────── */}
          {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

          {/* ── L1: Corner brackets ───────────────────────────────────── */}
          <Bracket pos={{ top: 18, left: 18   }} delay={0.10} />
          <Bracket pos={{ top: 18, right: 18  }} delay={0.14} />
          <Bracket pos={{ bottom: 18, left: 18  }} delay={0.18} />
          <Bracket pos={{ bottom: 18, right: 18 }} delay={0.22} />

          {/* ── L2: Scan beam ─────────────────────────────────────────── */}
          <ScanBeam active={showScan} />

          {/* ── L3: Central composition ───────────────────────────────── */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 5,
          }}>
            {/* Shield group (relative container for absolute checkmark) */}
            <div style={{ position: 'relative' }}>
              <Shield drawOuter={shieldOuter} drawInner={shieldInner} />
              <Checkmark visible={checkVisible} />
            </div>

            {/* Wordmark */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.01em',
              }}
            >
              {WORDMARK.map((l, i) => (
                <Letter key={i} {...l} active={lettersActive} />
              ))}
            </div>

            {/* Divider */}
            <Divider visible={dividerVisible} />

            {/* Tagline */}
            <Tagline visible={taglineVisible} />
          </div>

          {/* ── L4: Status bar ────────────────────────────────────────── */}
          <StatusBar phase={phase} />

          {/* ── L5: Edge metadata ─────────────────────────────────────── */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 18,
              left: 22,
              fontFamily: B.mono,
              fontSize: 7.5,
              letterSpacing: '0.1em',
              color: 'rgba(0,208,122,0.18)',
              textTransform: 'uppercase',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showGlow ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            FSSAI Certified
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 18,
              right: 22,
              fontFamily: B.mono,
              fontSize: 7.5,
              letterSpacing: '0.1em',
              color: 'rgba(0,208,122,0.18)',
              textTransform: 'uppercase',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: showGlow ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            v2.0
          </motion.div>

          {/* ── L5: Scan line ghost trace (aesthetic) ─────────────────── */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: 80,
              background: `linear-gradient(180deg,
                transparent,
                ${B.greenTrace} 50%,
                transparent
              )`,
              transform: 'translateY(-50%)',
              opacity: 0,
              pointerEvents: 'none',
              filter: 'blur(8px)',
            }}
            animate={showScan ? {
              opacity: [0, 0.4, 0],
              scaleY: [0.5, 1.5, 0.5],
            } : { opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
          />

        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * In main.jsx:
 *
 *   import { useState } from 'react'
 *   import SplashLoader from './components/SplashLoader'
 *   import App from './App'
 *
 *   function Root() {
 *     const [done, setDone] = useState(false)
 *     return (
 *       <>
 *         {!done && <SplashLoader onDone={() => setDone(true)} />}
 *         <App />
 *       </>
 *     )
 *   }
 *
 *   ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
 */