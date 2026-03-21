import { useRef, useState } from 'react'
import { t } from '../../i18n/translations'

export function ScanInput({ value, onChange, onScan, lang }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onScan()}
      placeholder={t(lang, 'placeholder')}
      style={{
        flex: 1, padding: '8px 12px', borderRadius: 8,
        border: '1px solid #ddd', fontSize: 13,
        outline: 'none', fontFamily: 'inherit', width: '100%',
      }}
    />
  )
}

export function VoiceButton({ onResult, onError, lang }) {
  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onError('Voice not supported'); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.onresult = e => onResult(e.results[0][0].transcript)
    rec.onerror  = () => onError('Voice recognition failed')
    rec.start()
  }
  return (
    <button onClick={start} style={btnStyle}>🎤 Voice</button>
  )
}

export function ImageUploadButton({ onUpload }) {
  const ref = useRef()
  return (
    <>
      <button onClick={() => ref.current.click()} style={btnStyle}>📷 Photo</button>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
    </>
  )
}

export function BarcodeScanner({ onResult, onError }) {
  const videoRef = useRef()
  const streamRef = useRef()
  const [scanning, setScanning] = useState(false)

  async function lookupBarcode(code) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1) onResult(data.product.product_name || code)
      else onError('Product not found')
    } catch { onError('Barcode lookup failed') }
  }

  async function startScan() {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      if (!('BarcodeDetector' in window)) {
        stopScan()
        const code = window.prompt('Enter barcode number manually:')
        if (code) await lookupBarcode(code)
        return
      }

      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] })
      const interval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            clearInterval(interval)
            stopScan()
            await lookupBarcode(barcodes[0].rawValue)
          }
        } catch {}
      }, 300)
    } catch {
      setScanning(false)
      onError('Camera access denied')
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setScanning(false)
  }

  return (
    <>
      {scanning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12
        }}>
          <video ref={videoRef} style={{ width: '90vw', maxWidth: 400, borderRadius: 12 }} />
          <p style={{ color: '#fff', fontSize: 13 }}>Point camera at barcode...</p>
          <button onClick={stopScan}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                     background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
      <button onClick={startScan} style={btnStyle}>📊 Barcode</button>
    </>
  )
}

const btnStyle = {
  flex: 1, padding: '7px 4px', borderRadius: 8,
  border: '1px solid #ddd', background: '#f8f9f6',
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
}