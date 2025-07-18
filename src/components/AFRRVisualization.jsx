import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import AFRROptimizer from '../utils/AFRROptimizerClass.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AFRRVisualization = () => {
  const [afrrData, setAfrrData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '2024-06-14',
    endDate: '2024-06-15'
  });

  const afrrOptimizer = new AFRROptimizer();

  // Load aFRR data from backend
  const loadAFRRData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await afrrOptimizer.loadAFRRData(dateRange.startDate, dateRange.endDate);
      setAfrrData(data);
      console.log('aFRR data loaded:', data);
    } catch (error) {
      console.error('Error loading aFRR data:', error);
      setError('Failed to load aFRR data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Run aFRR analysis
  const runAnalysis = async () => {
    if (!afrrData) {
      setError('Please load aFRR data first');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const contractingValues = afrrData.data.map(record => record.contractingStatus);
      const results = await afrrOptimizer.analyzeAFRR(contractingValues, {
        categorizationMethod: 'quantile'
      });
      
      setAnalysisResults(results);
      console.log('aFRR analysis completed:', results);
    } catch (error) {
      console.error('Error running aFRR analysis:', error);
      setError('Failed to run aFRR analysis: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAFRRData();
  }, []);

  // Prepare chart data for contracting status
  const prepareChartData = () => {
    if (!afrrData || !afrrData.data) {
      return null;
    }

    const timestamps = afrrData.data.map(record => 
      new Date(record.timestamp).toLocaleString('pl-PL', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    const contractingValues = afrrData.data.map(record => record.contractingStatus);
    const prices = afrrData.data.map(record => record.price);

    return {
      labels: timestamps,
      datasets: [
        {
          label: 'Contracting Status (MW)',
          data: contractingValues,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y',
          tension: 0.1,
        },
        {
          label: 'Price (PLN/MWh)',
          data: prices,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y1',
          tension: 0.1,
        }
      ]
    };
  };

  // Prepare chart data for HMM states
  const prepareHMMChartData = () => {
    if (!analysisResults || !analysisResults.success) {
      return null;
    }

    const timestamps = afrrData.data.map(record => 
      new Date(record.timestamp).toLocaleString('pl-PL', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    const stateNames = afrrOptimizer.getStateNames();
    const observedStates = analysisResults.observations.map(obs => 
      stateNames[obs + 1] || `State ${obs}`
    );
    const viterbiStates = analysisResults.viterbiPath.map(state => 
      stateNames[state + 1] || `State ${state}`
    );

    return {
      labels: timestamps,
      datasets: [
        {
          label: 'Observed States',
          data: analysisResults.observations,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Viterbi States',
          data: analysisResults.viterbiPath,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'aFRR Contracting Status Analysis',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Contracting Status (MW)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Price (PLN/MWh)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const hmmChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'HMM State Analysis',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 2,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            const stateNames = afrrOptimizer.getStateNames();
            return stateNames[value + 1] || `State ${value}`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>aFRR Capacity Bidding Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <Button 
                onClick={loadAFRRData}
                disabled={isLoading}
                className="mt-6"
              >
                {isLoading ? 'Loading...' : 'Load Data'}
              </Button>
              <Button 
                onClick={runAnalysis}
                disabled={isLoading || !afrrData}
                variant="outline"
                className="mt-6"
              >
                {isLoading ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {afrrData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold text-blue-900">Data Points</h3>
                  <p className="text-2xl font-bold text-blue-600">{afrrData.data?.length || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold text-green-900">Date Range</h3>
                  <p className="text-sm text-green-700">
                    {dateRange.startDate} to {dateRange.endDate}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <h3 className="font-semibold text-purple-900">Status</h3>
                  <p className="text-sm text-purple-700">
                    {analysisResults ? 'Analysis Complete' : 'Ready for Analysis'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {afrrData && (
        <Card>
          <CardHeader>
            <CardTitle>Contracting Status & Price Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              <Line data={prepareChartData()} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {analysisResults && analysisResults.success && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>HMM State Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line data={prepareHMMChartData()} options={hmmChartOptions} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">State Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(analysisResults.stateCounts).map(([state, count]) => (
                      <div key={state} className="flex justify-between">
                        <span>State {state}:</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Viterbi Path Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(analysisResults.viterbiStateCounts).map(([state, count]) => (
                      <div key={state} className="flex justify-between">
                        <span>State {state}:</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Contracting Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Min:</span>
                    <p className="font-mono">{analysisResults.contractingStats.min.toFixed(2)} MW</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Max:</span>
                    <p className="font-mono">{analysisResults.contractingStats.max.toFixed(2)} MW</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Average:</span>
                    <p className="font-mono">{analysisResults.contractingStats.avg.toFixed(2)} MW</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Count:</span>
                    <p className="font-mono">{analysisResults.contractingStats.count}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AFRRVisualization; 