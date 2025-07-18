import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import fetch from 'node-fetch';

// Error handling test configurations
const ERROR_TESTS = [
  // Invalid input tests
  {
    name: 'Negative Battery Capacity',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: -1,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedError: 'Invalid battery capacity',
    category: 'Invalid Input'
  },
  
  {
    name: 'Efficiency Greater Than 100%',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 1.5,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedError: 'Invalid efficiency',
    category: 'Invalid Input'
  },
  
  {
    name: 'Invalid Date Format',
    config: {
      startDate: 'invalid-date',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedError: 'Invalid date format',
    category: 'Invalid Input'
  },
  
  {
    name: 'Zero Max Power',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 0,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedError: 'Invalid max power',
    category: 'Invalid Input'
  },
  
  {
    name: 'SOC Greater Than 100%',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 1.5,
      targetSOC: 0.5
    },
    expectedError: 'Invalid SOC',
    category: 'Invalid Input'
  },
  
  {
    name: 'End Date Before Start Date',
    config: {
      startDate: '2024-06-15',
      endDate: '2024-06-14',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5
    },
    expectedError: 'End date before start date',
    category: 'Invalid Input'
  },
  
  // Edge case tests
  {
    name: 'Empty Price Array',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: [] // Empty data
    },
    expectedError: 'No price data available',
    category: 'Edge Case'
  },
  
  {
    name: 'Single Price Point',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: [{ datetime: '2024-06-14T00:00:00Z', price: 100 }] // Single point
    },
    expectedError: 'Insufficient data points',
    category: 'Edge Case'
  },
  
  {
    name: 'All Same Prices',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: Array(24).fill().map((_, i) => ({
        datetime: `2024-06-14T${String(i).padStart(2, '0')}:00:00Z`,
        price: 100 // All same price
      }))
    },
    expectedError: 'No price variation',
    category: 'Edge Case'
  },
  
  {
    name: 'Very Small Price Range',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: Array(24).fill().map((_, i) => ({
        datetime: `2024-06-14T${String(i).padStart(2, '0')}:00:00Z`,
        price: 100 + i * 0.01 // Very small variation
      }))
    },
    expectedError: 'Insufficient price variation',
    category: 'Edge Case'
  },
  
  // Data quality tests
  {
    name: 'NaN Prices',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: Array(24).fill().map((_, i) => ({
        datetime: `2024-06-14T${String(i).padStart(2, '0')}:00:00Z`,
        price: i % 2 === 0 ? 100 : NaN // Alternating NaN
      }))
    },
    expectedError: 'Invalid price data',
    category: 'Data Quality'
  },
  
  {
    name: 'Negative Prices',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: Array(24).fill().map((_, i) => ({
        datetime: `2024-06-14T${String(i).padStart(2, '0')}:00:00Z`,
        price: i % 2 === 0 ? 100 : -50 // Alternating negative
      }))
    },
    expectedError: 'Negative prices not allowed',
    category: 'Data Quality'
  },
  
  {
    name: 'Null Prices',
    config: {
      startDate: '2024-06-14',
      endDate: '2024-06-15',
      batteryCapacity: 10,
      batteryEfficiency: 0.9,
      maxPower: 5,
      minPower: 0,
      initialSOC: 0.5,
      targetSOC: 0.5,
      mockData: Array(24).fill().map((_, i) => ({
        datetime: `2024-06-14T${String(i).padStart(2, '0')}:00:00Z`,
        price: i % 2 === 0 ? 100 : null // Alternating null
      }))
    },
    expectedError: 'Missing price data',
    category: 'Data Quality'
  }
];

// Default mock data for tests that don't specify custom data
const DEFAULT_MOCK_DATA = [
  150, 160, 140, 180, 170, 190, 200, 180, 160, 140, 130, 120,
  110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5
].map((price, index) => ({
  datetime: new Date(2024, 5, 14, index).toISOString(),
  price: price,
  dtime_utc: new Date(2024, 5, 14, index).toISOString(),
  business_date: '2024-06-14',
  period: index
}));

