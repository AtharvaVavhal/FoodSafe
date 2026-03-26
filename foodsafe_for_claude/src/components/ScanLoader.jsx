/**
 * ScanLoader — shown while the AI analyses a food item
 *
 * Usage:
 *   import ScanLoader from '../components/ScanLoader'
 *
 *   {loading && <ScanLoader food="Turmeric" lang={lang} />}
 *
 * Props:
 *   food  — string, food name being scanned (optional)
 *   lang  — 'en' | 'hi' | 'mr'
 */

const MESSAGES = {
  en: [
    'Checking FSSAI violation records…',
    'Analysing adulterant risk…',
    'Running seasonal risk model…',
    'Preparing your safety report…',
  ],
  hi: [
    'FSSAI रिकॉर्ड जांच रहे हैं…',
    'मिलावट जोखिम विश्लेषण…',
    'मौसमी जोखिम मॉडल चला रहे हैं…',
    'सुरक्षा रिपोर्ट तैयार हो रही है…',
  ],
  mr: [
    'FSSAI नोंदी तपासत आहोत…',
    'भेसळ जोखीम विश्लेषण…',
    'हंगामी जोखीम मॉडेल चालवत आहोत…',
    'सुरक्षा अहवाल तयार होत आहे…',
  ],
}

import { useEffect, useState } from 'react'

