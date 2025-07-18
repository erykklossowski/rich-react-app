import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import fetch from 'node-fetch';

// Parameter consistency test configurations
const PARAMETER_TESTS = [
  // Normal case
  {
    name: 'Normal Parameters',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedBehavior: 'Should work normally'
  },
  
  // Boundary tests
  {
    name: 'Minimum Values',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 0.1,
      batteryEfficiency: 0.5,
      maxPower: 0.1,
      minPower: 0,
      initialSOC: 0.1,
      targetSOC: 0.1
    },
    expectedBehavior: 'Should handle minimum values'
  },
  
  {
    name: 'Maximum Values',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 100,
      batteryEfficiency: 0.99,
      maxPower: 50,
      minPower: 0,
      initialSOC: 0.99,
      targetSOC: 0.99
    },
    expectedBehavior: 'Should handle maximum values'
  },
  
  // SOC tests
  {
    name: 'Full Discharge to Full Charge',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0,
      targetSOC: 1
    },
    expectedBehavior: 'Should handle full discharge to full charge'
  },
  
  {
    name: 'Same SOC',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedBehavior: 'Should handle same initial and target SOC'
  },
  
  {
    name: 'Full Charge to Full Discharge',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 1,
      targetSOC: 0
    },
    expectedBehavior: 'Should handle full charge to full discharge'
  },
  
  // Power vs Capacity tests
  {
    name: 'Equal Power and Capacity',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 10,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedBehavior: 'Should handle equal power and capacity'
  },
  
  {
    name: 'Power Greater Than Capacity',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 5,
      batteryEfficiency: 0.9,
      maxPower: 10,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedBehavior: 'Should handle power greater than capacity (may be invalid)'
  }
];

// Mock data for testing
const MOCK_PRICES = [
  150, 160, 140, 180, 170, 190, 200, 180, 160, 140, 130, 120,
  110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5
];

const MOCK_DATA = MOCK_PRICES.map((price, index) => ({
  datetime: new Date(2024, 5, 14, index).toISOString(),
  price: price,
  dtime_utc: new Date(2024, 5, 14, index).toISOString(),
  business_date: '2024-06-14',
  period: index
}));

