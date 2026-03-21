import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Language ─────────────────────────────────────────
      lang: 'en',
      setLang: (lang) => set({ lang }),

      // ── Auth ─────────────────────────────────────────────
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('foodsafe_token', token)
        set({ user, token })
        // Sync existing local scan history to DB on login
        const history = get().scanHistory
        if (history.length > 0) {
          history.slice(0, 20).forEach(scan => {
            fetch(`${API_URL}/users/sync-scan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                food_name:    scan.food_name,
                risk_level:   scan.risk_level,
                safety_score: scan.safety_score,
                scanned_at:   scan.date,
              }),
            }).catch(() => {})
          })
        }
      },
      logout: () => {
        localStorage.removeItem('foodsafe_token')
        set({ user: null, token: null })
      },

      // ── Active family member ──────────────────────────────
      activeMember: null,
      setActiveMember: (member) => set({ activeMember: member }),

      // ── Family profiles ───────────────────────────────────
      family: [],
      addMember:    (member) => set((s) => ({ family: [...s.family, member] })),
      removeMember: (id)     => set((s) => ({ family: s.family.filter(m => m.id !== id) })),

      // ── Scan history ──────────────────────────────────────
      scanHistory: [],
      addScan: (scan) => {
        const newScan = { ...scan, id: Date.now(), date: new Date().toISOString() }

        // Always update local store
        set((s) => ({ scanHistory: [newScan, ...s.scanHistory] }))

        // Sync to DB if logged in
        const { token, user } = get()
        if (token && user) {
          fetch(`${API_URL}/users/sync-scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              food_name:    scan.food_name,
              risk_level:   scan.risk_level,
              safety_score: scan.safety_score,
              scanned_at:   newScan.date,
            }),
          }).catch(() => {}) // Silent fail — localStorage is the fallback
        }
      },

      // Load scan history from DB (called after login)
      loadScansFromDB: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await fetch(`${API_URL}/users/scan-history`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          if (!res.ok) return
          const data = await res.json()
          if (data.scans?.length > 0) {
            // Merge DB scans with local, deduplicate by food+date
            const local = get().scanHistory
            const merged = [...data.scans, ...local]
            const seen = new Set()
            const deduped = merged.filter(s => {
              const key = `${s.food_name}-${s.date?.slice(0,10)}`
              if (seen.has(key)) return false
              seen.add(key)
              return true
            }).slice(0, 100)
            set({ scanHistory: deduped })
          }
        } catch {}
      },

      // ── Combination scan ──────────────────────────────────
      combinationFoods: [],
      addCombinationFood: (food) => set((s) => ({ combinationFoods: [...s.combinationFoods, food] })),
      clearCombination:   ()     => set({ combinationFoods: [] }),

      // ── Last scan result ──────────────────────────────────
      lastResult: null,
      setLastResult: (result) => set({ lastResult: result }),
    }),
    {
      name: 'foodsafe-storage',
      partialize: (state) => ({
        lang:        state.lang,
        family:      state.family,
        scanHistory: state.scanHistory,
        user:        state.user,
        token:       state.token,
      }),
    }
  )
)