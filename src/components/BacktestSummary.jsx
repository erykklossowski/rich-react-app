import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useOptimizationStore } from '../store/optimizationStore'
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Euro, 
  Battery,
  ArrowRight,
  Filter,
  SortAsc,
  SortDesc,
  Table
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDate } from '../lib/utils'
import { Line, Bar } from 'react-chartjs-2'

const BacktestSummary = ({ backtestResults, onShowPeriodDetail }) => {
  const [sortField, setSortField] = useState('totalRevenue')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filterProfitable, setFilterProfitable] = useState(false)

  if (!backtestResults) return null

  const { results, analysisType, dateRange, params } = backtestResults

  // Sorting and filtering
  let filteredResults = [...results]
  
  if (filterProfitable) {
    filteredResults = filteredResults.filter(r => r.totalRevenue > 0)
  }

  filteredResults.sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  })

  // Calculate summary statistics
  const totalRevenue = results.reduce((sum, r) => sum + r.totalRevenue, 0)
  const avgRevenue = totalRevenue / results.length
  const bestPeriod = results.reduce((best, current) => 
    current.totalRevenue > best.totalRevenue ? current : best
  )
  const worstPeriod = results.reduce((worst, current) => 
    current.totalRevenue < worst.totalRevenue ? current : worst
  )
  const profitablePeriods = results.filter(r => r.totalRevenue > 0).length
  const totalEnergy = results.reduce((sum, r) => sum + r.totalEnergyDischarged, 0)
  const revenuePerMWh = totalEnergy > 0 ? totalRevenue / totalEnergy * 1000 : 0

  // Risk-adjusted return calculation
  const revenues = results.map(r => r.totalRevenue)
  const avgRevenueForRisk = revenues.reduce((a, b) => a + b, 0) / revenues.length
  const revenueStd = Math.sqrt(revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenueForRisk, 2), 0) / revenues.length)
  const riskAdjustedReturn = revenueStd > 0 ? avgRevenueForRisk / revenueStd : 0

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <SortAsc className="h-4 w-4 opacity-50" />
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />
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
          <h2 className="text-3xl font-bold text-foreground">
            Backtest Summary: {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis
          </h2>
          <p className="text-muted-foreground mt-1">
            {formatDate(dateRange.start)} to {formatDate(dateRange.end)} • {results.length} periods analyzed
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <Euro className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avg Revenue/Period</p>
                <p className="text-2xl font-bold">{formatCurrency(avgRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Risk-Adj. Return</p>
                <p className="text-2xl font-bold">{formatNumber(riskAdjustedReturn)}</p>
              </div>
              <BarChart3 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Energy</p>
                <p className="text-2xl font-bold">{formatNumber(totalEnergy / 1000, 1)} GWh</p>
              </div>
              <Battery className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(bestPeriod.totalRevenue)}
                </p>
                <p className="text-sm text-green-700">Best: {bestPeriod.period}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(worstPeriod.totalRevenue)}
                </p>
                <p className="text-sm text-red-700">Worst: {worstPeriod.period}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(revenuePerMWh)}
                </p>
                <p className="text-sm text-blue-700">Revenue per MWh</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {profitablePeriods}/{results.length}
                </p>
                <p className="text-sm text-purple-700">Profitable Periods</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={{
                labels: results.map(r => r.period),
                datasets: [{
                  label: 'Revenue (€)',
                  data: results.map(r => r.totalRevenue),
                  borderColor: '#667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  pointBackgroundColor: results.map(r => r.totalRevenue > 0 ? '#27ae60' : '#e74c3c'),
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  tension: 0.3,
                  fill: true
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { 
                    title: { display: true, text: 'Revenue (€)' },
                    beginAtZero: true
                  },
                  x: { title: { display: true, text: 'Period' } }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={filterProfitable ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterProfitable(!filterProfitable)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Profitable Only
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Click on any row to view detailed analysis
        </p>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Period Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('period')}
                  >
                    <div className="flex items-center gap-2">
                      Period
                      <SortIcon field="period" />
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('totalRevenue')}
                  >
                    <div className="flex items-center gap-2">
                      Revenue (€)
                      <SortIcon field="totalRevenue" />
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('totalEnergyDischarged')}
                  >
                    <div className="flex items-center gap-2">
                      Energy (MWh)
                      <SortIcon field="totalEnergyDischarged" />
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('avgPrice')}
                  >
                    <div className="flex items-center gap-2">
                      Avg Price (€/MWh)
                      <SortIcon field="avgPrice" />
                    </div>
                  </th>
                  <th className="text-left p-3">Data Points</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r, index) => (
                  <tr 
                    key={index} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => onShowPeriodDetail(r.period)}
                  >
                    <td className="p-3 font-medium">{r.period}</td>
                    <td className={`p-3 ${r.totalRevenue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(r.totalRevenue)}
                    </td>
                    <td className="p-3">{formatNumber(r.totalEnergyDischarged)}</td>
                    <td className="p-3">{formatCurrency(r.avgPrice)}</td>
                    <td className="p-3">{r.dataPoints}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BacktestSummary 