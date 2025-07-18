import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useOptimizationStore } from '../store/optimizationStore'
import { PriceChart, SoCChart, PowerChart, RevenueChart } from './ChartComponents'
import MetricsGrid from './MetricsGrid'
import AIInsights from './AIInsights'
import DebugReport from './DebugReport'
import { ArrowLeft, BarChart3, Table, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '../lib/utils'

const ResultsDashboard = ({ data, isManualInput = false, onBack }) => {
  const { detailedPeriod, setDetailedPeriod } = useOptimizationStore()
  
  if (!data) return null
  
  const { result, prices, params, title } = data

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Electricity Prices
            </CardTitle>
            <CardDescription>
              15-minute prices with HMM category coloring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceChart 
              data={prices} 
              priceCategories={result.priceCategories} 
              title=""
            />
          </CardContent>
        </Card>

        {/* SoC Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Battery State of Charge
            </CardTitle>
            <CardDescription>
              Energy level throughout the optimization period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Debug: Log the SoC data being passed */}
            {console.log('ResultsDashboard SoC Debug:', {
              socData: result.schedule.soc,
              socLength: result.schedule.soc.length,
              firstFew: result.schedule.soc.slice(0, 5),
              lastFew: result.schedule.soc.slice(-5)
            })}
            <SoCChart data={result.schedule.soc} title="" />
          </CardContent>
        </Card>

        {/* Power Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Battery Power Schedule
            </CardTitle>
            <CardDescription>
              Charging and discharging power over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PowerChart 
              charging={result.schedule.charging} 
              discharging={result.schedule.discharging} 
              title=""
            />
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              15-minute Revenue
            </CardTitle>
            <CardDescription>
              Revenue generated each hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={result.schedule.revenue} title="" />
          </CardContent>
        </Card>
      </div>

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