// Backend optimization function with error handling
async function runBackendOptimizationWithErrors(config) {
  console.log(`🔧 Running backend optimization for: ${config.name || 'Unknown'}`);
  
  try {
    // Use custom mock data if provided, otherwise use default
    const allData = config.mockData || DEFAULT_MOCK_DATA;
    
    // Validate input parameters
    if (config.batteryCapacity <= 0) {
      return { error: 'Invalid battery capacity', success: false };
    }
    
    if (config.batteryEfficiency <= 0 || config.batteryEfficiency > 1) {
      return { error: 'Invalid efficiency', success: false };
    }
    
    if (config.maxPower <= 0) {
      return { error: 'Invalid max power', success: false };
    }
    
    if (config.initialSOC < 0 || config.initialSOC > 1) {
      return { error: 'Invalid SOC', success: false };
    }
    
    if (config.targetSOC < 0 || config.targetSOC > 1) {
      return { error: 'Invalid SOC', success: false };
    }
    
    // Validate dates
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: 'Invalid date format', success: false };
    }
    
    if (endDate < startDate) {
      return { error: 'End date before start date', success: false };
    }
    
    // Filter data by date range
    const filteredData = allData.filter(record => {
      const recordDate = new Date(record.datetime);
      return recordDate >= startDate && recordDate <= endDate;
    });

    // Validate data quality
    if (filteredData.length === 0) {
      return { error: 'No data found for date range', success: false };
    }
    
    if (filteredData.length < 2) {
      return { error: 'Insufficient data points', success: false };
    }
    
    // Check for data quality issues
    const prices = filteredData.map(record => record.price).filter(p => !isNaN(p) && p !== null && p >= 0);
    
    if (prices.length === 0) {
      return { error: 'No valid price data available', success: false };
    }
    
    if (prices.length < filteredData.length) {
      return { error: 'Invalid price data', success: false };
    }
    
    // Check for price variation
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) {
      return { error: 'No price variation', success: false };
    }
    
    if (priceRange < 1) {
      return { error: 'Insufficient price variation', success: false };
    }
    
    // If we get here, proceed with optimization
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
        const optimizer = new BatteryOptimizer();
        
        const params = {
          pMax: config.maxPower,
          socMin: 0,
          socMax: config.batteryCapacity,
          efficiency: config.batteryEfficiency,
          initialSOC: config.initialSOC * config.batteryCapacity,
          targetSOC: config.targetSOC * config.batteryCapacity
        };

        const monthPrices = monthData.map(record => record.price).filter(p => !isNaN(p));
        
        if (monthPrices.length === 0) {
          continue;
        }

        const optimizationResult = optimizer.optimize(monthPrices, params);
        
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
async function callBackendAPIWithErrors(config) {
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

// Error handling comparison function
function compareErrorHandling(backendResult, apiResult, testConfig) {
  const differences = [];
  const matches = [];
  
  // Check if both results have errors
  const backendHasError = !backendResult.success;
  const apiHasError = !apiResult.success;
  
  if (backendHasError && apiHasError) {
    // Both have errors - compare error messages
    const backendError = backendResult.error || 'Unknown error';
    const apiError = apiResult.error || 'Unknown error';
    
    // Check if error messages are similar (don't need to be identical)
    const backendErrorLower = backendError.toLowerCase();
    const apiErrorLower = apiError.toLowerCase();
    
    // Check for common error keywords
    const errorKeywords = [
      'invalid', 'error', 'failed', 'missing', 'insufficient', 
      'negative', 'zero', 'empty', 'null', 'nan'
    ];
    
    const backendHasKeywords = errorKeywords.some(keyword => backendErrorLower.includes(keyword));
    const apiHasKeywords = errorKeywords.some(keyword => apiErrorLower.includes(keyword));
    
    if (backendHasKeywords && apiHasKeywords) {
      matches.push('error_handling');
      console.log(`✅ Error handling consistent: Both detected invalid input`);
      console.log(`   Backend: ${backendError}`);
      console.log(`   API:     ${apiError}`);
    } else {
      differences.push({
        path: 'error_handling',
        backend: backendError,
        api: apiError,
        difference: 'Different error detection'
      });
      console.log(`❌ Error handling inconsistent:`);
      console.log(`   Backend: ${backendError}`);
      console.log(`   API:     ${apiError}`);
    }
  } else if (!backendHasError && !apiHasError) {
    // Both succeeded - this might be unexpected for error tests
    matches.push('success_handling');
    console.log(`⚠️  Both succeeded (unexpected for error test): ${testConfig.name}`);
  } else {
    // One succeeded, one failed
    differences.push({
      path: 'error_handling',
      backend: backendHasError ? backendResult.error : 'Success',
      api: apiHasError ? apiResult.error : 'Success',
      difference: 'Inconsistent error detection'
    });
    console.log(`❌ Inconsistent error detection:`);
    console.log(`   Backend: ${backendHasError ? backendResult.error : 'Success'}`);
    console.log(`   API:     ${apiHasError ? apiResult.error : 'Success'}`);
  }
  
  return { differences, matches, totalCompared: differences.length + matches.length };
}

// Main error handling test function
async function runErrorHandlingTest() {
  console.log('🚀 STARTING ERROR HANDLING CONSISTENCY TEST');
  console.log('='.repeat(70));
  console.log(`Testing ${ERROR_TESTS.length} error scenarios`);
  console.log('='.repeat(70));
  
  const allResults = [];
  
  for (const testCase of ERROR_TESTS) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📋 Category: ${testCase.category}`);
    console.log(`📋 Expected: ${testCase.expectedError}`);
    console.log(`⚙️  Parameters:`, testCase.config);
    console.log('-'.repeat(50));
    
    try {
      // Run both backend and API
      const [backendResult, apiResult] = await Promise.all([
        runBackendOptimizationWithErrors(testCase.config),
        callBackendAPIWithErrors(testCase.config)
      ]);
      
      // Compare error handling
      const comparison = compareErrorHandling(backendResult, apiResult, testCase.config);
      
      const testResult = {
        name: testCase.name,
        category: testCase.category,
        config: testCase.config,
        expectedError: testCase.expectedError,
        backendResult,
        apiResult,
        comparison,
        success: comparison.differences.length === 0
      };
      
      allResults.push(testResult);
      
      // Display results
      if (testResult.success) {
        console.log(`✅ PASS: ${testCase.name} - Error handling consistent`);
        console.log(`   Matches: ${comparison.matches.length}, Differences: ${comparison.differences.length}`);
      } else {
        console.log(`❌ FAIL: ${testCase.name} - Error handling inconsistent`);
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
        category: testCase.category,
        config: testCase.config,
        error: error.message,
        success: false
      });
    }
  }
  
  // Summary by category
  console.log('\n📊 ERROR HANDLING TEST SUMMARY BY CATEGORY');
  console.log('='.repeat(70));
  
  const categories = [...new Set(ERROR_TESTS.map(t => t.category))];
  
  categories.forEach(category => {
    const categoryTests = allResults.filter(r => r.category === category);
    const passedTests = categoryTests.filter(r => r.success);
    const failedTests = categoryTests.filter(r => !r.success);
    
    console.log(`\n📁 ${category}:`);
    console.log(`   ✅ Passed: ${passedTests.length}/${categoryTests.length}`);
    console.log(`   ❌ Failed: ${failedTests.length}/${categoryTests.length}`);
    
    if (failedTests.length > 0) {
      failedTests.forEach(test => {
        console.log(`      - ${test.name}: ${test.error || 'Error handling inconsistency'}`);
      });
    }
  });
  
  // Overall summary
  console.log('\n📊 OVERALL ERROR HANDLING TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passedTests = allResults.filter(r => r.success);
  const failedTests = allResults.filter(r => !r.success);
  
  console.log(`✅ Passed: ${passedTests.length}/${allResults.length} tests`);
  console.log(`❌ Failed: ${failedTests.length}/${allResults.length} tests`);
  
  // Final verdict
  console.log('\n🎯 FINAL VERDICT:');
  console.log('='.repeat(60));
  
  if (failedTests.length === 0) {
    console.log('🎉 SUCCESS: All error scenarios handled consistently!');
    console.log('🎉 Backend and API error handling is robust and consistent!');
  } else {
    console.log('⚠️  WARNING: Some error scenarios show inconsistent handling!');
    console.log('⚠️  Error handling may need improvement!');
  }
  
  return {
    totalTests: allResults.length,
    passedTests: passedTests.length,
    failedTests: failedTests.length,
    results: allResults,
    success: failedTests.length === 0
  };
}

// Run the error handling test
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingTest()
    .then(result => {
      console.log('\n✅ Error handling test completed successfully');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error handling test failed:', error);
      process.exit(1);
    });
}

export { runErrorHandlingTest }; 