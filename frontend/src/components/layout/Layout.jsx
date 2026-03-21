import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'
import { useEffect, useState } from 'react'
import MealPlanner from '../MealPlanner'
import PushNotificationBell from '../PushNotificationBell'

const NAV = [
  { to: '/',       icon: '🔍', key: 'scan' },
  { to: '/diary',  icon: '📔', key: 'diary' },
  { to: '/map',    icon: '🗺',  key: 'map' },
  { to: '/brands', icon: '🛒', key: 'brands' },
  { to: '/family', icon: '👨‍👩‍👧', key: 'family' },
]

export default function Layout({ children }) {
  const { lang, setLang, user, logout } = useStore()
  const nav = useNavigate()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner]       = useState(false)
  const [installed, setInstalled]         = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setTimeout(() => setShowBanner(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setShowBanner(false)
    }
    setInstallPrompt(null)
  }

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#f7f5f0', position: 'relative',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0px; }
        .nav-link-item { transition: all 0.15s ease; }
        .nav-link-item:hover { transform: translateY(-1px); }
        .scan-btn { transition: all 0.15s ease; }
        .scan-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(26,61,43,0.3); }
        .mode-btn { transition: all 0.15s ease; }
        .mode-btn:hover { background: #e8ede4 !important; border-color: #1a3d2b !important; }
        .card { transition: box-shadow 0.15s ease; }
        .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        @keyframes slideIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bannerIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .install-banner { animation: bannerIn 0.35s ease forwards; }
      `}</style>

      {/* Install banner */}
      {showBanner && !installed && (
        <div className="install-banner" style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 448,
          background: 'linear-gradient(135deg, #0d2818, #1a3d2b)',
          borderRadius: 16, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          border: '1px solid rgba(201,168,76,0.3)',
          zIndex: 200,
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#f5f0e8',
              fontFamily: "'Playfair Display', serif", marginBottom: 1,
            }}>
              Install FoodSafe
            </div>
            <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.55)', fontWeight: 300 }}>
              Works offline · Scan food anywhere
            </div>
          </div>
          <button onClick={handleInstall} style={{
            background: 'linear-gradient(135deg, #c9a84c, #e0c068)',
            border: 'none', borderRadius: 10, padding: '7px 14px',
            fontSize: 12, fontWeight: 600, color: '#0d2818',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>
            Install
          </button>
          <button onClick={() => setShowBanner(false)} style={{
            background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)',
            cursor: 'pointer', fontSize: 18, padding: '0 2px', flexShrink: 0,
          }}>×</button>
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3d2b 0%, #2d6647 100%)',
        padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 12px rgba(26,61,43,0.2)',
      }}>
        <div onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
          <div style={{
            color: '#fff', fontSize: 18, fontWeight: 600,
            fontFamily: "'Playfair Display', serif",
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            FoodSafe
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: '0.08em', marginTop: 1 }}>
            {t(lang, 'tagline')}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

          {/* 🔔 Push notification bell */}
          <PushNotificationBell />

          {/* Lang switcher */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 2, gap: 1,
          }}>
            {['en', 'hi', 'mr'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                fontSize: 9, padding: '3px 7px', borderRadius: 16,
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontFamily: 'inherit', letterSpacing: '0.05em',
                background: lang === l ? '#fff' : 'transparent',
                color: lang === l ? '#1a3d2b' : 'rgba(255,255,255,0.7)',
                transition: 'all 0.15s ease',
              }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Auth button */}
          {user ? (
            <button onClick={() => { logout(); nav('/') }} style={{
              fontSize: 10, padding: '5px 10px', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
              fontWeight: 500, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              👤 {user.name?.split(' ')[0] || 'Logout'}
            </button>
          ) : (
            <button onClick={() => nav('/auth')} style={{
              fontSize: 10, padding: '5px 10px', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
              fontWeight: 500, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              👤 Login
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      {/* Meal Planner FAB */}
      <MealPlanner />

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid #e8ede4',
        display: 'flex', padding: '8px 0 10px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        zIndex: 100,
      }}>
        {NAV.map(({ to, icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className="nav-link-item"
            style={({ isActive }) => ({
              flex: 1, textAlign: 'center', textDecoration: 'none',
              fontSize: 8.5, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#1a3d2b' : '#aab',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              fontFamily: 'inherit', letterSpacing: '0.03em',
            })}>
            <span style={{ fontSize: 19 }}>{icon}</span>
            {t(lang, key)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}