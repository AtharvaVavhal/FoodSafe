import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INITIAL_HISTORY } from '../data/mock'

const useScanStore = create(
  persist(
    (set) => ({
      currentResult: null,
      scanHistory: INITIAL_HISTORY,

      setCurrentResult: (result) => set({ currentResult: result }),

      addToHistory: (entry) =>
        set((state) => ({
          scanHistory: [entry, ...state.scanHistory].slice(0, 100),
        })),

      clearHistory: () => set({ scanHistory: [] }),
    }),
    {
      name: 'foodsafe-store',
      partialize: (state) => ({ scanHistory: state.scanHistory }),
    }
  )
)

export default useScanStore
