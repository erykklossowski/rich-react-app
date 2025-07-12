import React, { useState, useEffect, useCallback } from 'react';
import BatteryOptimizer from './utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './utils/dataLoaders.js';
import { PriceChart, SoCChart, PowerChart, RevenueChart } from './components/ChartComponents.jsx';
import { Line, Bar } from 'react-chartjs-2';

const optimizer = new BatteryOptimizer();

const App = () => {
    const [activeTab, setActiveTab] = useState('manual');
    const [priceData, setPriceData] = useState('');
    const [pMax, setPMax] = useState(10);
    const [socMin, setSocMin] = useState(8);
    const [socMax, setSocMax] = useState(40);
    const [efficiency, setEfficiency] = useState(0.85);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [polishData, setPolishData] = useState(null);
    const [startDate, setStartDate] = useState('2020-01-01');
    const [endDate, setEndDate] = useState('2020-12-31');
    const [analysisType, setAnalysisType] = useState('monthly');
    const [backtestParams, setBacktestParams] = useState({ pMax: 10, socMin: 8, socMax: 40, efficiency: 0.85 });
    const [backtestResults, setBacktestResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [detailedPeriod, setDetailedPeriod] = useState(null);

    const [llmInsight, setLlmInsight] = useState('');
    const [llmLoading, setLlmLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const data = await loadPolishData();
                setPolishData(data);
                console.log('Polish electricity data preloaded successfully');
            } catch (error) {
                console.log('Could not preload Polish data - will load when needed');
                setStatusMessage({ type: 'error', text: `Initial data load failed: ${error.message}. Please check console for details.` });
            }
        };
        fetchInitialData();
    }, []);

    const generateSampleData = useCallback(() => {
        const samplePrices = [];
        for (let hour = 0; hour < 24; hour++) {
            let basePrice = 50;
            if (hour >= 6 && hour <= 8) basePrice += 20;
            if (hour >= 17 && hour <= 20) basePrice += 30;
            if (hour >= 22 || hour <= 5) basePrice -= 15;
            basePrice += (Math.random() - 0.5) * 20;
            samplePrices.push(Math.max(10, basePrice));
        }
        setPriceData(samplePrices.map(p => p.toFixed(2)).join(', '));
        setStatusMessage({ type: 'success', text: '📊 Sample data generated!' });
        setOptimizationResult(null);
        setDetailedPeriod(null);
        setLlmInsight('');
    }, []);

    const optimizeBattery = useCallback(() => {
        setLoading(true);
        setStatusMessage({ type: 'info', text: '🔄 Running optimization...' });
        setOptimizationResult(null);
        setDetailedPeriod(null);
        setLlmInsight('');

        try {
            const prices = priceData.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));

            if (prices.length === 0) throw new Error('Please enter valid price data');

            const params = { pMax, socMin, socMax, efficiency };

            if (params.socMin >= params.socMax) {
                throw new Error('Minimum SoC must be less than maximum SoC');
            }

            setTimeout(() => {
                const result = optimizer.optimize(prices, params);
                if (result.success) {
                    setStatusMessage({ type: 'success', text: '✅ Optimization completed!' });
                    setOptimizationResult({ result, prices, params, title: 'Manual Input' });
                } else {
                    setStatusMessage({ type: 'error', text: `❌ Optimization failed: ${result.error}` });
                    setOptimizationResult(null);
                }
                setLoading(false);
            }, 500);

        } catch (error) {
            setStatusMessage({ type: 'error', text: `❌ Error: ${error.message}` });
            setLoading(false);
            setOptimizationResult(null);
        }
    }, [priceData, pMax, socMin, socMax, efficiency]);

    const testDataConnection = useCallback(async () => {
        setStatusMessage({ type: 'info', text: '🔍 Testing data connection...' });
        try {
            const response = await fetch(POLAND_CSV_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            setStatusMessage({
                type: 'success',
                text: `✅ Data connection successful!<br>• Response status: ${response.status}<br>• Data size: ${text.length} characters<br>• Lines found: ${lines.length}`
            });
        } catch (error) {
            setStatusMessage({ type: 'error', text: `❌ Data connection failed: ${error.message}` });
        }
    }, []);

    const loadQuickPresets = useCallback(() => {
        const presets = [
            { name: '2020 COVID Year', start: '2020-01-01', end: '2020-12-31', type: 'monthly' },
            { name: '2022 Energy Crisis', start: '2022-01-01', end: '2022-12-31', type: 'monthly' },
            { name: 'Recent 6 Months', start: '2024-12-01', end: '2025-05-31', type: 'monthly' },
            { name: 'Last 5 Years', start: '2020-01-01', end: '2024-12-31', type: 'yearly' }
        ];

        const preset = presets[Math.floor(Math.random() * presets.length)];

        setStartDate(preset.start);
        setEndDate(preset.end);
        setAnalysisType(preset.type);

        setStatusMessage({ type: 'info', text: `⚡ Loaded preset: ${preset.name}` });
    }, []);

    const runBacktest = useCallback(async () => {
        setLoading(true);
        setBacktestResults(null);
        setDetailedPeriod(null);
        setLlmInsight('');
        setProgress(0);
        setProgressText('Preparing backtest...');
        setStatusMessage({ type: 'info', text: '📊 Running historical backtest...' });

        try {
            let currentPolishData = polishData;
            if (!currentPolishData || currentPolishData.length === 0) {
                setProgressText('Loading Polish electricity market data...');
                setProgress(10);
                try {
                    currentPolishData = await loadPolishData();
                    setPolishData(currentPolishData);
                } catch (dataError) {
                    throw new Error(`Failed to load Polish electricity market data: ${dataError.message}`);
                }
                if (!currentPolishData || currentPolishData.length === 0) {
                    throw new Error('Loaded data is empty or invalid after fetch.');
                }
                console.log(`Loaded ${currentPolishData.length} records for backtest.`);
            }

            setProgressText('Filtering data by date range...');
            setProgress(20);

            const params = backtestParams;

            if (params.socMin >= params.socMax) {
                throw new Error('Minimum SoC must be less than maximum SoC');
            }
            if (new Date(startDate) >= new Date(endDate)) {
                throw new Error('Start date must be before end date');
            }

            const filteredData = filterDataByDateRange(currentPolishData, startDate, endDate);
            if (filteredData.length === 0) {
                throw new Error('No data found for the selected date range. Please adjust dates.');
            }
            console.log(`Filtered data points: ${filteredData.length}`);


            setProgressText(`Processing ${filteredData.length} records...`);
            setProgress(40);

            const groups = groupDataByPeriod(filteredData, analysisType);
            const groupKeys = Object.keys(groups).sort();

            if (groupKeys.length === 0) {
                throw new Error('No valid periods found for analysis. Check date range and analysis type.');
            }
            console.log(`Number of analysis periods: ${groupKeys.length}`);


            setProgressText(`Analyzing ${groupKeys.length} periods...`);
            setProgress(60);

            const results = [];

            for (const [index, key] of groupKeys.entries()) {
                const groupData = groups[key];
                const prices = groupData.map(record => record.price);

                if (prices.length > 24) { // Ensure enough data points for meaningful analysis
                    const result = optimizer.optimize(prices, params);
                    if (result.success) {
                        results.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            ...result
                        });
                    } else {
                        console.warn(`Optimization failed for period ${key}: ${result.error}`);
                    }
                } else {
                    console.warn(`Skipping period ${key} due to insufficient data points (${prices.length} < 24).`);
                }

                const totalProgress = 60 + (40 * (index + 1) / groupKeys.length);
                setProgress(totalProgress);
                setProgressText(`Analyzed period ${index + 1}/${groupKeys.length}: ${key}`);

                await new Promise(resolve => setTimeout(resolve, 10));
            }

            setProgressText('Generating results...');
            setProgress(100);

            if (results.length === 0) {
                throw new Error('No valid optimization results generated for any period. Check data, parameters, or date range.');
            }
            console.log(`Total successful optimization results: ${results.length}`);


            setBacktestResults({
                results,
                analysisType,
                dateRange: { start: startDate, end: endDate },
                params
            });
            setStatusMessage({ type: 'success', text: '✅ Backtest completed!' });

        } catch (error) {
            setStatusMessage({ type: 'error', text: `❌ Backtest failed: ${error.message}` });
            setBacktestResults(null); // Ensure results are cleared on error
            console.error('Backtest Error:', error);
        } finally {
            setLoading(false);
            setProgress(0);
            setProgressText('');
        }
    }, [polishData, startDate, endDate, analysisType, backtestParams]);

    const showPeriodDetail = useCallback((periodKey) => {
        if (!backtestResults) return;
        const periodData = backtestResults.results.find(r => r.period === periodKey);
        if (periodData) {
            setDetailedPeriod({
                result: periodData,
                prices: periodData.prices,
                params: backtestResults.params,
                title: `Detailed Period: ${periodKey}`
            });
            setLlmInsight('');
        }
    }, [backtestResults]);

    const hideDetailedResults = useCallback(() => {
        setDetailedPeriod(null);
        setLlmInsight('');
    }, []);

    const getOptimizationInsight = useCallback(async (result, params) => {
        setLlmLoading(true);
        setLlmInsight('');

        const prompt = `Analyze the following battery energy storage optimization results and provide concise strategic insights and potential next steps. Focus on revenue maximization, efficiency, and market conditions.

**Optimization Parameters:**
Max Power (MW): ${params.pMax}
Min SoC (MWh): ${params.socMin}
Max SoC (MWh): ${params.socMax}
Efficiency: ${params.efficiency}

**Performance Metrics:**
Total Revenue: €${result.totalRevenue.toFixed(2)}
Energy Discharged: ${result.totalEnergyDischarged.toFixed(1)} MWh
Energy Charged: ${result.totalEnergyCharged.toFixed(1)} MWh
Operational Efficiency: ${(result.operationalEfficiency * 100).toFixed(1)}%
Average Market Price: €${result.avgPrice.toFixed(2)}/MWh
Battery Cycles: ${result.cycles.toFixed(2)}
VWAP Charge Price: €${result.vwapCharge.toFixed(2)}/MWh
VWAP Discharge Price: €${result.vwapDischarge.toFixed(2)}/MWh

Based on these metrics, what are the key takeaways? Suggest 1-3 actionable strategies or areas for further investigation to improve profitability or operational effectiveness. Keep the response under 200 words.`;

        try {
            const response = await fetch('http://localhost:3001/api/gemini-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const responseData = await response.json();

            if (responseData.success) {
                setLlmInsight(responseData.insight);
            } else {
                setLlmInsight(`Could not generate insights: ${responseData.error}`);
                console.error('API Error:', responseData.error);
            }
        } catch (error) {
            setLlmInsight(`Failed to get insights: ${error.message}. Please ensure the backend server is running.`);
            console.error('Error calling backend API:', error);
        } finally {
            setLlmLoading(false);
        }
    }, []);


    const renderMetricsGrid = (result) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">€{result.totalRevenue.toFixed(2)}</div>
                <div className="text-sm opacity-90">Total Revenue</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">{result.totalEnergyDischarged.toFixed(1)} MWh</div>
                <div className="text-sm opacity-90">Energy Discharged</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">{result.totalEnergyCharged.toFixed(1)} MWh</div>
                <div className="text-sm opacity-90">Energy Charged</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">{(result.operationalEfficiency * 100).toFixed(1)}%</div>
                <div className="text-sm opacity-90">Operational Efficiency</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">€{result.avgPrice.toFixed(2)}</div>
                <div className="text-sm opacity-90">Average Price</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">{result.cycles.toFixed(2)}</div>
                <div className="text-sm opacity-90">Battery Cycles</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">€{result.vwapCharge.toFixed(2)}</div>
                <div className="text-sm opacity-90">VWAP Charge (€/MWh)</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg transition-transform duration-300 hover:scale-105">
                <div className="text-3xl font-bold mb-2">€{result.vwapDischarge.toFixed(2)}</div>
                <div className="text-sm opacity-90">VWAP Discharge (€/MWh)</div>
            </div>
        </div>
    );

    const renderDetailedResults = (data, isManualInput = false) => {
        if (!data) return null;
        const { result, prices, params, title } = data;

        return (
            <div className="mt-10 pt-8 border-t-4 border-indigo-500 bg-white rounded-xl p-8 shadow-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">{title}</h2>
                {!isManualInput && (
                    <button
                        onClick={hideDetailedResults}
                        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg mb-6 shadow-md transition duration-300"
                    >
                        ⬅️ Back to Summary
                    </button>
                )}

                {renderMetricsGrid(result)}

                <div className="flex justify-center my-6">
                    <button
                        onClick={() => getOptimizationInsight(result, params)}
                        disabled={llmLoading}
                        className="bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                    >
                        {llmLoading && <span className="animate-spin h-5 w-5 mr-3 border-b-2 border-white rounded-full"></span>}
                        ✨ Get Optimization Insights
                    </button>
                </div>

                {llmInsight && (
                    <div className="bg-blue-50 p-6 rounded-xl shadow-md mb-6 border-l-4 border-blue-400 text-blue-800">
                        <h3 className="text-xl font-semibold mb-3">AI-Powered Insights:</h3>
                        <p className="whitespace-pre-wrap">{llmInsight}</p>
                    </div>
                )}
                {llmLoading && (
                    <div className="bg-blue-50 p-6 rounded-xl shadow-md mb-6 border-l-4 border-blue-400 text-blue-800 flex items-center">
                        <span className="animate-spin h-5 w-5 mr-3 border-b-2 border-blue-800 rounded-full"></span>
                        Generating insights...
                    </div>
                )}

                <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                    <PriceChart data={prices} priceCategories={result.priceCategories} title="💰 Electricity Prices (Color-coded by HMM Categories)" />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                    <SoCChart data={result.schedule.soc} title="🔋 Battery State of Charge" />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                    <PowerChart charging={result.schedule.charging} discharging={result.schedule.discharging} title="⚡ Battery Power Schedule" />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                    <RevenueChart data={result.schedule.revenue} title="💰 Hourly Revenue" />
                </div>

                <div className="bg-gray-50 p-6 rounded-xl shadow-md mb-6 font-mono overflow-x-auto">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">🔄 HMM Transition Matrix</h3>
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg"></th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Low→</th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Medium→</th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">High→</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.transitionMatrix.map((row, i) => (
                                <tr key={i} className="even:bg-gray-50">
                                    <th className="py-3 px-4 font-semibold text-gray-700">{['Low', 'Medium', 'High'][i]}</th>
                                    {row.map((val, j) => (
                                        <td key={j} className="py-3 px-4 border border-gray-200">{val.toFixed(3)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl shadow-md font-mono overflow-x-auto">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">📊 Emission Matrix (Action Probabilities)</h3>
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tl-lg">Price Category</th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Charge</th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold">Idle</th>
                                <th className="py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-tr-lg">Discharge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.emissionMatrix.map((row, i) => (
                                <tr key={i} className="even:bg-gray-50">
                                    <th className="py-3 px-4 font-semibold text-gray-700">{['Low', 'Medium', 'High'][i]}</th>
                                    {row.map((val, j) => (
                                        <td key={j} className="py-3 px-4 border border-gray-200">{val.toFixed(3)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-5 font-sans flex items-center justify-center">
            <div className="container bg-white bg-opacity-95 rounded-3xl p-8 shadow-2xl max-w-6xl w-full">
                <h1 className="text-5xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-700">
                    🔋 Battery Energy Storage Optimization
                </h1>

                <div className="flex mb-8 bg-gray-100 rounded-xl shadow-inner">
                    <button
                        className={`flex-1 py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-300 ${activeTab === 'manual' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => { setActiveTab('manual'); setOptimizationResult(null); setBacktestResults(null); setDetailedPeriod(null); setStatusMessage({ type: '', text: '' }); setLlmInsight(''); }}
                    >
                        📝 Manual Input
                    </button>
                    <button
                        className={`flex-1 py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-300 ${activeTab === 'backtest' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => { setActiveTab('backtest'); setOptimizationResult(null); setBacktestResults(null); setDetailedPeriod(null); setStatusMessage({ type: '', text: '' }); setLlmInsight(''); }}
                    >
                        📊 Historical Backtesting
                    </button>
                </div>

                {statusMessage.text && (
                    <div className={`p-4 rounded-lg mb-6 text-lg font-medium ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}
                        dangerouslySetInnerHTML={{ __html: statusMessage.text }}
                    ></div>
                )}

                {activeTab === 'manual' && (
                    <div className="bg-gray-50 p-8 rounded-2xl shadow-md border-l-4 border-indigo-500">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Manual Price Input</h2>
                        <div className="mb-6">
                            <label htmlFor="priceData" className="block text-gray-700 text-sm font-semibold mb-2">Day-Ahead Electricity Prices (EUR/MWh, comma-separated):</label>
                            <textarea
                                id="priceData"
                                rows="4"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                placeholder="Example: 45.2, 38.7, 35.1, 42.8, 55.3, 67.9, 89.4, 95.2, 87.6, 78.3, 65.4, 58.7, 52.1, 49.8, 46.3, 43.9, 48.2, 56.7, 72.8, 89.3, 95.8, 88.4, 76.2, 63.5"
                                value={priceData}
                                onChange={(e) => setPriceData(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label htmlFor="pMax" className="block text-gray-700 text-sm font-semibold mb-2">Max Power (MW):</label>
                                <input
                                    type="number"
                                    id="pMax"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={pMax}
                                    onChange={(e) => setPMax(parseFloat(e.target.value))}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="socMin" className="block text-gray-700 text-sm font-semibold mb-2">Min SoC (MWh):</label>
                                <input
                                    type="number"
                                    id="socMin"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={socMin}
                                    onChange={(e) => setSocMin(parseFloat(e.target.value))}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="socMax" className="block text-gray-700 text-sm font-semibold mb-2">Max SoC (MWh):</label>
                                <input
                                    type="number"
                                    id="socMax"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={socMax}
                                    onChange={(e) => setSocMax(parseFloat(e.target.value))}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="efficiency" className="block text-gray-700 text-sm font-semibold mb-2">Round-trip Efficiency:</label>
                                <input
                                    type="number"
                                    id="efficiency"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={efficiency}
                                    onChange={(e) => setEfficiency(parseFloat(e.target.value))}
                                    step="0.01"
                                    min="0"
                                    max="1"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={optimizeBattery}
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                            >
                                {loading && <span className="animate-spin h-5 w-5 mr-3 border-b-2 border-white rounded-full"></span>}
                                🚀 Optimize Battery Operation
                            </button>
                            <button
                                onClick={generateSampleData}
                                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1"
                            >
                                📈 Generate Sample Data
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'backtest' && (
                    <div className="bg-gray-50 p-8 rounded-2xl shadow-md border-l-4 border-purple-500">
                        <div className="bg-blue-50 p-6 rounded-xl mb-6 border-l-4 border-blue-400 text-blue-800">
                            <h3 className="text-xl font-bold mb-2">📈 Polish Electricity Market Dataset</h3>
                            <p><strong>Period:</strong> January 2015 - June 2025 (91,790 hourly records)</p>
                            <p><strong>Price Range:</strong> -132.95 to 771.00 EUR/MWh</p>
                            <p><strong>Average Price:</strong> 73.72 EUR/MWh</p>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-6">⏱️ Backtesting Parameters</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label htmlFor="startDate" className="block text-gray-700 text-sm font-semibold mb-2">Start Date:</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    min="2015-01-01"
                                    max="2025-06-21"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-gray-700 text-sm font-semibold mb-2">End Date:</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min="2015-01-01"
                                    max="2025-06-21"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label htmlFor="btPMax" className="block text-gray-700 text-sm font-semibold mb-2">Max Power (MW):</label>
                                <input
                                    type="number"
                                    id="btPMax"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={backtestParams.pMax}
                                    onChange={(e) => setBacktestParams({ ...backtestParams, pMax: parseFloat(e.target.value) })}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="btSocMin" className="block text-gray-700 text-sm font-semibold mb-2">Min SoC (MWh):</label>
                                <input
                                    type="number"
                                    id="btSocMin"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={backtestParams.socMin}
                                    onChange={(e) => setBacktestParams({ ...backtestParams, socMin: parseFloat(e.target.value) })}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="btSocMax" className="block text-gray-700 text-sm font-semibold mb-2">Max SoC (MWh):</label>
                                <input
                                    type="number"
                                    id="btSocMax"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={backtestParams.socMax}
                                    onChange={(e) => setBacktestParams({ ...backtestParams, socMax: parseFloat(e.target.value) })}
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label htmlFor="btEfficiency" className="block text-gray-700 text-sm font-semibold mb-2">Round-trip Efficiency:</label>
                                <input
                                    type="number"
                                    id="btEfficiency"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                    value={backtestParams.efficiency}
                                    onChange={(e) => setBacktestParams({ ...backtestParams, efficiency: parseFloat(e.target.value) })}
                                    step="0.01"
                                    min="0"
                                    max="1"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="analysisType" className="block text-gray-700 text-sm font-semibold mb-2">Analysis Type:</label>
                            <select
                                id="analysisType"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                                value={analysisType}
                                onChange={(e) => setAnalysisType(e.target.value)}
                            >
                                <option value="continuous">Continuous Period</option>
                                <option value="monthly">Monthly Analysis</option>
                                <option value="quarterly">Quarterly Analysis</option>
                                <option value="yearly">Yearly Analysis</option>
                            </select>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={runBacktest}
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1 flex items-center justify-center"
                            >
                                {loading && <span className="animate-spin h-5 w-5 mr-3 border-b-2 border-white rounded-full"></span>}
                                📊 Run Historical Backtest
                            </button>
                            <button
                                onClick={loadQuickPresets}
                                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1"
                            >
                                ⚡ Load Quick Presets
                            </button>
                            <button
                                onClick={testDataConnection}
                                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1"
                            >
                                🔍 Test Data Connection
                            </button>
                        </div>

                        {loading && (
                            <div className="mt-8">
                                <div className="bg-blue-100 text-blue-800 p-4 rounded-lg flex items-center justify-center text-lg font-medium">
                                    <span className="animate-spin h-5 w-5 mr-3 border-b-2 border-blue-800 rounded-full"></span>
                                    <span id="progress-text">{progressText}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                                    <div className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Input Results */}
                {activeTab === 'manual' && optimizationResult && renderDetailedResults(optimizationResult, true)}

                {/* Backtesting Results Summary */}
                {activeTab === 'backtest' && backtestResults && !detailedPeriod && (
                    <div className="mt-10 pt-8 border-t-4 border-indigo-500 bg-white rounded-xl p-8 shadow-md">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg mb-6">
                            <h3 className="text-2xl font-bold mb-2">📊 Backtest Summary: {backtestResults.analysisType.charAt(0).toUpperCase() + backtestResults.analysisType.slice(1)} Analysis</h3>
                            <p><strong>Period:</strong> {backtestResults.dateRange.start} to {backtestResults.dateRange.end}</p>
                            <p><strong>Analysis Periods:</strong> {backtestResults.results.length}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                <div className="text-center p-3 bg-white bg-opacity-10 rounded-lg">
                                    <div className="text-2xl font-bold">€{backtestResults.results.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(0)}</div>
                                    <div className="text-sm opacity-90">Total Revenue</div>
                                </div>
                                <div className="text-center p-3 bg-white bg-opacity-10 rounded-lg">
                                    <div className="text-2xl font-bold">€{(backtestResults.results.reduce((sum, r) => sum + r.totalRevenue, 0) / backtestResults.results.length).toFixed(0)}</div>
                                    <div className="text-sm opacity-90">Avg Revenue/{backtestResults.analysisType.replace('ly', '')}</div>
                                </div>
                                <div className="text-center p-3 bg-white bg-opacity-10 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        {(() => {
                                            const revenues = backtestResults.results.map(r => r.totalRevenue);
                                            const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
                                            const revenueStd = Math.sqrt(revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length);
                                            return revenueStd > 0 ? (avgRevenue / revenueStd).toFixed(2) : '0.00';
                                        })()}
                                    </div>
                                    <div className="text-sm opacity-90">Risk-Adj. Return</div>
                                </div>
                                <div className="text-center p-3 bg-white bg-opacity-10 rounded-lg">
                                    <div className="text-2xl font-bold">{(backtestResults.results.reduce((sum, r) => sum + r.totalEnergyDischarged, 0) / 1000).toFixed(1)} GWh</div>
                                    <div className="text-sm opacity-90">Total Energy</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-5">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg">
                                <div className="text-3xl font-bold mb-2">€{backtestResults.results.reduce((best, current) => current.totalRevenue > best.totalRevenue ? current : best).totalRevenue.toFixed(0)}</div>
                                <div className="text-sm opacity-90">Best Period: {backtestResults.results.reduce((best, current) => current.totalRevenue > best.totalRevenue ? current : best).period}</div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg">
                                <div className="text-3xl font-bold mb-2">€{backtestResults.results.reduce((worst, current) => current.totalRevenue < worst.totalRevenue ? current : worst).totalRevenue.toFixed(0)}</div>
                                <div className="text-sm opacity-90">Worst Period: {backtestResults.results.reduce((worst, current) => current.totalRevenue < worst.totalRevenue ? current : worst).period}</div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg">
                                <div className="text-3xl font-bold mb-2">
                                    {(() => {
                                        const totalRev = backtestResults.results.reduce((sum, r) => sum + r.totalRevenue, 0);
                                        const totalEnergy = backtestResults.results.reduce((sum, r) => sum + r.totalEnergyDischarged, 0);
                                        return totalEnergy > 0 ? (totalRev / totalEnergy * 1000).toFixed(2) : '0.00';
                                    })()}
                                </div>
                                <div className="text-sm opacity-90">Revenue per MWh (€/MWh)</div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl text-center shadow-lg">
                                <div className="text-3xl font-bold mb-2">{backtestResults.results.filter(r => r.totalRevenue > 0).length}/{backtestResults.results.length}</div>
                                <div className="text-sm opacity-90">Profitable Periods</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                            <Line
                                data={{
                                    labels: backtestResults.results.map(r => r.period),
                                    datasets: [{
                                        label: 'Revenue (€)',
                                        data: backtestResults.results.map(r => r.totalRevenue),
                                        borderColor: '#667eea',
                                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                        pointBackgroundColor: backtestResults.results.map(r => r.totalRevenue > 0 ? '#27ae60' : '#e74c3c'),
                                        pointBorderColor: '#fff',
                                        pointBorderWidth: 2,
                                        pointRadius: 5,
                                        tension: 0.3,
                                        fill: true
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        title: { display: true, text: `💰 Revenue Trend by ${backtestResults.analysisType.charAt(0).toUpperCase() + backtestResults.analysisType.slice(1, -2)}` },
                                        legend: { display: true }
                                    },
                                    scales: {
                                        y: { title: { display: true, text: 'Revenue (€)' } },
                                        x: { title: { display: true, text: 'Period' } }
                                    }
                                }}
                            />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                            <Bar
                                data={{
                                    labels: backtestResults.results.map(r => r.period),
                                    datasets: [
                                        {
                                            label: 'Revenue (€)',
                                            data: backtestResults.results.map(r => r.totalRevenue),
                                            backgroundColor: 'rgba(102, 126, 234, 0.7)',
                                            borderColor: '#667eea',
                                            borderWidth: 1,
                                            yAxisID: 'y'
                                        },
                                        {
                                            label: 'Avg Price (€/MWh)',
                                            data: backtestResults.results.map(r => r.avgPrice),
                                            backgroundColor: 'rgba(231, 76, 60, 0.7)',
                                            borderColor: '#e74c3c',
                                            borderWidth: 1,
                                            type: 'line',
                                            yAxisID: 'y1'
                                        }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        title: { display: true, text: '📊 Revenue vs Market Prices' },
                                        legend: { display: true }
                                    },
                                    scales: {
                                        y: {
                                            type: 'linear',
                                            display: true,
                                            position: 'left',
                                            title: { display: true, text: 'Revenue (€)' }
                                        },
                                        y1: {
                                            type: 'linear',
                                            display: true,
                                            position: 'right',
                                            title: { display: true, text: 'Price (€/MWh)' },
                                            grid: { drawOnChartArea: false }
                                        },
                                        x: { title: { display: true, text: 'Period' } }
                                    }
                                }}
                            />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                            <Bar
                                data={{
                                    labels: (() => {
                                        const allPrices = backtestResults.results.flatMap(r => r.prices);
                                        const numBins = 20;
                                        const minPrice = Math.min(...allPrices);
                                        const maxPrice = Math.max(...allPrices);
                                        const binSize = (maxPrice - minPrice) / numBins;
                                        const priceRanges = [];
                                        for (let i = 0; i < numBins; i++) {
                                            const rangeStart = minPrice + i * binSize;
                                            const rangeEnd = rangeStart + binSize;
                                            priceRanges.push(`${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}`);
                                        }
                                        return priceRanges;
                                    })(),
                                    datasets: [{
                                        label: 'Frequency',
                                        data: (() => {
                                            const allPrices = backtestResults.results.flatMap(r => r.prices);
                                            const numBins = 20;
                                            const minPrice = Math.min(...allPrices);
                                            const maxPrice = Math.max(...allPrices);
                                            const binSize = (maxPrice - minPrice) / numBins;
                                            const rangeCounts = [];
                                            for (let i = 0; i < numBins; i++) {
                                                const rangeStart = minPrice + i * binSize;
                                                const rangeEnd = rangeStart + binSize;
                                                rangeCounts.push(allPrices.filter(p => p >= rangeStart && p < rangeEnd).length);
                                            }
                                            return rangeCounts;
                                        })(),
                                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                                        borderColor: '#667eea',
                                        borderWidth: 1
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        title: { display: true, text: '📈 Price Distribution During Analysis Period' },
                                        legend: { display: true }
                                    },
                                    scales: {
                                        y: { title: { display: true, text: 'Hours' } },
                                        x: { title: { display: true, text: 'Price Range (€/MWh)' } }
                                    }
                                }}
                            />
                        </div>

                        <div className="my-8">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">📈 Period Performance Table</h3>
                            <div className="overflow-x-auto bg-white rounded-xl shadow-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                        <tr>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-xl">Period</th>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider">Revenue (€)</th>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider">Energy (MWh)</th>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider">€/MWh</th>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider">Avg Price</th>
                                            <th scope="col" className="py-3 px-6 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-xl">Data Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {backtestResults.results.map((r, index) => (
                                            <tr key={index} onClick={() => showPeriodDetail(r.period)} className="cursor-pointer hover:bg-gray-50 transition duration-150 ease-in-out">
                                                <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{r.period}</td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-700">€{r.totalRevenue.toFixed(0)}</td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-700">{r.totalEnergyDischarged.toFixed(1)}</td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-700">€{r.totalEnergyDischarged > 0 ? (r.totalRevenue / r.totalEnergyDischarged).toFixed(2) : '0.00'}</td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-700">€{r.avgPrice.toFixed(2)}</td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-700">{r.dataPoints}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-sm text-gray-600 mt-4">
                                💡 Click on any row to view detailed analysis for that period
                            </p>
                        </div>
                    </div>
                )}

                {/* Detailed Period Results (for backtesting) */}
                {activeTab === 'backtest' && detailedPeriod && renderDetailedResults(detailedPeriod, false)}
            </div>
        </div>
    );
};

export default App;
