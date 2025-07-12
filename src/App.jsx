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

      setProgressText(`Processing ${filteredData.length} records...`)
      setProgress(40)

      const groups = groupDataByPeriod(filteredData, analysisType)
      const groupKeys = Object.keys(groups).sort()

      if (groupKeys.length === 0) {
        throw new Error('No valid periods found for analysis. Check date range and analysis type.')
      }
      console.log(`Number of analysis periods: ${groupKeys.length}`)

      setProgressText(`Analyzing ${groupKeys.length} periods...`)
      setProgress(60)

      const results = []

      for (const [index, key] of groupKeys.entries()) {
        const groupData = groups[key]
        const prices = groupData.map(record => record.price)

        if (prices.length > 24) {
          const result = optimizer.optimize(prices, params)
          if (result.success) {
            results.push({
              period: key,
              periodStart: groupData[0].datetime,
              periodEnd: groupData[groupData.length - 1].datetime,
              dataPoints: prices.length,
              prices: prices,
              ...result
            })
          } else {
            console.warn(`Optimization failed for period ${key}: ${result.error}`)
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
      const response = await fetch('http://localhost:3001/api/gemini-insights', {
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
    <div className="min-h-screen amiga-pattern amiga-font">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="amiga-window p-6 mb-4">
            <div className="amiga-titlebar">
              <span>Battery Energy Storage Optimization</span>
              <div className="amiga-gadget">×</div>
            </div>
            <div className="p-4 flex items-center justify-center gap-3">
              <div className="p-2 bg-gradient-to-b from-[#0055AA] to-[#003388] border-2 outset border-[#0055AA]">
                <Battery className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#0055AA]">
                Battery Energy Storage Optimization
              </h1>
            </div>
            <p className="px-4 pb-4 text-sm text-[#555555]">
              Advanced battery optimization using Hidden Markov Models and the Viterbi algorithm
            </p>
          </div>
        </motion.div>

        {/* Status Message */}
        <StatusMessage message={statusMessage} />

        {/* Main Content */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Optimization Interface</span>
            <div className="amiga-gadget">−</div>
          </div>
          <div className="p-4">
            <div className="amiga-tabs mb-4">
              <button
                onClick={() => handleTabChange('manual')}
                className={cn(
                  "amiga-tab",
                  activeTab === 'manual' && "active"
                )}
              >
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Manual Input
              </button>
              <button
                onClick={() => handleTabChange('backtest')}
                className={cn(
                  "amiga-tab",
                  activeTab === 'backtest' && "active"
                )}
              >
                <Battery className="h-3 w-3 inline mr-1" />
                Historical Backtest
              </button>
            </div>

            {activeTab === 'manual' && (
              <div className="space-y-6">
                <ManualInputForm 
                  onOptimize={optimizeBattery}
                  onGenerateSample={generateSampleData}
                />
                
                {optimizationResult && (
                  <ResultsDashboard 
                    data={optimizationResult}
                    isManualInput={true}
                    onGetInsights={getOptimizationInsight}
                  />
                )}
              </div>
            )}

            {activeTab === 'backtest' && (
              <div className="space-y-6">
                <BacktestForm 
                  onRunBacktest={runBacktest}
                  onLoadPresets={loadQuickPresets}
                  onTestConnection={testDataConnection}
                />
                
                {backtestResults && !detailedPeriod && (
                  <BacktestSummary 
                    backtestResults={backtestResults}
                    onShowPeriodDetail={showPeriodDetail}
                  />
                )}
                
                {detailedPeriod && (
                  <ResultsDashboard 
                    data={detailedPeriod}
                    isManualInput={false}
                    onBack={hideDetailedResults}
                    onGetInsights={getOptimizationInsight}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
