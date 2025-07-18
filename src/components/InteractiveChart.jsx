import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { TrendingUp, Battery, Zap, DollarSign, BarChart3, Settings } from 'lucide-react';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const InteractiveChart = ({ 
  prices = [], 
  priceCategories = [], 
  soc = [], 
  charging = [], 
  discharging = [], 
  revenue = [], 
  timestamps = null,
  title = "Interactive Data Visualization"
}) => {
  const [selectedDataSeries, setSelectedDataSeries] = useState(['prices']);
  const [chartType, setChartType] = useState('line');

  // Chart configuration options
  const chartOptions = {
    prices: {
      label: 'Electricity Prices',
      icon: <TrendingUp className="h-4 w-4" />,
      color: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      yAxisLabel: 'Price (PLN/MWh)',
      chartType: 'line',
      data: prices,
      pointColors: priceCategories ? priceCategories.map(cat => 
        cat === 1 ? '#3498db' : cat === 2 ? '#f39c12' : '#e74c3c'
      ) : undefined
    },
    soc: {
      label: 'Battery State of Charge',
      icon: <Battery className="h-4 w-4" />,
      color: '#27ae60',
      backgroundColor: 'rgba(39, 174, 96, 0.1)',
      yAxisLabel: 'Energy (MWh)',
      chartType: 'line',
      data: soc
    },
    power: {
      label: 'Battery Power Schedule',
      icon: <Zap className="h-4 w-4" />,
      color: '#e74c3c',
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      yAxisLabel: 'Power (MW)',
      chartType: 'bar',
      data: {
        charging: charging.map(p => -p), // Negative for charging
        discharging: discharging
      }
    },
    revenue: {
      label: 'Hourly Revenue',
      icon: <DollarSign className="h-4 w-4" />,
      color: '#f39c12',
      backgroundColor: 'rgba(243, 156, 18, 0.1)',
      yAxisLabel: 'Revenue (PLN)',
      chartType: 'bar',
      data: revenue
    }
  };

  // Generate labels: use timestamps if available, otherwise use indices
  const labels = useMemo(() => {
    if (timestamps) {
      return timestamps.map((ts, index) => {
        try {
          // Handle different timestamp formats
          let date;
          if (typeof ts === 'string') {
            // Try parsing as ISO string first
            date = new Date(ts);
            if (isNaN(date.getTime())) {
              // Try parsing as different formats
              const isoMatch = ts.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
              if (isoMatch) {
                date = new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3], isoMatch[4], isoMatch[5], isoMatch[6]);
              } else {
                // Try simple date format
                const dateMatch = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                  date = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
                } else {
                  console.error('Unable to parse timestamp:', ts);
                  return `Period ${index + 1}`;
                }
              }
            }
          } else if (ts instanceof Date) {
            date = ts;
          } else {
            console.error('Invalid timestamp type:', typeof ts, ts);
            return `Period ${index + 1}`;
          }

          if (isNaN(date.getTime())) {
            console.error('Invalid date after parsing:', ts);
            return `Period ${index + 1}`;
          }

          return date.toLocaleString('pl-PL', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } catch (error) {
          console.error('Date parsing error:', error, 'timestamp:', ts);
          return `Period ${index + 1}`;
        }
      });
    }
    return Array.from({ length: Math.max(prices.length, soc.length, charging.length, revenue.length) }, (_, i) => i + 1);
  }, [timestamps, prices.length, soc.length, charging.length, revenue.length]);

  // Handle series selection toggle
  const toggleSeries = (seriesKey) => {
    setSelectedDataSeries(prev => {
      if (prev.includes(seriesKey)) {
        return prev.filter(key => key !== seriesKey);
      } else {
        return [...prev, seriesKey];
      }
    });
  };

  // Prepare chart data based on selected data series
  const chartData = useMemo(() => {
    const datasets = [];

    // Add prices if selected
    if (selectedDataSeries.includes('prices')) {
      datasets.push({
        label: 'Electricity Prices (PLN/MWh)',
        data: prices,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        pointBackgroundColor: priceCategories ? priceCategories.map(cat => 
          cat === 1 ? '#3498db' : cat === 2 ? '#f39c12' : '#e74c3c'
        ) : '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      });
    }

    // Add SOC if selected
    if (selectedDataSeries.includes('soc')) {
      datasets.push({
        label: 'Battery State of Charge (MWh)',
        data: soc,
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        pointBackgroundColor: '#27ae60',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
        yAxisID: 'y1'
      });
    }

    // Add power if selected
    if (selectedDataSeries.includes('power')) {
      datasets.push({
        label: 'Charging Power (MW)',
        data: charging.map(p => -p), // Negative values for charging
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: '#3498db',
        borderWidth: 1,
        yAxisID: 'y2'
      });
      datasets.push({
        label: 'Discharging Power (MW)',
        data: discharging,
        backgroundColor: 'rgba(231, 76, 60, 0.7)',
        borderColor: '#e74c3c',
        borderWidth: 1,
        yAxisID: 'y2'
      });
    }

    // Add revenue if selected
    if (selectedDataSeries.includes('revenue')) {
      datasets.push({
        label: 'Hourly Revenue (PLN)',
        data: revenue,
        backgroundColor: revenue.map(r => r >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
        borderColor: revenue.map(r => r >= 0 ? '#27ae60' : '#e74c3c'),
        borderWidth: 1,
        yAxisID: 'y3'
      });
    }

    return {
      labels,
      datasets
    };
  }, [selectedDataSeries, prices, priceCategories, soc, charging, discharging, revenue, labels]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    plugins: {
      title: { 
        display: true, 
        text: `${title} - Interactive Analysis`,
        font: { size: 16, weight: 'bold' }
      },
      legend: { 
        display: true,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: (context) => {
            return `Time: ${context[0].label}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (selectedDataSeries.includes('prices')) {
              return `${label}: ${value.toFixed(2)} PLN/MWh`;
            } else if (selectedDataSeries.includes('soc')) {
              return `${label}: ${value.toFixed(2)} MWh`;
            } else if (selectedDataSeries.includes('power')) {
              if (label.includes('Charging')) {
                return `${label}: ${Math.abs(value).toFixed(2)} MW`;
              } else if (label.includes('Discharging')) {
                return `${label}: ${value.toFixed(2)} MW`;
              }
              return `${label}: ${Math.abs(value).toFixed(2)} MW`;
            } else if (selectedDataSeries.includes('revenue')) {
              return `${label}: ${value.toFixed(2)} PLN`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: { 
        type: 'linear',
        display: selectedDataSeries.includes('prices'),
        position: 'left',
        title: { display: true, text: 'Price (PLN/MWh)' },
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
          lineWidth: 0.5
        },
        ticks: {
          font: { size: 12 },
          callback: function(value) {
            return value.toLocaleString('pl-PL') + ' PLN/MWh';
          }
        },
        // Proper scaling to prevent compression
        afterDataLimits: (axis) => {
          if (axis.max === axis.min) {
            // If all values are the same, add some range
            axis.max = axis.max + 50;
            axis.min = axis.min - 50;
          } else {
            const range = axis.max - axis.min;
            const padding = Math.max(range * 0.25, 20); // At least 20 units padding, 25% range
            axis.min = axis.min - padding;
            axis.max = axis.max + padding;
          }
        }
      },
      y1: {
        type: 'linear',
        display: selectedDataSeries.includes('soc'),
        position: 'right',
        title: { display: true, text: 'Energy (MWh)' },
        beginAtZero: false,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: { size: 12 }
        },
        // Proper scaling to prevent compression
        afterDataLimits: (axis) => {
          if (axis.max === axis.min) {
            // If all values are the same, add some range
            axis.max = axis.max + 10;
            axis.min = axis.min - 10;
          } else {
            const range = axis.max - axis.min;
            const padding = Math.max(range * 0.25, 5); // At least 5 units padding, 25% range
            axis.min = axis.min - padding;
            axis.max = axis.max + padding;
          }
        }
      },
      y2: {
        type: 'linear',
        display: selectedDataSeries.includes('power'),
        position: 'right',
        title: { display: true, text: 'Power (MW)' },
        beginAtZero: false,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: { size: 12 },
          callback: function(value) {
            return Math.abs(value).toFixed(1) + ' MW';
          }
        },
        // Proper scaling to prevent compression
        afterDataLimits: (axis) => {
          if (axis.max === axis.min) {
            // If all values are the same, add some range
            axis.max = axis.max + 5;
            axis.min = axis.min - 5;
          } else {
            const range = axis.max - axis.min;
            const padding = Math.max(range * 0.25, 2); // At least 2 units padding, 25% range
            axis.min = axis.min - padding;
            axis.max = axis.max + padding;
          }
        }
      },
      y3: {
        type: 'linear',
        display: selectedDataSeries.includes('revenue'),
        position: 'right',
        title: { display: true, text: 'Revenue (PLN)' },
        beginAtZero: false,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: { size: 12 },
          callback: function(value) {
            return value.toLocaleString('pl-PL') + ' PLN';
          }
        },
        // Proper scaling to prevent compression
        afterDataLimits: (axis) => {
          if (axis.max === axis.min) {
            // If all values are the same, add some range
            axis.max = axis.max + 200;
            axis.min = axis.min - 200;
          } else {
            const range = axis.max - axis.min;
            const padding = Math.max(range * 0.25, 100); // At least 100 PLN padding, 25% range
            axis.min = axis.min - padding;
            axis.max = axis.max + padding;
          }
        }
      },
      x: { 
        title: { 
          display: true, 
          text: timestamps ? 'Date & Time' : 'Time Period',
          font: { weight: 'bold' }
        },
        ticks: {
          maxTicksLimit: timestamps ? 15 : 20,
          maxRotation: 45,
          font: { size: 11 },
          callback: function(value, index, values) {
            if (timestamps) {
              try {
                const date = new Date(this.getLabelForValue(value));
                if (isNaN(date.getTime())) {
                  return 'Invalid Date';
                }
                return date.toLocaleString('pl-PL', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
              } catch (error) {
                return 'Invalid Date';
              }
            }
            return value;
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
          lineWidth: 0.5
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 6,
        hoverBorderWidth: 3
      },
      line: {
        tension: 0.1
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Interactive Data Visualization</h3>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Multi-Series Controls</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Select multiple data series to display simultaneously. Toggle between different data views using the controls below.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Multi-Series Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Select Data Series:</span>
            <span className="text-xs text-gray-500">({selectedDataSeries.length} selected)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(chartOptions).map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDataSeries.includes(key)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.icon}
                {config.label}
                {selectedDataSeries.includes(key) && (
                  <span className="ml-1 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
          {selectedDataSeries.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              ⚠️ No data series selected. Please select at least one series to display data.
            </div>
          )}
        </div>

        {/* Chart Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bar Chart
          </button>
        </div>

        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          {selectedDataSeries.includes('prices') && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {prices.length > 0 ? Math.min(...prices).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Min Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {prices.length > 0 ? Math.max(...prices).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Max Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Avg Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {prices.length}
                </div>
                <div className="text-xs text-gray-600">Data Points</div>
              </div>
            </>
          )}
          {selectedDataSeries.includes('revenue') && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {revenue.length > 0 ? Math.min(...revenue).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Min Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {revenue.length > 0 ? Math.max(...revenue).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Max Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {revenue.length > 0 ? revenue.reduce((a, b) => a + b, 0).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {revenue.length}
                </div>
                <div className="text-xs text-gray-600">Data Points</div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <div className="w-full h-[800px] relative bg-white border border-gray-200 rounded-lg p-4">
          {chartType === 'bar' ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveChart; 