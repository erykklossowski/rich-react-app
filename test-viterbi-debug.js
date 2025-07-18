// Debug test for Viterbi algorithm and revenue calculation
import AFRRDataProcessor from './src/utils/afrrDataProcessor.js';
import AFRRHMMModel from './src/utils/afrrHMMModel.js';

console.log('=== Debug Test for Viterbi Algorithm ===');

async function debugViterbi() {
    try {
        // Generate small dataset
        const dataProcessor = new AFRRDataProcessor();
        const processedData = dataProcessor.processData(); // Use default 1000 periods
        
        console.log('Data generated:', processedData.data.length, 'periods');
        console.log('Hidden states distribution:', processedData.statistics.stateDistribution);
        
        // Initialize and train HMM
        const model = new AFRRHMMModel();
        model.initializeParameters();
        
        console.log('\nTraining HMM...');
        const trainingResult = model.train(processedData.observations, null, 20, 1e-6);
        console.log('Training completed:', trainingResult.iterations, 'iterations');
        
        // Run Viterbi on first 10 observations
        console.log('\nRunning Viterbi on first 10 observations...');
        const testObservations = processedData.observations.slice(0, 10);
        const testData = processedData.data.slice(0, 10);
        
        const viterbiResult = model.viterbi(testObservations);
        console.log('Viterbi path:', viterbiResult.path);
        console.log('Log likelihood:', viterbiResult.logLikelihood);
        
        // Calculate revenue
        console.log('\nCalculating revenue...');
        const revenueResult = model.calculateCapacityRevenue(viterbiResult.path, testData);
        console.log('Revenue result:', revenueResult);
        
        // Check individual periods
        console.log('\nIndividual period analysis:');
        for (let i = 0; i < 10; i++) {
            const state = viterbiResult.path[i];
            const data = testData[i];
            const revenue = state === 1 ? data.afrr_down_capacity_marginal_price_eur_per_mw :
                           state === 2 ? data.afrr_up_capacity_marginal_price_eur_per_mw : 0;
            
            console.log(`Period ${i}: State=${state}, Revenue=${revenue}, UpPrice=${data.afrr_up_capacity_marginal_price_eur_per_mw}, DownPrice=${data.afrr_down_capacity_marginal_price_eur_per_mw}`);
        }
        
        return { success: true, revenueResult, viterbiResult };
        
    } catch (error) {
        console.error('Debug test failed:', error);
        return { success: false, error: error.message };
    }
}

debugViterbi().then(result => {
    if (result.success) {
        console.log('\n✅ Debug test completed successfully');
    } else {
        console.log('\n❌ Debug test failed:', result.error);
    }
}); 