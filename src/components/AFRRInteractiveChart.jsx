import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, Battery, Zap, DollarSign, BarChart3, Settings, Activity, Table } from 'lucide-react';

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
  const [selectedData, setSelectedData] = useState('contracting');
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
    },
    comparison: {
      label: 'Viterbi vs Observed',
      icon: <Zap className="h-4 w-4" />,
      color: '#FF6384',
      backgroundColor: 'rgba(255, 99, 132, 0.1)',
      yAxisLabel: 'State Category',
      chartType: 'line',
      data: {
        viterbi: viterbiPath,
        observed: contractingStates
      }
    }
  };

  // Generate labels from timestamps
  const labels = useMemo(() => {
    return timestamps.map((timestamp, index) => {
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', timestamp);
          return `Invalid-${index}`;
        }
        return date.toLocaleString('pl-PL', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (error) {
        console.error('Date parsing error:', error, 'timestamp:', timestamp);
        return `Error-${index}`;
      }
    });
  }, [timestamps]);

  const currentConfig = chartOptions[selectedData];
  const isBarChart = currentConfig.chartType === 'bar';

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

  // Prepare chart data based on selected data type
  const chartData = useMemo(() => {
    if (selectedData === 'comparison') {
      return {
        labels,
        datasets: [
          {
            label: 'Viterbi Path (Predicted)',
            data: currentConfig.data.viterbi,
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: currentConfig.data.viterbi.map(state => stateColors[state]),
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            pointStyle: 'circle'
          },
          {
            label: 'Observed States',
            data: currentConfig.data.observed,
            borderColor: 'rgba(201, 203, 207, 0.9)',
            backgroundColor: currentConfig.data.observed.map(state => stateColors[state]),
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0,
            pointStyle: 'rect'
          }
        ]
      };
    } else if (selectedData === 'viterbi') {
      return {
        labels,
        datasets: [{
          label: currentConfig.label,
          data: currentConfig.data,
          borderColor: currentConfig.color,
          backgroundColor: currentConfig.data.map(state => stateColors[state]),
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1,
          pointStyle: 'circle'
        }]
      };
    } else if (selectedData === 'states') {
      return {
        labels,
        datasets: [{
          label: currentConfig.label,
          data: currentConfig.data,
          borderColor: currentConfig.color,
          backgroundColor: currentConfig.data.map(state => stateColors[state]),
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
          pointStyle: 'rect'
        }]
      };
    } else {
      // Contracting status with average line
      const avgValue = contractingValues.length > 0 ? 
        contractingValues.reduce((sum, val) => sum + val, 0) / contractingValues.length : 0;
      
      return {
        labels,
        datasets: [
          {
            label: 'Contracting Status (sk_d1_fcst)',
            data: currentConfig.data,
            borderColor: currentConfig.color,
            backgroundColor: currentConfig.backgroundColor,
            borderWidth: 2,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Average',
            data: Array(currentConfig.data.length).fill(avgValue),
            borderColor: 'rgba(255, 99, 132, 0.5)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      };
    }
  }, [selectedData, currentConfig, labels, contractingValues, stateColors]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { 
        display: true, 
        text: `${currentConfig.label} - ${title}`,
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
            if (selectedData === 'contracting') {
              return `${label}: ${value.toFixed(2)} MW`;
            } else if (selectedData === 'viterbi' || selectedData === 'states') {
              return `${label}: ${stateNames[value] || value}`;
            } else if (selectedData === 'comparison') {
              return `${label}: ${stateNames[value] || value}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: selectedData === 'contracting',
        title: { 
          display: true, 
          text: currentConfig.yAxisLabel,
          font: { weight: 'bold' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          font: { size: 12 }
        }
      },
      x: { 
        title: { 
          display: true, 
          text: 'Date & Time',
          font: { weight: 'bold' }
        },
        ticks: {
          maxTicksLimit: 12,
          maxRotation: 45,
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
          drawBorder: false,
          lineWidth: 1
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            aFRR Interactive Analysis
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Controls</span>
          </div>
        </CardTitle>
        <CardDescription>
          Interactive aFRR market analysis with HMM state prediction. 
          Viterbi path shows smoothed predictions, while Observed States show raw categorization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Type Selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(chartOptions).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedData === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedData(key)}
              className="flex items-center gap-2"
            >
              {config.icon}
              {config.label}
            </Button>
          ))}
        </div>

        {/* Chart Type Selector (for compatible data types) */}
        {selectedData === 'contracting' && (
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('line')}
            >
              Line Chart
            </Button>
            <Button
              variant={chartType === 'bar' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              Bar Chart
            </Button>
          </div>
        )}

        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          {selectedData === 'contracting' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {contractingValues.length > 0 ? Math.min(...contractingValues).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Min Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {contractingValues.length > 0 ? Math.max(...contractingValues).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {contractingValues.length > 0 ? (contractingValues.reduce((a, b) => a + b, 0) / contractingValues.length).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Contracting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {contractingValues.length}
                </div>
                <div className="text-xs text-muted-foreground">Data Points</div>
              </div>
            </>
          )}
          {(selectedData === 'viterbi' || selectedData === 'states') && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {viterbiPath.filter(s => s === 1).length}
                </div>
                <div className="text-xs text-muted-foreground">Undercontracted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {viterbiPath.filter(s => s === 2).length}
                </div>
                <div className="text-xs text-muted-foreground">Balanced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {viterbiPath.filter(s => s === 3).length}
                </div>
                <div className="text-xs text-muted-foreground">Overcontracted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {viterbiPath.length}
                </div>
                <div className="text-xs text-muted-foreground">Total States</div>
              </div>
            </>
          )}
          {selectedData === 'comparison' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {viterbiPath.filter((v, i) => v === contractingStates[i]).length}
                </div>
                <div className="text-xs text-muted-foreground">Matching States</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((viterbiPath.filter((v, i) => v === contractingStates[i]).length / viterbiPath.length) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Prediction Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {viterbiPath.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Predictions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {viterbiPath.filter((v, i) => v !== contractingStates[i]).length}
                </div>
                <div className="text-xs text-muted-foreground">Smoothing Events</div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <div className="w-full h-[500px] relative">
          {isBarChart ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>

        {/* HMM Matrices (if available) */}
        {transitionMatrix.length > 0 && emissionMatrix.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Transition Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  HMM Transition Matrix
                </CardTitle>
                <CardDescription>
                  Probability of transitioning between contracting states
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Emission Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  Emission Matrix
                </CardTitle>
                <CardDescription>
                  Action probabilities for each contracting state
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AFRRInteractiveChart; 