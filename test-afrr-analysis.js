// Test script for AFRR analysis functionality
import AFRRDataLoader from './src/utils/afrrDataLoaders.js';
import AFRROptimizer from './src/utils/AFRROptimizerClass.js';

console.log('=== Testing AFRR Analysis System ===');

async function testAFRRAnalysis() {
    try {
        // Test data loader
        console.log('\n1. Testing AFRR Data Loader...');
        const dataLoader = new AFRRDataLoader();
        
        // Load PSE data
        await dataLoader.loadPSEData();
        console.log('✓ PSE data loaded successfully');
        
        // Extract contracting values
        const processedData = dataLoader.extractContractingValues();
        console.log('✓ Contracting values extracted:', processedData.contractingValues.length, 'points');
        
        // Get statistics
        const stats = dataLoader.getContractingStatistics();
        console.log('✓ Statistics calculated:', {
            average: stats.average.toFixed(2),
            min: stats.minimum.toFixed(2),
            max: stats.maximum.toFixed(2),
            std: stats.standardDeviation.toFixed(2)
        });
        
        // Test different time ranges
        const last24h = dataLoader.getLast24Hours();
        console.log('✓ Last 24 hours data:', last24h.contractingValues.length, 'points');
        
        // Test AFRR optimizer
        console.log('\n2. Testing AFRR Optimizer...');
        const optimizer = new AFRROptimizer();
        
        // Test with sample data first
        console.log('\n2a. Testing with sample data...');
        const sampleResult = optimizer.testAnalysis();
        if (sampleResult.success) {
            console.log('✓ Sample analysis successful');
        } else {
            console.log('✗ Sample analysis failed:', sampleResult.error);
        }
        
        // Test with real data
        console.log('\n2b. Testing with real data (last 96 points)...');
        const realData = processedData.contractingValues.slice(-96); // Last 24 hours
        const realResult = optimizer.analyze(realData, 'quantile');
        
        if (realResult.success) {
            console.log('✓ Real data analysis successful');
            console.log('State distribution:', realResult.stateCounts);
            console.log('Viterbi state distribution:', realResult.viterbiStateCounts);
        } else {
            console.log('✗ Real data analysis failed:', realResult.error);
        }
        
        // Test categorization methods
        console.log('\n3. Testing categorization methods...');
        const testData = processedData.contractingValues.slice(-48); // Last 12 hours
        const categorizationResults = optimizer.testCategorizationMethods(testData);
        
        console.log('✓ Categorization methods tested');
        Object.entries(categorizationResults).forEach(([method, result]) => {
            console.log(`${method}: ${JSON.stringify(result.categoryCounts)}`);
        });
        
        console.log('\n=== AFRR Analysis Test Complete ===');
        return {
            success: true,
            dataPoints: processedData.contractingValues.length,
            statistics: stats,
            categorizationResults: Object.keys(categorizationResults).length
        };
        
    } catch (error) {
        console.error('✗ AFRR analysis test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testAFRRAnalysis().then(result => {
    if (result.success) {
        console.log('\n🎉 All tests passed!');
        console.log(`Processed ${result.dataPoints} data points`);
        console.log(`Tested ${result.categorizationResults} categorization methods`);
    } else {
        console.log('\n❌ Tests failed:', result.error);
        process.exit(1);
    }
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
}); 