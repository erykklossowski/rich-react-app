import { useOptimizationStore } from './src/store/optimizationStore.js';

console.log('=== RevenueChart Data Flow Debug ===');

// Test the store state
const store = useOptimizationStore.getState();
console.log('Store state:', {
  backtestResults: store.backtestResults ? {
    resultsLength: store.backtestResults.results?.length || 0,
    hasResults: !!store.backtestResults.results,
    firstResult: store.backtestResults.results?.[0] || null,
    lastResult: store.backtestResults.results?.[store.backtestResults.results?.length - 1] || null
  } : null
});

if (store.backtestResults && store.backtestResults.results) {
  console.log('\n=== Analyzing Results Array ===');
  
  const results = store.backtestResults.results;
  console.log(`Total results: ${results.length}`);
  
  // Check for NaN values in the results
  const nanResults = results.filter(r => 
    isNaN(r.totalRevenue) || 
    isNaN(r.totalEnergyDischarged) || 
    isNaN(r.dataPoints)
  );
  
  console.log(`Results with NaN values: ${nanResults.length}`);
  
  if (nanResults.length > 0) {
    console.log('NaN results details:');
    nanResults.forEach((r, i) => {
      console.log(`  ${i + 1}. Period: ${r.period}`);
      console.log(`     totalRevenue: ${r.totalRevenue} (${typeof r.totalRevenue})`);
      console.log(`     totalEnergyDischarged: ${r.totalEnergyDischarged} (${typeof r.totalEnergyDischarged})`);
      console.log(`     dataPoints: ${r.dataPoints} (${typeof r.dataPoints})`);
    });
  }
  
  // Check for undefined or null values
  const invalidResults = results.filter(r => 
    r.totalRevenue === undefined || 
    r.totalRevenue === null || 
    r.totalEnergyDischarged === undefined || 
    r.totalEnergyDischarged === null
  );
  
  console.log(`Results with undefined/null values: ${invalidResults.length}`);
  
  if (invalidResults.length > 0) {
    console.log('Invalid results details:');
    invalidResults.forEach((r, i) => {
      console.log(`  ${i + 1}. Period: ${r.period}`);
      console.log(`     totalRevenue: ${r.totalRevenue} (${typeof r.totalRevenue})`);
      console.log(`     totalEnergyDischarged: ${r.totalEnergyDischarged} (${typeof r.totalEnergyDischarged})`);
    });
  }
  
  // Check for zero values
  const zeroRevenueResults = results.filter(r => r.totalRevenue === 0);
  console.log(`Results with zero revenue: ${zeroRevenueResults.length}`);
  
  // Show sample of valid results
  const validResults = results.filter(r => 
    typeof r.totalRevenue === 'number' && 
    !isNaN(r.totalRevenue) && 
    r.totalRevenue !== 0
  );
  
  console.log(`Valid non-zero results: ${validResults.length}`);
  
  if (validResults.length > 0) {
    console.log('Sample valid results:');
    validResults.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. Period: ${r.period}`);
      console.log(`     totalRevenue: ${r.totalRevenue}`);
      console.log(`     totalEnergyDischarged: ${r.totalEnergyDischarged}`);
      console.log(`     dataPoints: ${r.dataPoints}`);
    });
  }
  
  // Test the sorting and formatting logic from RevenueChart
  console.log('\n=== Testing RevenueChart Logic ===');
  
  const sortedResults = [...results].sort((a, b) => {
    const dateA = new Date(a.periodStart || a.period);
    const dateB = new Date(b.periodStart || b.period);
    return dateA - dateB;
  });
  
  console.log('Sorting test completed');
  
  // Test summary calculations
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
  console.log(`  chartLabels length: ${chartLabels.length}`);
  console.log(`  chartValues length: ${chartValues.length}`);
  console.log(`  chartValues with NaN: ${chartValues.filter(v => isNaN(v)).length}`);
  
  // Show first few chart labels and values
  console.log('First 5 chart labels:', chartLabels.slice(0, 5));
  console.log('First 5 chart values:', chartValues.slice(0, 5));
  
} else {
  console.log('No backtest results available in store');
}

console.log('\n=== End Debug ==='); 