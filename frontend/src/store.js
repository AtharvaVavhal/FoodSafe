import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Language ────────────────────────────────────────
      lang: 'en',
      setLang: (lang) => set({ lang }),

      // ── Auth ────────────────────────────────────────────
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('foodsafe_token', token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('foodsafe_token')
        set({ user: null, token: null })
      },

      // ── Active family member ─────────────────────────────
      activeMember: null,
      setActiveMember: (member) => set({ activeMember: member }),

      // ── Family profiles ──────────────────────────────────
      family: [],
      addMember:    (member) => set((s) => ({ family: [...s.family, member] })),
      removeMember: (id)     => set((s) => ({ family: s.family.filter(m => m.id !== id) })),

      // ── Scan history ─────────────────────────────────────
      scanHistory: [],
      addScan: (scan) => set((s) => ({
        scanHistory: [{ ...scan, id: Date.now(), date: new Date().toISOString() }, ...s.scanHistory]
      })),

      // ── Combination scan ─────────────────────────────────
      combinationFoods: [],
      addCombinationFood: (food) => set((s) => ({ combinationFoods: [...s.combinationFoods, food] })),
      clearCombination:   ()     => set({ combinationFoods: [] }),

      // ── Last scan result ─────────────────────────────────
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