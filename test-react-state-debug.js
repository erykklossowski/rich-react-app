import { create } from 'zustand';

// Simulate the store structure
const createTestStore = () => {
  return create((set, get) => ({
    backtestResults: null,
    setBacktestResults: (results) => set({ backtestResults: results }),
    getState: () => get()
  }));
};

console.log('=== React State Debug ===');

// Create test store
const testStore = createTestStore();

// Simulate valid backtest results (like what we saw in the investigation)
const validBacktestResults = {
  results: [
    {
      period: '2024-06',
      periodStart: '2024-06-01',
      periodEnd: '2024-06-30',
      totalRevenue: -246144,
      totalEnergyCharged: 9358.3,
      totalEnergyDischarged: 9358.3,
      operationalEfficiency: 0.95,
      avgPrice: 500.0,
      cycles: 30,
      vwapCharge: 510.0,
      vwapDischarge: 490.0,
      dataPoints: 1631,
      prices: Array(1631).fill(500),
      timestamps: Array(1631).fill('2024-06-01T00:00:00Z')
    },
    {
      period: '2024-07',
      periodStart: '2024-07-01',
      periodEnd: '2024-07-31',
      totalRevenue: -278257,
      totalEnergyCharged: 9593.3,
      totalEnergyDischarged: 9593.3,
      operationalEfficiency: 0.94,
      avgPrice: 520.0,
      cycles: 31,
      vwapCharge: 530.0,
      vwapDischarge: 510.0,
      dataPoints: 2976,
      prices: Array(2976).fill(520),
      timestamps: Array(2976).fill('2024-07-01T00:00:00Z')
    },
    {
      period: '2024-08',
      periodStart: '2024-08-01',
      periodEnd: '2024-08-31',
      totalRevenue: -494604,
      totalEnergyCharged: 8516.1,
      totalEnergyDischarged: 8516.1,
      operationalEfficiency: 0.93,
      avgPrice: 540.0,
      cycles: 29,
      vwapCharge: 550.0,
      vwapDischarge: 530.0,
      dataPoints: 2976,
      prices: Array(2976).fill(540),
      timestamps: Array(2976).fill('2024-08-01T00:00:00Z')
    }
  ],
  warnings: [],
  analysisType: 'monthly',
  dateRange: { start: '2024-06-01', end: '2024-08-31' },
  params: { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 },
  categorizationMethod: 'zscore',
  categorizationOptions: { lowThreshold: -0.5, highThreshold: 0.5 }
};

console.log('1. Setting valid backtest results...');
testStore.getState().setBacktestResults(validBacktestResults);

console.log('2. Checking store state...');
const storeState = testStore.getState();
console.log('Store state:', {
  hasBacktestResults: !!storeState.backtestResults,
  resultsLength: storeState.backtestResults?.results?.length || 0,
  firstResult: storeState.backtestResults?.results?.[0] || null
});

console.log('3. Testing RevenueChart logic with valid data...');
const results = storeState.backtestResults.results;

// Check for NaN values in the results
const nanResults = results.filter(r => 
  isNaN(r.totalRevenue) || 
  isNaN(r.totalEnergyDischarged) || 
  isNaN(r.dataPoints)
);

console.log(`Results with NaN values: ${nanResults.length}`);

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

// Test PLN formatting
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

console.log('\n4. Testing with NaN values to simulate the issue...');
const nanBacktestResults = {
  ...validBacktestResults,
  results: [
    {
      period: '2024-06',
      periodStart: '2024-06-01',
      periodEnd: '2024-06-30',
      totalRevenue: NaN, // Introduce NaN
      totalEnergyCharged: 9358.3,
      totalEnergyDischarged: 9358.3,
      operationalEfficiency: 0.95,
      avgPrice: 500.0,
      cycles: 30,
      vwapCharge: 510.0,
      vwapDischarge: 490.0,
      dataPoints: 1631,
      prices: Array(1631).fill(500),
      timestamps: Array(1631).fill('2024-06-01T00:00:00Z')
    },
    {
      period: '2024-07',
      periodStart: '2024-07-01',
      periodEnd: '2024-07-31',
      totalRevenue: -278257,
      totalEnergyCharged: 9593.3,
      totalEnergyDischarged: 9593.3,
      operationalEfficiency: 0.94,
      avgPrice: 520.0,
      cycles: 31,
      vwapCharge: 530.0,
      vwapDischarge: 510.0,
      dataPoints: 2976,
      prices: Array(2976).fill(520),
      timestamps: Array(2976).fill('2024-07-01T00:00:00Z')
    }
  ]
};

testStore.getState().setBacktestResults(nanBacktestResults);

const nanStoreState = testStore.getState();
const nanResults2 = nanStoreState.backtestResults.results;

console.log('Testing with NaN values:');
console.log(`Results with NaN values: ${nanResults2.filter(r => isNaN(r.totalRevenue)).length}`);

// Test the same logic with NaN values
const sortedResults2 = [...nanResults2].sort((a, b) => {
  const dateA = new Date(a.periodStart || a.period);
  const dateB = new Date(b.periodStart || b.period);
  return dateA - dateB;
});

const totalRevenue2 = sortedResults2.reduce((sum, r) => {
  if (isNaN(r.totalRevenue)) {
    console.log(`  ❌ NaN detected in totalRevenue calculation for period: ${r.period}`);
    return sum;
  }
  return sum + r.totalRevenue;
}, 0);

const avgRevenue2 = sortedResults2.length > 0 ? totalRevenue2 / sortedResults2.length : 0;

console.log('Summary calculations with NaN:');
console.log(`  totalRevenue: ${totalRevenue2} (${typeof totalRevenue2})`);
console.log(`  avgRevenue: ${avgRevenue2} (${typeof avgRevenue2})`);

console.log('\n=== End React State Debug ==='); 