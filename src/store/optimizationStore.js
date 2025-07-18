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
      startDate: '2024-06-14',
      endDate: '2025-07-18',
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
      },

      // Debug function to generate diagnostic information
      generateDebugInfo: async () => {
        const state = get()
        
        try {
          // Load and analyze data
          const { loadCSDACPLNData, loadPolishData, loadSystemContractingData } = await import('../utils/dataLoaders.js')
          const { loadSystemContractingData: loadAFRRSystemData } = await import('../utils/afrrDataLoaders.js')
          
          console.log('=== DEBUG: Data Analysis ===')
          
          // 1. Raw CSDAC data
          console.log('\n1. Raw CSDAC PLN Data:')
          const rawCsdac = await loadCSDACPLNData()
          console.log(`- Total records: ${rawCsdac.length}`)
          console.log(`- Date range: ${rawCsdac[0]?.dtime} to ${rawCsdac[rawCsdac.length-1]?.dtime}`)
          console.log(`- Sample records:`, rawCsdac.slice(0, 3))
          
          // 2. Aggregated Polish data
          console.log('\n2. Aggregated Polish Data:')
          const polishData = await loadPolishData()
          console.log(`- Total records: ${polishData.length}`)
          console.log(`- Date range: ${polishData[0]?.datetime} to ${polishData[polishData.length-1]?.datetime}`)
          console.log(`- Price range: ${Math.min(...polishData.map(r => r.price))} to ${Math.max(...polishData.map(r => r.price))}`)
          console.log(`- Sample records:`, polishData.slice(0, 3))
          
          // 3. System contracting data
          console.log('\n3. System Contracting Data:')
          const contractingData = await loadAFRRSystemData({ lookbackDays: 7 })
          console.log(`- Total records: ${contractingData.data.length}`)
          console.log(`- Date range: ${contractingData.data[0]?.dtime} to ${contractingData.data[contractingData.data.length-1]?.dtime}`)
          console.log(`- Contracting range: ${Math.min(...contractingData.data.map(r => r.sk_d1_fcst))} to ${Math.max(...contractingData.data.map(r => r.sk_d1_fcst))}`)
          console.log(`- Sample records:`, contractingData.data.slice(0, 3))
          
          // 4. Current store state
          console.log('\n4. Current Store State:')
          console.log(`- Start date: ${state.startDate}`)
          console.log(`- End date: ${state.endDate}`)
          console.log(`- Analysis type: ${state.analysisType}`)
          console.log(`- Polish data loaded: ${state.polishData ? state.polishData.length : 0} records`)
          
          // 5. Date validation
          console.log('\n5. Date Validation:')
          const startDate = new Date(state.startDate)
          const endDate = new Date(state.endDate)
          console.log(`- Start date valid: ${!isNaN(startDate.getTime())}`)
          console.log(`- End date valid: ${!isNaN(endDate.getTime())}`)
          console.log(`- Date range valid: ${startDate < endDate}`)
          
          // Generate debug report
          const debugReport = {
            timestamp: new Date().toISOString(),
            rawCsdacRecords: rawCsdac.length,
            rawCsdacDateRange: {
              start: rawCsdac[0]?.dtime,
              end: rawCsdac[rawCsdac.length-1]?.dtime
            },
            aggregatedPolishRecords: polishData.length,
            aggregatedPolishDateRange: {
              start: polishData[0]?.datetime,
              end: polishData[polishData.length-1]?.datetime
            },
            contractingRecords: contractingData.data.length,
            contractingDateRange: {
              start: contractingData.data[0]?.dtime,
              end: contractingData.data[contractingData.data.length-1]?.dtime
            },
            storeState: {
              startDate: state.startDate,
              endDate: state.endDate,
              analysisType: state.analysisType,
              polishDataLoaded: state.polishData ? state.polishData.length : 0
            },
            dateValidation: {
              startDateValid: !isNaN(startDate.getTime()),
              endDateValid: !isNaN(endDate.getTime()),
              rangeValid: startDate < endDate
            },
            sampleData: {
              rawCsdac: rawCsdac.slice(0, 3),
              aggregatedPolish: polishData.slice(0, 3),
              contracting: contractingData.data.slice(0, 3)
            }
          }
          
          console.log('\n=== DEBUG REPORT ===')
          console.log(JSON.stringify(debugReport, null, 2))
          
          // Set status message with debug info
          set({ 
            statusMessage: { 
              type: 'info', 
              text: `Debug info generated. Check console for details. Records: CSDAC=${rawCsdac.length}, Polish=${polishData.length}, Contracting=${contractingData.data.length}` 
            } 
          })
          
          return debugReport
          
        } catch (error) {
          console.error('Debug function error:', error)
          set({ 
            statusMessage: { 
              type: 'error', 
              text: `Debug failed: ${error.message}` 
            } 
          })
          throw error
        }
      }
    }),
    {
      name: 'optimization-store',
    }
  )
) 