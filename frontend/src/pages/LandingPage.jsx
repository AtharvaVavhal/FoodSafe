import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store' 

/* ── HELPERS (Must be OUTSIDE the component) ─────────────────────────── */

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 6,
    opacity: 0.15 + Math.random() * 0.3,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: `rgba(0, 200, 150, ${p.opacity})`,
          animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 2}px rgba(0,200,150,0.3)`,
        }} />
      ))}
    </div>
  )
}

function Typewriter({ words, speed = 100, pause = 2000 }) {
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIdx(c => c + 1)
        }
      } else {
        setText(word.slice(0, charIdx))
        if (charIdx === 0) {
          setDeleting(false)
          setWordIdx((wordIdx + 1) % words.length)
        } else {
          setCharIdx(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, wordIdx, words, speed, pause])

  return (
    <span style={{ borderRight: '2px solid #00c896', paddingRight: 4, animation: 'blinkCaret 0.8s step-end infinite' }}>
      {text}
    </span>
  )
}

function AlertMarquee({ alerts }) {
  return (
    <div style={{
      overflow: 'hidden', whiteSpace: 'nowrap',
      background: 'rgba(255,255,255,0.04)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '12px 0',
    }}>
      <div style={{
        display: 'inline-block',
        animation: `marquee ${alerts.length * 6}s linear infinite`,
        paddingLeft: '100%',
      }}>
        {alerts.map((a, i) => (
          <span key={i} style={{
            fontSize: 13, color: 'rgba(255,255,255,0.7)',
            marginRight: 60, letterSpacing: '0.02em',
          }}>
            ⚠️ {typeof a === 'string' ? a : a.title}
            <span style={{ margin: '0 20px', color: 'rgba(255,255,255,0.2)' }}>•</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── CONSTANTS ──────────────────────────────────────────────────────── */

const STATS = [
  { value: 68, suffix: '%', label: 'Turmeric Adulterated', icon: '🌿' },
  { value: 77, suffix: '%', label: 'Honey Brands Fail Tests', icon: '🍯' },
  { value: 46, suffix: '%', label: 'Milk Samples Impure', icon: '🥛' },
  { value: 89, suffix: 'K+', label: 'Foods Scanned', icon: '🔍' },
]

const FEATURES = [
  { icon: '📸', title: 'AI Camera Scan', desc: 'Point your camera at any food item — our YOLOv8 model detects adulteration in real-time with 94% accuracy.', color: '#00c896' },
  { icon: '🗣️', title: 'Hindi, Marathi & English', desc: 'Native multilingual NLP powered by IndicBERT. Ask about food safety in your language.', color: '#f5c842' },
  { icon: '📊', title: 'Seasonal Risk Prediction', desc: 'Prophet ML time-series model predicts adulteration spikes before they happen.', color: '#ff6450' },
  { icon: '👨‍👩‍👧', title: 'Family Health Profiles', desc: 'Personalized toxin exposure scoring for each family member based on their conditions.', color: '#7c5cff' },
  { icon: '🏛️', title: 'FSSAI Data Integration', desc: 'Real violation data scraped from FSSAI databases, cross-referenced with your food scans.', color: '#00a0ff' },
  { icon: '🤝', title: 'Community Intelligence', desc: 'Crowdsourced reports from users across India create a real-time adulteration heatmap.', color: '#e07c1a' },
]

const STEPS = [
  { num: '01', title: 'Scan Your Food', desc: 'Type a food name, snap a photo, or use voice input in Hindi/Marathi/English.', icon: '🔍' },
  { num: '02', title: 'AI Analyzes Risk', desc: 'Our multimodal AI checks FSSAI data, seasonal risks, and your family health profile.', icon: '🤖' },
  { num: '03', title: 'Get Safe Results', desc: 'Receive a safety score, home tests, buying tips, and personalized warnings.', icon: '✅' },
]

const DEFAULT_ALERTS = [
  "MDH spices flagged for pesticide residue",
  "Everest Fish Curry Masala recalled — ethylene oxide",
  "83% paneer samples fail quality in UP cities",
  "Honey adulteration with HFCS — NMR test recommended",
  "Sudan Red dye found in chilli powder — Tamil Nadu",
  "Argemone oil in mustard oil detected in Rajasthan",
]

/* ── MAIN COMPONENT ─────────────────────────────────────────────────── */

export default function LandingPage() {
  const nav = useNavigate()
  const { refreshToken: token } = useStore()
  
  const [statsRef, statsInView] = useInView(0.3)
  const [featRef, featInView] = useInView(0.1)
  const [stepsRef, stepsInView] = useInView(0.2)
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS)
  const [heroLoaded, setHeroLoaded] = useState(false)

  const stat0 = useCountUp(STATS[0].value, 2000, statsInView)
  const stat1 = useCountUp(STATS[1].value, 2000, statsInView)
  const stat2 = useCountUp(STATS[2].value, 2000, statsInView)
  const stat3 = useCountUp(STATS[3].value, 2000, statsInView)
  const statValues = [stat0, stat1, stat2, stat3]

  // AUTO-REDIRECT LOGGED IN USERS
  useEffect(() => {
    if (token) {
      nav('/scan', { replace: true });
    }
  }, [token, nav]);

  useEffect(() => { setTimeout(() => setHeroLoaded(true), 100) }, [])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/fssai/alerts`)
      .then(r => r.json())
      .then(d => { if (d.alerts?.length) setAlerts(d.alerts) })
      .catch(() => {})
  }, [])

  return (
    <div style={{ background: '#070d14', minHeight: '100vh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Hero Section ────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Background gradient orbs */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 60% at 30% 10%, rgba(0,200,150,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 70% 90%, rgba(0,100,220,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(120,0,200,0.06) 0%, transparent 70%)
          `,
        }} />
        <Particles />

        <div style={{
          position: 'absolute',
          width: 300, height: 300,
          background: 'rgba(0,200,150,0.08)',
          animation: 'morphGlow 8s ease-in-out infinite',
          top: '10%', left: '50%', transform: 'translateX(-50%)',
          filter: 'blur(40px)',
        }} />

        <div style={{
          opacity: heroLoaded ? 1 : 0,
          transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 50, padding: '8px 20px 8px 12px',
          marginBottom: 28,
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em' }}>
            AI-POWERED FOOD SAFETY FOR INDIA
          </span>
          <div className="live-dot" style={{ marginLeft: 4 }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 12,
          opacity: heroLoaded ? 1 : 0,
          transform: heroLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s',
          color: 'rgba(255,255,255,0.95)',
          maxWidth: 800,
        }}>
          Know what's{' '}
          <span className="gradient-text-gold" style={{ fontStyle: 'italic' }}>really</span>
          <br />in your food
        </h1>

        <div style={{
          fontSize: 'clamp(16px, 3vw, 22px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 36,
          fontWeight: 300,
          opacity: heroLoaded ? 1 : 0,
          transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s',
          minHeight: 32,
        }}>
          Detect adulteration in{' '}
          <Typewriter
            words={['turmeric', 'milk', 'honey', 'spices', 'paneer', 'ghee', 'oil']}
            speed={90}
            pause={1800}
          />
        </div>

        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          opacity: heroLoaded ? 1 : 0,
          transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s',
        }}>
          <button onClick={() => nav('/auth')} style={{
            padding: '16px 36px',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(135deg, #00c896, #00a878)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 30px rgba(0,200,150,0.4), 0 0 60px rgba(0,200,150,0.15)',
            transition: 'all 0.2s ease',
            animation: 'glow-pulse 3s ease infinite',
          }}>
            🔍 Scan Your Food Free
          </button>
          <button onClick={() => {
            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
          }} style={{
            padding: '16px 36px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
          }}>
            See how it works ↓
          </button>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'float 2.5s ease-in-out infinite',
          opacity: 0.4,
          fontSize: 24,
        }}>↓</div>
      </section>

      <AlertMarquee alerts={alerts} />

      {/* ── Stats Section ──────────────────────────────── */}
      <section ref={statsRef} style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          textAlign: 'center', marginBottom: 48,
          opacity: statsInView ? 1 : 0,
          transform: statsInView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00c896', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            THE HARD TRUTH
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            India's Food Adulteration Crisis
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} className="glass-card-hover hover-lift" style={{
              padding: 28,
              textAlign: 'center',
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
              transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{
                fontSize: 44, fontWeight: 800, lineHeight: 1,
                background: 'linear-gradient(135deg, #00c896, #f5c842)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 8,
              }}>
                {statValues[i]}{s.suffix}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────── */}
      <section id="how-it-works" ref={stepsRef} style={{
        padding: '80px 24px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center', marginBottom: 56,
          opacity: stepsInView ? 1 : 0,
          transform: stepsInView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f5c842', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            SIMPLE AS 1-2-3
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            How FoodSafe Works
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              position: 'relative',
              padding: 32,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 22,
              backdropFilter: 'blur(12px)',
              opacity: stepsInView ? 1 : 0,
              transform: stepsInView ? 'translateY(0)' : 'translateY(40px)',
              transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.15}s`,
            }}>
              <div style={{
                position: 'absolute', top: -14, left: 24,
                background: 'linear-gradient(135deg, #00c896, #00a878)',
                color: '#fff', fontSize: 12, fontWeight: 700,
                padding: '6px 14px', borderRadius: 20,
                letterSpacing: '0.05em',
              }}>{s.num}</div>
              <div style={{ fontSize: 40, marginBottom: 16, marginTop: 8 }}>{s.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────── */}
      <section ref={featRef} style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          textAlign: 'center', marginBottom: 56,
          opacity: featInView ? 1 : 0,
          transform: featInView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c5cff', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            POWERED BY AI & ML
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            Features That Make a Difference
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="hover-lift" style={{
              padding: 28,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              backdropFilter: 'blur(12px)',
              cursor: 'default',
              opacity: featInView ? 1 : 0,
              transform: featInView ? 'translateY(0)' : 'translateY(30px)',
              transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
            }}>
              <div style={{
                width: 48, height: 48,
                borderRadius: 14,
                background: `${f.color}18`,
                border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack Showcase ────────────────────────── */}
      <section style={{
        padding: '60px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 20 }}>
          BUILT WITH
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 700, margin: '0 auto',
        }}>
          {['React.js', 'FastAPI', 'YOLOv8', 'IndicBERT', 'Prophet ML', 'PostgreSQL', 'Groq API', 'Leaflet.js'].map(t => (
            <span key={t} style={{
              padding: '8px 18px', borderRadius: 30,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 13, color: 'rgba(255,255,255,0.5)',
              fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────── */}
      <section style={{
        padding: '80px 24px 100px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 50% 80%, rgba(0,200,150,0.1) 0%, transparent 60%)',
        }} />
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          color: 'rgba(255,255,255,0.95)',
          marginBottom: 16,
        }}>
          Protect Your Family's Plate
        </h2>
        <p style={{
          fontSize: 16, color: 'rgba(255,255,255,0.45)',
          maxWidth: 500, margin: '0 auto 32px',
          fontWeight: 300, lineHeight: 1.6,
        }}>
          Join thousands of Indian families using AI to make safer food choices every day.
        </p>
        <button onClick={() => nav('/auth')} className="hover-glow" style={{
          padding: '18px 48px',
          borderRadius: 16,
          border: 'none',
          background: 'linear-gradient(135deg, #00c896, #00a878)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 4px 30px rgba(0,200,150,0.4)',
          transition: 'all 0.2s ease',
        }}>
          Start Scanning Free →
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 60,
          paddingTop: 30,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
        }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>🌿</span>
          FoodSafe — AI-Powered Food Safety for India
          <br />
          <span style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
            MIT License · Open for Research & Educational Use · ₹0 Cost
          </span>
        </div>
      </section>
    </div>
  )
}