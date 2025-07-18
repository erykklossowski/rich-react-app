// Path: src/utils/afrrBacktester.js

// Backtesting engine for aFRR capacity bidding
class AFRRBacktester {
    constructor() {
        this.results = null;
        this.confidenceIntervals = null;
        this.simulationResults = [];
    }

    // Run single backtest
    runSingleBacktest(model, data, observations, startIndex = 0, endIndex = null) {
        const testData = endIndex ? data.slice(startIndex, endIndex) : data.slice(startIndex);
        const testObservations = endIndex ? observations.slice(startIndex, endIndex) : observations.slice(startIndex);
        
        console.log(`Running backtest from period ${startIndex} to ${endIndex || data.length - 1}`);
        
        // Run Viterbi algorithm to infer hidden states
        const viterbiResult = model.viterbi(testObservations);
        
        // Calculate revenue based on inferred states
        const revenueResult = model.calculateCapacityRevenue(viterbiResult.path, testData);
        
        // Calculate additional metrics
        const metrics = this.calculateBacktestMetrics(viterbiResult.path, testData, revenueResult);
        
        return {
            startIndex,
            endIndex: endIndex || data.length - 1,
            periods: testData.length,
            viterbiPath: viterbiResult.path,
            logLikelihood: viterbiResult.logLikelihood,
            revenue: revenueResult,
            metrics
        };
    }

    // Run multiple backtests with different time windows
    runMultipleBacktests(model, data, observations, windowSize = 96, overlap = 0.5) {
        console.log(`Running multiple backtests with window size ${windowSize} and overlap ${overlap}`);
        
        const results = [];
        const stepSize = Math.floor(windowSize * (1 - overlap));
        
        for (let startIndex = 0; startIndex <= data.length - windowSize; startIndex += stepSize) {
            const endIndex = startIndex + windowSize;
            const result = this.runSingleBacktest(model, data, observations, startIndex, endIndex);
            results.push(result);
        }
        
        console.log(`Completed ${results.length} backtest windows`);
        return results;
    }

    // Run Monte Carlo simulations for confidence intervals
    runMonteCarloSimulations(model, data, observations, numSimulations = 100, windowSize = 96) {
        console.log(`Running ${numSimulations} Monte Carlo simulations`);
        
        const simulationResults = [];
        
        for (let sim = 0; sim < numSimulations; sim++) {
            // Randomly select a time window
            const maxStartIndex = data.length - windowSize;
            const startIndex = Math.floor(Math.random() * maxStartIndex);
            const endIndex = startIndex + windowSize;
            
            const result = this.runSingleBacktest(model, data, observations, startIndex, endIndex);
            simulationResults.push(result);
            
            if (sim % 20 === 0) {
                console.log(`Completed ${sim}/${numSimulations} simulations`);
            }
        }
        
        console.log('Monte Carlo simulations completed');
        return simulationResults;
    }

    // Calculate confidence intervals from simulation results
    calculateConfidenceIntervals(simulationResults, confidenceLevels = [0.05, 0.25, 0.5, 0.75, 0.95]) {
        console.log('Calculating confidence intervals...');
        
        // Extract total revenues from all simulations
        const totalRevenues = simulationResults.map(result => result.revenue.totalRevenue);
        const upRevenues = simulationResults.map(result => result.revenue.upRevenue);
        const downRevenues = simulationResults.map(result => result.revenue.downRevenue);
        const avgRevenuesPerPeriod = simulationResults.map(result => result.revenue.averageRevenuePerPeriod);
        
        // Sort arrays for percentile calculation
        totalRevenues.sort((a, b) => a - b);
        upRevenues.sort((a, b) => a - b);
        downRevenues.sort((a, b) => a - b);
        avgRevenuesPerPeriod.sort((a, b) => a - b);
        
        // Calculate percentiles
        const calculatePercentiles = (sortedArray) => {
            const percentiles = {};
            confidenceLevels.forEach(level => {
                const index = Math.floor(level * (sortedArray.length - 1));
                percentiles[`p${Math.round(level * 100)}`] = sortedArray[index];
            });
            return percentiles;
        };
        
        const totalRevenuePercentiles = calculatePercentiles(totalRevenues);
        const upRevenuePercentiles = calculatePercentiles(upRevenues);
        const downRevenuePercentiles = calculatePercentiles(downRevenues);
        const avgRevenuePercentiles = calculatePercentiles(avgRevenuesPerPeriod);
        
        // Calculate summary statistics
        const mean = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;
        const std = (arr) => {
            const avg = mean(arr);
            const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
            return Math.sqrt(variance);
        };
        
        const confidenceIntervals = {
            totalRevenue: {
                mean: mean(totalRevenues),
                std: std(totalRevenues),
                percentiles: totalRevenuePercentiles,
                min: Math.min(...totalRevenues),
                max: Math.max(...totalRevenues)
            },
            upRevenue: {
                mean: mean(upRevenues),
                std: std(upRevenues),
                percentiles: upRevenuePercentiles,
                min: Math.min(...upRevenues),
                max: Math.max(...upRevenues)
            },
            downRevenue: {
                mean: mean(downRevenues),
                std: std(downRevenues),
                percentiles: downRevenuePercentiles,
                min: Math.min(...downRevenues),
                max: Math.max(...downRevenues)
            },
            averageRevenuePerPeriod: {
                mean: mean(avgRevenuesPerPeriod),
                std: std(avgRevenuesPerPeriod),
                percentiles: avgRevenuePercentiles,
                min: Math.min(...avgRevenuesPerPeriod),
                max: Math.max(...avgRevenuesPerPeriod)
            }
        };
        
        console.log('Confidence intervals calculated');
        return confidenceIntervals;
    }

