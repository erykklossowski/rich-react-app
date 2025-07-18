import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getDataConfig, getDateRange, getPresetScenarios } from '../utils/dataConfig.js'

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

      // Backtest state - Will be initialized with dynamic data range
      startDate: null,
      endDate: null,
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

      // Initialize store with dynamic configuration
      initializeWithDataConfig: async () => {
        try {
          const config = await getDataConfig();
          const dateRange = await getDateRange();
          
          set({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          });
          
          console.log('Store initialized with dynamic configuration:', { dateRange, config });
        } catch (error) {
          console.error('Failed to initialize store with dynamic configuration:', error);
          // Fallback to default values
          set({
            startDate: '2024-06-14',
            endDate: '2025-07-18'
          });
        }
      },

      // Get dynamic preset scenarios
      getDynamicPresets: async () => {
        try {
          return await getPresetScenarios();
        } catch (error) {
          console.error('Failed to get dynamic presets:', error);
          // Fallback to default presets
          return [
            { name: 'Last 7 Days', start: '2025-07-11', end: '2025-07-18', type: 'continuous' },
            { name: 'Last 30 Days', start: '2025-06-18', end: '2025-07-18', type: 'continuous' },
            { name: 'Current Month', start: '2025-07-01', end: '2025-07-18', type: 'continuous' }
          ];
        }
      },

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

      // Comprehensive debug function to generate thorough diagnostic information
      generateDebugInfo: async () => {
        const state = get()
        
        try {
          console.log('=== COMPREHENSIVE DATA DIAGNOSTIC REPORT ===')
          console.log(`Generated at: ${new Date().toISOString()}`)
          
          // Import all necessary modules
          const { loadCSDACPLNData, loadPolishData, loadAllPSEData, filterDataByDateRange } = await import('../utils/dataLoaders.js')
          const { loadSystemContractingData: loadAFRRSystemData, loadAFRRDataForAnalysis } = await import('../utils/afrrDataLoaders.js')
          const { getDataConfig } = await import('../utils/dataConfig.js')
          
          const debugReport = {
            timestamp: new Date().toISOString(),
            summary: {},
            dataSources: {},
            dataValidation: {},
            parsingIssues: [],
            integrationTests: {},
            recommendations: []
          }
          
          // 1. DYNAMIC CONFIGURATION ANALYSIS
          console.log('\n1. DYNAMIC CONFIGURATION ANALYSIS')
          console.log('='.repeat(50))
          
          try {
            const config = await getDataConfig()
            debugReport.dynamicConfig = config
            console.log('✅ Dynamic configuration loaded successfully')
            console.log(`- Data start date: ${config.dataStartDate}`)
            console.log(`- Data end date: ${config.dataEndDate}`)
            console.log(`- Total records: ${config.totalRecords.toLocaleString()}`)
            console.log(`- Price range: ${config.priceRange.min.toFixed(2)} to ${config.priceRange.max.toFixed(2)} ${config.currency}/MWh`)
            console.log(`- Average price: ${config.priceRange.avg.toFixed(2)} ${config.currency}/MWh`)
          } catch (error) {
            console.log('❌ Dynamic configuration failed:', error.message)
            debugReport.parsingIssues.push(`Dynamic configuration error: ${error.message}`)
          }
          
          // 2. RAW DATA SOURCE ANALYSIS
          console.log('\n2. RAW DATA SOURCE ANALYSIS')
          console.log('='.repeat(50))
          
          // 2.1 CSDAC PLN Data (Day-ahead prices)
          console.log('\n2.1 CSDAC PLN Data (Day-ahead prices)')
          try {
            const rawCsdac = await loadCSDACPLNData()
            debugReport.dataSources.csdac = {
              totalRecords: rawCsdac.length,
              dateRange: {
                start: rawCsdac[0]?.dtime,
                end: rawCsdac[rawCsdac.length-1]?.dtime
              },
              priceStats: {
                min: Math.min(...rawCsdac.map(r => r.csdac_pln).filter(p => !isNaN(p))),
                max: Math.max(...rawCsdac.map(r => r.csdac_pln).filter(p => !isNaN(p))),
                avg: rawCsdac.map(r => r.csdac_pln).filter(p => !isNaN(p)).reduce((sum, p) => sum + p, 0) / rawCsdac.length
              },
              sampleRecords: rawCsdac.slice(0, 3)
            }
            
            console.log(`✅ CSDAC PLN: ${rawCsdac.length.toLocaleString()} records`)
            console.log(`- Date range: ${rawCsdac[0]?.dtime} to ${rawCsdac[rawCsdac.length-1]?.dtime}`)
            console.log(`- Price range: ${debugReport.dataSources.csdac.priceStats.min.toFixed(2)} to ${debugReport.dataSources.csdac.priceStats.max.toFixed(2)} PLN/MWh`)
            console.log(`- Average price: ${debugReport.dataSources.csdac.priceStats.avg.toFixed(2)} PLN/MWh`)
            
            // Check for data quality issues
            const invalidPrices = rawCsdac.filter(r => r.csdac_pln === null || isNaN(r.csdac_pln))
            if (invalidPrices.length > 0) {
              console.log(`⚠️  Found ${invalidPrices.length} records with invalid prices`)
              debugReport.parsingIssues.push(`CSDAC: ${invalidPrices.length} invalid price records`)
            }
            
            const invalidDates = rawCsdac.filter(r => !r.dtime || isNaN(new Date(r.dtime).getTime()))
            if (invalidDates.length > 0) {
              console.log(`⚠️  Found ${invalidDates.length} records with invalid dates`)
              debugReport.parsingIssues.push(`CSDAC: ${invalidDates.length} invalid date records`)
            }
            
          } catch (error) {
            console.log(`❌ CSDAC PLN loading failed: ${error.message}`)
            debugReport.parsingIssues.push(`CSDAC loading error: ${error.message}`)
          }
          
          // 2.2 All PSE Data Sources
          console.log('\n2.2 All PSE Data Sources')
          try {
            const allPseData = await loadAllPSEData()
            debugReport.dataSources.allPSE = {
              csdacRecords: allPseData.csdac_data?.length || 0,
              mbpRecords: allPseData.mbp_data?.length || 0,
              cmbpRecords: allPseData.cmbp_data?.length || 0,
              skRecords: allPseData.sk_data?.length || 0
            }
            
            console.log(`✅ All PSE data loaded successfully`)
            console.log(`- CSDAC (prices): ${debugReport.dataSources.allPSE.csdacRecords.toLocaleString()} records`)
            console.log(`- MBP (volumes): ${debugReport.dataSources.allPSE.mbpRecords.toLocaleString()} records`)
            console.log(`- CMBP (prices): ${debugReport.dataSources.allPSE.cmbpRecords.toLocaleString()} records`)
            console.log(`- SK (contracting): ${debugReport.dataSources.allPSE.skRecords.toLocaleString()} records`)
            
          } catch (error) {
            console.log(`❌ All PSE data loading failed: ${error.message}`)
            debugReport.parsingIssues.push(`All PSE data loading error: ${error.message}`)
          }
          
          // 3. DATA AGGREGATION AND PROCESSING ANALYSIS
          console.log('\n3. DATA AGGREGATION AND PROCESSING ANALYSIS')
          console.log('='.repeat(50))
          
          // 3.1 Aggregated Polish Data
          console.log('\n3.1 Aggregated Polish Data (15-min to hourly)')
          try {
            const polishData = await loadPolishData()
            debugReport.dataSources.aggregatedPolish = {
              totalRecords: polishData.length,
              dateRange: {
                start: polishData[0]?.datetime,
                end: polishData[polishData.length-1]?.datetime
              },
              priceStats: {
                min: Math.min(...polishData.map(r => r.price).filter(p => !isNaN(p))),
                max: Math.max(...polishData.map(r => r.price).filter(p => !isNaN(p))),
                avg: polishData.map(r => r.price).filter(p => !isNaN(p)).reduce((sum, p) => sum + p, 0) / polishData.length
              },
              sampleRecords: polishData.slice(0, 3)
            }
            
            console.log(`✅ Aggregated Polish: ${polishData.length.toLocaleString()} records`)
            console.log(`- Date range: ${polishData[0]?.datetime} to ${polishData[polishData.length-1]?.datetime}`)
            console.log(`- Price range: ${debugReport.dataSources.aggregatedPolish.priceStats.min.toFixed(2)} to ${debugReport.dataSources.aggregatedPolish.priceStats.max.toFixed(2)} PLN/MWh`)
            console.log(`- Average price: ${debugReport.dataSources.aggregatedPolish.priceStats.avg.toFixed(2)} PLN/MWh`)
            
            // Check aggregation quality
            const expectedRecords = Math.ceil(rawCsdac.length / 4) // 15-min to hourly
            const aggregationRatio = polishData.length / expectedRecords
            console.log(`- Aggregation ratio: ${aggregationRatio.toFixed(2)} (expected ~0.25)`)
            
            if (aggregationRatio < 0.2 || aggregationRatio > 0.3) {
              console.log(`⚠️  Unusual aggregation ratio - possible data loss or duplication`)
              debugReport.parsingIssues.push(`Unusual aggregation ratio: ${aggregationRatio.toFixed(2)}`)
            }
            
          } catch (error) {
            console.log(`❌ Aggregated Polish data loading failed: ${error.message}`)
            debugReport.parsingIssues.push(`Aggregated Polish loading error: ${error.message}`)
          }
          
          // 4. aFRR DATA ANALYSIS
          console.log('\n4. aFRR DATA ANALYSIS')
          console.log('='.repeat(50))
          
          // 4.1 System Contracting Data
          console.log('\n4.1 System Contracting Data (SK)')
          try {
            const contractingData = await loadAFRRSystemData({ lookbackDays: 7 })
            debugReport.dataSources.contracting = {
              totalRecords: contractingData.data.length,
              dateRange: {
                start: contractingData.data[0]?.dtime,
                end: contractingData.data[contractingData.data.length-1]?.dtime
              },
              contractingStats: {
                min: Math.min(...contractingData.data.map(r => r.sk_d1_fcst).filter(v => !isNaN(v))),
                max: Math.max(...contractingData.data.map(r => r.sk_d1_fcst).filter(v => !isNaN(v))),
                avg: contractingData.data.map(r => r.sk_d1_fcst).filter(v => !isNaN(v)).reduce((sum, v) => sum + v, 0) / contractingData.data.length
              },
              sampleRecords: contractingData.data.slice(0, 3)
            }
            
            console.log(`✅ System Contracting: ${contractingData.data.length.toLocaleString()} records`)
            console.log(`- Date range: ${contractingData.data[0]?.dtime} to ${contractingData.data[contractingData.data.length-1]?.dtime}`)
            console.log(`- Contracting range: ${debugReport.dataSources.contracting.contractingStats.min.toFixed(2)} to ${debugReport.dataSources.contracting.contractingStats.max.toFixed(2)} MW`)
            console.log(`- Average contracting: ${debugReport.dataSources.contracting.contractingStats.avg.toFixed(2)} MW`)
            
            // Check for sufficient data
            if (contractingData.data.length < 100) {
              console.log(`⚠️  Insufficient contracting data: ${contractingData.data.length} records (minimum: 100)`)
              debugReport.parsingIssues.push(`Insufficient contracting data: ${contractingData.data.length} records`)
            }
            
          } catch (error) {
            console.log(`❌ System contracting data loading failed: ${error.message}`)
            debugReport.parsingIssues.push(`System contracting loading error: ${error.message}`)
          }
          
          // 4.2 aFRR Analysis Data
          console.log('\n4.2 aFRR Analysis Data')
          try {
            const afrrData = await loadAFRRDataForAnalysis({ lookbackDays: 7 })
            debugReport.dataSources.afrr = {
              totalRecords: afrrData.data.length,
              dataAvailability: afrrData.dataAvailability || {},
              sampleRecords: afrrData.data.slice(0, 3)
            }
            
            console.log(`✅ aFRR Analysis: ${afrrData.data.length.toLocaleString()} records`)
            if (afrrData.dataAvailability) {
              console.log(`- With aFRR data: ${afrrData.dataAvailability.withAFRR} records`)
              console.log(`- With SK data: ${afrrData.dataAvailability.withSK} records`)
              console.log(`- aFRR coverage: ${(afrrData.dataAvailability.afrrCoverage * 100).toFixed(1)}%`)
              console.log(`- SK coverage: ${(afrrData.dataAvailability.skCoverage * 100).toFixed(1)}%`)
            }
            
          } catch (error) {
            console.log(`❌ aFRR analysis data loading failed: ${error.message}`)
            debugReport.parsingIssues.push(`aFRR analysis loading error: ${error.message}`)
          }
          
          // 5. DATE FILTERING AND VALIDATION
          console.log('\n5. DATE FILTERING AND VALIDATION')
          console.log('='.repeat(50))
          
          const startDate = new Date(state.startDate)
          const endDate = new Date(state.endDate)
          
          debugReport.dateValidation = {
            startDate: state.startDate,
            endDate: state.endDate,
            startDateValid: !isNaN(startDate.getTime()),
            endDateValid: !isNaN(endDate.getTime()),
            rangeValid: startDate < endDate,
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          }
          
          console.log(`✅ Date validation results:`)
          console.log(`- Start date: ${state.startDate} (valid: ${!isNaN(startDate.getTime())})`)
          console.log(`- End date: ${state.endDate} (valid: ${!isNaN(endDate.getTime())})`)
          console.log(`- Range valid: ${startDate < endDate}`)
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate < endDate) {
            // Test date filtering
            try {
              const filteredData = filterDataByDateRange(polishData, state.startDate, state.endDate)
              debugReport.dateValidation.filteredRecords = filteredData.length
              console.log(`- Filtered records: ${filteredData.length.toLocaleString()}`)
              
              if (filteredData.length === 0) {
                console.log(`⚠️  No data found for selected date range`)
                debugReport.parsingIssues.push(`No data found for date range ${state.startDate} to ${state.endDate}`)
              }
            } catch (error) {
              console.log(`❌ Date filtering failed: ${error.message}`)
              debugReport.parsingIssues.push(`Date filtering error: ${error.message}`)
            }
          }
          
          // 6. STORE STATE ANALYSIS
          console.log('\n6. STORE STATE ANALYSIS')
          console.log('='.repeat(50))
          
          debugReport.storeState = {
            startDate: state.startDate,
            endDate: state.endDate,
            analysisType: state.analysisType,
            polishDataLoaded: state.polishData ? state.polishData.length : 0,
            backtestParams: state.backtestParams,
            categorizationMethod: state.categorizationMethod,
            categorizationOptions: state.categorizationOptions
          }
          
          console.log(`✅ Store state analysis:`)
          console.log(`- Start date: ${state.startDate}`)
          console.log(`- End date: ${state.endDate}`)
          console.log(`- Analysis type: ${state.analysisType}`)
          console.log(`- Polish data loaded: ${state.polishData ? state.polishData.length : 0} records`)
          console.log(`- Backtest params:`, state.backtestParams)
          console.log(`- Categorization method: ${state.categorizationMethod}`)
          
          // 7. DATA CONSISTENCY CHECKS
          console.log('\n7. DATA CONSISTENCY CHECKS')
          console.log('='.repeat(50))
          
          debugReport.dataConsistency = {}
          
          // Check if all data sources have overlapping date ranges
          const allDateRanges = []
          if (debugReport.dataSources.csdac) allDateRanges.push({ source: 'CSDAC', start: debugReport.dataSources.csdac.dateRange.start, end: debugReport.dataSources.csdac.dateRange.end })
          if (debugReport.dataSources.aggregatedPolish) allDateRanges.push({ source: 'Polish', start: debugReport.dataSources.aggregatedPolish.dateRange.start, end: debugReport.dataSources.aggregatedPolish.dateRange.end })
          if (debugReport.dataSources.contracting) allDateRanges.push({ source: 'Contracting', start: debugReport.dataSources.contracting.dateRange.start, end: debugReport.dataSources.contracting.dateRange.end })
          
          console.log(`✅ Data consistency analysis:`)
          console.log(`- Date ranges found: ${allDateRanges.length}`)
          
          if (allDateRanges.length > 1) {
            const earliestStart = new Date(Math.min(...allDateRanges.map(r => new Date(r.start))))
            const latestEnd = new Date(Math.max(...allDateRanges.map(r => new Date(r.end))))
            
            debugReport.dataConsistency.globalDateRange = {
              earliestStart: earliestStart.toISOString(),
              latestEnd: latestEnd.toISOString()
            }
            
            console.log(`- Global date range: ${earliestStart.toISOString().split('T')[0]} to ${latestEnd.toISOString().split('T')[0]}`)
            
            // Check for gaps
            const gaps = []
            for (let i = 0; i < allDateRanges.length - 1; i++) {
              const currentEnd = new Date(allDateRanges[i].end)
              const nextStart = new Date(allDateRanges[i + 1].start)
              if (nextStart > currentEnd) {
                gaps.push(`${allDateRanges[i].source} to ${allDateRanges[i + 1].source}`)
              }
            }
            
            if (gaps.length > 0) {
              console.log(`⚠️  Found data gaps: ${gaps.join(', ')}`)
              debugReport.parsingIssues.push(`Data gaps found: ${gaps.join(', ')}`)
            } else {
              console.log(`✅ No data gaps detected`)
            }
          }
          
          // 8. INTEGRATION TESTS
          console.log('\n8. INTEGRATION TESTS')
          console.log('='.repeat(50))
          
          debugReport.integrationTests = {}
          
          // Test optimization with current data
          try {
            const testPrices = polishData.slice(0, 24).map(r => r.price)
            if (testPrices.length === 24 && testPrices.every(p => !isNaN(p))) {
              console.log(`✅ Optimization test: 24 valid price points available`)
              debugReport.integrationTests.optimizationReady = true
            } else {
              console.log(`❌ Optimization test: Insufficient valid price data`)
              debugReport.integrationTests.optimizationReady = false
              debugReport.parsingIssues.push(`Insufficient valid price data for optimization`)
            }
          } catch (error) {
            console.log(`❌ Optimization test failed: ${error.message}`)
            debugReport.integrationTests.optimizationReady = false
            debugReport.parsingIssues.push(`Optimization test error: ${error.message}`)
          }
          
          // Test aFRR analysis with current data
          try {
            if (contractingData && contractingData.data.length >= 24) {
              console.log(`✅ aFRR analysis test: ${contractingData.data.length} contracting records available`)
              debugReport.integrationTests.afrrReady = true
            } else {
              console.log(`❌ aFRR analysis test: Insufficient contracting data`)
              debugReport.integrationTests.afrrReady = false
              debugReport.parsingIssues.push(`Insufficient contracting data for aFRR analysis`)
            }
          } catch (error) {
            console.log(`❌ aFRR analysis test failed: ${error.message}`)
            debugReport.integrationTests.afrrReady = false
            debugReport.parsingIssues.push(`aFRR analysis test error: ${error.message}`)
          }
          
          // 9. SUMMARY AND RECOMMENDATIONS
          console.log('\n9. SUMMARY AND RECOMMENDATIONS')
          console.log('='.repeat(50))
          
          const totalRecords = (debugReport.dataSources.csdac?.totalRecords || 0) + 
                              (debugReport.dataSources.aggregatedPolish?.totalRecords || 0) + 
                              (debugReport.dataSources.contracting?.totalRecords || 0)
          
          debugReport.summary = {
            totalRecords,
            parsingIssuesCount: debugReport.parsingIssues.length,
            dataSourcesCount: Object.keys(debugReport.dataSources).length,
            integrationTestsPassed: Object.values(debugReport.integrationTests).filter(Boolean).length,
            integrationTestsTotal: Object.keys(debugReport.integrationTests).length
          }
          
          console.log(`📊 SUMMARY:`)
          console.log(`- Total records across all sources: ${totalRecords.toLocaleString()}`)
          console.log(`- Data sources loaded: ${debugReport.summary.dataSourcesCount}`)
          console.log(`- Parsing issues found: ${debugReport.summary.parsingIssuesCount}`)
          console.log(`- Integration tests passed: ${debugReport.summary.integrationTestsPassed}/${debugReport.summary.integrationTestsTotal}`)
          
          // Generate recommendations
          if (debugReport.parsingIssues.length > 0) {
            console.log(`\n⚠️  RECOMMENDATIONS:`)
            debugReport.parsingIssues.forEach((issue, index) => {
              console.log(`${index + 1}. ${issue}`)
            })
          }
          
          if (debugReport.summary.integrationTestsPassed === debugReport.summary.integrationTestsTotal) {
            console.log(`\n✅ All integration tests passed! System is ready for use.`)
          } else {
            console.log(`\n❌ Some integration tests failed. Check the issues above.`)
          }
          
          // 10. MONTHLY DATA SAMPLING ANALYSIS
          console.log('\n10. MONTHLY DATA SAMPLING ANALYSIS')
          console.log('='.repeat(50))
          
          debugReport.monthlySampling = {}
          
          try {
            // Sample 3 days from every month in the timeseries
            const monthlySamples = {}
            const allData = await loadPolishData()
            
            // Group data by month
            const monthlyGroups = {}
            allData.forEach(record => {
              const date = new Date(record.datetime)
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
              
              if (!monthlyGroups[monthKey]) {
                monthlyGroups[monthKey] = []
              }
              monthlyGroups[monthKey].push(record)
            })
            
            console.log(`Found data for ${Object.keys(monthlyGroups).length} months`)
            
            // Sample 3 days from each month
            Object.keys(monthlyGroups).forEach(monthKey => {
              const monthData = monthlyGroups[monthKey]
              const daysInMonth = [...new Set(monthData.map(r => new Date(r.datetime).getDate()))]
              
              // Sample 3 days (or all if less than 3)
              const sampleDays = daysInMonth.slice(0, Math.min(3, daysInMonth.length))
              const sampleData = monthData.filter(record => 
                sampleDays.includes(new Date(record.datetime).getDate())
              )
              
              monthlySamples[monthKey] = {
                totalRecords: monthData.length,
                sampleDays: sampleDays.length,
                sampleRecords: sampleData.length,
                dateRange: {
                  start: monthData[0]?.datetime,
                  end: monthData[monthData.length-1]?.datetime
                },
                priceStats: {
                  min: Math.min(...monthData.map(r => r.price).filter(p => !isNaN(p))),
                  max: Math.max(...monthData.map(r => r.price).filter(p => !isNaN(p))),
                  avg: monthData.map(r => r.price).filter(p => !isNaN(p)).reduce((sum, p) => sum + p, 0) / monthData.length
                },
                sampleData: sampleData.slice(0, 5) // First 5 records as sample
              }
            })
            
            debugReport.monthlySampling = monthlySamples
            
            console.log('📊 MONTHLY SAMPLING RESULTS:')
            Object.keys(monthlySamples).forEach(monthKey => {
              const sample = monthlySamples[monthKey]
              console.log(`${monthKey}: ${sample.totalRecords} total, ${sample.sampleRecords} sampled, price range: ${sample.priceStats.min.toFixed(0)}-${sample.priceStats.max.toFixed(0)} PLN/MWh`)
            })
            
            // Check for data compression issues
            const monthsWithData = Object.keys(monthlySamples)
            const expectedRecordsPerMonth = 24 * 30 // ~30 days * 24 hours
            const compressionIssues = []
            
            monthsWithData.forEach(monthKey => {
              const sample = monthlySamples[monthKey]
              const compressionRatio = sample.totalRecords / expectedRecordsPerMonth
              
              if (compressionRatio > 4) {
                compressionIssues.push(`${monthKey}: ${sample.totalRecords} records (expected ~${expectedRecordsPerMonth}, ratio: ${compressionRatio.toFixed(1)}x) - 15-min data detected`)
              } else if (compressionRatio < 0.5) {
                compressionIssues.push(`${monthKey}: ${sample.totalRecords} records (expected ~${expectedRecordsPerMonth}, ratio: ${compressionRatio.toFixed(1)}x) - data loss detected`)
              }
            })
            
            if (compressionIssues.length > 0) {
              console.log('⚠️  DATA COMPRESSION ISSUES DETECTED:')
              compressionIssues.forEach(issue => console.log(`- ${issue}`))
              debugReport.parsingIssues.push(...compressionIssues)
            } else {
              console.log('✅ No data compression issues detected')
            }
            
          } catch (error) {
            console.log(`❌ Monthly sampling failed: ${error.message}`)
            debugReport.parsingIssues.push(`Monthly sampling error: ${error.message}`)
          }
          
          // 11. AGGREGATION ANALYSIS
          console.log('\n11. AGGREGATION ANALYSIS')
          console.log('='.repeat(50))
          
          try {
            // Check if we're getting 15-minute or hourly data
            const rawCsdac = await loadCSDACPLNData()
            const aggregatedPolish = await loadPolishData()
            
            const rawRecordsPerDay = rawCsdac.length / (rawCsdac.length > 0 ? (new Date(rawCsdac[rawCsdac.length-1].dtime) - new Date(rawCsdac[0].dtime)) / (1000 * 60 * 60 * 24) : 1)
            const aggregatedRecordsPerDay = aggregatedPolish.length / (aggregatedPolish.length > 0 ? (new Date(aggregatedPolish[aggregatedPolish.length-1].datetime) - new Date(aggregatedPolish[0].datetime)) / (1000 * 60 * 60 * 24) : 1)
            
            console.log(`Raw CSDAC records per day: ${rawRecordsPerDay.toFixed(1)}`)
            console.log(`Aggregated Polish records per day: ${aggregatedRecordsPerDay.toFixed(1)}`)
            
            if (rawRecordsPerDay > 90) { // More than 90 records per day = 15-minute data
              console.log('✅ Raw data is 15-minute resolution')
            } else {
              console.log('⚠️  Raw data resolution unclear')
            }
            
            if (aggregatedRecordsPerDay > 25 && aggregatedRecordsPerDay < 30) {
              console.log('✅ Aggregated data is hourly resolution')
            } else {
              console.log(`⚠️  Aggregated data resolution unclear: ${aggregatedRecordsPerDay.toFixed(1)} records/day`)
              debugReport.parsingIssues.push(`Aggregation issue: ${aggregatedRecordsPerDay.toFixed(1)} records/day (expected ~24)`)
            }
            
            // Check for power rating constraint violations
            if (aggregatedPolish.length > 1) {
              const socChanges = []
              for (let i = 1; i < Math.min(aggregatedPolish.length, 100); i++) {
                const timeDiff = (new Date(aggregatedPolish[i].datetime) - new Date(aggregatedPolish[i-1].datetime)) / (1000 * 60) // minutes
                if (timeDiff <= 15) { // 15-minute intervals
                  socChanges.push(timeDiff)
                }
              }
              
              if (socChanges.length > 0) {
                console.log(`⚠️  POWER RATING CONSTRAINT VIOLATION: Found ${socChanges.length} 15-minute intervals in aggregated data`)
                console.log(`   Battery cannot change SoC in 15 minutes - violates 10 MW power rating`)
                debugReport.parsingIssues.push(`Power rating violation: ${socChanges.length} 15-minute intervals in hourly data`)
              } else {
                console.log('✅ No power rating constraint violations detected')
              }
            }
            
          } catch (error) {
            console.log(`❌ Aggregation analysis failed: ${error.message}`)
            debugReport.parsingIssues.push(`Aggregation analysis error: ${error.message}`)
          }
          
          // 12. FINAL DEBUG REPORT
          console.log('\n12. COMPLETE DEBUG REPORT')
          console.log('='.repeat(50))
          console.log(JSON.stringify(debugReport, null, 2))
          
          // Set status message with comprehensive summary
          const statusText = `Debug report generated. Records: ${totalRecords.toLocaleString()}, Issues: ${debugReport.summary.parsingIssuesCount}, Tests: ${debugReport.summary.integrationTestsPassed}/${debugReport.summary.integrationTestsTotal}`
          
          set({ 
            statusMessage: { 
              type: debugReport.summary.parsingIssuesCount === 0 ? 'success' : 'warning', 
              text: statusText
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
      },
      // Comprehensive debug function to trace data path and identify compression issues
      generateDataPathDebug: async () => {
        const state = get()
        
        try {
          console.log('=== COMPREHENSIVE DATA PATH DEBUG ===')
          console.log(`Generated at: ${new Date().toISOString()}`)
          
          // Import all necessary modules
          const { loadCSDACPLNData, loadPolishData, groupDataByPeriod, filterDataByDateRange } = await import('../utils/dataLoaders.js')
          const { getDataConfig } = await import('../utils/dataConfig.js')
          
          const debugReport = {
            timestamp: new Date().toISOString(),
            dataPath: {},
            issues: [],
            recommendations: []
          }
          
          // STEP 1: RAW DATA ANALYSIS
          console.log('\n1. RAW DATA ANALYSIS')
          console.log('='.repeat(50))
          
          const rawData = await loadCSDACPLNData()
          debugReport.dataPath.rawData = {
            totalRecords: rawData.length,
            dateRange: {
              start: rawData[0]?.dtime,
              end: rawData[rawData.length - 1]?.dtime
            },
            sampleRecords: rawData.slice(0, 3)
          }
          
          console.log(`✅ Raw CSDAC data: ${rawData.length.toLocaleString()} records`)
          console.log(`📅 Date range: ${debugReport.dataPath.rawData.dateRange.start} to ${debugReport.dataPath.rawData.dateRange.end}`)
          
          // STEP 2: AGGREGATED DATA ANALYSIS
          console.log('\n2. AGGREGATED DATA ANALYSIS')
          console.log('='.repeat(50))
          
          const aggregatedData = await loadPolishData()
          debugReport.dataPath.aggregatedData = {
            totalRecords: aggregatedData.length,
            dateRange: {
              start: aggregatedData[0]?.datetime,
              end: aggregatedData[aggregatedData.length - 1]?.datetime
            },
            sampleRecords: aggregatedData.slice(0, 3)
          }
          
          console.log(`✅ Aggregated data: ${aggregatedData.length.toLocaleString()} records`)
          console.log(`📅 Date range: ${debugReport.dataPath.aggregatedData.dateRange.start} to ${debugReport.dataPath.aggregatedData.dateRange.end}`)
          
          // STEP 3: DATE RANGE FILTERING ANALYSIS
          console.log('\n3. DATE RANGE FILTERING ANALYSIS')
          console.log('='.repeat(50))
          
          const config = await getDataConfig()
          const currentStartDate = state.startDate || config.dataStartDate
          const currentEndDate = state.endDate || config.dataEndDate
          
          console.log(`🔍 Current date range: ${currentStartDate} to ${currentEndDate}`)
          
          const filteredData = filterDataByDateRange(aggregatedData, currentStartDate, currentEndDate)
          debugReport.dataPath.filteredData = {
            totalRecords: filteredData.length,
            dateRange: {
              start: filteredData[0]?.datetime,
              end: filteredData[filteredData.length - 1]?.datetime
            },
            sampleRecords: filteredData.slice(0, 3)
          }
          
          console.log(`✅ Filtered data: ${filteredData.length.toLocaleString()} records`)
          console.log(`📅 Filtered range: ${debugReport.dataPath.filteredData.dateRange.start} to ${debugReport.dataPath.filteredData.dateRange.end}`)
          
          // STEP 4: MONTHLY GROUPING ANALYSIS
          console.log('\n4. MONTHLY GROUPING ANALYSIS')
          console.log('='.repeat(50))
          
          const monthlyGroups = groupDataByPeriod(filteredData, 'monthly')
          const monthKeys = Object.keys(monthlyGroups).sort()
          
          debugReport.dataPath.monthlyGroups = {
            totalMonths: monthKeys.length,
            monthDetails: {}
          }
          
          console.log(`📅 Found ${monthKeys.length} months: ${monthKeys.join(', ')}`)
          
          // Analyze each month in detail
          for (const monthKey of monthKeys) {
            const monthData = monthlyGroups[monthKey]
            const prices = monthData.map(record => record.price || record.csdac_pln)
            const timestamps = monthData.map(record => record.datetime || record.dtime)
            
            const monthDays = monthData.length / 24
            const expectedDays = new Date(new Date(monthData[0].datetime).getFullYear(), new Date(monthData[0].datetime).getMonth() + 1, 0).getDate()
            const dayCompleteness = monthDays / expectedDays
            
            debugReport.dataPath.monthlyGroups.monthDetails[monthKey] = {
              records: monthData.length,
              days: monthDays,
              expectedDays: expectedDays,
              completeness: dayCompleteness,
              priceStats: {
                min: Math.min(...prices),
                max: Math.max(...prices),
                avg: prices.reduce((a, b) => a + b, 0) / prices.length
              },
              dateRange: {
                start: monthData[0]?.datetime,
                end: monthData[monthData.length - 1]?.datetime
              },
              sampleTimestamps: timestamps.slice(0, 3)
            }
            
            console.log(`\n📊 ${monthKey}:`)
            console.log(`  Records: ${monthData.length}, Days: ${monthDays.toFixed(1)}/${expectedDays} (${(dayCompleteness * 100).toFixed(1)}% complete)`)
            console.log(`  Price range: ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)} PLN/MWh`)
            console.log(`  Date range: ${monthData[0]?.datetime} to ${monthData[monthData.length - 1]?.datetime}`)
            console.log(`  Sample timestamps:`, timestamps.slice(0, 3))
            
            // Check for data compression issues (using 50% threshold like main validation)
            const expectedMonthlyRecords = 24 * 30 // ~720 records for a full month
            const completeness = monthData.length / expectedMonthlyRecords
            const isInsufficient = completeness < 0.5 // 50% threshold
            
            if (isInsufficient) {
              debugReport.issues.push(`${monthKey}: Insufficient data (${monthData.length} records, expected ~${expectedMonthlyRecords}, ${(completeness * 100).toFixed(1)}% complete)`)
              console.log(`  ⚠️  INSUFFICIENT DATA DETECTED (${(completeness * 100).toFixed(1)}% complete)`)
            } else {
              console.log(`  ✅ Data sufficient (${(completeness * 100).toFixed(1)}% complete)`)
            }
            
            // Check for invalid timestamps
            const invalidTimestamps = timestamps.filter(ts => !ts || isNaN(new Date(ts).getTime()))
            if (invalidTimestamps.length > 0) {
              debugReport.issues.push(`${monthKey}: ${invalidTimestamps.length} invalid timestamps`)
              console.log(`  ⚠️  Found ${invalidTimestamps.length} invalid timestamps`)
            }
          }
          
          // STEP 5: OPTIMIZATION RESULTS ANALYSIS
          console.log('\n5. OPTIMIZATION RESULTS ANALYSIS')
          console.log('='.repeat(50))
          
          if (state.backtestResults) {
            const results = state.backtestResults.results || []
            console.log(`📊 Frontend results: ${results.length} periods`)
            
            debugReport.dataPath.frontendResults = {
              totalResults: results.length,
              resultDetails: results.map(r => ({
                period: r.period,
                revenue: r.totalRevenue,
                dataPoints: r.dataPoints,
                periodStart: r.periodStart,
                periodEnd: r.periodEnd
              }))
            }
            
            console.log(`Frontend periods: ${results.map(r => r.period).join(', ')}`)
            
            // Compare backend vs frontend
            const backendMonths = new Set(monthKeys)
            const frontendMonths = new Set(results.map(r => r.period))
            
            const missingInFrontend = [...backendMonths].filter(m => !frontendMonths.has(m))
            const extraInFrontend = [...frontendMonths].filter(m => !backendMonths.has(m))
            
            if (missingInFrontend.length > 0) {
              debugReport.issues.push(`Missing in frontend: ${missingInFrontend.join(', ')}`)
              console.log(`❌ Missing in frontend: ${missingInFrontend.join(', ')}`)
            }
            
            if (extraInFrontend.length > 0) {
              debugReport.issues.push(`Extra in frontend: ${extraInFrontend.join(', ')}`)
              console.log(`❌ Extra in frontend: ${extraInFrontend.join(', ')}`)
            }
            
            // Check for zero revenue issues
            const zeroRevenueResults = results.filter(r => r.totalRevenue === 0)
            if (zeroRevenueResults.length > 0) {
              debugReport.issues.push(`Zero revenue results: ${zeroRevenueResults.map(r => r.period).join(', ')}`)
              console.log(`❌ Zero revenue results: ${zeroRevenueResults.map(r => r.period).join(', ')}`)
            }
            
          } else {
            console.log(`❌ No backtest results found in store`)
            debugReport.issues.push('No backtest results found in store')
          }
          
          // STEP 6: DATA COMPRESSION ANALYSIS
          console.log('\n6. DATA COMPRESSION ANALYSIS')
          console.log('='.repeat(50))
          
          // Check if data is being compressed to specific months
          const monthCounts = {}
          monthKeys.forEach(key => {
            monthCounts[key] = monthlyGroups[key].length
          })
          
          console.log(`📊 Month record counts:`)
          Object.entries(monthCounts).forEach(([month, count]) => {
            console.log(`  ${month}: ${count} records`)
          })
          
          // Identify compression patterns
          const highCountMonths = Object.entries(monthCounts).filter(([month, count]) => count > 2000)
          const lowCountMonths = Object.entries(monthCounts).filter(([month, count]) => count < 500)
          
          if (highCountMonths.length > 0) {
            console.log(`⚠️  High count months (possible compression):`)
            highCountMonths.forEach(([month, count]) => {
              console.log(`  ${month}: ${count} records`)
            })
          }
          
          if (lowCountMonths.length > 0) {
            console.log(`⚠️  Low count months:`)
            lowCountMonths.forEach(([month, count]) => {
              console.log(`  ${month}: ${count} records`)
            })
          }
          
          // STEP 7: TIMESTAMP ANALYSIS
          console.log('\n7. TIMESTAMP ANALYSIS')
          console.log('='.repeat(50))
          
          // Check for timestamp parsing issues
          const sampleTimestamps = filteredData.slice(0, 10).map(r => r.datetime)
          console.log(`📅 Sample timestamps from filtered data:`)
          sampleTimestamps.forEach((ts, index) => {
            try {
              const date = new Date(ts)
              console.log(`  ${index + 1}: ${ts} -> ${date.toISOString()}`)
            } catch (error) {
              console.log(`  ${index + 1}: ${ts} -> INVALID`)
            }
          })
          
          // STEP 8: SUMMARY AND RECOMMENDATIONS
          console.log('\n8. SUMMARY AND RECOMMENDATIONS')
          console.log('='.repeat(50))
          
          const totalBackendRecords = Object.values(monthCounts).reduce((sum, count) => sum + count, 0)
          const totalFrontendResults = state.backtestResults?.results?.length || 0
          
          console.log(`📊 SUMMARY:`)
          console.log(`  Backend months: ${monthKeys.length}`)
          console.log(`  Frontend results: ${totalFrontendResults}`)
          console.log(`  Total backend records: ${totalBackendRecords.toLocaleString()}`)
          console.log(`  Data compression ratio: ${(totalBackendRecords / (monthKeys.length * 24 * 30)).toFixed(2)}`)
          
          if (debugReport.issues.length > 0) {
            console.log(`\n⚠️  ISSUES DETECTED:`)
            debugReport.issues.forEach(issue => {
              console.log(`  - ${issue}`)
            })
          }
          
          // Generate recommendations
          if (monthKeys.length !== totalFrontendResults) {
            debugReport.recommendations.push('Investigate why frontend shows different number of periods than backend')
          }
          
          if (debugReport.issues.length > 0) {
            debugReport.recommendations.push('Address data quality issues before analysis')
          }
          
          if (highCountMonths.length > 0) {
            debugReport.recommendations.push('Investigate data compression to specific months')
          }
          
          console.log(`\n📋 RECOMMENDATIONS:`)
          debugReport.recommendations.forEach(rec => {
            console.log(`  - ${rec}`)
          })
          
          return debugReport
          
        } catch (error) {
          console.error('❌ Data path debug failed:', error)
          return {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
          }
        }
      }
    }),
    {
      name: 'optimization-store',
    }
  )
) 