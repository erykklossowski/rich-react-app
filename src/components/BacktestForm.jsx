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
      className="space-y-4"
    >
      {/* Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Left Column - Dataset Info */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Dataset</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2 mb-2">
              <Database className="h-4 w-4 mt-0.5" />
              <span className="text-xs font-bold">Polish Electricity Market</span>
            </div>
            <div className="text-xs text-[#555555] space-y-1">
              <div><strong>Period:</strong> 2015-2025</div>
              <div><strong>Records:</strong> 91,790 hourly</div>
              <div><strong>Price Range:</strong> -133 to 771 €/MWh</div>
              <div><strong>Average:</strong> 73.72 €/MWh</div>
            </div>
          </div>
        </div>

        {/* Middle Column - Parameters */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Parameters</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-3 space-y-3">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min="2015-01-01"
                  max="2025-06-21"
                  className="amiga-input text-xs"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min="2015-01-01"
                  max="2025-06-21"
                  className="amiga-input text-xs"
                />
              </div>
            </div>

            {/* Analysis Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Analysis Type
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="amiga-input text-xs w-full"
              >
                {analysisTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Battery Parameters - Compact */}
            <div className="space-y-2">
              <div className="text-xs font-bold flex items-center gap-1">
                <Battery className="h-3 w-3" />
                Battery Settings
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs">Power: {formatNumber(backtestParams.pMax)} MW</label>
                  <Slider
                    value={[backtestParams.pMax]}
                    onValueChange={(value) => handleSliderChange(value, 'pMax')}
                    max={50}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs">Efficiency: {formatNumber(backtestParams.efficiency * 100, 0)}%</label>
                  <Slider
                    value={[backtestParams.efficiency]}
                    onValueChange={(value) => handleSliderChange(value, 'efficiency')}
                    max={1}
                    min={0.5}
                    step={0.01}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs">Battery Capacity Configuration</label>
                  <div className="space-y-3">
                    {/* Max SoC Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Max SoC</span>
                        <span>{(backtestParams.socMax / backtestParams.pMax).toFixed(1)}x Max Power ({formatNumber(backtestParams.socMax)} MWh)</span>
                      </div>
                      <Slider
                        value={[backtestParams.socMax / backtestParams.pMax]}
                        onValueChange={(value) => {
                          const socFactor = value[0]
                          const newMax = backtestParams.pMax * socFactor
                          // Keep the same DoD percentage when Max SoC changes
                          const currentDoDPercent = ((backtestParams.socMax - backtestParams.socMin) / backtestParams.socMax) * 100
                          const newMin = newMax * (1 - currentDoDPercent / 100)
                          handleSliderChange([newMax], 'socMax')
                          handleSliderChange([newMin], 'socMin')
                        }}
                        max={6}
                        min={1}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs">
                        <span>1x ({formatNumber(backtestParams.pMax)} MWh)</span>
                        <span>6x ({formatNumber(backtestParams.pMax * 6)} MWh)</span>
                      </div>
                    </div>

                    {/* DoD Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Depth of Discharge</span>
                        <span>{((backtestParams.socMax - backtestParams.socMin) / backtestParams.socMax * 100).toFixed(1)}% ({formatNumber(backtestParams.socMax - backtestParams.socMin)} MWh)</span>
                      </div>
                      <Slider
                        value={[(backtestParams.socMax - backtestParams.socMin) / backtestParams.socMax * 100]}
                        onValueChange={(value) => {
                          const dodPercent = value[0]
                          const newMin = backtestParams.socMax * (1 - dodPercent / 100)
                          handleSliderChange([newMin], 'socMin')
                        }}
                        max={50}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs">
                        <span>0%</span>
                        <span>50%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Actions</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-3 space-y-3">
            <button
              onClick={onRunBacktest}
              disabled={loading}
              className="amiga-button primary w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </>
              )}
            </button>
            <button
              onClick={onLoadPresets}
              className="amiga-button w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Load Presets
            </button>
            <button
              onClick={onTestConnection}
              className="amiga-button w-full"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Test Connection
            </button>

            {/* Progress Bar */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#555555]">{progressText}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-[#AAAAAA] border-2 inset border-[#AAAAAA] h-2">
                  <motion.div
                    className="bg-[#0055AA] h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default BacktestForm 