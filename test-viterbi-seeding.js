import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

// Test configuration
const TEST_CONFIG = {
  prices: [100, 150, 80, 200, 120, 180, 90, 160, 110, 170],
  params: {
    pMax: 5,
    socMin: 0,
    socMax: 10,
    efficiency: 0.9,
    initialSOC: 5,
    targetSOC: 5
  }
};

// Test Viterbi path seeding
async function testViterbiSeeding() {
  console.log('🧪 TESTING VITERBI PATH SEEDING');
  console.log('='.repeat(60));
  console.log('Goal: Verify that Viterbi path seeding produces deterministic results');
  console.log('='.repeat(60));
  
  const optimizer = new BatteryOptimizer();
  const results = [];
  
  // Run optimization multiple times with same Viterbi path
  for (let run = 1; run <= 5; run++) {
    console.log(`\n🔄 Run ${run}/5`);
    console.log('-'.repeat(30));
    
    try {
      // Reset optimizer state
      optimizer.reset();
      
      // Run optimization with Viterbi path
      const result = optimizer.optimize(
        TEST_CONFIG.prices,
        TEST_CONFIG.params,
        'quantile',
        {},
        null
      );
      
      if (result && result.success) {
        const runResult = {
          run,
          totalRevenue: result.totalRevenue,
          cycles: result.cycles,
          totalEnergyDischarged: result.totalEnergyDischarged,
          totalEnergyCharged: result.totalEnergyCharged
        };
        
        results.push(runResult);
        
        console.log(`✅ Run ${run} completed successfully`);
        console.log(`   Revenue: ${result.totalRevenue.toFixed(2)} PLN`);
        console.log(`   Cycles: ${result.cycles}`);
        console.log(`   Energy Discharged: ${result.totalEnergyDischarged.toFixed(2)} MWh`);
        console.log(`   Energy Charged: ${result.totalEnergyCharged.toFixed(2)} MWh`);
      } else {
        console.log(`❌ Run ${run} failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Run ${run} threw exception: ${error.message}`);
    }
  }
  
  // Analyze results for consistency
  console.log('\n📊 VITERBI SEEDING ANALYSIS');
  console.log('='.repeat(60));
  
  if (results.length === 0) {
    console.log('❌ No successful runs to analyze');
    return false;
  }
  
  // Check if all results are identical (deterministic)
  const firstResult = results[0];
  const allIdentical = results.every(result => 
    Math.abs(result.totalRevenue - firstResult.totalRevenue) < 0.01 &&
    Math.abs(result.cycles - firstResult.cycles) < 0.01 &&
    Math.abs(result.totalEnergyDischarged - firstResult.totalEnergyDischarged) < 0.01 &&
    Math.abs(result.totalEnergyCharged - firstResult.totalEnergyCharged) < 0.01
  );
  
  if (allIdentical) {
    console.log('🎉 SUCCESS: All runs produced identical results!');
    console.log('✅ Viterbi path seeding is working deterministically');
    console.log(`📊 Consistent Results:`);
    console.log(`   Revenue: ${firstResult.totalRevenue.toFixed(2)} PLN`);
    console.log(`   Cycles: ${firstResult.cycles}`);
    console.log(`   Energy Discharged: ${firstResult.totalEnergyDischarged.toFixed(2)} MWh`);
    console.log(`   Energy Charged: ${firstResult.totalEnergyCharged.toFixed(2)} MWh`);
  } else {
    console.log('⚠️  WARNING: Results are not identical across runs');
    console.log('❌ Viterbi path seeding may not be fully deterministic');
    
    // Show differences
    console.log('\n📈 Results Comparison:');
    results.forEach((result, index) => {
      console.log(`   Run ${index + 1}: Revenue=${result.totalRevenue.toFixed(2)}, Cycles=${result.cycles}`);
    });
    
    // Calculate statistics
    const revenues = results.map(r => r.totalRevenue);
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const revenueRange = maxRevenue - minRevenue;
    
    console.log(`\n📊 Revenue Statistics:`);
    console.log(`   Average: ${avgRevenue.toFixed(2)} PLN`);
    console.log(`   Range: ${revenueRange.toFixed(2)} PLN (${minRevenue.toFixed(2)} - ${maxRevenue.toFixed(2)})`);
    console.log(`   Coefficient of Variation: ${(revenueRange / avgRevenue * 100).toFixed(2)}%`);
  }
  
  return allIdentical;
}

// Test Viterbi path generation
function testViterbiPathGeneration() {
  console.log('\n🔍 TESTING VITERBI PATH GENERATION');
  console.log('='.repeat(60));
  
  const optimizer = new BatteryOptimizer();
  
  // Test price categorization
  const categories = optimizer.categorizePrices(TEST_CONFIG.prices);
  console.log('Price Categories:', categories);
  
  // Test transition matrix
  const transitionMatrix = optimizer.calculateTransitionMatrix(categories);
  console.log('Transition Matrix:', transitionMatrix);
  
  // Test emission matrix
  const emissionMatrix = optimizer.initializeEmissionMatrix(TEST_CONFIG.prices);
  console.log('Emission Matrix Shape:', emissionMatrix.length, 'x', emissionMatrix[0]?.length);
  
  // Test Viterbi decoding
  const viterbiPath = optimizer.viterbiDecode(categories, transitionMatrix, emissionMatrix);
  console.log('Viterbi Path:', viterbiPath);
  
  // Test Viterbi seed creation
  const viterbiSeed = optimizer.createViterbiSeed(viterbiPath, TEST_CONFIG.prices.length, TEST_CONFIG.params.pMax);
  console.log('Viterbi Seed Length:', viterbiSeed.length);
  console.log('Viterbi Seed Sample:', viterbiSeed.slice(0, 10));
  
  return {
    categories,
    viterbiPath,
    viterbiSeed
  };
}

// Main test function
async function runViterbiSeedingTests() {
  console.log('🚀 STARTING VITERBI PATH SEEDING TESTS');
  console.log('='.repeat(80));
  
  try {
    // Test Viterbi path generation
    const viterbiResults = testViterbiPathGeneration();
    
    // Test deterministic optimization
    const seedingSuccess = await testViterbiSeeding();
    
    // Final verdict
    console.log('\n🎯 FINAL VERDICT');
    console.log('='.repeat(60));
    
    if (seedingSuccess) {
      console.log('🎉 SUCCESS: Viterbi path seeding is working deterministically!');
      console.log('✅ Single source of truth architecture is ready for production');
      console.log('✅ Frontend will receive consistent results from backend');
    } else {
      console.log('⚠️  WARNING: Viterbi path seeding needs improvement');
      console.log('🔧 Consider implementing additional deterministic measures');
    }
    
    return seedingSuccess;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runViterbiSeedingTests()
    .then(success => {
      console.log('\n✅ Viterbi seeding test completed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Viterbi seeding test failed:', error);
      process.exit(1);
    });
}

export { runViterbiSeedingTests, testViterbiSeeding, testViterbiPathGeneration }; 