export default function ScanLoader({ food = '', lang = 'en' }) {
  const messages = MESSAGES[lang] || MESSAGES.en
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Cycle messages every 900ms
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % messages.length)
    }, 900)

    // Animate progress bar (fake, for UX — resets at 88% so it never completes)
    let p = 0
    const progTimer = setInterval(() => {
      p += Math.random() * 4 + 1
      if (p > 88) p = 88
      setProgress(Math.round(p))
    }, 200)

    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(4,9,14,0.97) 0%, rgba(4,9,14,0.99) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <style>{`
        @keyframes scanBeam {
          0%   { top: 15%; opacity: 0; transform: scaleX(0.8); }
          5%   { opacity: 1; transform: scaleX(1); }
          50%  { top: 50%; opacity: 1; transform: scaleX(1); }
          95%  { opacity: 1; transform: scaleX(1); }
          100% { top: 85%; opacity: 0; transform: scaleX(0.8); }
        }
        @keyframes fadeMsg {
          0%   { opacity: 0; transform: translateY(8px) scale(0.98); }
          15%  { opacity: 1; transform: translateY(0) scale(1); }
          85%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
        }
        @keyframes morphGlow {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            box-shadow: 0 0 40px rgba(0,200,150,0.15), inset 0 0 40px rgba(0,200,150,0.05);
          }
          50% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
            box-shadow: 0 0 60px rgba(0,200,150,0.25), inset 0 0 60px rgba(0,200,150,0.1);
          }
        }
        @keyframes ripple {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes particleFloat {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.6; }
          25%  { transform: translateY(-30px) translateX(10px) scale(1.1); opacity: 0.8; }
          50%  { transform: translateY(-60px) translateX(-5px) scale(0.9); opacity: 0.4; }
          75%  { transform: translateY(-90px) translateX(15px) scale(1.05); opacity: 0.7; }
          100% { transform: translateY(-120px) translateX(0) scale(1); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(0,200,150,0.4); }
          50% { box-shadow: 0 0 20px rgba(0,200,150,0.7), 0 0 30px rgba(0,200,150,0.3); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0,200,150,0.2); }
          50% { border-color: rgba(0,200,150,0.6); }
        }
      `}</style>

      {/* Floating particles */}
      <div style={{
        position: 'absolute',
        width: '100%', height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + i * 12}%`,
            top: `${50 + (i % 4) * 8}%`,
            width: i % 3 === 0 ? 6 : 4,
            height: i % 3 === 0 ? 6 : 4,
            background: i % 3 === 0
              ? 'radial-gradient(circle, rgba(0,200,150,0.8) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(245,200,66,0.6) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: `particleFloat ${3 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      {/* Scanner orb */}
      <div style={{
        position: 'relative',
        width: 150, height: 150,
        marginBottom: 40,
        animation: 'float 3s ease-in-out infinite',
      }}>
        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: `${-i * 15}px`,
            borderRadius: '50%',
            border: `1px solid rgba(0,200,150,${0.3 - i * 0.08})`,
            animation: `ripple 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}

        {/* Morphing glow background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,200,150,0.15) 0%, transparent 70%)',
          animation: 'morphGlow 4s ease-in-out infinite',
        }} />

        {/* Outer ring with border glow */}
        <div style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          border: '2px solid rgba(0,200,150,0.3)',
          animation: 'borderGlow 3s ease-in-out infinite, spin 8s linear infinite',
        }} />

        {/* Spinning dashed ring */}
        <div style={{
          position: 'absolute',
          inset: 16,
          borderRadius: '50%',
          border: '2px dashed rgba(245,200,66,0.35)',
          animation: 'spin 6s linear infinite reverse',
        }} />

        {/* Solid arc ring */}
        <div style={{
          position: 'absolute',
          inset: 24,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#00c896',
          borderRightColor: 'rgba(0,200,150,0.5)',
          borderRadius: '50%',
          animation: 'spin 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          filter: 'drop-shadow(0 0 8px rgba(0,200,150,0.6))',
        }} />

        {/* Inner counter-spin ring */}
        <div style={{
          position: 'absolute',
          inset: 36,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'rgba(245,200,66,0.7)',
          borderLeftColor: 'rgba(245,200,66,0.5)',
          animation: 'spin 3s linear infinite reverse',
        }} />

        {/* Centre: leaf icon with glass container */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'rgba(0,200,150,0.12)',
            border: '1px solid rgba(0,200,150,0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            animation: 'float 2s ease-in-out infinite',
            boxShadow: '0 0 30px rgba(0,200,150,0.3), inset 0 0 20px rgba(0,200,150,0.1)',
          }}>
            🌿
          </div>
        </div>

        {/* Scanning beam */}
        <div style={{
          position: 'absolute',
          left: 20,
          right: 20,
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,150,0.2), #00c896, rgba(0,200,150,0.2), transparent)',
          animation: 'scanBeam 2.5s ease-in-out infinite',
          borderRadius: 2,
          boxShadow: '0 0 15px rgba(0,200,150,0.6)',
        }} />

        {/* Vertical accent line */}
        <div style={{
          position: 'absolute',
          top: 20,
          bottom: 20,
          width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(0,200,150,0.15), transparent)',
        }} />
      </div>

      {/* Food name with gradient text */}
      {food && (
        <div style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: 'transparent',
          marginBottom: 16,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #00c896 0%, #f5c842 50%, #00c896 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'gradientShift 3s ease infinite, float 2s ease-in-out infinite',
          textAlign: 'center',
        }}>
          {food}
        </div>
      )}

      {/* Cycling message */}
      <div key={msgIdx} style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: '0.02em',
        minHeight: 24,
        animation: 'fadeMsg 0.9s ease forwards',
        marginBottom: 32,
        textAlign: 'center',
        padding: '0 32px',
      }}>
        {messages[msgIdx]}
      </div>

      {/* Progress bar container - glass style */}
      <div style={{
        position: 'relative',
        width: 240,
        height: 5,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        {/* Progress fill */}
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, rgba(0,200,150,0.6) 0%, #00c896 50%, rgba(245,200,66,0.6) 100%)',
          borderRadius: 6,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'shimmer 2s linear infinite, progressGlow 2s ease-in-out infinite',
          position: 'relative',
        }}>
          {/* Inner shine */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
            borderRadius: '6px 6px 0 0',
          }} />
        </div>

        {/* Shimmer overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
      </div>

      {/* Percentage text */}
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(0,200,150,0.8)',
        marginTop: 12,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontVariant: 'small-caps',
      }}>
        {progress}%
      </div>
    </div>
  )
}
