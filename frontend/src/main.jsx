import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './app.jsx'
import SplashLoader from './components/SplashLoader'
import { SpeedInsights } from '@vercel/speed-insights/react'

function Root() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <BrowserRouter>
      {!splashDone && <SplashLoader onDone={() => setSplashDone(true)} />}
      <App />
      <SpeedInsights />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)