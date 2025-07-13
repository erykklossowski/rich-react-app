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
      className="space-y-4"
    >
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Column - Price Data */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Price Data</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-bold">Day-Ahead Electricity Prices</span>
            </div>
            <textarea
              placeholder="45.2, 38.7, 35.1, 42.8, 55.3, 67.9, 89.4, 95.2, 87.6, 78.3, 65.4, 58.7, 52.1, 49.8, 46.3, 43.9, 48.2, 56.7, 72.8, 89.3, 95.8, 88.4, 76.2, 63.5"
              value={priceData}
              onChange={(e) => setPriceData(e.target.value)}
              className="amiga-input w-full h-24 resize-none text-xs"
            />
            <p className="text-xs text-[#555555] mt-1">
              Enter 24 comma-separated values (EUR/MWh)
            </p>
          </div>
        </div>

        {/* Right Column - Battery Parameters */}
        <div className="amiga-window">
          <div className="amiga-titlebar">
            <span>Battery Parameters</span>
            <div className="amiga-gadget">×</div>
          </div>
          <div className="p-3 space-y-3">
            {/* Max Power */}
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Zap className="h-3 w-3" />
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
            </div>

            {/* Efficiency */}
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Battery className="h-3 w-3" />
                Efficiency: {formatNumber(efficiency * 100, 0)}%
              </label>
              <Slider
                value={[efficiency]}
                onValueChange={(value) => handleSliderChange(value, setEfficiency)}
                max={1}
                min={0.5}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* SoC Range - Two Sliders */}
            <div className="space-y-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Battery className="h-3 w-3" />
                SoC Range: {formatNumber(socMin)}-{formatNumber(socMax)} MWh
              </label>
              <div className="space-y-3">
                {/* Max SoC Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Max SoC</span>
                    <span>{(socMax / pMax).toFixed(1)}x Max Power ({formatNumber(socMax)} MWh)</span>
                  </div>
                  <Slider
                    value={[socMax / pMax]}
                    onValueChange={(value) => {
                      const socFactor = value[0]
                      const newMax = pMax * socFactor
                      // Adjust min SoC to maintain current DoD percentage
                      const currentDoDPercent = ((socMax - socMin) / socMax) * 100
                      const newMin = newMax * (1 - currentDoDPercent / 100)
                      setSocMin(newMin)
                      setSocMax(newMax)
                    }}
                    max={6}
                    min={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs">
                    <span>1x ({formatNumber(pMax)} MWh)</span>
                    <span>6x ({formatNumber(pMax * 6)} MWh)</span>
                  </div>
                </div>

                {/* DoD Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Depth of Discharge</span>
                    <span>{((socMax - socMin) / socMax * 100).toFixed(1)}% ({formatNumber(socMax - socMin)} MWh)</span>
                  </div>
                  <Slider
                    value={[(socMax - socMin) / socMax * 100]}
                    onValueChange={(value) => {
                      const dodPercent = value[0]
                      const newMin = socMax * (1 - dodPercent / 100)
                      setSocMin(newMin)
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

      {/* Action Buttons */}
      <div className="amiga-window">
        <div className="amiga-titlebar">
          <span>Actions</span>
          <div className="amiga-gadget">×</div>
        </div>
        <div className="p-3">
          <div className="flex gap-3">
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
                  Optimize Battery
                </>
              )}
            </button>
            <button
              onClick={onGenerateSample}
              className="amiga-button flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Sample
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ManualInputForm 