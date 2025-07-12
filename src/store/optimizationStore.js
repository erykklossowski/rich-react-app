import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useOptimizationStore = create(
  devtools(
    (set, get) => ({
      // Manual input state
      priceData: '',
      pMax: 10,
      socMin: 8,
      socMax: 40,
      efficiency: 0.85,

      // Backtest state
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      analysisType: 'monthly',
      backtestParams: { pMax: 10, socMin: 8, socMax: 40, efficiency: 0.85 },

      // Results state
      optimizationResult: null,
      backtestResults: null,
      detailedPeriod: null,

      // UI state
      activeTab: 'manual',
      loading: false,
      progress: 0,
      progressText: '',
      statusMessage: { type: '', text: '' },

      // AI insights state
      llmInsight: '',
      llmLoading: false,

      // Data state
      polishData: null,

      // Actions
      setPriceData: (data) => set({ priceData: data }),
      setPMax: (value) => set({ pMax: value }),
      setSocMin: (value) => set({ socMin: value }),
      setSocMax: (value) => set({ socMax: value }),
      setEfficiency: (value) => set({ efficiency: value }),

      setStartDate: (date) => set({ startDate: date }),
      setEndDate: (date) => set({ endDate: date }),
      setAnalysisType: (type) => set({ analysisType: type }),
      setBacktestParams: (params) => set({ backtestParams: params }),

      setOptimizationResult: (result) => set({ optimizationResult: result }),
      setBacktestResults: (results) => set({ backtestResults: results }),
      setDetailedPeriod: (period) => set({ detailedPeriod: period }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setLoading: (loading) => set({ loading }),
      setProgress: (progress) => set({ progress }),
      setProgressText: (text) => set({ progressText: text }),
      setStatusMessage: (message) => set({ statusMessage: message }),

      setLlmInsight: (insight) => set({ llmInsight: insight }),
      setLlmLoading: (loading) => set({ llmLoading: loading }),

      setPolishData: (data) => set({ polishData: data }),

      // Complex actions
      resetResults: () => set({
        optimizationResult: null,
        backtestResults: null,
        detailedPeriod: null,
        llmInsight: '',
        statusMessage: { type: '', text: '' }
      }),

      updateBacktestParams: (updates) => set((state) => ({
        backtestParams: { ...state.backtestParams, ...updates }
      })),

      // Computed values
      getParams: () => {
        const state = get()
        return {
          pMax: state.pMax,
          socMin: state.socMin,
          socMax: state.socMax,
          efficiency: state.efficiency
        }
      },

      getBacktestParams: () => {
        const state = get()
        return state.backtestParams
      }
    }),
    {
      name: 'optimization-store',
    }
  )
) 