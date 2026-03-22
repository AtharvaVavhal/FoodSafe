import { useEffect, useState } from 'react'

/**
 * SplashLoader — shown on first app load, auto-dismisses after 2.2s
 *
 * Usage in main.jsx:
 *   import SplashLoader from './components/SplashLoader'
 *   // wrap your <App /> with it — see bottom of this file
 */

const LEAVES = [
  { x: 18,  y: 22,  size: 7,  delay: 0,    rot: -25 },
  { x: 72,  y: 15,  size: 5,  delay: 0.15, rot: 40  },
  { x: 85,  y: 60,  size: 9,  delay: 0.3,  rot: -10 },
  { x: 10,  y: 68,  size: 6,  delay: 0.1,  rot: 55  },
  { x: 55,  y: 82,  size: 4,  delay: 0.45, rot: -40 },
  { x: 38,  y: 12,  size: 5,  delay: 0.25, rot: 20  },
  { x: 90,  y: 30,  size: 7,  delay: 0.05, rot: -60 },
]

function Leaf({ x, y, size, delay, rot }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      fontSize: size * 3,
      opacity: 0,
      transform: `rotate(${rot}deg) scale(0)`,
      animation: `leafPop 0.6s ease forwards`,
      animationDelay: `${delay + 0.4}s`,
    }}>
      🌿
    </div>
  )
}

export default function SplashLoader({ onDone }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2000)
    const t2 = setTimeout(() => onDone?.(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0d2818 0%, #1a3d2b 50%, #2d6647 100%)',
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.4s ease',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600&family=Playfair+Display:wght@500;600&display=swap');

        @keyframes leafPop {
          0%   { opacity: 0; transform: rotate(var(--rot, 0deg)) scale(0); }
          60%  { opacity: 0.25; transform: rotate(var(--rot, 0deg)) scale(1.15); }
          100% { opacity: 0.18; transform: rotate(var(--rot, 0deg)) scale(1); }
        }
        @keyframes logoIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tagIn {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);   opacity: 0.15; }
          50%       { transform: scale(1.08); opacity: 0.3;  }
        }
        @keyframes scanLine {
          0%   { top: 20%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* Ambient leaves */}
      {LEAVES.map((l, i) => <Leaf key={i} {...l} />)}

      {/* Pulsing ring behind logo */}
      <div style={{
        position: 'absolute',
        width: 160, height: 160,
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.3)',
        animation: 'ringPulse 2s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.12)',
        animation: 'ringPulse 2s ease-in-out infinite',
        animationDelay: '0.3s',
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        animation: 'logoIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        zIndex: 2,
      }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>🌿</div>

        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 34, fontWeight: 600,
          color: '#f5f0e8',
          letterSpacing: '-0.02em',
        }}>
          FoodSafe
        </div>

        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, fontWeight: 300,
          color: 'rgba(245,240,232,0.45)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          animation: 'tagIn 0.5s ease forwards',
          animationDelay: '0.3s',
          opacity: 0,
        }}>
          Know What You Eat
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'absolute', bottom: 60,
        display: 'flex', gap: 6,
        animation: 'tagIn 0.4s ease forwards',
        animationDelay: '0.6s',
        opacity: 0,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#c9a84c',
            animation: 'dotBounce 1.2s ease infinite',
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

/**
 * HOW TO USE — wrap your app in main.jsx:
 *
 * import { useState } from 'react'
 * import SplashLoader from './components/SplashLoader'
 * import App from './App'
 *
 * function Root() {
 *   const [splashDone, setSplashDone] = useState(false)
 *   return (
 *     <>
 *       {!splashDone && <SplashLoader onDone={() => setSplashDone(true)} />}
 *       <App />
 *     </>
 *   )
 * }
 */
