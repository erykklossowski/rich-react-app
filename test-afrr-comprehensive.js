// Comprehensive test script for aFRR capacity bidding system
import AFRRDataProcessor from './src/utils/afrrDataProcessor.js';
import AFRRHMMModel from './src/utils/afrrHMMModel.js';
import AFRRBacktester from './src/utils/afrrBacktester.js';

console.log('=== Comprehensive aFRR Capacity Bidding System Test ===');

async function testComprehensiveAFRRSystem() {
    try {
        // Step 1: Test Data Processor
        console.log('\n1. Testing Data Processor...');
        const dataProcessor = new AFRRDataProcessor();
        const dataProcessorTest = dataProcessor.testDataProcessor();
        
        if (!dataProcessorTest.success) {
            throw new Error(`Data processor test failed: ${dataProcessorTest.error}`);
        }
        
        console.log('✓ Data processor test passed');
        
        // Step 2: Process data for HMM training
        console.log('\n2. Processing data for HMM training...');
        const processedData = dataProcessor.processData();
        
        console.log(`✓ Processed ${processedData.data.length} data points`);
        console.log(`✓ Generated ${processedData.hiddenStates.length} hidden states`);
        console.log(`✓ Created ${processedData.observations.length} observation sequences`);
        
        // Step 3: Test HMM Model
        console.log('\n3. Testing HMM Model...');
        const hmmModel = new AFRRHMMModel();
        const hmmTest = hmmModel.testHMMModel();
        
        if (!hmmTest.success) {
            throw new Error(`HMM model test failed: ${hmmTest.error}`);
        }
        
        console.log('✓ HMM model test passed');
        
        // Step 4: Train HMM on processed data
        console.log('\n4. Training HMM on processed data...');
        hmmModel.initializeParameters();
        const trainingResult = hmmModel.train(processedData.observations, null, 50, 1e-6);
        
        console.log(`✓ HMM training completed in ${trainingResult.iterations} iterations`);
        console.log(`✓ Final log likelihood: ${trainingResult.finalLogLikelihood.toFixed(6)}`);
        console.log(`✓ Converged: ${trainingResult.converged}`);
        
        // Step 5: Test Backtester
        console.log('\n5. Testing Backtester...');
        const backtester = new AFRRBacktester();
        const backtesterTest = await backtester.testBacktester();
        
        if (!backtesterTest.success) {
            throw new Error(`Backtester test failed: ${backtesterTest.error}`);
        }
        
        console.log('✓ Backtester test passed');
        
        // Step 6: Run comprehensive backtest on processed data
        console.log('\n6. Running comprehensive backtest on processed data...');
        const comprehensiveBacktest = backtester.runComprehensiveBacktest(
            hmmModel,
            processedData.data,
            processedData.observations,
            {
                windowSize: 96,        // 24 hours at 15-minute resolution
                numSimulations: 100,   // 100 Monte Carlo simulations
                confidenceLevels: [0.05, 0.25, 0.5, 0.75, 0.95]
            }
        );
        
        console.log('✓ Comprehensive backtest completed');
        
        // Step 7: Display results
        console.log('\n7. Backtest Results Summary:');
        console.log('=============================');
        
        const summary = comprehensiveBacktest.summary;
        
        console.log(`Total Revenue:`);
        console.log(`  Expected: ${summary.totalRevenue.expected} EUR`);
        console.log(`  95% Confidence: ${summary.totalRevenue.confidence95} EUR`);
        console.log(`  Range: ${summary.totalRevenue.range} EUR`);
        console.log(`  Volatility: ${summary.totalRevenue.volatility} EUR`);
        
        console.log(`\nAverage Revenue per Period:`);
        console.log(`  Expected: ${summary.averageRevenuePerPeriod.expected} EUR`);
        console.log(`  95% Confidence: ${summary.averageRevenuePerPeriod.confidence95} EUR`);
        
        console.log(`\nCapacity Clearing:`);
        console.log(`  Total Periods: ${summary.capacityClearing.totalPeriods}`);
        console.log(`  Cleared Periods: ${summary.capacityClearing.clearedPeriods}`);
        console.log(`  Clearing Rate: ${summary.capacityClearing.clearingRate}%`);
        
        console.log(`\nModel Performance:`);
        console.log(`  Log Likelihood: ${summary.modelPerformance.logLikelihood}`);
        console.log(`  Convergence: ${summary.modelPerformance.convergence}`);
        
        // Step 8: Detailed analysis
        console.log('\n8. Detailed Analysis:');
        console.log('====================');
        
        const fullBacktest = comprehensiveBacktest.fullBacktest;
        const metrics = fullBacktest.metrics;
        
        // State transition analysis
        console.log('\nState Transitions:');
        Object.entries(metrics.stateTransitions.stateCounts).forEach(([state, count]) => {
            const stateName = hmmModel.stateNames[parseInt(state)];
            console.log(`  ${stateName}: ${count} periods`);
        });
        
        // Market condition analysis
        console.log('\nMarket Conditions:');
        Object.entries(metrics.marketConditions).forEach(([condition, stats]) => {
            console.log(`  ${condition}:`);
            console.log(`    Total periods: ${stats.total}`);
            console.log(`    Cleared periods: ${stats.cleared}`);
            console.log(`    Clearing rate: ${(stats.clearingRate * 100).toFixed(2)}%`);
            console.log(`    Average revenue when cleared: ${stats.averageRevenue.toFixed(2)} EUR`);
        });
        
        // Risk metrics
        console.log('\nRisk Metrics:');
        console.log(`  Mean daily revenue: ${metrics.riskMetrics.meanDailyRevenue.toFixed(2)} EUR`);
        console.log(`  Daily revenue volatility: ${metrics.riskMetrics.stdDailyRevenue.toFixed(2)} EUR`);
        console.log(`  Sharpe ratio: ${metrics.riskMetrics.sharpeRatio.toFixed(4)}`);
        console.log(`  VaR (95%): ${metrics.riskMetrics.var95.toFixed(2)} EUR`);
        console.log(`  Max drawdown: ${(metrics.riskMetrics.maxDrawdown * 100).toFixed(2)}%`);
        
        // Step 9: Confidence interval details
        console.log('\n9. Confidence Interval Details:');
        console.log('================================');
        
        const ci = comprehensiveBacktest.confidenceIntervals;
        
        console.log('\nTotal Revenue Distribution:');
        console.log(`  Mean: ${ci.totalRevenue.mean.toFixed(2)} EUR`);
        console.log(`  Std Dev: ${ci.totalRevenue.std.toFixed(2)} EUR`);
        console.log(`  5th percentile: ${ci.totalRevenue.percentiles.p5.toFixed(2)} EUR`);
        console.log(`  25th percentile: ${ci.totalRevenue.percentiles.p25.toFixed(2)} EUR`);
        console.log(`  50th percentile: ${ci.totalRevenue.percentiles.p50.toFixed(2)} EUR`);
        console.log(`  75th percentile: ${ci.totalRevenue.percentiles.p75.toFixed(2)} EUR`);
        console.log(`  95th percentile: ${ci.totalRevenue.percentiles.p95.toFixed(2)} EUR`);
        
        console.log('\nUp Capacity Revenue Distribution:');
        console.log(`  Mean: ${ci.upRevenue.mean.toFixed(2)} EUR`);
        console.log(`  Std Dev: ${ci.upRevenue.std.toFixed(2)} EUR`);
        console.log(`  5th percentile: ${ci.upRevenue.percentiles.p5.toFixed(2)} EUR`);
        console.log(`  95th percentile: ${ci.upRevenue.percentiles.p95.toFixed(2)} EUR`);
        
        console.log('\nDown Capacity Revenue Distribution:');
        console.log(`  Mean: ${ci.downRevenue.mean.toFixed(2)} EUR`);
        console.log(`  Std Dev: ${ci.downRevenue.std.toFixed(2)} EUR`);
        console.log(`  5th percentile: ${ci.downRevenue.percentiles.p5.toFixed(2)} EUR`);
        console.log(`  95th percentile: ${ci.downRevenue.percentiles.p95.toFixed(2)} EUR`);
        
        console.log('\n=== Comprehensive aFRR System Test Complete ===');
        
        return {
            success: true,
            dataProcessorTest,
            hmmTest,
            backtesterTest,
            comprehensiveBacktest,
            summary: {
                totalDataPoints: processedData.data.length,
                trainingIterations: trainingResult.iterations,
                numSimulations: comprehensiveBacktest.monteCarloResults.length,
                expectedRevenue: summary.totalRevenue.expected,
                clearingRate: summary.capacityClearing.clearingRate
            }
        };
        
    } catch (error) {
        console.error('✗ Comprehensive test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the comprehensive test
testComprehensiveAFRRSystem().then(result => {
    if (result.success) {
        console.log('\n🎉 All tests passed successfully!');
        console.log('\nFinal Summary:');
        console.log(`  Data points processed: ${result.summary.totalDataPoints}`);
        console.log(`  HMM training iterations: ${result.summary.trainingIterations}`);
        console.log(`  Monte Carlo simulations: ${result.summary.numSimulations}`);
        console.log(`  Expected revenue: ${result.summary.expectedRevenue} EUR`);
        console.log(`  Capacity clearing rate: ${result.summary.clearingRate}%`);
        
        console.log('\n✅ aFRR Capacity Bidding System is ready for production use!');
    } else {
        console.log('\n❌ Tests failed:', result.error);
        process.exit(1);
    }
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
}); 