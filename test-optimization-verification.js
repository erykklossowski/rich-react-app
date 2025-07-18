import { loadPolishData, groupDataByPeriod } from './src/utils/dataLoaders.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

async function testOptimizationVerification() {
    console.log('🔍 Verifying Optimization Results\n');
    
    try {
        // Load data
        const polishData = await loadPolishData();
        console.log(`Loaded ${polishData.length} records`);
        
        // Group by month
        const groups = groupDataByPeriod(polishData, 'monthly');
        const groupKeys = Object.keys(groups).sort();
        console.log(`Found ${groupKeys.length} months: ${groupKeys.join(', ')}`);
        
        // Initialize optimizer
        const optimizer = new BatteryOptimizer();
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        
        console.log('\n📊 OPTIMIZATION RESULTS:');
        console.log('='.repeat(80));
        
        const results = [];
        
        for (const key of groupKeys) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            console.log(`\n📅 Processing ${key}: ${prices.length} data points`);
            console.log(`   Price range: ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)} PLN/MWh`);
            
            if (prices.length >= 12) {
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                    
                    if (result.success) {
                        console.log(`   ✅ SUCCESS: Revenue = ${result.totalRevenue.toFixed(2)} PLN`);
                        console.log(`      Energy: ${result.totalEnergyCharged.toFixed(1)} MWh charged, ${result.totalEnergyDischarged.toFixed(1)} MWh discharged`);
                        
                        results.push({
                            period: key,
                            totalRevenue: result.totalRevenue,
                            totalEnergyCharged: result.totalEnergyCharged,
                            totalEnergyDischarged: result.totalEnergyDischarged,
                            dataPoints: prices.length,
                            success: true
                        });
                    } else {
                        console.log(`   ❌ FAILED: ${result.error}`);
                        
                        // Try simplified optimization
                        try {
                            const simpleSchedule = optimizer.simpleOptimize(prices, params);
                            const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                            const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                            const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                            
                            console.log(`   ✅ SIMPLIFIED SUCCESS: Revenue = ${totalRevenue.toFixed(2)} PLN`);
                            
                            results.push({
                                period: key,
                                totalRevenue: totalRevenue,
                                totalEnergyCharged: totalEnergyCharged,
                                totalEnergyDischarged: totalEnergyDischarged,
                                dataPoints: prices.length,
                                success: true,
                                method: 'simplified'
                            });
                        } catch (simpleError) {
                            console.log(`   ❌ SIMPLIFIED FAILED: ${simpleError.message}`);
                            results.push({
                                period: key,
                                totalRevenue: NaN,
                                totalEnergyCharged: 0,
                                totalEnergyDischarged: 0,
                                dataPoints: prices.length,
                                success: false,
                                error: simpleError.message
                            });
                        }
                    }
                } catch (optimizationError) {
                    console.log(`   ❌ EXCEPTION: ${optimizationError.message}`);
                    results.push({
                        period: key,
                        totalRevenue: NaN,
                        totalEnergyCharged: 0,
                        totalEnergyDischarged: 0,
                        dataPoints: prices.length,
                        success: false,
                        error: optimizationError.message
                    });
                }
            } else {
                console.log(`   ⚠️  INSUFFICIENT DATA: ${prices.length} < 12 points`);
                results.push({
                    period: key,
                    totalRevenue: NaN,
                    totalEnergyCharged: 0,
                    totalEnergyDischarged: 0,
                    dataPoints: prices.length,
                    success: false,
                    error: 'Insufficient data points'
                });
            }
        }
        
        console.log('\n📋 SUMMARY:');
        console.log('='.repeat(80));
        
        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        console.log(`✅ Successful optimizations: ${successfulResults.length}`);
        console.log(`❌ Failed optimizations: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            const totalRevenue = successfulResults.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / successfulResults.length;
            console.log(`💰 Total revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`💰 Average revenue: ${avgRevenue.toFixed(2)} PLN`);
        }
        
        console.log('\n📊 DETAILED RESULTS:');
        results.forEach(r => {
            const status = r.success ? '✅' : '❌';
            const revenue = r.success ? `${r.totalRevenue.toFixed(2)} PLN` : 'NaN';
            console.log(`${status} ${r.period}: ${revenue} (${r.dataPoints} points)${r.method ? ` [${r.method}]` : ''}`);
        });
        
        // Check for NaN values
        const nanResults = results.filter(r => isNaN(r.totalRevenue));
        if (nanResults.length > 0) {
            console.log('\n⚠️  MONTHS WITH NaN REVENUE:');
            nanResults.forEach(r => {
                console.log(`   ${r.period}: ${r.error || 'Unknown error'}`);
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testOptimizationVerification(); 