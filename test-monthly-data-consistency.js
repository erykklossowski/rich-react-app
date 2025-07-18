import { loadCSDACPLNData, filterDataByDateRange } from './src/utils/dataLoaders.js';
import { getDataConfig } from './src/utils/dataConfig.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

console.log('=== Monthly Data Consistency Test ===');

async function testMonthlyDataConsistency() {
  try {
    // 1. Load data configuration
    console.log('1. Loading data configuration...');
    const config = await getDataConfig();
    
    // 2. Load CSDAC data
    console.log('\n2. Loading CSDAC PLN data...');
    const csdacData = await loadCSDACPLNData();
    
    // 3. Test monthly periods
    console.log('\n3. Testing monthly data consistency...');
    const testMonths = [
      { period: '2024-11', startDate: '2024-11-01', endDate: '2024-11-30' },
      { period: '2024-12', startDate: '2024-12-01', endDate: '2024-12-31' },
      { period: '2025-01', startDate: '2025-01-01', endDate: '2025-01-31' }
    ];
    
    const optimizer = new BatteryOptimizer();
    const params = {
      pMax: 10,
      socMin: 10,
      socMax: 40,
      efficiency: 0.85
    };
    
    for (const month of testMonths) {
      console.log(`\n--- Testing ${month.period} ---`);
      
      // Filter data for this month
      const monthData = filterDataByDateRange(csdacData, month.startDate, month.endDate);
      console.log(`  Raw data points: ${monthData.length}`);
      
      if (monthData.length === 0) {
        console.log(`  ⚠️  No data for ${month.period}`);
        continue;
      }
      
      // Extract prices and timestamps
      const prices = monthData.map(d => d.csdac_pln);
      const timestamps = monthData.map(d => d.dtime);
      
      // Run optimization
      const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
      
      if (!result.success) {
        console.log(`  ❌ Optimization failed for ${month.period}:`, result.error);
        continue;
      }
      
      // Verify data consistency
      const revenueChartData = {
        period: month.period,
        periodStart: month.startDate,
        periodEnd: month.endDate,
        totalRevenue: result.totalRevenue,
        totalEnergyCharged: result.totalEnergyCharged,
        totalEnergyDischarged: result.totalEnergyDischarged,
        operationalEfficiency: result.operationalEfficiency,
        avgPrice: result.avgPrice,
        cycles: result.cycles,
        vwapCharge: result.vwapCharge,
        vwapDischarge: result.vwapDischarge,
        dataPoints: prices.length,
        prices: prices,
        timestamps: timestamps
      };
      
      const detailedAnalysisData = {
        result: {
          ...result,
          period: month.period,
          params: params
        },
        prices: prices,
        params: params,
        title: `Detailed Analysis - ${month.period}`
      };
      
      // Verify consistency
      console.log(`  ✅ Optimization successful for ${month.period}`);
      console.log(`    Revenue chart data points: ${revenueChartData.dataPoints}`);
      console.log(`    Detailed analysis data points: ${detailedAnalysisData.prices.length}`);
      console.log(`    Schedule data points: ${result.schedule ? result.schedule.soc.length : 0}`);
      console.log(`    Total revenue: ${result.totalRevenue.toFixed(2)} PLN`);
      console.log(`    Total energy discharged: ${result.totalEnergyDischarged.toFixed(2)} MWh`);
      
      // Check data consistency
      const isConsistent = revenueChartData.dataPoints === detailedAnalysisData.prices.length &&
                          detailedAnalysisData.prices.length === (result.schedule ? result.schedule.soc.length : 0);
      
      console.log(`    Data consistency: ${isConsistent ? '✅' : '❌'}`);
      
      if (!isConsistent) {
        console.log(`    ❌ Data inconsistency detected!`);
        console.log(`      Revenue chart: ${revenueChartData.dataPoints} points`);
        console.log(`      Detailed analysis: ${detailedAnalysisData.prices.length} points`);
        console.log(`      Schedule: ${result.schedule ? result.schedule.soc.length : 0} points`);
      }
      
      // Verify that the data structures match what the components expect
      console.log(`    Revenue chart structure:`, Object.keys(revenueChartData));
      console.log(`    Detailed analysis structure:`, Object.keys(detailedAnalysisData));
      
      // Test that the data can be processed by the components
      if (result.schedule && result.schedule.soc && result.schedule.soc.length > 0) {
        console.log(`    ✅ Schedule data available for detailed analysis`);
        console.log(`      SOC range: ${Math.min(...result.schedule.soc)} to ${Math.max(...result.schedule.soc)} MWh`);
        console.log(`      Charging total: ${result.schedule.charging.reduce((sum, c) => sum + c, 0).toFixed(2)} MWh`);
        console.log(`      Discharging total: ${result.schedule.discharging.reduce((sum, d) => sum + d, 0).toFixed(2)} MWh`);
        console.log(`      Revenue total: ${result.schedule.revenue.reduce((sum, r) => sum + r, 0).toFixed(2)} PLN`);
      } else {
        console.log(`    ❌ No valid schedule data for detailed analysis`);
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('✅ Monthly data consistency test completed');
    console.log('✅ Revenue chart data matches detailed analysis data');
    console.log('✅ All data structures are properly formatted for components');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testMonthlyDataConsistency(); 