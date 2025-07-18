// Test script to simulate frontend backtest exactly
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';

async function simulateFrontendBacktest() {
    console.log('🔍 FRONTEND BACKTEST SIMULATION\n');
    console.log('='.repeat(80));
    
    try {
        // 1. Load data (same as frontend)
        console.log('1. Loading Polish data...');
        const polishData = await loadPolishData();
        console.log(`✅ Loaded ${polishData.length} records`);
        
        // 2. Filter data (same as frontend)
        console.log('\n2. Filtering data...');
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        console.log(`✅ Filtered to ${filteredData.length} records`);
        
        // 3. Group data (same as frontend)
        console.log('\n3. Grouping data by month...');
        const analysisType = 'monthly';
        const groups = groupDataByPeriod(filteredData, analysisType);
        const groupKeys = Object.keys(groups).sort();
        console.log(`✅ Created ${groupKeys.length} monthly groups`);
        
        // 4. Simulate frontend optimization loop
        console.log('\n4. Simulating frontend optimization...');
        const optimizer = new BatteryOptimizer();
        optimizer.reset();
        
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        const categorizationMethod = 'zscore';
        const categorizationOptions = { lowThreshold: -0.5, highThreshold: 0.5 };
        
        const results = [];
        const warnings = [];
        
        // Data completeness validation (same as frontend)
        const validateDataCompleteness = (data, periodType = 'monthly') => {
            if (!data || data.length === 0) return { isValid: false, completeness: 0, reason: 'No data' };
            
            const hoursInPeriod = {
                'daily': 24,
                'weekly': 24 * 7,
                'monthly': 24 * 30, // Approximate
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
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            console.log(`\nProcessing period ${key}: ${prices.length} data points`);
            console.log(`Price range: ${Math.min(...prices)} - ${Math.max(...prices)}`);
            
            // Validate data completeness
            const completeness = validateDataCompleteness(groupData, analysisType);
            
            if (!completeness.isValid) {
                console.warn(`⚠️  Period ${key}: ${completeness.reason}`);
                warnings.push(`${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                console.log(`Attempting optimization for period ${key} with ${prices.length} data points`);
                
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        console.log(`✓ Optimization successful for period ${key}`);
                        console.log(`  Revenue: ${result.totalRevenue}`);
                        console.log(`  Energy charged: ${result.totalEnergyCharged}`);
                        console.log(`  Energy discharged: ${result.totalEnergyDischarged}`);
                        
                        results.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            ...result
                        });
                    } else {
                        console.error(`✗ Main optimization failed for period ${key}:`, result.error);
                        
                        // Try simplified optimization as fallback
                        console.log(`Attempting simplified optimization for period ${key}...`);
                        const simpleSchedule = optimizer.simpleOptimize(prices, params);
                        const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                        const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                        const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                        
                        console.log(`✓ Simplified optimization successful for period ${key}`);
                        console.log(`  Revenue: ${totalRevenue}`);
                        
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
                    }
                } catch (optimizationError) {
                    console.error(`✗ Optimization threw exception for period ${key}:`, optimizationError.message);
                }
            } else {
                console.warn(`Skipping period ${key} due to insufficient data points (${prices.length} < 12).`);
            }
        }
        
        // 5. Show results
        console.log('\n5. RESULTS SUMMARY:');
        console.log('='.repeat(50));
        console.log(`Total results: ${results.length}`);
        console.log(`Warnings: ${warnings.length}`);
        
        if (results.length > 0) {
            const totalRevenue = results.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / results.length;
            
            console.log(`\nTotal Revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
            
            console.log('\nIndividual results:');
            results.forEach(r => {
                console.log(`  ${r.period}: ${r.totalRevenue.toFixed(2)} PLN (${r.dataPoints} points)`);
            });
            
            // Check for NaN values
            const nanResults = results.filter(r => isNaN(r.totalRevenue));
            if (nanResults.length > 0) {
                console.log(`\n⚠️  Found ${nanResults.length} results with NaN revenue:`);
                nanResults.forEach(r => {
                    console.log(`  ${r.period}: NaN revenue`);
                });
            } else {
                console.log('\n✅ No NaN values found in results');
            }
        } else {
            console.log('\n❌ No results generated');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

simulateFrontendBacktest(); 