    // Calculate additional backtest metrics
    calculateBacktestMetrics(viterbiPath, data, revenueResult) {
        // State transition analysis
        const stateTransitions = this.analyzeStateTransitions(viterbiPath);
        
        // Market condition analysis
        const marketConditions = this.analyzeMarketConditions(data, viterbiPath);
        
        // Risk metrics
        const riskMetrics = this.calculateRiskMetrics(revenueResult, data.length);
        
        return {
            stateTransitions,
            marketConditions,
            riskMetrics
        };
    }

    // Analyze state transitions in the Viterbi path
    analyzeStateTransitions(viterbiPath) {
        const transitions = {};
        const stateCounts = {};
        
        // Count states
        viterbiPath.forEach(state => {
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        });
        
        // Count transitions
        for (let i = 0; i < viterbiPath.length - 1; i++) {
            const fromState = viterbiPath[i];
            const toState = viterbiPath[i + 1];
            const key = `${fromState}->${toState}`;
            transitions[key] = (transitions[key] || 0) + 1;
        }
        
        // Calculate transition probabilities
        const transitionProbabilities = {};
        Object.keys(transitions).forEach(key => {
            const fromState = parseInt(key.split('->')[0]);
            const count = transitions[key];
            const totalFromState = stateCounts[fromState] || 0;
            transitionProbabilities[key] = totalFromState > 0 ? count / totalFromState : 0;
        });
        
        return {
            stateCounts,
            transitions,
            transitionProbabilities
        };
    }

    // Analyze market conditions and their relationship to capacity clearing
    analyzeMarketConditions(data, viterbiPath) {
        const conditions = {
            undercontracted: { total: 0, cleared: 0, revenue: 0 },
            balanced: { total: 0, cleared: 0, revenue: 0 },
            overcontracted: { total: 0, cleared: 0, revenue: 0 }
        };
        
        data.forEach((periodData, index) => {
            const state = viterbiPath[index];
            const status = periodData.system_forecast_status;
            
            conditions[status].total++;
            
            if (state === 1 || state === 2) { // Capacity cleared
                conditions[status].cleared++;
                const revenue = state === 1 ? 
                    periodData.afrr_down_capacity_marginal_price_eur_per_mw :
                    periodData.afrr_up_capacity_marginal_price_eur_per_mw;
                conditions[status].revenue += revenue;
            }
        });
        
        // Calculate clearing rates and average revenues
        Object.keys(conditions).forEach(status => {
            const condition = conditions[status];
            condition.clearingRate = condition.total > 0 ? condition.cleared / condition.total : 0;
            condition.averageRevenue = condition.cleared > 0 ? condition.revenue / condition.cleared : 0;
        });
        
        return conditions;
    }

