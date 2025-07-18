// Test script to populate the store with valid backtest results
import { useOptimizationStore } from './src/store/optimizationStore.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';

async function populateStoreWithValidResults() {
    console.log('🔧 POPULATING STORE WITH VALID RESULTS\n');
    console.log('='.repeat(80));
    
    try {
        // 1. Load and process data (same as our working test)
        console.log('1. Loading and processing data...');
        
        const polishData = await loadPolishData();
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        const groups = groupDataByPeriod(filteredData, 'monthly');
        const groupKeys = Object.keys(groups).sort();
        
        console.log(`✅ Processed ${groupKeys.length} months`);
        
        // 2. Run optimization for each month
        console.log('\n2. Running optimization for each month...');
        
        const optimizer = new BatteryOptimizer();
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        const categorizationMethod = 'zscore';
        const categorizationOptions = { lowThreshold: -0.5, highThreshold: 0.5 };
        
        const results = [];
        const warnings = [];
        
        // Data completeness validation function
        const validateDataCompleteness = (data, periodType = 'monthly') => {
            if (!data || data.length === 0) return { isValid: false, completeness: 0, reason: 'No data' };
            
            const hoursInPeriod = {
                'daily': 24,
                'weekly': 24 * 7,
                'monthly': 24 * 30,
                'yearly': 24 * 365
            };
            
            const expectedHours = hoursInPeriod[periodType] || 24 * 30;
            const actualHours = data.length;
            const completeness = actualHours / expectedHours;
            
            const isValid = completeness >= 0.5;
            
            return {
                isValid,
                completeness,
                actualHours,
                expectedHours,
                reason: isValid ? 'Complete' : `Incomplete: ${(completeness * 100).toFixed(1)}% (${actualHours}/${expectedHours} hours)`
            };
        };
        
        for (const [index, key] of groupKeys.entries()) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.price);
            
            console.log(`📊 Processing ${key}: ${prices.length} data points`);
            
            const completeness = validateDataCompleteness(groupData, 'monthly');
            
            if (!completeness.isValid) {
                console.log(`   ❌ SKIPPED: ${completeness.reason}`);
                warnings.push(`${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                try {
                    optimizer.reset();
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        console.log(`   ✅ SUCCESS: ${result.totalRevenue.toFixed(2)} PLN`);
                        
                        results.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            timestamps: timestamps,
                            success: true,
                            ...result
                        });
                    } else {
                        console.log(`   ❌ FAILED: ${result.error}`);
                    }
                } catch (optimizationError) {
                    console.log(`   ❌ EXCEPTION: ${optimizationError.message}`);
                }
            } else {
                console.log(`   ❌ INSUFFICIENT DATA: ${prices.length} < 12 points`);
            }
        }
        
        // 3. Create backtest results structure
        console.log('\n3. Creating backtest results structure...');
        
        const backtestResults = {
            results,
            warnings,
            analysisType: 'monthly',
            dateRange: { start: startDate, end: endDate },
            params,
            categorizationMethod,
            categorizationOptions
        };
        
        console.log(`✅ Created backtest results with ${results.length} successful optimizations`);
        
        // 4. Populate the store
        console.log('\n4. Populating the store...');
        
        const store = useOptimizationStore.getState();
        store.setBacktestResults(backtestResults);
        
        console.log('✅ Store populated successfully!');
        
        // 5. Verify the store was populated
        console.log('\n5. Verifying store state...');
        
        const updatedStore = useOptimizationStore.getState();
        console.log(`Store backtestResults: ${updatedStore.backtestResults ? 'EXISTS' : 'NULL'}`);
        
        if (updatedStore.backtestResults) {
            console.log(`  Results count: ${updatedStore.backtestResults.results.length}`);
            console.log(`  First result: ${updatedStore.backtestResults.results[0]?.period}`);
            console.log(`  Last result: ${updatedStore.backtestResults.results[updatedStore.backtestResults.results.length - 1]?.period}`);
            
            // Calculate total revenue to verify data integrity
            const totalRevenue = updatedStore.backtestResults.results.reduce((sum, r) => sum + r.totalRevenue, 0);
            console.log(`  Total revenue: ${totalRevenue.toFixed(2)} PLN`);
            
            if (isNaN(totalRevenue)) {
                console.log('  ❌ WARNING: Total revenue is NaN!');
            } else {
                console.log('  ✅ Total revenue is valid');
            }
        }
        
        // 6. Show what the frontend should display
        console.log('\n6. Frontend display simulation:');
        console.log('='.repeat(50));
        
        const formatPLN = (amount) => {
            if (isNaN(amount)) {
                return 'NaN zł';
            }
            return new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: 'PLN',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
        };
        
        if (results.length > 0) {
            const totalRevenue = results.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / results.length;
            const maxRevenue = Math.max(...results.map(r => r.totalRevenue));
            const minRevenue = Math.min(...results.map(r => r.totalRevenue));
            const profitablePeriods = results.filter(r => r.totalRevenue > 0).length;
            
            console.log('What the frontend should now show:');
            console.log(`  Total Revenue: ${formatPLN(totalRevenue)}`);
            console.log(`  Average Revenue: ${formatPLN(avgRevenue)}`);
            console.log(`  Best Period: ${formatPLN(maxRevenue)}`);
            console.log(`  Worst Period: ${formatPLN(minRevenue)}`);
            console.log(`  Profitable Periods: ${profitablePeriods}/${results.length}`);
        }
        
        console.log('\n🎯 STORE POPULATION COMPLETE!');
        console.log('The frontend should now display the correct revenue data.');
        console.log('If you refresh the page, you may need to run this script again.');
        
    } catch (error) {
        console.error('❌ Failed to populate store:', error);
        console.error('Error stack:', error.stack);
    }
}

// Run the store population
populateStoreWithValidResults(); 