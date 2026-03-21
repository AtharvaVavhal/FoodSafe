import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // Language: 'en' | 'hi' | 'mr'
      lang: 'en',
      setLang: (lang) => set({ lang }),

      // Active family member
      activeMember: null,
      setActiveMember: (member) => set({ activeMember: member }),

      // Family profiles
      family: [],
      addMember: (member) => set((s) => ({ family: [...s.family, member] })),
      removeMember: (id) => set((s) => ({ family: s.family.filter(m => m.id !== id) })),

      // Scan history
      scanHistory: [],
      addScan: (scan) => set((s) => ({
        scanHistory: [{ ...scan, id: Date.now(), date: new Date().toISOString() }, ...s.scanHistory]
      })),

      // Combination scan foods list
      combinationFoods: [],
      addCombinationFood: (food) => set((s) => ({ combinationFoods: [...s.combinationFoods, food] })),
      clearCombination: () => set({ combinationFoods: [] }),

      // Last scan result (passed to ResultPage)
      lastResult: null,
      setLastResult: (result) => set({ lastResult: result }),
    }),
    {
      name: 'foodsafe-storage',
      partialize: (state) => ({
        lang: state.lang,
        family: state.family,
        scanHistory: state.scanHistory,
      }),
    }
  )
)