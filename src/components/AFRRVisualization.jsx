// Path: src/components/AFRRVisualization.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { loadSystemContractingData, loadAFRRDataForAnalysis } from '../utils/afrrDataLoaders';
import AFRROptimizer from '../utils/AFRROptimizerClass';
import AFRRInteractiveChart from './AFRRInteractiveChart';
import { getDataConfig } from '../utils/dataConfig';



const AFRRVisualization = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [categorizationMethod, setCategorizationMethod] = useState('quantile');
    const [categorizationOptions, setCategorizationOptions] = useState({});
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const optimizer = useMemo(() => new AFRROptimizer(), []);

    // Get data configuration for date constraints
    const dataConfig = useMemo(async () => {
        try {
            return await getDataConfig();
        } catch (error) {
            console.error('Error loading data config:', error);
            return null;
        }
    }, []);

    // Initialize default date range when component mounts
    useEffect(() => {
        const initializeDates = async () => {
            try {
                const config = await getDataConfig();
                if (config) {
                    // Set default to last 7 days
                    const endDate = new Date(config.dataEndDate);
                    const startDate = new Date(endDate);
                    startDate.setDate(startDate.getDate() - 7);
                    
                    setEndDate(endDate.toISOString().split('T')[0]);
                    setStartDate(startDate.toISOString().split('T')[0]);
                }
            } catch (error) {
                console.error('Error initializing dates:', error);
            }
        };
        
        initializeDates();
    }, []);

    // Load and process data
    const loadData = async () => {
        if (!startDate || !endDate) {
            console.log('Date range not set yet, skipping data load');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // Load system contracting data based on custom date range
            const contractingData = await loadSystemContractingData({
                startDate,
                endDate,
                maxRecords: 10000 // Allow up to 10k records for custom ranges
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
    }, [startDate, endDate, categorizationMethod, categorizationOptions]);



    // Handle categorization method change
    const handleCategorizationChange = (method) => {
        setCategorizationMethod(method);
        setCategorizationOptions({}); // Reset options for new method
    };

    // Handle date range changes
    const handleStartDateChange = (date) => {
        setStartDate(date);
    };

    const handleEndDateChange = (date) => {
        setEndDate(date);
    };

    // Quick date range presets
    const setQuickRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
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
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">aFRR Market Analysis</h2>
                
                {/* Controls */}
                <div className="space-y-4 mb-6">
                    {/* Date Range Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => handleEndDateChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                    
                    {/* Quick Date Range Presets */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-gray-700 mr-2">Quick Ranges:</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(1)}
                            className="text-xs"
                        >
                            1 Day
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(5)}
                            className="text-xs"
                        >
                            5 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(7)}
                            className="text-xs"
                        >
                            7 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(30)}
                            className="text-xs"
                        >
                            30 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(90)}
                            className="text-xs"
                        >
                            90 Days
                        </Button>
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

                {/* Interactive Chart */}
                {data && analysis && (
                    <AFRRInteractiveChart
                        contractingValues={data.contractingValues}
                        timestamps={data.timestamps}
                        viterbiPath={analysis.success ? analysis.viterbiPath : []}
                        contractingStates={analysis.success ? analysis.contractingStates : []}
                        transitionMatrix={analysis.success ? analysis.transitionMatrix : []}
                        emissionMatrix={analysis.success ? analysis.emissionMatrix : []}
                        title="aFRR Market Analysis"
                    />
                )}

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
                                Date range: {startDate} to {endDate}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Viterbi algorithm smooths state transitions to reduce noise. 
                                Differences between observed and predicted states are normal and indicate the model's smoothing behavior.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AFRRVisualization; 