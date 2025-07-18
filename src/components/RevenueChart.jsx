import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RevenueChart = ({ results }) => {
  if (!results || !results.monthlyData) {
    return (
      <div className="text-center text-gray-500">
        No revenue data available
      </div>
    );
  }

  const { monthlyData } = results;

  const chartData = {
    labels: monthlyData.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Revenue (PLN)',
        data: monthlyData.map(item => item.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Revenue Performance',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Revenue: ${context.parsed.y.toLocaleString('pl-PL', { 
              style: 'currency', 
              currency: 'PLN' 
            })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString('pl-PL', { 
              style: 'currency', 
              currency: 'PLN' 
            });
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default RevenueChart; 