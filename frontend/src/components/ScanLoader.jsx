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
      background: 'rgba(13,40,24,0.92)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600&family=Playfair+Display:wght@500;600&display=swap');

        @keyframes scanBeam {
          0%   { top: 10%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes outerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes innerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes fadeMsg {
          0%   { opacity: 0; transform: translateY(4px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(201,168,76,0.2); }
          50%       { box-shadow: 0 0 40px rgba(201,168,76,0.45); }
        }
      `}</style>

      {/* Scanner orb */}
      <div style={{
        position: 'relative',
        width: 130, height: 130,
        marginBottom: 32,
        animation: 'glowPulse 2s ease-in-out infinite',
        borderRadius: '50%',
      }}>

        {/* Outer spinning ring — dashed */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '2px dashed rgba(201,168,76,0.35)',
          animation: 'outerSpin 4s linear infinite',
        }} />

        {/* Middle ring — solid with gap */}
        <div style={{
          position: 'absolute', inset: 10,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#c9a84c',
          borderRightColor: '#c9a84c',
          animation: 'outerSpin 1.6s cubic-bezier(0.5,0,0.5,1) infinite',
        }} />

        {/* Inner ring — counter-spin */}
        <div style={{
          position: 'absolute', inset: 20,
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: 'rgba(201,168,76,0.5)',
          borderLeftColor: 'rgba(201,168,76,0.5)',
          animation: 'innerSpin 2.4s linear infinite',
        }} />

        {/* Centre: food emoji or icon */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 30 }}>🌿</div>
        </div>

        {/* Scanning beam */}
        <div style={{
          position: 'absolute', left: 20, right: 20,
          height: 1.5,
          background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          animation: 'scanBeam 1.6s ease-in-out infinite',
          borderRadius: 2,
        }} />
      </div>

      {/* Food name */}
      {food && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 18, fontWeight: 500,
          color: '#f5f0e8',
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          {food}
        </div>
      )}

      {/* Cycling message */}
      <div key={msgIdx} style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14, fontWeight: 500,
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: '0.01em',
        minHeight: 24,
        animation: 'fadeMsg 0.9s ease forwards',
        marginBottom: 24,
        textAlign: 'center',
        padding: '0 32px',
      }}>
        {messages[msgIdx]}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 2,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #1a3d2b, #c9a84c)',
          borderRadius: 2,
          transition: 'width 0.2s ease',
        }} />
      </div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 10, fontWeight: 400,
        color: 'rgba(201,168,76,0.6)',
        marginTop: 8,
        letterSpacing: '0.08em',
      }}>
        {progress}%
      </div>
    </div>
  )
}
