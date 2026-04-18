import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Language ─────────────────────────────────────────
      lang: 'en',
      setLang: (lang) => set({ lang }),

      // ── Auth ─────────────────────────────────────────────
      user:         null,
      accessToken:  null,  // short-lived (15 min), not persisted
      refreshToken: null,  // long-lived (7 days), persisted

      setAuth: async (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken })

        // Sync any locally-cached scans to DB on login
        const history = get().scanHistory
        if (history.length > 0) {
          await Promise.all(
            history.slice(0, 20).map(scan =>
              fetch(`${API_URL}/users/sync-scan`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  food_name:    scan.food_name,
                  risk_level:   scan.risk_level,
                  safety_score: scan.safety_score,
                  scanned_at:   scan.date,
                }),
              }).catch(() => {})
            )
          )
        }

        get().loadScansFromDB()
      },

      // Called by api.js interceptor after a silent refresh
      setAccessToken: (accessToken, refreshToken) => {
        set(refreshToken ? { accessToken, refreshToken } : { accessToken })
      },

      // Called on page load to recover session from persisted refreshToken
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false
        try {
          const res = await fetch(`${API_URL}/users/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
          if (!res.ok) { get().logout(); return false }
          const data = await res.json()
          set({ accessToken: data.access_token, refreshToken: data.refresh_token })
          return true
        } catch {
          get().logout()
          return false
        }
      },

      logout: () => {
        const { refreshToken } = get()
        set({ user: null, accessToken: null, refreshToken: null })
        if (refreshToken) {
          fetch(`${API_URL}/users/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {})
        }
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

        const { accessToken, user } = get()
        if (accessToken && user) {
          fetch(`${API_URL}/users/sync-scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              food_name:    scan.food_name,
              risk_level:   scan.risk_level,
              safety_score: scan.safety_score,
              scanned_at:   newScan.date,
            }),
          }).then(res => {
            if (res.status === 401) get().logout()
          }).catch(() => {})
        }
      },

      // Load scan history from DB (called after login)
      loadScansFromDB: async () => {
        const { accessToken } = get()
        if (!accessToken) return
        try {
          const res = await fetch(`${API_URL}/users/scan-history`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          })
          if (res.status === 401) { get().logout(); return }
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
        lang:         state.lang,
        family:       state.family,
        scanHistory:  state.scanHistory,
        user:         state.user,
        refreshToken: state.refreshToken,
        // accessToken is intentionally excluded — re-acquired via refresh on page load
      }),
    }
  )
)