// Backend optimization function
async function runBackendOptimization(config) {
  console.log(`🔧 Running backend optimization for: ${config.name || 'Unknown'}`);
  
  try {
    // Use mock data
    const allData = MOCK_DATA;
    
    // Filter data by date range
    const filteredData = allData.filter(record => {
      const recordDate = new Date(record.datetime);
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      return recordDate >= start && recordDate <= end;
    });

    if (filteredData.length === 0) {
      return { error: 'No data found for date range' };
    }

    // Group data by month
    const monthlyGroups = {};
    filteredData.forEach(record => {
      const date = new Date(record.datetime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(record);
    });

    // Run optimization for each month
    const results = [];
    let totalRevenue = 0;
    let totalCycles = 0;
    let totalEnergyDischarged = 0;
    let totalEnergyCharged = 0;
    let totalEfficiency = 0;

    for (const [month, monthData] of Object.entries(monthlyGroups)) {
      try {
        // Create optimizer instance
        const optimizer = new BatteryOptimizer();
        
        // Set up parameters
        const params = {
          pMax: config.maxPower,
          socMin: 0,
          socMax: config.batteryCapacity,
          efficiency: config.batteryEfficiency,
          initialSOC: config.initialSOC * config.batteryCapacity,
          targetSOC: config.targetSOC * config.batteryCapacity
        };

        // Extract prices for the month
        const prices = monthData.map(record => record.price).filter(p => !isNaN(p));
        
        if (prices.length === 0) {
          continue;
        }

        // Run optimization
        const optimizationResult = optimizer.optimize(prices, params);
        
        if (optimizationResult && optimizationResult.success) {
          const monthResult = {
            month,
            revenue: optimizationResult.totalRevenue,
            cycles: optimizationResult.cycles || 0,
            energyDischarged: optimizationResult.totalEnergyDischarged || 0,
            energyCharged: optimizationResult.totalEnergyCharged || 0,
            efficiency: config.batteryEfficiency
          };

          results.push(monthResult);
          
          totalRevenue += monthResult.revenue;
          totalCycles += monthResult.cycles;
          totalEnergyDischarged += monthResult.energyDischarged;
          totalEnergyCharged += monthResult.energyCharged;
          totalEfficiency += monthResult.efficiency;
        }
      } catch (error) {
        console.error(`Error optimizing ${month}:`, error);
      }
    }

    // Calculate summary metrics
    const summary = {
      totalRevenue,
      totalCycles,
      totalEnergyDischarged,
      totalEnergyCharged,
      averageEfficiency: results.length > 0 ? totalEfficiency / results.length : 0,
      revenuePerMWh: totalEnergyDischarged > 0 ? totalRevenue / totalEnergyDischarged : 0,
      startDate: config.startDate,
      endDate: config.endDate,
      periodsAnalyzed: results.length
    };

    return {
      summary,
      results,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

// API call function
async function callBackendAPI(config) {
  console.log(`🌐 Calling backend API for: ${config.name || 'Unknown'}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/backtest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: config.startDate,
        endDate: config.endDate,
        batteryCapacity: config.batteryCapacity,
        batteryEfficiency: config.batteryEfficiency,
        maxPower: config.maxPower,
        minPower: config.minPower,
        initialSOC: config.initialSOC,
        targetSOC: config.targetSOC
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: errorData.error || `HTTP error! status: ${response.status}`,
        success: false
      };
    }

    const data = await response.json();
    return {
      ...data,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

// Parameter consistency comparison function
function compareParameterResults(backendResult, apiResult, testConfig) {
  const differences = [];
  const matches = [];
  
  // Helper function to compare values
  function compareValue(path, backendVal, apiVal, tolerance = 0.0001) {
    const backendNum = Number(backendVal);
    const apiNum = Number(apiVal);
    
    const diff = Math.abs(backendNum - apiNum);
    
    if (diff > tolerance) {
      differences.push({
        path,
        backend: backendVal,
        api: apiVal,
        difference: diff
      });
    } else {
      matches.push(path);
    }
  }
  
  // Check if both results are successful
  if (!backendResult.success || !apiResult.success) {
    const backendError = backendResult.error || 'Unknown error';
    const apiError = apiResult.error || 'Unknown error';
    
    if (backendError === apiError) {
      matches.push('error_handling');
      console.log(`✅ Error handling consistent: ${backendError}`);
    } else {
      differences.push({
        path: 'error_handling',
        backend: backendError,
        api: apiError,
        difference: 'Different error messages'
      });
      console.log(`❌ Error handling inconsistent:`);
      console.log(`   Backend: ${backendError}`);
      console.log(`   API:     ${apiError}`);
    }
    return { differences, matches, totalCompared: differences.length + matches.length };
  }
  
  // Compare summary metrics
  compareValue('summary.totalRevenue', backendResult.summary.totalRevenue, apiResult.summary.totalRevenue);
  compareValue('summary.totalCycles', backendResult.summary.totalCycles, apiResult.summary.totalCycles);
  compareValue('summary.totalEnergyDischarged', backendResult.summary.totalEnergyDischarged, apiResult.summary.totalEnergyDischarged);
  compareValue('summary.totalEnergyCharged', backendResult.summary.totalEnergyCharged, apiResult.summary.totalEnergyCharged);
  compareValue('summary.averageEfficiency', backendResult.summary.averageEfficiency, apiResult.summary.averageEfficiency);
  compareValue('summary.revenuePerMWh', backendResult.summary.revenuePerMWh, apiResult.summary.revenuePerMWh);
  compareValue('summary.periodsAnalyzed', backendResult.summary.periodsAnalyzed, apiResult.summary.periodsAnalyzed);
  
  // Compare results length
  compareValue('results.length', backendResult.results.length, apiResult.results.length);
  
  return { differences, matches, totalCompared: differences.length + matches.length };
}

// Main parameter consistency test function
async function runParameterConsistencyTest() {
  console.log('🚀 STARTING PARAMETER CONSISTENCY TEST');
  console.log('='.repeat(70));
  console.log(`Testing ${PARAMETER_TESTS.length} different parameter configurations`);
  console.log('='.repeat(70));
  
  const allResults = [];
  
  for (const testCase of PARAMETER_TESTS) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📋 Expected: ${testCase.expectedBehavior}`);
    console.log(`⚙️  Parameters:`, testCase.config);
    console.log('-'.repeat(50));
    
    try {
      // Run both backend and API
      const [backendResult, apiResult] = await Promise.all([
        runBackendOptimization(testCase.config),
        callBackendAPI(testCase.config)
      ]);
      
      // Compare results
      const comparison = compareParameterResults(backendResult, apiResult, testCase.config);
      
      const testResult = {
        name: testCase.name,
        config: testCase.config,
        expectedBehavior: testCase.expectedBehavior,
        backendResult,
        apiResult,
        comparison,
        success: comparison.differences.length === 0
      };
      
      allResults.push(testResult);
      
      // Display results
      if (testResult.success) {
        console.log(`✅ PASS: ${testCase.name} - Parameter consistency maintained`);
        console.log(`   Matches: ${comparison.matches.length}, Differences: ${comparison.differences.length}`);
      } else {
        console.log(`❌ FAIL: ${testCase.name} - Parameter consistency issues detected`);
        console.log(`   Matches: ${comparison.matches.length}, Differences: ${comparison.differences.length}`);
        
        comparison.differences.forEach((diff, index) => {
          console.log(`   ${index + 1}. ${diff.path}:`);
          console.log(`      Backend: ${diff.backend}`);
          console.log(`      API:     ${diff.api}`);
          console.log(`      Diff:    ${diff.difference}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ ERROR: ${testCase.name} - Test failed:`, error.message);
      allResults.push({
        name: testCase.name,
        config: testCase.config,
        error: error.message,
        success: false
      });
    }
  }
  
  // Summary
  console.log('\n📊 PARAMETER CONSISTENCY TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passedTests = allResults.filter(r => r.success);
  const failedTests = allResults.filter(r => !r.success);
  
  console.log(`✅ Passed: ${passedTests.length}/${allResults.length} tests`);
  console.log(`❌ Failed: ${failedTests.length}/${allResults.length} tests`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error || 'Parameter consistency issues'}`);
    });
  }
  
  if (passedTests.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    passedTests.forEach(test => {
      console.log(`   - ${test.name}`);
    });
  }
  
  // Final verdict
  console.log('\n🎯 FINAL VERDICT:');
  console.log('='.repeat(60));
  
  if (failedTests.length === 0) {
    console.log('🎉 SUCCESS: All parameter configurations maintain consistency!');
    console.log('🎉 Backend and API handle all parameter variations identically!');
  } else {
    console.log('⚠️  WARNING: Some parameter configurations show inconsistencies!');
    console.log('⚠️  Parameter handling may need improvement!');
  }
  
  return {
    totalTests: allResults.length,
    passedTests: passedTests.length,
    failedTests: failedTests.length,
    results: allResults,
    success: failedTests.length === 0
  };
}

// Run the parameter consistency test
if (import.meta.url === `file://${process.argv[1]}`) {
  runParameterConsistencyTest()
    .then(result => {
      console.log('\n✅ Parameter consistency test completed successfully');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Parameter consistency test failed:', error);
      process.exit(1);
    });
}

export { runParameterConsistencyTest }; 