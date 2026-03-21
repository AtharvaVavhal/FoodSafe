import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

// ── Scan ────────────────────────────────────────────────
export const scanFood = (payload) =>
  api.post('/scan/text', payload).then(r => r.data)

export const scanImage = (formData) =>
  api.post('/scan/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)

export const scanBarcode = (barcode) =>
  api.get(`/scan/barcode/${barcode}`).then(r => r.data)

export const scanCombination = (payload) =>
  api.post('/scan/combination', payload).then(r => r.data)

// ── Symptoms ─────────────────────────────────────────────
export const analyzeSymptoms = (payload) =>
  api.post('/symptoms/analyze', payload).then(r => r.data)

// ── Community ────────────────────────────────────────────
export const getCityReports = (city) =>
  api.get(`/community/reports?city=${city}`).then(r => r.data)

export const submitReport = (payload) =>
  api.post('/community/report', payload).then(r => r.data)

// ── Brands ───────────────────────────────────────────────
export const getSafeBrands = (foodName) =>
  api.get(`/brands/safe?food=${encodeURIComponent(foodName)}`).then(r => r.data)

// ── FSSAI ────────────────────────────────────────────────
export const getFssaiAlerts = () =>
  api.get('/fssai/alerts').then(r => r.data)

// ── User / Diary ─────────────────────────────────────────
export const getUserStats = (userId) =>
  api.get(`/users/${userId}/stats`).then(r => r.data)

// ── Open Food Facts (direct, no backend needed) ──────────
export const lookupBarcode = async (barcode) => {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  )
  const data = await res.json()
  if (data.status === 1) return data.product
  return null
}

export default api