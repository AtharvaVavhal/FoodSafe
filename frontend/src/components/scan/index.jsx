// components/scan/ScanInput.jsx
import { useRef } from 'react'
import { t } from '../../i18n/translations'

export function ScanInput({ value, onChange, onScan, loading, lang }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onScan()}
        placeholder={t(lang, 'placeholder')}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 8,
          border: '1px solid #ddd', fontSize: 13,
          outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// components/scan/VoiceButton.jsx
export function VoiceButton({ onResult, onError, lang }) {
  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onError('Voice not supported in this browser'); return }
    const rec = new SR()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.onresult = e => onResult(e.results[0][0].transcript)
    rec.onerror  = () => onError('Voice recognition failed')
    rec.start()
  }
  return (
    <button onClick={start}
      style={{
        flex: 1, padding: '7px 4px', borderRadius: 8,
        border: '1px solid #ddd', background: '#f8f9f6',
        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      }}>
      🎤 Voice
    </button>
  )
}

// components/scan/ImageUploadButton.jsx
export function ImageUploadButton({ onUpload, lang }) {
  const ref = useRef()
  return (
    <>
      <button onClick={() => ref.current.click()}
        style={{
          flex: 1, padding: '7px 4px', borderRadius: 8,
          border: '1px solid #ddd', background: '#f8f9f6',
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}>
        📷 Upload Photo
      </button>
      <input ref={ref} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={onUpload} />
    </>
  )
}

// components/scan/BarcodeScanner.jsx
export function BarcodeScanner({ onResult, onError }) {
  async function scan() {
    const barcode = prompt('Enter barcode number:')
    if (!barcode) return
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()
      if (data.status === 1) {
        onResult(data.product.product_name || barcode)
      } else {
        onError('Product not found in barcode database')
      }
    } catch {
      onError('Barcode lookup failed')
    }
  }
  return (
    <button onClick={scan}
      style={{
        flex: 1, padding: '7px 4px', borderRadius: 8,
        border: '1px solid #ddd', background: '#f8f9f6',
        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      }}>
      📊 Barcode
    </button>
  )
}