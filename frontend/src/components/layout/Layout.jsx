import { NavLink } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'

const NAV = [
  { to: '/',         icon: '⬡', key: 'scan' },
  { to: '/diary',    icon: '📔', key: 'diary' },
  { to: '/map',      icon: '🗺', key: 'map' },
  { to: '/brands',   icon: '🛒', key: 'brands' },
  { to: '/family',   icon: '👨‍👩‍👧', key: 'family' },
]

export default function Layout({ children }) {
  const { lang, setLang } = useStore()

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh',
                  display: 'flex', flexDirection: 'column', background: '#f8f9f6' }}>

      {/* Top bar */}
      <header style={{ background: '#1a3d2b', padding: '12px 16px',
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 500 }}>
            🌿 {t(lang, 'appName')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 1 }}>
            {t(lang, 'tagline')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['en','hi','mr'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 12,
                border: 'none', cursor: 'pointer', fontWeight: 500,
                background: lang === l ? '#fff' : 'rgba(255,255,255,0.15)',
                color: lang === l ? '#1a3d2b' : 'rgba(255,255,255,0.8)',
              }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{ background: '#fff', borderTop: '0.5px solid #e0e0d8',
                    display: 'flex', padding: '6px 0 8px' }}>
        {NAV.map(({ to, icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              flex: 1, textAlign: 'center', textDecoration: 'none',
              fontSize: 9, color: isActive ? '#1a3d2b' : '#999',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            })}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            {t(lang, key)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
