import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { useOptimizationStore } from '../store/optimizationStore'
import { 
  Calendar, 
  Zap, 
  Battery, 
  Settings, 
  Database, 
  Play,
  RotateCcw,
  Wifi
} from 'lucide-react'
import { formatNumber } from '../lib/utils'

const BacktestForm = ({ onRunBacktest, onLoadPresets, onTestConnection }) => {
  const {
    startDate,
    endDate,
    analysisType,
    backtestParams,
    setStartDate,
    setEndDate,
    setAnalysisType,
    updateBacktestParams,
    loading,
    progress,
    progressText
  } = useOptimizationStore()

  const handleSliderChange = (value, param) => {
    updateBacktestParams({ [param]: value[0] })
  }

  const analysisTypes = [
    { value: 'continuous', label: 'Continuous Period' },
    { value: 'monthly', label: 'Monthly Analysis' },
    { value: 'quarterly', label: 'Quarterly Analysis' },
    { value: 'yearly', label: 'Yearly Analysis' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Historical Backtesting
          </CardTitle>
          <CardDescription>
            Analyze battery performance using historical Polish electricity market data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Source Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Polish Electricity Market Dataset</h4>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Period:</strong> January 2015 - June 2025 (91,790 hourly records)<br />
                  <strong>Price Range:</strong> -132.95 to 771.00 EUR/MWh<br />
                  <strong>Average Price:</strong> 73.72 EUR/MWh
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min="2015-01-01"
                max="2025-06-21"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min="2015-01-01"
                max="2025-06-21"
              />
            </div>
          </div>

          {/* Analysis Type */}
          <div className="space-y-2">
            <Label htmlFor="analysisType" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Analysis Type
            </Label>
            <select
              id="analysisType"
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {analysisTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Battery Parameters */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Battery className="h-4 w-4" />
              Battery Parameters
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Power */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Max Power: {formatNumber(backtestParams.pMax)} MW
                </Label>
                <Slider
                  value={[backtestParams.pMax]}
                  onValueChange={(value) => handleSliderChange(value, 'pMax')}
                  max={50}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 MW</span>
                  <span>50 MW</span>
                </div>
              </div>

              {/* Efficiency */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Battery className="h-4 w-4" />
                  Round-trip Efficiency: {formatNumber(backtestParams.efficiency * 100, 0)}%
                </Label>
                <Slider
                  value={[backtestParams.efficiency]}
                  onValueChange={(value) => handleSliderChange(value, 'efficiency')}
                  max={1}
                  min={0.5}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Min SoC */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Battery className="h-4 w-4" />
                  Min SoC: {formatNumber(backtestParams.socMin)} MWh
                </Label>
                <Slider
                  value={[backtestParams.socMin]}
                  onValueChange={(value) => handleSliderChange(value, 'socMin')}
                  max={backtestParams.socMax - 1}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 MWh</span>
                  <span>{formatNumber(backtestParams.socMax - 1)} MWh</span>
                </div>
              </div>

              {/* Max SoC */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Battery className="h-4 w-4" />
                  Max SoC: {formatNumber(backtestParams.socMax)} MWh
                </Label>
                <Slider
                  value={[backtestParams.socMax]}
                  onValueChange={(value) => handleSliderChange(value, 'socMax')}
                  max={100}
                  min={backtestParams.socMin + 1}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatNumber(backtestParams.socMin + 1)} MWh</span>
                  <span>100 MWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={onRunBacktest}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Historical Backtest
                </>
              )}
            </Button>
            <Button
              onClick={onLoadPresets}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Load Presets
            </Button>
            <Button
              onClick={onTestConnection}
              variant="outline"
              size="lg"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progressText}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default BacktestForm 