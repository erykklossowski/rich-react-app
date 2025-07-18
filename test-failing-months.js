// Test script to identify failing months and their causes
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData } from './src/utils/dataLoaders.js';

async function testFailingMonths() {
    console.log('🔍 FAILING MONTHS ANALYSIS\n');
    console.log('='.repeat(80));
    
    try {
        // Load data
        const polishData = await loadPolishData();
        console.log(`✅ Loaded ${polishData.length.toLocaleString()} data points`);
        
        // Group by month
        const groups = {};
        polishData.forEach(record => {
            const date = new Date(record.datetime);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });
        
        const groupKeys = Object.keys(groups).sort();
        console.log(`Found ${groupKeys.length} months: ${groupKeys.join(', ')}\n`);
        
        // Test each month
        const optimizer = new BatteryOptimizer();
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        
        const results = [];
        
        for (const key of groupKeys) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.price);
            const timestamps = groupData.map(record => record.datetime);
            
            console.log(`📅 ${key}: ${prices.length} data points`);
            
            if (prices.length < 12) {
                console.log(`   ❌ INSUFFICIENT DATA: ${prices.length} < 12 points`);
                results.push({
                    period: key,
                    success: false,
                    error: `Insufficient data: ${prices.length} points`,
                    dataPoints: prices.length
                });
                continue;
            }
            
            // Check for invalid prices
            const invalidPrices = prices.filter(p => isNaN(p) || p === null || p === undefined);
            if (invalidPrices.length > 0) {
                console.log(`   ❌ INVALID PRICES: ${invalidPrices.length} invalid values`);
                results.push({
                    period: key,
                    success: false,
                    error: `Invalid prices: ${invalidPrices.length} values`,
                    dataPoints: prices.length,
                    invalidPrices: invalidPrices.length
                });
                continue;
            }
            
            // Check price range
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            console.log(`   Price range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} PLN/MWh`);
            console.log(`   Average price: ${avgPrice.toFixed(2)} PLN/MWh`);
            
            // Try optimization
            try {
                optimizer.reset(); // Reset state for fresh start
                const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                
                if (result.success) {
                    console.log(`   ✅ SUCCESS: ${result.totalRevenue.toFixed(2)} PLN`);
                    console.log(`      Energy: ${result.totalEnergyCharged.toFixed(1)} MWh charged, ${result.totalEnergyDischarged.toFixed(1)} MWh discharged`);
                    console.log(`      Efficiency: ${(result.operationalEfficiency * 100).toFixed(1)}%`);
                    console.log(`      Cycles: ${result.cycles.toFixed(1)}`);
                    
                    results.push({
                        period: key,
                        success: true,
                        totalRevenue: result.totalRevenue,
                        totalEnergyCharged: result.totalEnergyCharged,
                        totalEnergyDischarged: result.totalEnergyDischarged,
                        operationalEfficiency: result.operationalEfficiency,
                        cycles: result.cycles,
                        dataPoints: prices.length,
                        avgPrice: avgPrice,
                        minPrice: minPrice,
                        maxPrice: maxPrice
                    });
                } else {
                    console.log(`   ❌ OPTIMIZATION FAILED: ${result.error}`);
                    
                    // Try simplified optimization as fallback
                    try {
                        const simpleSchedule = optimizer.simpleOptimize(prices, params);
                        const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                        const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                        const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                        
                        console.log(`   ✅ SIMPLIFIED SUCCESS: ${totalRevenue.toFixed(2)} PLN`);
                        
                        results.push({
                            period: key,
                            success: true,
                            method: 'simplified',
                            totalRevenue: totalRevenue,
                            totalEnergyCharged: totalEnergyCharged,
                            totalEnergyDischarged: totalEnergyDischarged,
                            operationalEfficiency: totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0,
                            cycles: 0,
                            dataPoints: prices.length,
                            avgPrice: avgPrice,
                            minPrice: minPrice,
                            maxPrice: maxPrice
                        });
                    } catch (simpleError) {
                        console.log(`   ❌ SIMPLIFIED FAILED: ${simpleError.message}`);
                        results.push({
                            period: key,
                            success: false,
                            error: `Main: ${result.error}, Simplified: ${simpleError.message}`,
                            dataPoints: prices.length,
                            avgPrice: avgPrice,
                            minPrice: minPrice,
                            maxPrice: maxPrice
                        });
                    }
                }
            } catch (optimizationError) {
                console.log(`   ❌ EXCEPTION: ${optimizationError.message}`);
                console.log(`   Stack: ${optimizationError.stack}`);
                
                results.push({
                    period: key,
                    success: false,
                    error: `Exception: ${optimizationError.message}`,
                    dataPoints: prices.length,
                    avgPrice: avgPrice,
                    minPrice: minPrice,
                    maxPrice: maxPrice
                });
            }
            
            console.log(''); // Empty line for readability
        }
        
        // Summary
        console.log('\n📋 SUMMARY ANALYSIS');
        console.log('='.repeat(50));
        
        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        console.log(`Total months: ${results.length}`);
        console.log(`Successful: ${successfulResults.length}`);
        console.log(`Failed: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            const totalRevenue = successfulResults.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / successfulResults.length;
            const maxRevenue = Math.max(...successfulResults.map(r => r.totalRevenue));
            const minRevenue = Math.min(...successfulResults.map(r => r.totalRevenue));
            
            console.log(`\n💰 Revenue Summary (successful only):`);
            console.log(`  Total Revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`  Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
            console.log(`  Best Month: ${maxRevenue.toFixed(2)} PLN`);
            console.log(`  Worst Month: ${minRevenue.toFixed(2)} PLN`);
        }
        
        if (failedResults.length > 0) {
            console.log(`\n❌ Failed months:`);
            failedResults.forEach(r => {
                console.log(`  ${r.period}: ${r.error}`);
            });
        }
        
        // Check for NaN values in successful results
        console.log('\n🔍 NaN CHECK');
        console.log('='.repeat(50));
        
        const nanResults = successfulResults.filter(r => 
            isNaN(r.totalRevenue) || 
            isNaN(r.totalEnergyCharged) || 
            isNaN(r.totalEnergyDischarged) ||
            isNaN(r.operationalEfficiency)
        );
        
        if (nanResults.length > 0) {
            console.log(`❌ Found ${nanResults.length} successful results with NaN values:`);
            nanResults.forEach(r => {
                console.log(`  ${r.period}:`);
                console.log(`    totalRevenue: ${r.totalRevenue} (${typeof r.totalRevenue})`);
                console.log(`    totalEnergyCharged: ${r.totalEnergyCharged} (${typeof r.totalEnergyCharged})`);
                console.log(`    totalEnergyDischarged: ${r.totalEnergyDischarged} (${typeof r.totalEnergyDischarged})`);
                console.log(`    operationalEfficiency: ${r.operationalEfficiency} (${typeof r.operationalEfficiency})`);
            });
        } else {
            console.log('✅ No NaN values found in successful results');
        }
        
        // Show data quality issues
        console.log('\n📊 DATA QUALITY ANALYSIS');
        console.log('='.repeat(50));
        
        const lowDataMonths = results.filter(r => r.dataPoints < 100);
        const highDataMonths = results.filter(r => r.dataPoints > 1000);
        
        if (lowDataMonths.length > 0) {
            console.log(`⚠️  Months with low data points (< 100):`);
            lowDataMonths.forEach(r => {
                console.log(`  ${r.period}: ${r.dataPoints} points`);
            });
        }
        
        if (highDataMonths.length > 0) {
            console.log(`⚠️  Months with high data points (> 1000):`);
            highDataMonths.forEach(r => {
                console.log(`  ${r.period}: ${r.dataPoints} points`);
            });
        }
        
        // Show price statistics
        console.log('\n💰 PRICE STATISTICS');
        console.log('='.repeat(50));
        
        const allPrices = successfulResults.map(r => r.avgPrice);
        if (allPrices.length > 0) {
            const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
            const minPrice = Math.min(...allPrices);
            const maxPrice = Math.max(...allPrices);
            
            console.log(`Average price across all months: ${avgPrice.toFixed(2)} PLN/MWh`);
            console.log(`Price range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} PLN/MWh`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error stack:', error.stack);
    }
}

// Run the test
testFailingMonths(); 