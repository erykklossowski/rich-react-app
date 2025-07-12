import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { useOptimizationStore } from '../store/optimizationStore'
import { Battery, Zap, TrendingUp, Settings } from 'lucide-react'
import { formatNumber } from '../lib/utils'

const ManualInputForm = ({ onOptimize, onGenerateSample }) => {
  const {
    priceData,
    pMax,
    socMin,
    socMax,
    efficiency,
    setPriceData,
    setPMax,
    setSocMin,
    setSocMax,
    setEfficiency,
    loading
  } = useOptimizationStore()

  const handleSliderChange = (value, setter) => {
    console.log('Slider changed:', value)
    setter(value[0])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="amiga-window w-full">
        <div className="amiga-titlebar">
          <span>Manual Price Input</span>
          <div className="amiga-gadget">×</div>
        </div>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-bold">Enter 24-hour electricity prices and configure battery parameters for optimization</span>
          </div>
          {/* Price Data Input */}
          <div className="space-y-2">
            <label htmlFor="priceData" className="flex items-center gap-2 text-sm font-bold">
              <TrendingUp className="h-4 w-4" />
              Day-Ahead Electricity Prices (EUR/MWh)
            </label>
            <textarea
              id="priceData"
              placeholder="45.2, 38.7, 35.1, 42.8, 55.3, 67.9, 89.4, 95.2, 87.6, 78.3, 65.4, 58.7, 52.1, 49.8, 46.3, 43.9, 48.2, 56.7, 72.8, 89.3, 95.8, 88.4, 76.2, 63.5"
              value={priceData}
              onChange={(e) => setPriceData(e.target.value)}
              className="amiga-input w-full h-20 resize-none"
            />
            <p className="text-xs text-[#555555]">
              Enter 24 comma-separated values representing hourly prices
            </p>
          </div>

          {/* Battery Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Power */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <Zap className="h-4 w-4" />
                Max Power: {formatNumber(pMax)} MW
              </label>
              <Slider
                value={[pMax]}
                onValueChange={(value) => handleSliderChange(value, setPMax)}
                max={50}
                min={1}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#555555]">
                <span>1 MW</span>
                <span>50 MW</span>
              </div>
            </div>

            {/* Efficiency */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <Battery className="h-4 w-4" />
                Round-trip Efficiency: {formatNumber(efficiency * 100, 0)}%
              </label>
              <Slider
                value={[efficiency]}
                onValueChange={(value) => handleSliderChange(value, setEfficiency)}
                max={1}
                min={0.5}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#555555]">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Min SoC */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <Battery className="h-4 w-4" />
                Min SoC: {formatNumber(socMin)} MWh
              </label>
              <Slider
                value={[socMin]}
                onValueChange={(value) => handleSliderChange(value, setSocMin)}
                max={socMax - 1}
                min={1}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#555555]">
                <span>1 MWh</span>
                <span>{formatNumber(socMax - 1)} MWh</span>
              </div>
            </div>

            {/* Max SoC */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <Battery className="h-4 w-4" />
                Max SoC: {formatNumber(socMax)} MWh
              </label>
              <Slider
                value={[socMax]}
                onValueChange={(value) => handleSliderChange(value, setSocMax)}
                max={100}
                min={socMin + 1}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-xs text-[#555555]">
                <span>{formatNumber(socMin + 1)} MWh</span>
                <span>100 MWh</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onOptimize}
              disabled={loading || !priceData.trim()}
              className="amiga-button primary flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Battery Operation
                </>
              )}
            </button>
            <button
              onClick={onGenerateSample}
              className="amiga-button flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Sample Data
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ManualInputForm 