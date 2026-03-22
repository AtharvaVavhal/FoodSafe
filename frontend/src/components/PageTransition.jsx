import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_ANIMATIONS = {
  '/':         { from: 'translateY(10px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/result':   { from: 'translateY(16px)', easing: 'cubic-bezier(0.16,1,0.3,1)'  },
  '/diary':    { from: 'translateX(12px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/map':      { from: 'translateY(8px)',  easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/brands':   { from: 'translateX(12px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/family':   { from: 'translateX(12px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/symptoms': { from: 'translateY(10px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/festival': { from: 'translateY(10px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/meal':     { from: 'translateX(12px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/admin':    { from: 'translateY(8px)',  easing: 'cubic-bezier(0.22,1,0.36,1)' },
  '/auth':     { from: 'translateY(12px)', easing: 'cubic-bezier(0.22,1,0.36,1)' },
}

export default function PageTransition({ children, duration = 320 }) {
  const location = useLocation()
  // Start visible — no animation on first mount
  const [style, setStyle] = useState({ opacity: 1 })
  const prevPath = useRef(null)
  const isFirst = useRef(true)

  useEffect(() => {
    // First mount — show content immediately, no animation
    if (isFirst.current) {
      isFirst.current = false
      prevPath.current = location.pathname
      setStyle({ opacity: 1 })
      return
    }

    // Same route (e.g. query param change) — skip
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname

    const anim = ROUTE_ANIMATIONS[location.pathname] || ROUTE_ANIMATIONS['/']

    // Snap to "from" state
    setStyle({ opacity: 0, transform: anim.from, transition: 'none' })

    // setTimeout is StrictMode-safe unlike nested RAFs
    const id = setTimeout(() => {
      setStyle({
        opacity: 1,
        transform: 'translateY(0) translateX(0)',
        transition: `opacity ${duration}ms ${anim.easing}, transform ${duration}ms ${anim.easing}`,
      })
    }, 20)

    return () => clearTimeout(id)
  }, [location.pathname])

  return (
    <div style={{ ...style, willChange: 'opacity, transform' }}>
      {children}
    </div>
  )
}