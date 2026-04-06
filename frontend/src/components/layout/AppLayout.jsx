import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

/**
 * Root layout for all pages.
 * Constrains content to max-w-lg, adds padding for the fixed BottomNav.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50">
      <main className="max-w-lg mx-auto w-full pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
