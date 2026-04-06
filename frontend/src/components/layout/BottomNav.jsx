import { NavLink } from 'react-router-dom'
import { Search, Clock, Bell, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/scan',    icon: Search, label: 'Scan'    },
  { to: '/history', icon: Clock,  label: 'History' },
  { to: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { to: '/profile', icon: User,   label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 z-50">
      <div className="max-w-lg mx-auto flex h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => [
              'relative flex flex-col items-center justify-center gap-1 flex-1',
              'transition-colors duration-100',
              isActive ? 'text-stone-900' : 'text-stone-400',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-900 rounded-b-sm" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
