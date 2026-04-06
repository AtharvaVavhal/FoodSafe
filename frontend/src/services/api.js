import axios from 'axios'

const api = axios.create({
  // Points directly to your FastAPI backend
  baseURL: import.meta.env.VITE_API_URL || 'https://foodsafe-api.onrender.com/api',
  timeout: 30000,
})

// ── Auth token injection ──────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('foodsafe_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────
export const register = (payload) =>
  api.post('/users/register', payload).then(r => r.data)

export const login = (payload) =>
  api.post('/users/login', payload).then(r => r.data)

export const getMe = () =>
  api.get('/users/me').then(r => r.data)

// ── Scan ──────────────────────────────────────────────────
export const scanFoodAPI = (payload) =>
  api.post('/scan/text', payload).then(r => r.data)

export const scanImageAPI = (formData) =>
  api.post('/scan/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)

export const scanBarcodeAPI = (barcode) =>
  api.get(`/scan/barcode/${barcode}`).then(r => r.data)

export const scanCombinationAPI = (payload) =>
  api.post('/scan/combination', payload).then(r => r.data)

// ── Symptoms ──────────────────────────────────────────────
export const analyzeSymptomsAPI = (payload) =>
  api.post('/symptoms/analyze', payload).then(r => r.data)

// ── Community ─────────────────────────────────────────────
export const getCityReports = (city) =>
  api.get(`/community/reports?city=${city}`).then(r => r.data)

export const submitReport = (payload) =>
  api.post('/community/report', payload).then(r => r.data)

// ── Brands ────────────────────────────────────────────────
export const getSafeBrands = (foodName) =>
  api.get(`/brands/safe?food=${encodeURIComponent(foodName)}`).then(r => r.data)

// ── FSSAI ─────────────────────────────────────────────────
export const getFssaiAlerts = () =>
  api.get('/fssai/alerts').then(r => r.data)

// ── User stats ────────────────────────────────────────────
export const getUserStats = (userId) =>
  api.get(`/users/${userId}/stats`).then(r => r.data)

// ── Open Food Facts (direct) ──────────────────────────────
export const lookupBarcode = async (barcode) => {
  const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
  const data = await res.json()
  return data.status === 1 ? data.product : null
}

export default api