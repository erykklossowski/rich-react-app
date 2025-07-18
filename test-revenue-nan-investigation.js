import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadCSDACPLNData, loadPolishData, loadAllPSEData, filterDataByDateRange } from './src/utils/dataLoaders.js';
import { getDataConfig } from './src/utils/dataConfig.js';

console.log('=== Revenue NaN Investigation ===');

async function investigateRevenueNaN() {
  try {
    // 1. Load data
    console.log('1. Loading data...');
    const config = await getDataConfig();
    console.log('Data config loaded:', {
      startDate: config.dataStartDate,
      endDate: config.dataEndDate,
      totalRecords: config.totalRecords
    });

    // Load data for a specific month to test
    const testStartDate = '2024-11-01';
    const testEndDate = '2024-11-30';
    
    const priceData = await loadCSDACPLNData();
    console.log('Raw price data sample:', priceData.slice(0, 3));
    
    const filteredData = filterDataByDateRange(priceData, testStartDate, testEndDate);
    
    console.log(`Filtered data: ${filteredData.length} records`);
    console.log(`Date range: ${filteredData[0]?.dtime} to ${filteredData[filteredData.length - 1]?.dtime}`);
    console.log('Filtered data sample:', filteredData.slice(0, 3));
    
    // 2. Run optimization for this period
    console.log('\n2. Running optimization...');
    const optimizer = new BatteryOptimizer();
    
    // Use the correct field names from CSDAC PLN data
    const prices = filteredData.map(d => d.csdac_pln);
    const timestamps = filteredData.map(d => d.dtime);
    
    console.log(`Prices array: ${prices.length} values`);
    console.log(`Price range: ${Math.min(...prices)} to ${Math.max(...prices)}`);
    console.log(`Sample prices:`, prices.slice(0, 5));
    console.log(`Sample timestamps:`, timestamps.slice(0, 5));
    
    const params = {
      pMax: 10,
      socMin: 10,
      socMax: 40,
      efficiency: 0.85
    };
    
    const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
    
    if (!result.success) {
      console.log('❌ Optimization failed:', result.error);
      return;
    }
    
    console.log('✅ Optimization successful');
    console.log('Result structure:', {
      totalRevenue: result.totalRevenue,
      totalEnergyCharged: result.totalEnergyCharged,
      totalEnergyDischarged: result.totalEnergyDischarged,
      operationalEfficiency: result.operationalEfficiency,
      avgPrice: result.avgPrice,
      cycles: result.cycles,
      vwapCharge: result.vwapCharge,
      vwapDischarge: result.vwapDischarge
    });
    
    // 3. Check for NaN values in the result
    console.log('\n3. Checking for NaN values...');
    const resultFields = [
      'totalRevenue', 'totalEnergyCharged', 'totalEnergyDischarged', 
      'operationalEfficiency', 'avgPrice', 'cycles', 'vwapCharge', 'vwapDischarge'
    ];
    
    const nanFields = resultFields.filter(field => isNaN(result[field]));
    if (nanFields.length > 0) {
      console.log('❌ NaN values found in result:', nanFields);
      nanFields.forEach(field => {
        console.log(`  ${field}: ${result[field]} (${typeof result[field]})`);
      });
    } else {
      console.log('✅ No NaN values in optimization result');
    }
    
    // 4. Simulate the backtest results structure
    console.log('\n4. Simulating backtest results structure...');
    const backtestResult = {
      period: '2024-11',
      periodStart: testStartDate,
      periodEnd: testEndDate,
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
    
    console.log('Backtest result structure:', {
      period: backtestResult.period,
      totalRevenue: backtestResult.totalRevenue,
      totalEnergyDischarged: backtestResult.totalEnergyDischarged,
      dataPoints: backtestResult.dataPoints
    });
    
    // 5. Test the RevenueChart logic
    console.log('\n5. Testing RevenueChart logic...');
    const results = [backtestResult];
    
    // Sort results
    const sortedResults = [...results].sort((a, b) => {
      const dateA = new Date(a.periodStart || a.period);
      const dateB = new Date(b.periodStart || b.period);
      return dateA - dateB;
    });
    
    // Calculate summary statistics
    const totalRevenue = sortedResults.reduce((sum, r) => {
      if (isNaN(r.totalRevenue)) {
        console.log(`  ❌ NaN detected in totalRevenue calculation for period: ${r.period}`);
        return sum;
      }
      return sum + r.totalRevenue;
    }, 0);
    
    const avgRevenue = sortedResults.length > 0 ? totalRevenue / sortedResults.length : 0;
    const maxRevenue = sortedResults.length > 0 ? Math.max(...sortedResults.map(r => r.totalRevenue || 0)) : 0;
    const minRevenue = sortedResults.length > 0 ? Math.min(...sortedResults.map(r => r.totalRevenue || 0)) : 0;
    
    console.log('Summary calculations:');
    console.log(`  totalRevenue: ${totalRevenue} (${typeof totalRevenue})`);
    console.log(`  avgRevenue: ${avgRevenue} (${typeof avgRevenue})`);
    console.log(`  maxRevenue: ${maxRevenue} (${typeof maxRevenue})`);
    console.log(`  minRevenue: ${minRevenue} (${typeof minRevenue})`);
    
    // Test chart data preparation
    const chartLabels = sortedResults.map(r => {
      if (r.period.includes('-')) {
        const [year, month] = r.period.split('-');
        const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                           'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      return r.period;
    });
    
    const chartValues = sortedResults.map(r => {
      if (isNaN(r.totalRevenue)) {
        console.log(`  ❌ NaN detected in chart data for period: ${r.period}`);
        return 0;
      }
      return r.totalRevenue;
    });
    
    console.log('Chart data preparation:');
    console.log(`  chartLabels: ${chartLabels}`);
    console.log(`  chartValues: ${chartValues}`);
    
    // 6. Test PLN formatting
    console.log('\n6. Testing PLN formatting...');
    const formatPLN = (amount) => {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
    
    console.log('Formatted values:');
    console.log(`  totalRevenue: ${formatPLN(totalRevenue)}`);
    console.log(`  avgRevenue: ${formatPLN(avgRevenue)}`);
    console.log(`  maxRevenue: ${formatPLN(maxRevenue)}`);
    console.log(`  minRevenue: ${formatPLN(minRevenue)}`);
    
    // 7. Check if the issue might be in the schedule calculation
    console.log('\n7. Checking schedule calculation...');
    if (result.schedule) {
      console.log('Schedule structure:', {
        revenue: result.schedule.revenue?.length || 0,
        charging: result.schedule.charging?.length || 0,
        discharging: result.schedule.discharging?.length || 0,
        soc: result.schedule.soc?.length || 0
      });
      
      // Check for NaN in schedule arrays
      const scheduleRevenue = result.schedule.revenue || [];
      const nanRevenueCount = scheduleRevenue.filter(r => isNaN(r)).length;
      console.log(`NaN values in schedule revenue: ${nanRevenueCount}`);
      
      if (nanRevenueCount > 0) {
        console.log('Sample NaN revenue values:');
        scheduleRevenue.forEach((r, i) => {
          if (isNaN(r)) {
            console.log(`  Index ${i}: ${r} (${typeof r})`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the investigation
investigateRevenueNaN(); 