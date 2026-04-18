import axios from 'axios'
import { useStore } from '../store'

const BASE = import.meta.env.VITE_API_URL || 'https://foodsafe-api.onrender.com/api'

const api = axios.create({ baseURL: BASE, timeout: 30000 })

// ── Token injection ───────────────────────────────────────
api.interceptors.request.use(config => {
  const token = useStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Silent refresh on 401 ────────────────────────────────
let isRefreshing = false
let waitQueue    = []  // [{resolve, reject}]

const drainQueue = (token, error) =>
  waitQueue.splice(0).forEach(p => (token ? p.resolve(token) : p.reject(error)))

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    // Queue concurrent requests while refresh is in flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({
          resolve: token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true
    const { refreshToken, setAccessToken, logout } = useStore.getState()

    if (!refreshToken) {
      isRefreshing = false
      logout()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${BASE}/users/refresh`, {
        refresh_token: refreshToken,
      })
      setAccessToken(data.access_token, data.refresh_token)
      drainQueue(data.access_token, null)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch (refreshError) {
      drainQueue(null, refreshError)
      logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

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
    headers: { 'Content-Type': 'multipart/form-data' },
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
