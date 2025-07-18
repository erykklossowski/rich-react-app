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
  Table,
  AlertTriangle,
  Bug
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDate } from '../lib/utils'
import { cn } from '../lib/utils'
import { Line, Bar } from 'react-chartjs-2'

const BacktestSummary = ({ backtestResults, onShowPeriodDetail }) => {
  const [sortField, setSortField] = useState('totalRevenue')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filterProfitable, setFilterProfitable] = useState(false)

  if (!backtestResults) return null

  const { results, analysisType, dateRange, params, categorizationMethod, categorizationOptions } = backtestResults

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
          <p className="text-muted-foreground text-sm">
            Categorization Method: <span className="font-medium">{categorizationMethod}</span>
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
              <TrendingUp className="h-8 w-8 opacity-80" />
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
                labels: results.map(r => {
                  // Use actual timestamps if available, otherwise format period labels
                  if (r.periodStart && r.periodEnd) {
                    // Use the start of the period as the label
                    try {
                      const startDate = new Date(r.periodStart);
                      if (!isNaN(startDate.getTime())) {
                        return startDate.toLocaleDateString('pl-PL', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                    } catch (error) {
                      console.error('Error parsing period start date:', error);
                    }
                  }
                  
                  // Fallback to period formatting
                  if (r.period.includes('-')) {
                    // Monthly format: "2024-06" -> "Jun 2024"
                    const [year, month] = r.period.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  } else if (r.period.includes('Q')) {
                    // Quarterly format: "2024-Q1" -> "Q1 2024"
                    return r.period.replace('-', ' ');
                  } else {
                    // Yearly or other format
                    return r.period;
                  }
                }),
                datasets: [{
                  label: 'Revenue (PLN)',
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
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => {
                        return `Period: ${context[0].label}`;
                      },
                      label: (context) => {
                        const result = results[context.dataIndex];
                        return [
                          `Revenue: ${formatCurrency(context.parsed.y)}`,
                          `Energy: ${formatNumber(result.totalEnergyDischarged)} MWh`,
                          `Data Points: ${result.dataPoints}`
                        ];
                      }
                    }
                  }
                },
                scales: {
                  y: { 
                    title: { display: true, text: 'Revenue (PLN)' },
                    beginAtZero: false, // Don't force zero to avoid compression
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)',
                      drawBorder: false,
                      lineWidth: 0.5
                    },
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value);
                      }
                    }
                  },
                  x: { 
                    title: { display: true, text: 'Period' },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.03)',
                      drawBorder: false,
                      lineWidth: 0.5
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Warnings Display */}
      {backtestResults.warnings && backtestResults.warnings.length > 0 && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Data Quality Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backtestResults.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-orange-700">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Incomplete periods have been excluded from analysis to ensure accurate results.
            </p>
          </CardContent>
        </Card>
      )}

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
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { generateDataPathDebug } = useOptimizationStore.getState()
              console.log('🔍 Starting comprehensive data path debug...')
              const debugReport = await generateDataPathDebug()
              console.log('📋 Full debug report:', debugReport)
              alert(`Debug completed! Check console for detailed report.\n\nIssues found: ${debugReport.issues?.length || 0}\nRecommendations: ${debugReport.recommendations?.length || 0}`)
            }}
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug Data Path
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Click on any row to view detailed analysis
        </p>
      </div>

      {/* Period Icons Grid - AmigaOS Style */}
      <div className="amiga-window">
        <div className="amiga-titlebar">
          <span>Period Analysis Icons</span>
          <div className="amiga-gadget">×</div>
        </div>
        <div className="p-4">
          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <button
              className={cn(
                "amiga-button text-xs",
                filterProfitable && "primary"
              )}
              onClick={() => setFilterProfitable(!filterProfitable)}
            >
              <Filter className="h-3 w-3 mr-1" />
              Profitable Only
            </button>
            <span className="text-xs text-[#555555]">
              Click icons to view detailed analysis
            </span>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredResults.map((r, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="amiga-icon cursor-pointer"
                onClick={() => onShowPeriodDetail(r.period)}
              >
                <div className={cn(
                  "amiga-icon-bg p-3 text-center border-2 outset",
                  r.totalRevenue > 0 
                    ? "border-[#00AA00] bg-gradient-to-b from-[#00CC00] to-[#008800]" 
                    : "border-[#AA0000] bg-gradient-to-b from-[#CC0000] to-[#880000]"
                )}>
                  <div className="text-white mb-2">
                    {r.totalRevenue > 0 ? (
                      <TrendingUp className="h-6 w-6 mx-auto" />
                    ) : (
                      <BarChart3 className="h-6 w-6 mx-auto" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-white">
                    {r.period}
                  </div>
                </div>
                <div className="amiga-icon-label text-xs text-center mt-1 px-1">
                  <div className="font-bold">
                    {formatCurrency(r.totalRevenue)}
                  </div>
                  <div className="text-[#555555]">
                    {formatNumber(r.totalEnergyDischarged)} MWh
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="amiga-window p-2">
              <div className="text-xs font-bold text-[#0055AA]">Total Revenue</div>
              <div className="text-xs">{formatCurrency(totalRevenue)}</div>
            </div>
            <div className="amiga-window p-2">
              <div className="text-xs font-bold text-[#0055AA]">Avg Revenue</div>
              <div className="text-xs">{formatCurrency(avgRevenue)}</div>
            </div>
            <div className="amiga-window p-2">
              <div className="text-xs font-bold text-[#0055AA]">Profitable</div>
              <div className="text-xs">{profitablePeriods}/{results.length}</div>
            </div>
            <div className="amiga-window p-2">
              <div className="text-xs font-bold text-[#0055AA]">Total Energy</div>
              <div className="text-xs">{formatNumber(totalEnergy / 1000, 1)} GWh</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default BacktestSummary 