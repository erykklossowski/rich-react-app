import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Activity, TrendingUp, BarChart3, Zap, Settings } from 'lucide-react';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const AFRRInteractiveChart = ({ 
  contractingValues = [], 
  timestamps = [], 
  viterbiPath = [], 
  contractingStates = [],
  transitionMatrix = [],
  emissionMatrix = [],
  title = "aFRR Market Analysis"
}) => {
  const [selectedDataSeries, setSelectedDataSeries] = useState(['contracting']);
  const [chartType, setChartType] = useState('line');

  // Chart configuration options
  const chartOptions = {
    contracting: {
      label: 'Contracting Status',
      icon: <Activity className="h-4 w-4" />,
      color: '#4BC0C0',
      backgroundColor: 'rgba(75, 192, 192, 0.1)',
      yAxisLabel: 'Contracting Status (MW)',
      chartType: 'line',
      data: contractingValues
    },
    viterbi: {
      label: 'Viterbi Path',
      icon: <TrendingUp className="h-4 w-4" />,
      color: '#9966FF',
      backgroundColor: 'rgba(153, 102, 255, 0.1)',
      yAxisLabel: 'Hidden State',
      chartType: 'line',
      data: viterbiPath
    },
    states: {
      label: 'Observed States',
      icon: <BarChart3 className="h-4 w-4" />,
      color: '#C9CBCF',
      backgroundColor: 'rgba(201, 203, 207, 0.1)',
      yAxisLabel: 'State Category',
      chartType: 'line',
      data: contractingStates
    }
  };

  // Generate labels from timestamps with proper error handling
  const labels = useMemo(() => {
    return timestamps.map((timestamp, index) => {
      try {
        // Handle different timestamp formats
        let date;
        if (typeof timestamp === 'string') {
          // Try parsing as ISO string first
          date = new Date(timestamp);
          if (isNaN(date.getTime())) {
            // Try parsing as different formats
            const isoMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (isoMatch) {
              date = new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3], isoMatch[4], isoMatch[5], isoMatch[6]);
            } else {
              // Try simple date format
              const dateMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (dateMatch) {
                date = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
              } else {
                console.error('Unable to parse timestamp:', timestamp);
                return `Period ${index + 1}`;
              }
            }
          }
        } else if (timestamp instanceof Date) {
          date = timestamp;
        } else {
          console.error('Invalid timestamp type:', typeof timestamp, timestamp);
          return `Period ${index + 1}`;
        }

        if (isNaN(date.getTime())) {
          console.error('Invalid date after parsing:', timestamp);
          return `Period ${index + 1}`;
        }

        return date.toLocaleString('pl-PL', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (error) {
        console.error('Date parsing error:', error, 'timestamp:', timestamp);
        return `Period ${index + 1}`;
      }
    });
  }, [timestamps]);

  // State colors and names
  const stateColors = {
    1: 'rgba(255, 99, 132, 0.8)',   // Undercontracted - Red
    2: 'rgba(255, 205, 86, 0.8)',   // Balanced - Yellow
    3: 'rgba(75, 192, 192, 0.8)'    // Overcontracted - Green
  };

  const stateNames = {
    1: 'Undercontracted',
    2: 'Balanced',
    3: 'Overcontracted'
  };

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

    // Add contracting status if selected
    if (selectedDataSeries.includes('contracting')) {
      const avgValue = contractingValues.length > 0 ? 
        contractingValues.reduce((sum, val) => sum + val, 0) / contractingValues.length : 0;
      
      datasets.push({
        label: 'Contracting Status (MW)',
        data: contractingValues,
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        yAxisID: 'y'
      });

      // Add average line
      datasets.push({
        label: 'Average',
        data: Array(contractingValues.length).fill(avgValue),
        borderColor: 'rgba(255, 99, 132, 0.5)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        yAxisID: 'y'
      });
    }

    // Add Viterbi path if selected
    if (selectedDataSeries.includes('viterbi')) {
      datasets.push({
        label: 'Viterbi Path (Predicted)',
        data: viterbiPath,
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: viterbiPath.map(state => stateColors[state]),
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.1,
        pointStyle: 'circle',
        yAxisID: 'y1'
      });
    }

    // Add observed states if selected
    if (selectedDataSeries.includes('states')) {
      datasets.push({
        label: 'Observed States',
        data: contractingStates,
        borderColor: 'rgba(201, 203, 207, 0.9)',
        backgroundColor: contractingStates.map(state => stateColors[state]),
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0,
        pointStyle: 'rect',
        yAxisID: 'y1'
      });
    }

    return {
      labels,
      datasets
    };
  }, [selectedDataSeries, contractingValues, viterbiPath, contractingStates, stateColors, labels]);

  // Calculate Y-axis scale for contracting status
  const getYAxisScale = () => {
    if (contractingValues.length === 0) return {};
    
    const min = Math.min(...contractingValues);
    const max = Math.max(...contractingValues);
    const range = max - min;
    const step = 10; // 10 MW intervals
    
    const minTick = Math.floor(min / step) * step;
    const maxTick = Math.ceil(max / step) * step;
    const numTicks = Math.min(10, Math.ceil((maxTick - minTick) / step));
    
    return {
      min: minTick,
      max: maxTick,
      ticks: {
        stepSize: step,
        callback: function(value) {
          return value + ' MW';
        }
      }
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
            if (selectedDataSeries.includes('contracting') && context.dataset.label.includes('Contracting')) {
              return `${label}: ${value.toFixed(2)} MW`;
            } else if (selectedDataSeries.includes('viterbi') || selectedDataSeries.includes('states')) {
              return `${label}: ${stateNames[value] || value}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: { 
        type: 'linear',
        display: selectedDataSeries.includes('contracting'),
        position: 'left',
        title: { 
          display: true, 
          text: 'Contracting Status (MW)',
          font: { weight: 'bold' }
        },
        beginAtZero: false, // Don't force zero to avoid compression
        ...getYAxisScale(),
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
          lineWidth: 0.5
        },
        ticks: {
          font: { size: 12 }
        },
        // Dynamic scaling to prevent compression
        afterDataLimits: (axis) => {
          const range = axis.max - axis.min;
          const padding = range * 0.1; // 10% padding
          axis.min = axis.min - padding;
          axis.max = axis.max + padding;
        }
      },
      y1: {
        type: 'linear',
        display: selectedDataSeries.includes('viterbi') || selectedDataSeries.includes('states'),
        position: 'right',
        title: { 
          display: true, 
          text: 'State Category',
          font: { weight: 'bold' }
        },
        min: 0.5,
        max: 3.5,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return stateNames[value] || value;
          }
        },
        grid: {
          drawOnChartArea: false,
        }
      },
      x: { 
        title: { 
          display: true, 
          text: 'Date & Time',
          font: { weight: 'bold' }
        },
        ticks: {
          maxTicksLimit: 15,
          maxRotation: 45,
          font: { size: 11 },
          callback: function(value, index, values) {
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
            <h3 className="text-lg font-semibold text-gray-900">aFRR Interactive Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Multi-Series Controls</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Select multiple data series to display simultaneously. Viterbi path shows smoothed predictions, while Observed States show raw categorization.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Multi-Series Selector */}
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
          {selectedDataSeries.includes('contracting') && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {contractingValues.length > 0 ? Math.min(...contractingValues).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Min Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {contractingValues.length > 0 ? Math.max(...contractingValues).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Max Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {contractingValues.length > 0 ? (contractingValues.reduce((a, b) => a + b, 0) / contractingValues.length).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Avg Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {contractingValues.length}
                </div>
                <div className="text-xs text-gray-600">Data Points</div>
              </div>
            </>
          )}
          {(selectedDataSeries.includes('viterbi') || selectedDataSeries.includes('states')) && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {viterbiPath.filter(s => s === 1).length}
                </div>
                <div className="text-xs text-gray-600">Undercontracted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {viterbiPath.filter(s => s === 2).length}
                </div>
                <div className="text-xs text-gray-600">Balanced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {viterbiPath.filter(s => s === 3).length}
                </div>
                <div className="text-xs text-gray-600">Overcontracted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {viterbiPath.length}
                </div>
                <div className="text-xs text-gray-600">Total States</div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <div className="w-full h-[500px] relative">
          {chartType === 'bar' ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>

        {/* HMM Matrices (if available) */}
        {transitionMatrix.length > 0 && emissionMatrix.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Transition Matrix */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  HMM Transition Matrix
                </h4>
                <p className="text-sm text-gray-600">
                  Probability of transitioning between contracting states
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg"></th>
                      <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Under→</th>
                      <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Balanced→</th>
                      <th className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">Over→</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transitionMatrix.map((row, i) => (
                      <tr key={i} className="even:bg-gray-50">
                        <th className="p-2 font-semibold text-gray-700">
                          {['Under', 'Balanced', 'Over'][i]}
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
            </div>

            {/* Emission Matrix */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Emission Matrix
                </h4>
                <p className="text-sm text-gray-600">
                  Action probabilities for each contracting state
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-tl-lg"></th>
                      <th className="p-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold">Low</th>
                      <th className="p-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold">Medium</th>
                      <th className="p-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-tr-lg">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emissionMatrix.map((row, i) => (
                      <tr key={i} className="even:bg-gray-50">
                        <th className="p-2 font-semibold text-gray-700">
                          {['Under', 'Balanced', 'Over'][i]}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AFRRInteractiveChart; 