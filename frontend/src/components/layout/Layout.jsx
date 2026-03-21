import { NavLink } from 'react-router-dom'
import { useStore } from '../../store'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n/translations'

const NAV = [
  { to: '/',      icon: '🔍', key: 'scan' },
  { to: '/diary', icon: '📔', key: 'diary' },
  { to: '/map',   icon: '🗺', key: 'map' },
  { to: '/brands',icon: '🛒', key: 'brands' },
  { to: '/family',icon: '👨‍👩‍👧', key: 'family' },
]

export default function Layout({ children }) {
  const { lang, setLang, user, logout } = useStore()
  const nav = useNavigate()

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#f0f2ee', position: 'relative',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0px; }
        .nav-link-item { transition: all 0.15s ease; }
        .nav-link-item:hover { transform: translateY(-1px); }
        .scan-btn { transition: all 0.15s ease; }
        .scan-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(26,61,43,0.3); }
        .mode-btn { transition: all 0.15s ease; }
        .mode-btn:hover { background: #e8ede4 !important; border-color: #1a3d2b !important; }
        .alert-ticker { animation: slideIn 0.5s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .card { transition: box-shadow 0.15s ease; }
        .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3d2b 0%, #2d6647 100%)',
        padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 12px rgba(26,61,43,0.2)',
      }}>
        {/* Logo */}
        <div onClick={() => nav('/')} style={{ cursor: 'pointer' }}>
          <div style={{
            color: '#fff', fontSize: 18, fontWeight: 600,
            fontFamily: "'DM Serif Display', serif",
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
          {/* Lang switcher */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 2, gap: 1,
          }}>
            {['en','hi','mr'].map(l => (
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
      <main style={{ flex: 1, padding: '14px 12px 80px', overflowY: 'auto' }}>
        {children}
      </main>

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