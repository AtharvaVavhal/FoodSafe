import usePushNotifications from '../hooks/usePushNotifications'
import { useStore } from '../store'

export default function PushNotificationBell() {
  const { permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications()
  const { accessToken: token } = useStore()

  async function toggle() {
    if (subscribed) {
      await unsubscribe()
    } else {
      const ok = await subscribe(token)
      if (ok) alert('🔔 You\'ll now get FSSAI alerts!')
    }
  }

  if (!('Notification' in window)) return null

  return (
    <button onClick={toggle} disabled={loading} title={subscribed ? 'Disable alerts' : 'Enable FSSAI alerts'} style={{
      background: subscribed ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.1)',
      border: `1px solid ${subscribed ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.2)'}`,
      borderRadius: 10,
      padding: '5px 8px',
      cursor: loading ? 'wait' : 'pointer',
      fontSize: 14,
      transition: 'all 0.15s',
    }}>
      {loading ? '⏳' : subscribed ? '🔔' : '🔕'}
    </button>
  )
}