import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const RevenueChart = ({ results }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (!results || results.length === 0) {
      return;
    }

    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: options
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

  // Calculate chart statistics
  const totalRevenue = sortedResults.reduce((sum, r) => sum + r.totalRevenue, 0);
  const avgRevenue = totalRevenue / sortedResults.length;
  const maxRevenue = Math.max(...sortedResults.map(r => r.totalRevenue));
  const minRevenue = Math.min(...sortedResults.map(r => r.totalRevenue));

  // Prepare chart data
  const chartData = {
    labels: sortedResults.map(r => formatPeriod(r.period)),
    datasets: [{
      label: 'Revenue (PLN)',
      data: sortedResults.map(r => r.totalRevenue),
      backgroundColor: sortedResults.map(r => 
        r.totalRevenue > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
      ),
      borderColor: sortedResults.map(r => 
        r.totalRevenue > 0 ? '#22c55e' : '#ef4444'
      ),
      borderWidth: 2,
      borderRadius: 4,
    }]
  };

  const options = {
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
              `Data Points: ${result.dataPoints || 'N/A'}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false, // Don't force zero to avoid compression
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
          const padding = range * 0.1; // 10% padding
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue by Period
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueChart; 