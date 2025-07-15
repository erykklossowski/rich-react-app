import React, { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card, CardContent } from './components/ui/card'
import { Button } from './components/ui/button'
import { useOptimizationStore } from './store/optimizationStore'
import ManualInputForm from './components/ManualInputForm'
import BacktestForm from './components/BacktestForm'
import ResultsDashboard from './components/ResultsDashboard'
import BacktestSummary from './components/BacktestSummary'
import BatteryOptimizer from './utils/BatteryOptimizerClass.js'
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './utils/dataLoaders.js'
import { Battery, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from './lib/utils'

const optimizer = new BatteryOptimizer()

const App = () => {
  const {
    // State
    activeTab,
    priceData,
    pMax,
    socMin,
    socMax,
    efficiency,
    statusMessage,
    optimizationResult,
    polishData,
    startDate,
    endDate,
    analysisType,
    backtestParams,
    backtestResults,
    loading,
    progress,
    progressText,
    detailedPeriod,
    llmInsight,
    llmLoading,

    // Actions
    setActiveTab,
    setPriceData,
    setPMax,
    setSocMin,
    setSocMax,
    setEfficiency,
    setStatusMessage,
    setOptimizationResult,
    setPolishData,
    setStartDate,
    setEndDate,
    setAnalysisType,
    setBacktestParams,
    setBacktestResults,
    setLoading,
    setProgress,
    setProgressText,
    setDetailedPeriod,
    setLlmInsight,
    setLlmLoading,
    resetResults
  } = useOptimizationStore()

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await loadPolishData()
        setPolishData(data)
        console.log('Polish electricity data preloaded successfully')
      } catch (error) {
        console.log('Could not preload Polish data - will load when needed')
        setStatusMessage({ type: 'error', text: `Initial data load failed: ${error.message}` })
      }
    }
    fetchInitialData()
  }, [setPolishData, setStatusMessage])

  // Generate sample data
  const generateSampleData = useCallback(() => {
    const samplePrices = []
    for (let hour = 0; hour < 24; hour++) {
      let basePrice = 50
      if (hour >= 6 && hour <= 8) basePrice += 20
      if (hour >= 17 && hour <= 20) basePrice += 30
      if (hour >= 22 || hour <= 5) basePrice -= 15
      basePrice += (Math.random() - 0.5) * 20
      samplePrices.push(Math.max(10, basePrice))
    }
    setPriceData(samplePrices.map(p => p.toFixed(2)).join(', '))
    setStatusMessage({ type: 'success', text: 'Sample data generated successfully!' })
    resetResults()
  }, [setPriceData, setStatusMessage, resetResults])

  // Optimize battery
  const optimizeBattery = useCallback(() => {
    setLoading(true)
    setStatusMessage({ type: 'info', text: 'Running optimization...' })
    resetResults()

    // Reset optimizer state to ensure fresh start
    optimizer.reset()

    try {
      const prices = priceData.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p))

      if (prices.length === 0) throw new Error('Please enter valid price data')

      const params = { pMax, socMin, socMax, efficiency }

      if (params.socMin >= params.socMax) {
        throw new Error('Minimum SoC must be less than maximum SoC')
      }

      setTimeout(() => {
        const result = optimizer.optimize(prices, params)
        if (result.success) {
          setStatusMessage({ type: 'success', text: 'Optimization completed successfully!' })
          setOptimizationResult({ result, prices, params, title: 'Manual Input' })
        } else {
          setStatusMessage({ type: 'error', text: `Optimization failed: ${result.error}` })
        }
        setLoading(false)
      }, 500)

    } catch (error) {
      setStatusMessage({ type: 'error', text: `Error: ${error.message}` })
      setLoading(false)
    }
  }, [priceData, pMax, socMin, socMax, efficiency, setLoading, setStatusMessage, resetResults, setOptimizationResult])

  // Test data connection
  const testDataConnection = useCallback(async () => {
    setStatusMessage({ type: 'info', text: 'Testing data connection...' })
    try {
      const response = await fetch('https://raw.githubusercontent.com/erykklossowski/resslv/refs/heads/main/Poland.csv')
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const text = await response.text()
      const lines = text.split('\n').filter(line => line.trim())

      setStatusMessage({
        type: 'success',
        text: `Data connection successful! Response status: ${response.status}, Data size: ${text.length} characters, Lines found: ${lines.length}`
      })
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Data connection failed: ${error.message}` })
    }
  }, [setStatusMessage])

  // Test optimizer in browser
  const testOptimizer = useCallback(() => {
    setStatusMessage({ type: 'info', text: 'Testing optimizer in browser...' })
    try {
      // Reset optimizer state to ensure fresh start
      optimizer.reset()
      
      const testPrices = [50, 45, 40, 35, 30, 25, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 80, 75, 70, 65, 60, 55]
      const testParams = { socMin: 10, socMax: 50, pMax: 5, efficiency: 0.85 }
      
      console.log('Testing optimizer with:', { testPrices, testParams })
      const result = optimizer.optimize(testPrices, testParams)
      
      if (result.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Optimizer test successful! Revenue: ${result.totalRevenue}, SoC range: ${Math.min(...result.schedule.soc)}-${Math.max(...result.schedule.soc)}` 
        })
      } else {
        setStatusMessage({ type: 'error', text: `Optimizer test failed: ${result.error}` })
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Optimizer test error: ${error.message}` })
    }
  }, [setStatusMessage])

  // Test optimizer with real data format
  const testOptimizerWithRealData = useCallback(async () => {
    setStatusMessage({ type: 'info', text: 'Testing optimizer with real data format...' })
    try {
      // Reset optimizer state to ensure fresh start
      optimizer.reset()
      
      // Load a small sample of real data
      const data = await loadPolishData()
      const sampleData = data.slice(0, 48) // Get 48 hours (2 days)
      const prices = sampleData.map(record => record.price)
      
      console.log('Testing optimizer with real data format:')
      console.log('Sample data records:', sampleData.slice(0, 3))
      console.log('Prices:', prices)
      
      const testParams = { socMin: 10, socMax: 50, pMax: 5, efficiency: 0.85 }
      const result = optimizer.optimize(prices, testParams)
      
      if (result.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Real data test successful! Revenue: ${result.totalRevenue}, Data points: ${prices.length}` 
        })
      } else {
        setStatusMessage({ type: 'error', text: `Real data test failed: ${result.error}` })
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Real data test error: ${error.message}` })
    }
  }, [setStatusMessage])

  // Test simplified optimization
  const testSimpleOptimization = useCallback(() => {
    setStatusMessage({ type: 'info', text: 'Testing simplified optimization...' })
    try {
      // Reset optimizer state to ensure fresh start
      optimizer.reset()
      
      const result = optimizer.testSimpleOptimization()
      
      if (result.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Simple optimization test successful! Revenue: ${result.totalRevenue}, SoC range: ${result.minSoC.toFixed(1)}-${result.maxSoC.toFixed(1)}` 
        })
      } else {
        setStatusMessage({ type: 'error', text: `Simple optimization test failed: ${result.error}` })
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Simple optimization test error: ${error.message}` })
    }
  }, [setStatusMessage])

  // Load quick presets
  const loadQuickPresets = useCallback(() => {
    const presets = [
      { name: '2020 COVID Year', start: '2020-01-01', end: '2020-12-31', type: 'monthly' },
      { name: '2022 Energy Crisis', start: '2022-01-01', end: '2022-12-31', type: 'monthly' },
      { name: 'Recent 6 Months', start: '2024-12-01', end: '2025-05-31', type: 'monthly' },
      { name: 'Last 5 Years', start: '2020-01-01', end: '2024-12-31', type: 'yearly' }
    ]

    const preset = presets[Math.floor(Math.random() * presets.length)]
    setStartDate(preset.start)
    setEndDate(preset.end)
    setAnalysisType(preset.type)
    setStatusMessage({ type: 'info', text: `Loaded preset: ${preset.name}` })
  }, [setStartDate, setEndDate, setAnalysisType, setStatusMessage])

  // Run backtest
  const runBacktest = useCallback(async () => {
    setLoading(true)
    resetResults()
    setProgress(0)
    setProgressText('Preparing backtest...')
    setStatusMessage({ type: 'info', text: 'Running historical backtest...' })

    // Reset optimizer state to ensure fresh start
    optimizer.reset()

    try {
      let currentPolishData = polishData
      if (!currentPolishData || currentPolishData.length === 0) {
        setProgressText('Loading Polish electricity market data...')
        setProgress(10)
        try {
          currentPolishData = await loadPolishData()
          setPolishData(currentPolishData)
        } catch (dataError) {
          throw new Error(`Failed to load Polish electricity market data: ${dataError.message}`)
        }
        if (!currentPolishData || currentPolishData.length === 0) {
          throw new Error('Loaded data is empty or invalid after fetch.')
        }
        console.log(`Loaded ${currentPolishData.length} records for backtest.`)
      }

      setProgressText('Filtering data by date range...')
      setProgress(20)

      const params = backtestParams

      if (params.socMin >= params.socMax) {
        throw new Error('Minimum SoC must be less than maximum SoC')
      }
      if (new Date(startDate) >= new Date(endDate)) {
        throw new Error('Start date must be before end date')
      }

      const filteredData = filterDataByDateRange(currentPolishData, startDate, endDate)
      if (filteredData.length === 0) {
        throw new Error('No data found for the selected date range. Please adjust dates.')
      }
      console.log(`Filtered data points: ${filteredData.length}`)
      console.log(`Date range: ${startDate} to ${endDate}`)
      console.log(`Sample filtered data:`, filteredData.slice(0, 3))

      setProgressText(`Processing ${filteredData.length} records...`)
      setProgress(40)

      const groups = groupDataByPeriod(filteredData, analysisType)
      const groupKeys = Object.keys(groups).sort()

      if (groupKeys.length === 0) {
        throw new Error('No valid periods found for analysis. Check date range and analysis type.')
      }
      console.log(`Number of analysis periods: ${groupKeys.length}`)
      console.log(`Period keys:`, groupKeys.slice(0, 5))
      
      // Log detailed sample data from first few groups
      for (let i = 0; i < Math.min(3, groupKeys.length); i++) {
        const key = groupKeys[i];
        const groupData = groups[key];
        const prices = groupData.map(r => r.price);
        console.log(`Group ${key}: ${groupData.length} records`);
        console.log(`  Price range: ${Math.min(...prices)} - ${Math.max(...prices)}`);
        console.log(`  Sample prices:`, prices.slice(0, 10));
        console.log(`  Sample datetimes:`, groupData.slice(0, 3).map(r => r.datetime));
      }

      setProgressText(`Analyzing ${groupKeys.length} periods...`)
      setProgress(60)

      const results = []

      for (const [index, key] of groupKeys.entries()) {
        const groupData = groups[key]
        const prices = groupData.map(record => record.price)

        console.log(`Processing period ${key}: ${prices.length} data points`)
        console.log(`Price range: ${Math.min(...prices)} - ${Math.max(...prices)}`)
        console.log(`Sample prices:`, prices.slice(0, 5))

        if (prices.length >= 24) {
          console.log(`Attempting optimization for period ${key} with ${prices.length} data points`)
          console.log(`Parameters:`, params)
          
          try {
            const result = optimizer.optimize(prices, params)
            
            if (result.success) {
              console.log(`✓ Optimization successful for period ${key}`)
              console.log(`  Revenue: ${result.totalRevenue}`)
              console.log(`  Energy charged: ${result.totalEnergyCharged}`)
              console.log(`  Energy discharged: ${result.totalEnergyDischarged}`)
              results.push({
                period: key,
                periodStart: groupData[0].datetime,
                periodEnd: groupData[groupData.length - 1].datetime,
                dataPoints: prices.length,
                prices: prices,
                ...result
              })
            } else {
              console.error(`✗ Main optimization failed for period ${key}:`, result.error)
              console.error(`Error details:`, result)
              
              // Try simplified optimization as fallback
              console.log(`Attempting simplified optimization for period ${key}...`)
              const simpleSchedule = optimizer.simpleOptimize(prices, params)
              const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0)
              const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0)
              const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0)
              
              console.log(`✓ Simplified optimization successful for period ${key}`)
              console.log(`  Revenue: ${totalRevenue}`)
              console.log(`  Energy charged: ${totalEnergyCharged}`)
              console.log(`  Energy discharged: ${totalEnergyDischarged}`)
              
              results.push({
                period: key,
                periodStart: groupData[0].datetime,
                periodEnd: groupData[groupData.length - 1].datetime,
                dataPoints: prices.length,
                prices: prices,
                success: true,
                schedule: simpleSchedule,
                totalRevenue,
                totalEnergyCharged,
                totalEnergyDischarged,
                operationalEfficiency: totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0,
                avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                cycles: 0, // Simplified optimization doesn't calculate cycles
                vwapCharge: 0,
                vwapDischarge: 0,
                method: 'simplified'
              })
            }
          } catch (optimizationError) {
            console.error(`✗ Optimization threw exception for period ${key}:`, optimizationError)
            console.error(`Exception stack:`, optimizationError.stack)
            
            // Try simplified optimization as fallback
            console.log(`Attempting simplified optimization as fallback for period ${key}...`)
            try {
              const simpleSchedule = optimizer.simpleOptimize(prices, params)
              const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0)
              const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0)
              const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0)
              
              console.log(`✓ Simplified optimization fallback successful for period ${key}`)
              
              results.push({
                period: key,
                periodStart: groupData[0].datetime,
                periodEnd: groupData[groupData.length - 1].datetime,
                dataPoints: prices.length,
                prices: prices,
                success: true,
                schedule: simpleSchedule,
                totalRevenue,
                totalEnergyCharged,
                totalEnergyDischarged,
                operationalEfficiency: totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0,
                avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                cycles: 0,
                vwapCharge: 0,
                vwapDischarge: 0,
                method: 'simplified_fallback'
              })
            } catch (fallbackError) {
              console.error(`✗ Simplified optimization fallback also failed for period ${key}:`, fallbackError)
            }
          }
        } else {
          console.warn(`Skipping period ${key} due to insufficient data points (${prices.length} < 24).`)
        }

        const totalProgress = 60 + (40 * (index + 1) / groupKeys.length)
        setProgress(totalProgress)
        setProgressText(`Analyzed period ${index + 1}/${groupKeys.length}: ${key}`)

        await new Promise(resolve => setTimeout(resolve, 10))
      }

      setProgressText('Generating results...')
      setProgress(100)

      if (results.length === 0) {
        throw new Error('No valid optimization results generated for any period. Check data, parameters, or date range.')
      }
      console.log(`Total successful optimization results: ${results.length}`)

      setBacktestResults({
        results,
        analysisType,
        dateRange: { start: startDate, end: endDate },
        params
      })
      setStatusMessage({ type: 'success', text: 'Backtest completed successfully!' })

    } catch (error) {
      setStatusMessage({ type: 'error', text: `Backtest failed: ${error.message}` })
      console.error('Backtest Error:', error)
    } finally {
      setLoading(false)
      setProgress(0)
      setProgressText('')
    }
  }, [polishData, startDate, endDate, analysisType, backtestParams, setLoading, resetResults, setProgress, setProgressText, setStatusMessage, setPolishData, setBacktestResults])

  // Show period detail
  const showPeriodDetail = useCallback((periodKey) => {
    if (!backtestResults) return
    const periodData = backtestResults.results.find(r => r.period === periodKey)
    if (periodData) {
      setDetailedPeriod({
        result: periodData,
        prices: periodData.prices,
        params: backtestResults.params,
        title: `Detailed Period: ${periodKey}`
      })
      setLlmInsight('')
    }
  }, [backtestResults, setDetailedPeriod, setLlmInsight])

  // Hide detailed results
  const hideDetailedResults = useCallback(() => {
    setDetailedPeriod(null)
    setLlmInsight('')
  }, [setDetailedPeriod, setLlmInsight])

  // Get optimization insight
  const getOptimizationInsight = useCallback(async (result, params) => {
    setLlmLoading(true)
    setLlmInsight('')

    const prompt = `Analyze the following battery energy storage optimization results and provide concise strategic insights and potential next steps. Focus on revenue maximization, efficiency, and market conditions.

**Optimization Parameters:**
Max Power (MW): ${params.pMax}
Min SoC (MWh): ${params.socMin}
Max SoC (MWh): ${params.socMax}
Efficiency: ${params.efficiency}

**Performance Metrics:**
Total Revenue: €${result.totalRevenue.toFixed(2)}
Energy Discharged: ${result.totalEnergyDischarged.toFixed(1)} MWh
Energy Charged: ${result.totalEnergyCharged.toFixed(1)} MWh
Operational Efficiency: ${(result.operationalEfficiency * 100).toFixed(1)}%
Average Market Price: €${result.avgPrice.toFixed(2)}/MWh
Battery Cycles: ${result.cycles.toFixed(2)}
VWAP Charge Price: €${result.vwapCharge.toFixed(2)}/MWh
VWAP Discharge Price: €${result.vwapDischarge.toFixed(2)}/MWh

Based on these metrics, what are the key takeaways? Suggest 1-3 actionable strategies or areas for further investigation to improve profitability or operational effectiveness. Keep the response under 200 words.`

    try {
      const response = await fetch('/api/gemini-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      const responseData = await response.json()

      if (responseData.success) {
        setLlmInsight(responseData.insight)
      } else {
        setLlmInsight(`Could not generate insights: ${responseData.error}`)
        console.error('API Error:', responseData.error)
      }
    } catch (error) {
      setLlmInsight(`Failed to get insights: ${error.message}. Please ensure the backend server is running.`)
      console.error('Error calling backend API:', error)
    } finally {
      setLlmLoading(false)
    }
  }, [setLlmLoading, setLlmInsight])

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value)
    resetResults()
  }

  // Status message component
  const StatusMessage = ({ message }) => {
    if (!message.text) return null

    const icons = {
      success: CheckCircle,
      error: AlertCircle,
      info: Info
    }

    const IconComponent = icons[message.type] || Info

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "amiga-status flex items-center gap-3 mb-4",
          message.type === 'success' && "success",
          message.type === 'error' && "error",
          message.type === 'info' && "info"
        )}
      >
        <IconComponent className="h-4 w-4" />
        <span className="text-xs">{message.text}</span>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen amiga-pattern amiga-font p-4">
      {/* Header Window - Top Center */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="amiga-window max-w-2xl mx-auto">
          <div className="amiga-titlebar">
            <span>Battery Energy Storage Optimization</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-4 flex items-center justify-center gap-3">
            <div className="p-2 bg-gradient-to-b from-[#0055AA] to-[#003388] border-2 outset border-[#0055AA]">
              <Battery className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#0055AA]">
              Battery Energy Storage Optimization
            </h1>
          </div>
          <p className="px-4 pb-4 text-xs text-[#555555] text-center">
            Advanced battery optimization using Hidden Markov Models and the Viterbi algorithm
          </p>
        </div>
      </motion.div>

      {/* Status Message */}
      <StatusMessage message={statusMessage} />

      {/* Main Workbench Layout - Grid of Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Tab Navigation Window - Top Left */}
        <div className="amiga-window lg:col-span-1">
          <div className="amiga-titlebar">
            <span>Navigation</span>
            <div className="amiga-gadget">−</div>
          </div>
          <div className="p-3">
            <div className="amiga-tabs">
              <button
                onClick={() => handleTabChange('manual')}
                className={cn(
                  "amiga-tab w-full mb-2",
                  activeTab === 'manual' && "active"
                )}
              >
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Manual Input
              </button>
              <button
                onClick={() => handleTabChange('backtest')}
                className={cn(
                  "amiga-tab w-full mb-2",
                  activeTab === 'backtest' && "active"
                )}
              >
                <Battery className="h-3 w-3 inline mr-1" />
                Historical Backtest
              </button>
              <button
                onClick={testOptimizer}
                className="amiga-tab w-full mb-2"
              >
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Test Optimizer
              </button>
              <button
                onClick={testOptimizerWithRealData}
                className="amiga-tab w-full mb-2"
              >
                <Info className="h-3 w-3 inline mr-1" />
                Test Real Data
              </button>
              <button
                onClick={testSimpleOptimization}
                className="amiga-tab w-full"
              >
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Test Simple Opt
              </button>
            </div>
          </div>
        </div>

        {/* Manual Input Form */}
        {activeTab === 'manual' && (
          <div className="lg:col-span-2 xl:col-span-2">
            <ManualInputForm 
              onOptimize={optimizeBattery}
              onGenerateSample={generateSampleData}
            />
          </div>
        )}

        {/* Backtest Form */}
        {activeTab === 'backtest' && (
          <div className="lg:col-span-2 xl:col-span-2">
            <BacktestForm 
              onRunBacktest={runBacktest}
              onLoadPresets={loadQuickPresets}
              onTestConnection={testDataConnection}
            />
          </div>
        )}

        {/* Results Dashboard Window - Spans Multiple Columns */}
        {optimizationResult && (
          <div className="amiga-window lg:col-span-2 xl:col-span-2">
            <div className="amiga-titlebar">
              <span>Optimization Results</span>
              <div className="amiga-gadget">×</div>
            </div>
            <div className="p-3">
              <ResultsDashboard 
                data={optimizationResult}
                isManualInput={true}
                onGetInsights={getOptimizationInsight}
              />
            </div>
          </div>
        )}

        {/* Backtest Summary Window */}
        {backtestResults && !detailedPeriod && (
          <div className="amiga-window lg:col-span-2 xl:col-span-2">
            <div className="amiga-titlebar">
              <span>Backtest Summary</span>
              <div className="amiga-gadget">×</div>
            </div>
            <div className="p-3">
              <BacktestSummary 
                backtestResults={backtestResults}
                onShowPeriodDetail={showPeriodDetail}
              />
            </div>
          </div>
        )}

        {/* Detailed Period Results Window */}
        {detailedPeriod && (
          <div className="amiga-window lg:col-span-2 xl:col-span-2">
            <div className="amiga-titlebar">
              <span>Detailed Period Analysis</span>
              <div className="amiga-gadget">×</div>
            </div>
            <div className="p-3">
              <ResultsDashboard 
                data={detailedPeriod}
                isManualInput={false}
                onBack={hideDetailedResults}
                onGetInsights={getOptimizationInsight}
              />
            </div>
          </div>
        )}

        {/* AI Insights Window - Bottom Right */}
        {llmInsight && (
          <div className="amiga-window lg:col-span-1 xl:col-span-1">
            <div className="amiga-titlebar">
              <span>AI Insights</span>
              <div className="amiga-gadget">×</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-[#555555] leading-relaxed">
                {llmLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-[#0055AA] border-t-transparent"></div>
                    <span>Generating insights...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{llmInsight}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
