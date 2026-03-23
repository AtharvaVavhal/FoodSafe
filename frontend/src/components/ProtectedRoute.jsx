import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function ProtectedRoute({ children }) {
  const { user } = useStore()
  const nav = useNavigate()

  useEffect(() => {
    if (!user) nav('/auth')
  }, [user])

  if (!user) return null
  return children
}