    // Calculate risk metrics
    calculateRiskMetrics(revenueResult, numPeriods) {
        // Calculate daily revenue (assuming 96 periods per day)
        const periodsPerDay = 96;
        const dailyRevenues = [];
        
        for (let day = 0; day < Math.floor(numPeriods / periodsPerDay); day++) {
            const dayStart = day * periodsPerDay;
            const dayEnd = Math.min((day + 1) * periodsPerDay, numPeriods);
            const dayRevenue = revenueResult.totalRevenue * (dayEnd - dayStart) / numPeriods;
            dailyRevenues.push(dayRevenue);
        }
        
        // Calculate risk metrics
        const mean = dailyRevenues.reduce((sum, val) => sum + val, 0) / dailyRevenues.length;
        const variance = dailyRevenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyRevenues.length;
        const std = Math.sqrt(variance);
        
        // Value at Risk (VaR) - 95% confidence
        const sortedRevenues = [...dailyRevenues].sort((a, b) => a - b);
        const var95Index = Math.floor(0.05 * sortedRevenues.length);
        const var95 = sortedRevenues[var95Index];
        
        // Maximum drawdown
        let maxDrawdown = 0;
        let peak = sortedRevenues[0];
        
        for (const revenue of sortedRevenues) {
            if (revenue > peak) {
                peak = revenue;
            }
            const drawdown = (peak - revenue) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        
        return {
            meanDailyRevenue: mean,
            stdDailyRevenue: std,
            sharpeRatio: std > 0 ? mean / std : 0,
            var95: var95,
            maxDrawdown: maxDrawdown,
            dailyRevenues
        };
    }

    // Comprehensive backtesting with confidence intervals
    runComprehensiveBacktest(model, data, observations, options = {}) {
        const {
            windowSize = 96,
            numSimulations = 100,
            confidenceLevels = [0.05, 0.25, 0.5, 0.75, 0.95]
        } = options;
        
        console.log('=== Starting Comprehensive AFRR Backtest ===');
        
        try {
            // Run single full backtest
            console.log('\n1. Running full period backtest...');
            const fullBacktest = this.runSingleBacktest(model, data, observations);
            
            // Run multiple windowed backtests
            console.log('\n2. Running multiple windowed backtests...');
            const windowedBacktests = this.runMultipleBacktests(model, data, observations, windowSize);
            
            // Run Monte Carlo simulations
            console.log('\n3. Running Monte Carlo simulations...');
            const monteCarloResults = this.runMonteCarloSimulations(model, data, observations, numSimulations, windowSize);
            
            // Calculate confidence intervals
            console.log('\n4. Calculating confidence intervals...');
            const confidenceIntervals = this.calculateConfidenceIntervals(monteCarloResults, confidenceLevels);
            
            // Compile results
            const results = {
                fullBacktest,
                windowedBacktests,
                monteCarloResults,
                confidenceIntervals,
                summary: this.generateBacktestSummary(fullBacktest, confidenceIntervals)
            };
            
            this.results = results;
            this.confidenceIntervals = confidenceIntervals;
            this.simulationResults = monteCarloResults;
            
            console.log('\n=== Comprehensive Backtest Complete ===');
            
            return results;
            
        } catch (error) {
            console.error('Backtest failed:', error);
            throw error;
        }
    }

    // Generate summary of backtest results
    generateBacktestSummary(fullBacktest, confidenceIntervals) {
        const totalRevenue = confidenceIntervals.totalRevenue;
        
        return {
            totalRevenue: {
                expected: Math.round(totalRevenue.mean * 100) / 100,
                confidence95: `[${Math.round(totalRevenue.percentiles.p5 * 100) / 100}, ${Math.round(totalRevenue.percentiles.p95 * 100) / 100}]`,
                range: `[${Math.round(totalRevenue.min * 100) / 100}, ${Math.round(totalRevenue.max * 100) / 100}]`,
                volatility: Math.round(totalRevenue.std * 100) / 100
            },
            averageRevenuePerPeriod: {
                expected: Math.round(confidenceIntervals.averageRevenuePerPeriod.mean * 100) / 100,
                confidence95: `[${Math.round(confidenceIntervals.averageRevenuePerPeriod.percentiles.p5 * 100) / 100}, ${Math.round(confidenceIntervals.averageRevenuePerPeriod.percentiles.p95 * 100) / 100}]`
            },
            capacityClearing: {
                totalPeriods: fullBacktest.periods,
                clearedPeriods: fullBacktest.revenue.totalClearedCount,
                clearingRate: Math.round((fullBacktest.revenue.totalClearedCount / fullBacktest.periods) * 10000) / 100
            },
            modelPerformance: {
                logLikelihood: Math.round(fullBacktest.logLikelihood * 1000000) / 1000000,
                convergence: fullBacktest.metrics ? 'Converged' : 'Not converged'
            }
        };
    }

    // Test the backtester
    async testBacktester() {
        console.log('=== Testing AFRR Backtester ===');
        
        try {
            // Import required modules
            const AFRRDataProcessor = (await import('./afrrDataProcessor.js')).default;
            const AFRRHMMModel = (await import('./afrrHMMModel.js')).default;
            
            // Generate test data
            const dataProcessor = new AFRRDataProcessor();
            const processedData = dataProcessor.processData();
            
            // Train HMM model
            const model = new AFRRHMMModel();
            model.initializeParameters();
            const trainingResult = model.train(processedData.observations);
            
            console.log('✓ Model trained successfully');
            
            // Run comprehensive backtest
            const backtestResult = this.runComprehensiveBacktest(
                model, 
                processedData.data, 
                processedData.observations,
                { numSimulations: 50 } // Reduced for testing
            );
            
            console.log('✓ Comprehensive backtest completed');
            console.log('Summary:', backtestResult.summary);
            
            console.log('\n=== Backtester Test Complete ===');
            
            return {
                success: true,
                backtestResult
            };
            
        } catch (error) {
            console.error('✗ Backtester test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the AFRRBacktester class
export default AFRRBacktester; 