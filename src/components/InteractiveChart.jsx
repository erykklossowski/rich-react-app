import React, { useState, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
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
  const [selectedData, setSelectedData] = useState('prices');
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
      return timestamps.map(ts => {
        try {
          const date = new Date(ts);
          return date.toLocaleString('pl-PL', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } catch (error) {
          return ts;
        }
      });
    }
    return Array.from({ length: Math.max(prices.length, soc.length, charging.length, revenue.length) }, (_, i) => i + 1);
  }, [timestamps, prices.length, soc.length, charging.length, revenue.length]);

  const currentConfig = chartOptions[selectedData];
  const isBarChart = currentConfig.chartType === 'bar';

  // Prepare chart data based on selected data type
  const chartData = useMemo(() => {
    if (selectedData === 'power') {
      return {
        labels,
        datasets: [
          {
            label: 'Charging Power (MW)',
            data: currentConfig.data.charging,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            borderColor: '#3498db',
            borderWidth: 1
          },
          {
            label: 'Discharging Power (MW)',
            data: currentConfig.data.discharging,
            backgroundColor: 'rgba(231, 76, 60, 0.7)',
            borderColor: '#e74c3c',
            borderWidth: 1
          }
        ]
      };
    } else if (selectedData === 'revenue') {
      return {
        labels,
        datasets: [{
          label: currentConfig.label,
          data: currentConfig.data,
          backgroundColor: currentConfig.data.map(r => r >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
          borderColor: currentConfig.data.map(r => r >= 0 ? '#27ae60' : '#e74c3c'),
          borderWidth: 1
        }]
      };
    } else {
      return {
        labels,
        datasets: [{
          label: currentConfig.label,
          data: currentConfig.data,
          borderColor: currentConfig.color,
          backgroundColor: currentConfig.backgroundColor,
          pointBackgroundColor: currentConfig.pointColors || currentConfig.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.3,
          fill: true
        }]
      };
    }
  }, [selectedData, currentConfig, labels]);

  const options = {
    responsive: true,
    plugins: {
      title: { 
        display: true, 
        text: `${currentConfig.label} - ${title}`,
        font: { size: 16, weight: 'bold' }
      },
      legend: { display: true },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            return `Time: ${context[0].label}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (selectedData === 'prices') {
              return `${label}: ${value.toFixed(2)} PLN/MWh`;
            } else if (selectedData === 'soc') {
              return `${label}: ${value.toFixed(2)} MWh`;
            } else if (selectedData === 'power') {
              return `${label}: ${Math.abs(value).toFixed(2)} MW`;
            } else if (selectedData === 'revenue') {
              return `${label}: ${value.toFixed(2)} PLN`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: selectedData === 'soc' || selectedData === 'revenue',
        title: { display: true, text: currentConfig.yAxisLabel },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      x: { 
        title: { display: true, text: timestamps ? 'Date & Time' : 'Time Period' },
        ticks: {
          maxTicksLimit: timestamps ? 10 : 20,
          maxRotation: 45
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
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
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Interactive Data Visualization
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Controls</span>
          </div>
        </CardTitle>
        <CardDescription>
          Toggle between different data views using the controls below
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
        {selectedData !== 'power' && selectedData !== 'revenue' && (
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
          {selectedData === 'prices' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {prices.length > 0 ? Math.min(...prices).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Min Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {prices.length > 0 ? Math.max(...prices).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {prices.length}
                </div>
                <div className="text-xs text-muted-foreground">Data Points</div>
              </div>
            </>
          )}
          {selectedData === 'soc' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {soc.length > 0 ? Math.min(...soc).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Min SoC</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {soc.length > 0 ? Math.max(...soc).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max SoC</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {soc.length > 0 ? (Math.max(...soc) - Math.min(...soc)).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">SoC Range</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {soc.length}
                </div>
                <div className="text-xs text-muted-foreground">Data Points</div>
              </div>
            </>
          )}
          {selectedData === 'power' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {charging.length > 0 ? Math.max(...charging).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max Charge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {discharging.length > 0 ? Math.max(...discharging).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max Discharge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {charging.length > 0 ? charging.reduce((a, b) => a + b, 0).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Total Charge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {discharging.length > 0 ? discharging.reduce((a, b) => a + b, 0).toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Total Discharge</div>
              </div>
            </>
          )}
          {selectedData === 'revenue' && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {revenue.length > 0 ? Math.min(...revenue).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Min Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {revenue.length > 0 ? Math.max(...revenue).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Max Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {revenue.length > 0 ? revenue.reduce((a, b) => a + b, 0).toFixed(0) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {revenue.length}
                </div>
                <div className="text-xs text-muted-foreground">Data Points</div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <div className="w-full h-96">
          {isBarChart ? (
            <Bar data={chartData} options={options} />
          ) : (
            <Line data={chartData} options={options} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveChart; 