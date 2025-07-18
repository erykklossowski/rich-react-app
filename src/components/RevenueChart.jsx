import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, TrendingUp, X, Maximize2 } from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import { useOptimizationStore } from '../store/optimizationStore';
import InteractiveChart from './InteractiveChart';
import MetricsGrid from './MetricsGrid';
import AIInsights from './AIInsights';
import { formatCurrency, formatNumber } from '../lib/utils';

Chart.register(...registerables);

const RevenueChart = ({ results }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { setDetailedPeriod } = useOptimizationStore();

  // Debug logging to track data flow
  useEffect(() => {
    console.log('🔍 RevenueChart Debug:');
    console.log('  Results received:', results);
    console.log('  Results length:', results?.length || 0);
    console.log('  Results type:', typeof results);
    
    if (results && results.length > 0) {
      console.log('  First result:', results[0]);
      console.log('  Last result:', results[results.length - 1]);
      
      // Check for NaN values
      const nanResults = results.filter(r => 
        isNaN(r.totalRevenue) || 
        isNaN(r.totalEnergyDischarged) || 
        isNaN(r.dataPoints)
      );
      
      if (nanResults.length > 0) {
        console.log('  ❌ NaN VALUES DETECTED:', nanResults);
      } else {
        console.log('  ✅ No NaN values found');
      }
    }
  }, [results]);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (!results || results.length === 0) {
      console.log('  ⚠️  No results provided to RevenueChart');
      return;
    }

    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: enhancedOptions
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [results]);

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  // Check if all results have invalid revenue values
  const validResults = results.filter(r => 
    r.totalRevenue !== undefined && 
    r.totalRevenue !== null && 
    !isNaN(r.totalRevenue)
  );
  
  if (validResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No valid revenue data available</p>
          <p className="text-xs text-red-500 mt-2">
            All revenue values are invalid (NaN, undefined, or null). 
            This may indicate a data loading issue.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort results by period
  const sortedResults = [...results].sort((a, b) => {
    const dateA = new Date(a.periodStart || a.period);
    const dateB = new Date(b.periodStart || b.period);
    return dateA - dateB;
  });

  // Format currency in PLN
  const formatPLN = (amount) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format period labels
  const formatPeriod = (period) => {
    if (period.includes('-')) {
      const [year, month] = period.split('-');
      const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                         'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    return period;
  };

  // Calculate chart statistics with validation
  const totalRevenue = sortedResults.reduce((sum, r) => {
    if (isNaN(r.totalRevenue) || r.totalRevenue === undefined || r.totalRevenue === null) {
      console.log('  ❌ Invalid value detected in totalRevenue calculation for period:', r.period, 'value:', r.totalRevenue);
      return sum;
    }
    return sum + r.totalRevenue;
  }, 0);
  
  const avgRevenue = sortedResults.length > 0 ? totalRevenue / sortedResults.length : 0;
  let maxRevenue = sortedResults.length > 0 ? Math.max(...sortedResults.map(r => (r.totalRevenue && !isNaN(r.totalRevenue)) ? r.totalRevenue : -Infinity)) : 0;
  let minRevenue = sortedResults.length > 0 ? Math.min(...sortedResults.map(r => (r.totalRevenue && !isNaN(r.totalRevenue)) ? r.totalRevenue : Infinity)) : 0;
  
  // Validate summary calculations
  if (isNaN(totalRevenue) || isNaN(avgRevenue) || isNaN(maxRevenue) || isNaN(minRevenue)) {
    console.log('  ❌ NaN detected in summary calculations:');
    console.log('    totalRevenue:', totalRevenue);
    console.log('    avgRevenue:', avgRevenue);
    console.log('    maxRevenue:', maxRevenue);
    console.log('    minRevenue:', minRevenue);
  } else {
    console.log('  ✅ Summary calculations valid');
  }
  
  // Handle edge cases where all values are invalid
  if (maxRevenue === -Infinity) {
    console.log('  ⚠️  All revenue values are invalid, setting maxRevenue to 0');
    maxRevenue = 0;
  }
  if (minRevenue === Infinity) {
    console.log('  ⚠️  All revenue values are invalid, setting minRevenue to 0');
    minRevenue = 0;
  }

  // Prepare chart data with validation
  const chartLabels = sortedResults.map(r => formatPeriod(r.period));
  const chartValues = sortedResults.map(r => {
    if (isNaN(r.totalRevenue) || r.totalRevenue === undefined || r.totalRevenue === null) {
      console.log('  ❌ Invalid value detected in chart data for period:', r.period, 'value:', r.totalRevenue);
      return 0;
    }
    return r.totalRevenue;
  });
  
  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Revenue (PLN)',
      data: chartValues,
      backgroundColor: chartValues.map(value => 
        value > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
      ),
      borderColor: chartValues.map(value => 
        value > 0 ? '#22c55e' : '#ef4444'
      ),
      borderWidth: 2,
      borderRadius: 4,
      hoverBackgroundColor: chartValues.map(value => 
        value > 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
      ),
      hoverBorderColor: chartValues.map(value => 
        value > 0 ? '#16a34a' : '#dc2626'
      ),
      hoverBorderWidth: 3,
    }]
  };
  
  // Validate chart data
  if (chartValues.some(v => isNaN(v))) {
    console.log('  ❌ NaN detected in chart values');
  } else {
    console.log('  ✅ Chart data valid');
  }

  // Enhanced chart options with click handling
  const enhancedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: (context) => {
            return `Period: ${context[0].label}`;
          },
          label: (context) => {
            const result = sortedResults[context.dataIndex];
            return [
              `Revenue: ${formatPLN(context.parsed.y)}`,
              `Energy: ${result.totalEnergyDischarged?.toFixed(1) || 'N/A'} MWh`,
              `Data Points: ${result.dataPoints || 'N/A'}`,
              `Click for detailed analysis`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: { 
          display: true, 
          text: 'Revenue (PLN)',
          font: { weight: 'bold' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
          lineWidth: 0.5
        },
        ticks: {
          callback: function(value) {
            return formatPLN(value);
          },
          font: { size: 12 }
        },
        // Dynamic scaling to prevent compression
        afterDataLimits: (axis) => {
          const range = axis.max - axis.min;
          const padding = range * 0.15; // 15% padding for better scaling
          axis.min = axis.min - padding;
          axis.max = axis.max + padding;
        }
      },
      x: {
        title: { 
          display: true, 
          text: 'Period',
          font: { weight: 'bold' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
          lineWidth: 0.5
        },
        ticks: {
          maxRotation: 45,
          font: { size: 11 }
        }
      }
    },
    elements: {
      bar: {
        borderSkipped: false,
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const selectedResult = sortedResults[index];
        console.log('Clicked on period:', selectedResult.period, selectedResult);
        
        // Set the detailed period in store
        setDetailedPeriod(selectedResult);
        setSelectedMonth(selectedResult);
        setShowDetailModal(true);
      }
    },
    onHover: (event, elements) => {
      const canvas = event.native.target;
      if (elements.length > 0) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  // Handle month detail analysis
  const handleMonthDetail = (monthData) => {
    if (!monthData || !monthData.schedule) {
      console.log('No valid schedule data for month:', monthData);
      return null;
    }

    return {
      result: monthData,
      prices: monthData.prices || [],
      params: {
        pMax: monthData.params?.pMax || 10,
        socMin: monthData.params?.socMin || 10,
        socMax: monthData.params?.socMax || 40,
        efficiency: monthData.params?.efficiency || 0.85
      },
      title: `Detailed Analysis - ${formatPeriod(monthData.period)}`
    };
  };

  const monthDetailData = selectedMonth ? handleMonthDetail(selectedMonth) : null;

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Interactive Revenue by Period
            <span className="text-sm text-muted-foreground ml-2">
              (Click any bar for detailed analysis)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-xl font-bold">{formatPLN(totalRevenue)}</p>
              </div>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Average Revenue</p>
                <p className="text-xl font-bold">{formatPLN(avgRevenue)}</p>
              </div>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Best Period</p>
                <p className="text-xl font-bold">{formatPLN(maxRevenue)}</p>
              </div>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Worst Period</p>
                <p className="text-xl font-bold">{formatPLN(minRevenue)}</p>
              </div>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Energy (MWh)</th>
                  <th className="text-right p-2">Data Points</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{formatPeriod(result.period)}</td>
                    <td className="p-2 text-right font-bold">
                      <span className={result.totalRevenue > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPLN(result.totalRevenue)}
                      </span>
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      {result.totalEnergyDischarged?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      {result.dataPoints || 'N/A'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          setSelectedMonth(result);
                          setShowDetailModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        <Maximize2 className="h-3 w-3 inline mr-1" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Month Detail Modal */}
      {showDetailModal && selectedMonth && monthDetailData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Detailed Analysis - {formatPeriod(selectedMonth.period)}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Metrics Grid */}
              <MetricsGrid result={monthDetailData.result} />

              {/* AI Insights */}
              <AIInsights 
                result={monthDetailData.result}
                params={monthDetailData.params}
              />

              {/* Interactive Chart with enhanced scaling */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Detailed Data Visualization</h3>
                <InteractiveChart
                  prices={monthDetailData.prices}
                  priceCategories={monthDetailData.result.priceCategories}
                  soc={monthDetailData.result.schedule.soc}
                  charging={monthDetailData.result.schedule.charging}
                  discharging={monthDetailData.result.schedule.discharging}
                  revenue={monthDetailData.result.schedule.revenue}
                  timestamps={monthDetailData.result.schedule.timestamps || null}
                  title={`${formatPeriod(selectedMonth.period)} - Detailed Analysis`}
                />
              </div>

              {/* HMM Matrices */}
              {monthDetailData.result.transitionMatrix && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Transition Matrix */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        HMM Transition Matrix
                      </CardTitle>
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
                            {monthDetailData.result.transitionMatrix.map((row, i) => (
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
                        <BarChart3 className="h-5 w-5" />
                        Emission Matrix
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg">Price Category</th>
                              <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Charge</th>
                              <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Hold</th>
                              <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">Discharge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthDetailData.result.emissionMatrix.map((row, i) => (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart; 