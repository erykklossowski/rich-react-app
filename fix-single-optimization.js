// Simple fix: Single optimization run shared between frontend and backend
// Keep existing differential evolution with Viterbi path guidance
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';

async function fixSingleOptimization() {
    console.log('🔧 FIXING SINGLE OPTIMIZATION SHARED BETWEEN FRONTEND AND BACKEND\n');
    console.log('='.repeat(80));
    
    try {
        // 1. Load and prepare data (same for both frontend and backend)
        console.log('1. Loading and preparing data...');
        const polishData = await loadPolishData();
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        const analysisType = 'monthly';
        const groups = groupDataByPeriod(filteredData, analysisType);
        const groupKeys = Object.keys(groups).sort();
        
        console.log(`✅ Data prepared: ${groupKeys.length} monthly groups`);
        
        // 2. Single optimizer instance (shared between frontend and backend)
        console.log('2. Creating single optimizer instance...');
        const optimizer = new BatteryOptimizer();
        
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        const categorizationMethod = 'zscore';
        const categorizationOptions = { lowThreshold: -0.5, highThreshold: 0.5 };
        
        // 3. Single optimization run (this is what both frontend and backend should use)
        console.log('3. Running single optimization...');
        const results = [];
        
        for (const [index, key] of groupKeys.entries()) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            // Validate data completeness
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
            
            const completeness = validateDataCompleteness(groupData, analysisType);
            
            if (!completeness.isValid) {
                console.log(`⚠️  Skipping ${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                console.log(`Processing ${key}: ${prices.length} data points`);
                
                // Reset optimizer state for each period to ensure clean state
                optimizer.reset();
                
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    
                    // Use existing optimization with Viterbi path guidance (keep as is)
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        results.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            ...result
                        });
                        
                        console.log(`✅ ${key}: ${result.totalRevenue.toFixed(2)} PLN`);
                    } else {
                        console.log(`⚠️  ${key}: Main optimization failed, using simplified`);
                        
                        // Try simplified optimization as fallback
                        const simpleSchedule = optimizer.simpleOptimize(prices, params);
                        const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                        const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                        const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                        
                        results.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            success: true,
                            schedule: simpleSchedule,
                            totalRevenue,
                            totalEnergyCharged,
                            totalEnergyDischarged,
                            operationalEfficiency: totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0,
                            avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                            cycles: 0,
                            vwapCharge: 0,
                            vwapDischarge: 0,
                            method: 'simplified'
                        });
                        
                        console.log(`✅ ${key}: ${totalRevenue.toFixed(2)} PLN (simplified)`);
                    }
                } catch (optimizationError) {
                    console.error(`❌ ${key}: Optimization failed:`, optimizationError.message);
                }
            } else {
                console.log(`⚠️  Skipping ${key}: insufficient data (${prices.length} < 12)`);
            }
        }
        
        // 4. Generate single results
        console.log('\n4. Generating single optimization results...');
        const totalRevenue = results.reduce((sum, r) => sum + r.totalRevenue, 0);
        const avgRevenue = totalRevenue / results.length;
        
        console.log(`✅ Total Revenue: ${totalRevenue.toFixed(2)} PLN`);
        console.log(`✅ Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
        console.log(`✅ Results Count: ${results.length}`);
        
        // 5. Create single backtest results object (shared between frontend and backend)
        const singleBacktestResults = {
            results,
            warnings: [],
            analysisType,
            dateRange: { start: startDate, end: endDate },
            params,
            categorizationMethod,
            categorizationOptions,
            totalRevenue,
            avgRevenue,
            resultCount: results.length
        };
        
        // 6. Summary
        console.log('\n5. SUMMARY');
        console.log('='.repeat(50));
        console.log('✅ Single optimization created');
        console.log('✅ Existing differential evolution with Viterbi path preserved');
        console.log('✅ Clean optimizer state for each period');
        console.log(`✅ Total revenue: ${totalRevenue.toFixed(2)} PLN`);
        console.log(`✅ Results count: ${results.length}`);
        
        // 7. Export for frontend use
        const exportData = {
            backtestResults: singleBacktestResults,
            metadata: {
                timestamp: new Date().toISOString(),
                singleOptimization: true,
                version: '1.0.0'
            }
        };
        
        console.log('\n6. EXPORT DATA FOR FRONTEND');
        console.log('='.repeat(50));
        console.log('Use this data in your frontend:');
        console.log(JSON.stringify(exportData, null, 2));
        
        return exportData;
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        return { error: error.message };
    }
}

// Run the fix
fixSingleOptimization().then(result => {
    if (result.error) {
        console.log('❌ Fix failed:', result.error);
    } else {
        console.log('\n' + '='.repeat(80));
        console.log('SINGLE OPTIMIZATION FIX COMPLETE');
        console.log('='.repeat(80));
        console.log('✅ Single optimization run shared between frontend and backend');
        console.log('✅ Existing differential evolution with Viterbi path preserved');
        console.log('✅ Use the exported data above in your frontend');
    }
}); 