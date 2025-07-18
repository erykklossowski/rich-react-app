// Path: src/components/AFRRVisualization.jsx

import React, { useState, useEffect, useMemo } from 'react';
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
    Filler
} from 'chart.js';
import { loadSystemContractingData, loadAFRRDataForAnalysis } from '../utils/afrrDataLoaders';
import AFRROptimizer from '../utils/AFRROptimizerClass';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AFRRVisualization = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [categorizationMethod, setCategorizationMethod] = useState('quantile');
    const [timeRange, setTimeRange] = useState('24h');
    const [categorizationOptions, setCategorizationOptions] = useState({});

    const optimizer = useMemo(() => new AFRROptimizer(), []);

    // Load and process data
    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Load system contracting data based on time range
            let lookbackDays;
            switch (timeRange) {
                case '24h':
                    lookbackDays = 1;
                    break;
                case '7d':
                    lookbackDays = 7;
                    break;
                case '30d':
                    lookbackDays = 30;
                    break;
                default:
                    lookbackDays = 1;
            }
            
            const contractingData = await loadSystemContractingData({
                lookbackDays,
                maxRecords: timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720 // Hourly intervals: 24h=24, 7d=168, 30d=720
            });
            
            // Transform data to match expected format
            let processedData = {
                contractingValues: contractingData.data.map(record => record.sk_d1_fcst),
                timestamps: contractingData.data.map(record => record.dtime),
                periods: contractingData.data.map(record => record.period),
                field: 'sk_d1_fcst'
            };

            // No need for sampling since we're now using hourly data
            console.log(`Using ${processedData.contractingValues.length} hourly data points for analysis`);
            
            setData(processedData);
            
            // Run analysis
            const analysisResult = optimizer.analyze(
                processedData.contractingValues,
                categorizationMethod,
                categorizationOptions
            );
            
            setAnalysis(analysisResult);
            
        } catch (err) {
            console.error('Error loading AFRR data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount and when dependencies change
    useEffect(() => {
        loadData();
    }, [timeRange, categorizationMethod, categorizationOptions]);

    // Chart configuration
    const chartData = useMemo(() => {
        if (!data || !data.contractingValues) return null;

        const labels = data.timestamps.map((timestamp, index) => {
            const date = new Date(timestamp);
            // Show date and time for better readability
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

        const contractingValues = data.contractingValues;
        const avgValue = contractingValues.reduce((sum, val) => sum + val, 0) / contractingValues.length;

        return {
            labels,
            datasets: [
                {
                    label: 'Contracting Status (sk_d1_fcst)',
                    data: contractingValues,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Average',
                    data: Array(contractingValues.length).fill(avgValue),
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        };
    }, [data]);

    // Viterbi path chart data
    const viterbiChartData = useMemo(() => {
        if (!data || !analysis || !analysis.success) return null;

        const labels = data.timestamps.map((timestamp, index) => {
            const date = new Date(timestamp);
            // Show date and time for better readability
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

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

        return {
            labels,
            datasets: [
                {
                    label: 'Viterbi Path (Predicted States)',
                    data: analysis.viterbiPath,
                    borderColor: 'rgb(153, 102, 255)',
                    backgroundColor: analysis.viterbiPath.map(state => stateColors[state]),
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                },
                {
                    label: 'Observed States',
                    data: analysis.contractingStates,
                    borderColor: 'rgba(201, 203, 207, 0.8)',
                    backgroundColor: analysis.contractingStates.map(state => stateColors[state]),
                    borderWidth: 1,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    tension: 0.1
                }
            ]
        };
    }, [data, analysis]);

    // Chart options
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'aFRR Contracting Status Analysis',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return `${label}: ${value.toFixed(2)} MW`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Contracting Status (MW)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Time'
                },
                ticks: {
                    maxTicksLimit: 20, // Limit number of x-axis labels to prevent overcrowding
                    maxRotation: 45,
                    minRotation: 0
                }
            }
        }
    };

    const viterbiChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'HMM State Analysis - Viterbi Path vs Observed States',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        const stateNames = {
                            1: 'Undercontracted',
                            2: 'Balanced',
                            3: 'Overcontracted'
                        };
                        return `${label}: ${stateNames[value] || value}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                min: 0.5,
                max: 3.5,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        const stateNames = {
                            1: 'Undercontracted',
                            2: 'Balanced',
                            3: 'Overcontracted'
                        };
                        return stateNames[value] || value;
                    }
                },
                title: {
                    display: true,
                    text: 'Contracting State'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Time'
                },
                ticks: {
                    maxTicksLimit: 20, // Limit number of x-axis labels to prevent overcrowding
                    maxRotation: 45,
                    minRotation: 0
                }
            }
        }
    };

    // Handle categorization method change
    const handleCategorizationChange = (method) => {
        setCategorizationMethod(method);
        setCategorizationOptions({}); // Reset options for new method
    };

    // Handle time range change
    const handleTimeRangeChange = (range) => {
        setTimeRange(range);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">Loading aFRR data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">aFRR Market Analysis</h2>
                
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Range
                        </label>
                        <select
                            value={timeRange}
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Categorization Method
                        </label>
                        <select
                            value={categorizationMethod}
                            onChange={(e) => handleCategorizationChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="quantile">Quantile-based</option>
                            <option value="kmeans">K-means Clustering</option>
                            <option value="volatility">Volatility-based</option>
                            <option value="adaptive">Adaptive Thresholds</option>
                            <option value="zscore">Z-score</option>
                            <option value="threshold">Fixed Thresholds</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data Points
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                            {data ? data.contractingValues.length : 0}
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-sm text-blue-600">Average</div>
                            <div className="text-xl font-bold text-blue-900">
                                {(data.contractingValues.reduce((sum, val) => sum + val, 0) / data.contractingValues.length).toFixed(2)} MW
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600">Minimum</div>
                            <div className="text-xl font-bold text-green-900">
                                {Math.min(...data.contractingValues).toFixed(2)} MW
                            </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-sm text-red-600">Maximum</div>
                            <div className="text-xl font-bold text-red-900">
                                {Math.max(...data.contractingValues).toFixed(2)} MW
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-sm text-purple-600">Std Dev</div>
                            <div className="text-xl font-bold text-purple-900">
                                {(() => {
                                    const avg = data.contractingValues.reduce((sum, val) => sum + val, 0) / data.contractingValues.length;
                                    const variance = data.contractingValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.contractingValues.length;
                                    return Math.sqrt(variance).toFixed(2);
                                })()} MW
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="space-y-6">
                    {/* Contracting Status Chart */}
                    {chartData && (
                        <div className="bg-white border rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4">Contracting Status Time Series</h3>
                            <div className="h-80 w-full" style={{ position: 'relative' }}>
                                <Line 
                                    data={chartData} 
                                    options={{
                                        ...chartOptions,
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        devicePixelRatio: 1,
                                        elements: {
                                            point: {
                                                radius: 2,
                                                hoverRadius: 4
                                            },
                                            line: {
                                                tension: 0.1
                                            }
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    )}

                    {/* Viterbi Path Chart */}
                    {viterbiChartData && analysis && analysis.success && (
                        <div className="bg-white border rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-4">HMM State Analysis</h3>
                            <div className="h-80 w-full" style={{ position: 'relative' }}>
                                <Line 
                                    data={viterbiChartData} 
                                    options={{
                                        ...viterbiChartOptions,
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        devicePixelRatio: 1,
                                        elements: {
                                            point: {
                                                radius: 2,
                                                hoverRadius: 4
                                            },
                                            line: {
                                                tension: 0.1
                                            }
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Analysis Results */}
                {analysis && analysis.success && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* State Distribution */}
                            <div>
                                <h4 className="font-medium mb-2">State Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Undercontracted:</span>
                                        <span className="font-semibold">{analysis.stateCounts[1] || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Balanced:</span>
                                        <span className="font-semibold">{analysis.stateCounts[2] || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Overcontracted:</span>
                                        <span className="font-semibold">{analysis.stateCounts[3] || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Viterbi Path Distribution */}
                            <div>
                                <h4 className="font-medium mb-2">Viterbi Path Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Undercontracted:</span>
                                        <span className="font-semibold">{analysis.viterbiStateCounts[1] || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Balanced:</span>
                                        <span className="font-semibold">{analysis.viterbiStateCounts[2] || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Overcontracted:</span>
                                        <span className="font-semibold">{analysis.viterbiStateCounts[3] || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2">Method Details</h4>
                            <p className="text-sm text-gray-600">
                                Categorization: {analysis.categorizationMethod} | 
                                Data points: {data.contractingValues.length} | 
                                Time range: {timeRange}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AFRRVisualization; 