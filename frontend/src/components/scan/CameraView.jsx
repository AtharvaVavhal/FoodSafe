import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Full-screen camera capture overlay.
 * On capture, calls onCapture(blob). On close, calls onClose().
 * Shows an inline error if camera permission is denied.
 */
export default function CameraView({ onCapture, onClose }) {
  const videoRef = useRef()
  const streamRef = useRef()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setReady(true)
        }
      })
      .catch(() => {
        setError('Camera access denied. Please allow access in your browser settings.')
      })

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    streamRef.current?.getTracks().forEach((t) => t.stop())
    canvas.toBlob((blob) => onCapture(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5 pb-4 z-10
                      bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white
                     hover:bg-white/20 transition-colors"
          aria-label="Close camera"
        >
          <X size={18} />
        </button>
        <p className="text-white/80 text-sm font-medium">Point at food or label</p>
        <div className="w-9" aria-hidden="true" />
      </div>

      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 w-full object-cover"
      />

      {/* Viewfinder corners — pure CSS, no animation */}
      {!error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-48">
            <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white rounded-tl" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white rounded-tr" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white rounded-bl" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white rounded-br" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-5 shadow-xl">
          <p className="text-stone-900 font-medium text-sm mb-1">Camera unavailable</p>
          <p className="text-stone-500 text-sm">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 text-sm font-medium text-stone-900 underline underline-offset-2"
          >
            Go back
          </button>
        </div>
      )}

      {/* Capture button */}
      {!error && (
        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-12 pt-6
                        bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white/60 text-xs mb-5">Tap to capture</p>
          <button
            onClick={capture}
            disabled={!ready}
            aria-label="Capture photo"
            className="w-[68px] h-[68px] rounded-full border-4 border-white/40 bg-white
                       shadow-lg active:scale-95 transition-transform
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  )
}
