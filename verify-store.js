// Simple script to verify store state
import { useOptimizationStore } from './src/store/optimizationStore.js';

const store = useOptimizationStore.getState();
console.log('✅ Store verification:');
console.log('  backtestResults exists:', !!store.backtestResults);
console.log('  Results count:', store.backtestResults?.results?.length || 0);

if (store.backtestResults?.results) {
    const totalRevenue = store.backtestResults.results.reduce((sum, r) => sum + r.totalRevenue, 0);
    console.log('  Total revenue:', totalRevenue.toFixed(2), 'PLN');
    console.log('  First result:', store.backtestResults.results[0]?.period);
    console.log('  Last result:', store.backtestResults.results[store.backtestResults.results.length - 1]?.period);
} 