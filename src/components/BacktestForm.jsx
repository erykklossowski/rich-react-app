import React, { useState } from 'react';
import { useOptimizationStore } from '../store/optimizationStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const BacktestForm = () => {
  const {
    startDate,
    endDate,
    batteryCapacity,
    batteryEfficiency,
    maxPower,
    minPower,
    initialSOC,
    targetSOC,
    setStartDate,
    setEndDate,
    setBatteryCapacity,
    setBatteryEfficiency,
    setMaxPower,
    setMinPower,
    setInitialSOC,
    setTargetSOC,
    runBacktest,
    isRunning,
    results,
    error
  } = useOptimizationStore();

  const [activeTab, setActiveTab] = useState('parameters');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runBacktest();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Battery Energy Storage Optimization
        </CardTitle>
        <p className="text-center text-gray-600">
          Optimize battery operation using real Polish electricity market data
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="dates">Date Range</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="parameters" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batteryCapacity">Battery Capacity (MWh)</Label>
                  <Input
                    id="batteryCapacity"
                    type="number"
                    value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                    min="0.1"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batteryEfficiency">Battery Efficiency (%)</Label>
                  <Input
                    id="batteryEfficiency"
                    type="number"
                    value={batteryEfficiency}
                    onChange={(e) => setBatteryEfficiency(parseFloat(e.target.value))}
                    min="0.1"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPower">Max Power (MW)</Label>
                  <Input
                    id="maxPower"
                    type="number"
                    value={maxPower}
                    onChange={(e) => setMaxPower(parseFloat(e.target.value))}
                    min="0.1"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPower">Min Power (MW)</Label>
                  <Input
                    id="minPower"
                    type="number"
                    value={minPower}
                    onChange={(e) => setMinPower(parseFloat(e.target.value))}
                    min="0.1"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialSOC">Initial State of Charge (%)</Label>
                  <Slider
                    id="initialSOC"
                    value={[initialSOC]}
                    onValueChange={([value]) => setInitialSOC(value)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">{initialSOC}%</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetSOC">Target State of Charge (%)</Label>
                  <Slider
                    id="targetSOC"
                    value={[targetSOC]}
                    onValueChange={([value]) => setTargetSOC(value)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500">{targetSOC}%</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isRunning}
              className="px-8 py-3 text-lg font-semibold"
            >
              {isRunning ? 'Running Optimization...' : 'Run Backtest'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default BacktestForm; 