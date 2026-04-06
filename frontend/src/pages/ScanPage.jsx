import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Search, Clock } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import CameraView from '../components/scan/CameraView'
import useScanStore from '../store/useScanStore'
import { getMockResult } from '../data/mock'

const SCAN_DELAY_MS = 1200

export default function ScanPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef()
  const navigate = useNavigate()
  const { setCurrentResult, addToHistory, scanHistory } = useScanStore()

  async function runScan(foodName) {
    if (!foodName.trim()) return
    setLoading(true)
    setError('')

    // Simulate API latency
    await new Promise((r) => setTimeout(r, SCAN_DELAY_MS))

    const result = getMockResult(foodName)
    result.foodName = foodName.trim()

    setCurrentResult(result)
    addToHistory({
      id: result.id,
      foodName: result.foodName,
      riskLevel: result.riskLevel,
      safetyScore: result.safetyScore,
      scannedAt: new Date().toISOString(),
      result,
    })

    setLoading(false)
    navigate('/result')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') runScan(query)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5 MB.')
      return
    }

    // Use filename as food name for demo purposes
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    runScan(name || 'Food item')
  }

  function handleCameraCapture() {
    setCameraOpen(false)
    runScan('Captured food item')
  }

  const recentScans = scanHistory.slice(0, 4)

  return (
    <>
      {cameraOpen && (
        <CameraView
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <div className="px-5 pt-8 flex flex-col gap-8">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
            FoodSafe
          </p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            What are you eating?
          </h1>
          <p className="text-[15px] text-stone-500 mt-1">
            Scan or search any food to check for adulteration.
          </p>
        </div>

        {/* Search input */}
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Turmeric powder, Amul milk, loose paneer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            right={<Search size={18} />}
          />

          <Button
            fullWidth
            size="lg"
            disabled={!query.trim() || loading}
            onClick={() => runScan(query)}
          >
            {loading ? 'Analyzing…' : 'Analyze Food Safety'}
          </Button>

          {/* Loading bar — replaces spinner */}
          {loading && (
            <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-stone-900 rounded-full animate-[loading_1.2s_ease-in-out_forwards]
                              w-0" style={{ animation: 'none', width: '100%', transition: 'width 1.2s ease-in-out' }} />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span aria-hidden="true">⚠</span> {error}
            </p>
          )}
        </div>

        {/* Secondary inputs */}
        <div className="flex gap-3">
          <button
            onClick={() => setCameraOpen(true)}
            className="flex-1 h-[52px] flex items-center justify-center gap-2
                       border border-stone-300 bg-white rounded-xl text-sm font-medium text-stone-700
                       hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            <Camera size={16} className="text-stone-500" />
            Take Photo
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-[52px] flex items-center justify-center gap-2
                       border border-stone-300 bg-white rounded-xl text-sm font-medium text-stone-700
                       hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            <Upload size={16} className="text-stone-500" />
            Upload Image
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-stone-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Recent
              </p>
            </div>
            <div className="flex flex-col divide-y divide-stone-100 border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-sm">
              {recentScans.map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => {
                    setCurrentResult(scan.result)
                    navigate('/result')
                  }}
                  className="flex items-center justify-between px-4 py-3.5
                             hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
                >
                  <span className="text-[15px] font-medium text-stone-900 truncate mr-3">
                    {scan.foodName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge risk={scan.riskLevel} size="sm" />
                    <span className="text-xs text-stone-400 tabular-nums">{scan.safetyScore}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
