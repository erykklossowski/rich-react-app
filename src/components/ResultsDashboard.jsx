import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useOptimizationStore } from '../store/optimizationStore'
import InteractiveChart from './InteractiveChart'
import MetricsGrid from './MetricsGrid'
import AIInsights from './AIInsights'
import DebugReport from './DebugReport'
import { ArrowLeft, BarChart3, Table, TrendingUp, AlertCircle } from 'lucide-react'
import { formatCurrency, formatNumber } from '../lib/utils'

const ResultsDashboard = ({ data, isManualInput = false, onBack }) => {
  const { detailedPeriod, setDetailedPeriod } = useOptimizationStore()
  
  if (!data) return null
  
  const { result, prices, params, title } = data

  // Validate that we have valid schedule data
  const hasValidSchedule = result && result.schedule && 
    Array.isArray(result.schedule.soc) && 
    Array.isArray(result.schedule.charging) && 
    Array.isArray(result.schedule.discharging) && 
    Array.isArray(result.schedule.revenue) &&
    result.schedule.soc.length > 0

  if (!hasValidSchedule) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground mt-1">
              Optimization results and detailed analysis
            </p>
          </div>
          {!isManualInput && (
            <Button
              onClick={onBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Summary
            </Button>
          )}
        </div>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">No Valid Schedule Data</h3>
              <p className="text-red-700 mt-1">
                This period has no valid optimization schedule data. This could be due to:
              </p>
              <ul className="list-disc list-inside text-red-600 mt-2 space-y-1">
                <li>Insufficient price data for optimization</li>
                <li>Optimization failed for this period</li>
                <li>Zero revenue period with no trading activity</li>
              </ul>
              <div className="mt-4">
                <p className="text-sm text-red-600">
                  <strong>Period:</strong> {result?.period || 'Unknown'}<br/>
                  <strong>Total Revenue:</strong> {result?.totalRevenue ? formatCurrency(result.totalRevenue) : 'N/A'}<br/>
                  <strong>Data Points:</strong> {result?.dataPoints || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">
            Optimization results and detailed analysis
          </p>
        </div>
        {!isManualInput && (
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Summary
          </Button>
        )}
      </div>

      {/* Metrics Grid */}
      <MetricsGrid result={result} />

      {/* AI Insights */}
      <AIInsights 
        onGetInsights={(result, params) => {
          // This will be handled by the parent component
        }}
        result={result}
        params={params}
      />

      {/* Debug Report */}
      {result.schedule.debugReport && (
        <DebugReport debugReport={result.schedule.debugReport} />
      )}

      {/* Interactive Chart Section */}
      <InteractiveChart
        prices={prices}
        priceCategories={result.priceCategories}
        soc={result.schedule.soc}
        charging={result.schedule.charging}
        discharging={result.schedule.discharging}
        revenue={result.schedule.revenue}
        timestamps={result.schedule.timestamps || null}
        title={title}
      />

      {/* HMM Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transition Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              HMM Transition Matrix
            </CardTitle>
            <CardDescription>
              Probability of transitioning between price states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg"></th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Low→</th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Medium→</th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">High→</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transitionMatrix.map((row, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <th className="p-2 font-semibold text-gray-700">
                        {['Low', 'Medium', 'High'][i]}
                      </th>
                      {row.map((val, j) => (
                        <td key={j} className="p-2 border border-gray-200 text-center">
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Emission Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Emission Matrix
            </CardTitle>
            <CardDescription>
              Action probabilities for each price category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg">Price Category</th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Charge</th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Idle</th>
                    <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">Discharge</th>
                  </tr>
                </thead>
                <tbody>
                  {result.emissionMatrix.map((row, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <th className="p-2 font-semibold text-gray-700">
                        {['Low', 'Medium', 'High'][i]}
                      </th>
                      {row.map((val, j) => (
                        <td key={j} className="p-2 border border-gray-200 text-center">
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

export default ResultsDashboard 