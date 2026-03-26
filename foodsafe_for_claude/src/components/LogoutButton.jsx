import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function LogoutButton() {
  const navigate = useNavigate()
  const logout = useStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <button 
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
    >
      Log Out
    </button>
  )
}