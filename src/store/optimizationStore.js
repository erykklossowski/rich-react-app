import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useOptimizationStore = create(
  devtools(
    (set, get) => ({
      // Manual input state
      priceData: '',
      pMax: 10,
      socMin: 10, // 1x Max Power
      socMax: 40, // 4x Max Power
      efficiency: 0.85,
      categorizationMethod: 'zscore', // Default to best performing method
      categorizationOptions: { lowThreshold: -0.5, highThreshold: 0.5 },

      // Backtest state
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      analysisType: 'monthly',
      backtestParams: { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 }, // 1x to 4x Max Power

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
      setPMax: (value) => set((state) => {
        // Update SoC values to maintain consistency with new pMax
        const currentMaxFactor = state.socMax / state.pMax
        const currentDoD = state.socMax - state.socMin
        
        const newSocMax = value * currentMaxFactor
        const newSocMin = Math.max(0, newSocMax - currentDoD)
        
        return { 
          pMax: value,
          socMax: newSocMax,
          socMin: newSocMin
        }
      }),
      setSocMin: (value) => set({ socMin: value }),
      setSocMax: (value) => set({ socMax: value }),
      setEfficiency: (value) => set({ efficiency: value }),
      setCategorizationMethod: (method) => set({ categorizationMethod: method }),
      setCategorizationOptions: (options) => set({ categorizationOptions: options }),

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

      updateBacktestParams: (updates) => set((state) => {
        const newParams = { ...state.backtestParams, ...updates }
        
        // If pMax is being updated, adjust SoC values accordingly
        if (updates.pMax !== undefined) {
          const currentMaxFactor = state.backtestParams.socMax / state.backtestParams.pMax
          const currentDoD = state.backtestParams.socMax - state.backtestParams.socMin
          
          newParams.socMax = updates.pMax * currentMaxFactor
          newParams.socMin = Math.max(0, newParams.socMax - currentDoD)
        }
        
        return {
          backtestParams: newParams
        }
      }),

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