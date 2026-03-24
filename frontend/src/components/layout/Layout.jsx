import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'
import { useEffect, useState } from 'react'
import PushNotificationBell from '../PushNotificationBell'
import { Search, BookOpen, Newspaper, ShieldCheck, Users, Map, Calendar, Menu, Bell, LogOut, LogIn, ChevronRight } from 'lucide-react'

// Premium Lucide Icons replacement
const NAV = [
  { to: '/',       icon: Search,      key: 'scan' },
  { to: '/diary',  icon: BookOpen,    key: 'diary' },
  { to: '/meal',   icon: Calendar,    key: 'mealPlanner' },
  { to: '/map',    icon: Map,         key: 'riskMap' },
  { to: '/brands', icon: ShieldCheck, key: 'brands' },
  { to: '/family', icon: Users,       key: 'family' },
  { to: '/news',   icon: Newspaper,   key: 'news' },
]

export default function Layout({ children }) {
  const { lang, setLang, user, logout } = useStore()
  const nav = useNavigate()
  const { pathname } = useLocation()
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

  // Desktop App Layout wrapper
  return (
    <div className="flex h-screen w-full bg-deep overflow-hidden font-sans text-white antialiased">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-halo-green opacity-20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-[#0055ff] opacity-[0.08] blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[60%] w-[20%] h-[20%] bg-gold opacity-5 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] h-full border-r border-white/5 bg-white/[0.01] backdrop-blur-3xl z-40 relative">
        {/* Brand Header */}
        <div className="p-6 pb-2 cursor-pointer flex items-center justify-between group" onClick={() => nav('/')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center group-hover:bg-brand/20 group-hover:scale-105 transition-all duration-300">
              <ShieldCheck className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-medium tracking-tight text-white/90">FoodSafe</h1>
              <p className="text-[10px] font-sans text-white/40 uppercase tracking-[0.15em] mt-0.5">{t(lang, 'tagline') || "PROTECT YOUR PLATE"}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
          <div className="px-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Menu</div>
          {NAV.map(({ to, icon: Icon, key }) => {
            const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <NavLink key={to} to={to} className="block relative focus:outline-none">
                <div className={`
                  flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-300
                  ${isActive 
                    ? 'bg-glass-gradient border border-white/10 text-white shadow-[0_0_20px_rgba(0,224,156,0.05)]' 
                    : 'text-white/50 hover:text-white/90 hover:bg-white/[0.03]'}
                `}>
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-brand drop-shadow-[0_0_8px_rgba(0,224,156,0.5)]' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[13px] tracking-wide ${isActive ? 'font-medium' : 'font-normal'}`}>{t(lang, key)}</span>
                </div>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand rounded-r-md shadow-[0_0_10px_rgba(0,224,156,0.8)]" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom Profile/Auth area */}
        <div className="p-4 mt-auto border-t border-white/5">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex bg-surface-200 rounded-full p-1 border border-white/5 shadow-inner">
              {['en', 'hi', 'mr'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`
                  text-[10px] px-2.5 py-1 rounded-full font-medium tracking-wide transition-all duration-300
                  ${lang === l ? 'bg-white text-deep shadow-sm' : 'text-white/50 hover:text-white/80'}
                `}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Desktop Notification Bell (Hidden on mobile inside this block) */}
            <div className="pr-1"><PushNotificationBell /></div>
          </div>
          
          {user ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-100 border border-white/5 hover:bg-surface-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-serif text-sm border border-brand/20">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-white/90 leading-tight">{user.name?.split(' ')[0]}</span>
                  <span className="text-[10px] text-white/40">Verified</span>
                </div>
              </div>
              <button onClick={() => { logout(); nav('/') }} className="w-8 h-8 rounded-full hover:bg-red-500/10 hover:text-red-400 text-white/40 flex items-center justify-center transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => nav('/auth')} className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-100 border border-white/5 hover:bg-surface-200 transition-colors text-white/70 hover:text-white group">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Log In</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col h-full relative z-10 w-full md:w-[calc(100%-260px)] lg:w-[calc(100%-280px)]">
        
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-50 px-5 py-3 flex items-center justify-between bg-deep/60 backdrop-blur-2xl border-b border-white/5">
          <div className="flex flex-col cursor-pointer" onClick={() => nav('/')}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              <span className="font-serif text-lg font-medium text-white/90 tracking-tight">FoodSafe</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <PushNotificationBell />
            {user ? (
              <button onClick={() => { logout(); nav('/') }} className="w-7 h-7 rounded-full bg-brand/20 text-brand flex items-center justify-center font-serif text-xs border border-brand/20">
                {user.name?.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button onClick={() => nav('/auth')} className="w-7 h-7 rounded-full bg-surface-200 border border-white/10 flex items-center justify-center text-white/70">
                <Users className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Mobile Lang Switcher Bar */}
        <div className="md:hidden flex justify-center py-2 bg-gradient-to-b from-background/90 to-transparent z-40">
           <div className="flex bg-surface-200 rounded-full p-1 border border-white/5 shadow-inner scale-[0.85]">
              {['en', 'hi', 'mr'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`
                  text-[10px] px-3 py-1 rounded-full font-medium tracking-wide transition-all duration-300
                  ${lang === l ? 'bg-white text-deep shadow-sm' : 'text-white/50 hover:text-white/80'}
                `}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-[100px] md:pb-0 relative">
          <div className="h-full w-full max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8 lg:px-10">
            {children}
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-deep/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {NAV.map(({ to, icon: Icon, key }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
              return (
                <NavLink key={to} to={to} className="flex flex-col items-center justify-center flex-1 relative group focus:outline-none h-12">
                  <div className={`
                    absolute inset-0 bg-brand/10 rounded-xl blur-md transition-opacity duration-500
                    ${isActive ? 'opacity-100' : 'opacity-0'}
                  `}/>
                  
                  <div className={`relative z-10 p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-brand -translate-y-2.5' : 'text-white/40 group-hover:text-white/60'}`}>
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-brand to-brand-light opacity-20 rounded-full blur-[8px]" />
                    )}
                    <Icon className="w-5 h-5 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  
                  <span className={`
                    absolute bottom-0 text-[9px] font-medium tracking-wide transition-all duration-300
                    ${isActive ? 'text-brand opacity-100 translate-y-2' : 'text-white/40 opacity-0 translate-y-4'}
                  `}>
                    {t(lang, key)}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Install App Banner (global) */}
        {showBanner && !installed && (
          <div className="fixed bottom-[90px] md:bottom-6 right-0 left-0 md:left-auto md:right-6 px-4 md:px-0 z-[100] animate-fade-up">
            <div className="mx-auto w-full max-w-md bg-surface-300/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 flex-shrink-0 bg-brand/20 border border-brand/30 rounded-xl flex items-center justify-center text-xl">
                🚀
              </div>
              <div className="flex-1">
                <h4 className="font-serif font-medium text-white text-[15px]">Install FoodSafe</h4>
                <p className="text-[11px] text-white/50 leading-tight mt-0.5">Add to home screen for fast offline scanning.</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={handleInstall} className="px-3 py-1.5 bg-brand text-deep rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">Install</button>
                <button onClick={() => setShowBanner(false)} className="text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest font-semibold">Dismiss</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}