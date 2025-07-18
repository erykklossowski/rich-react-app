// Test script to show raw optimization data and results
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData } from './src/utils/dataLoaders.js';

async function showRawOptimizationData() {
    console.log('🔍 RAW OPTIMIZATION DATA ANALYSIS\n');
    console.log('='.repeat(80));
    
    try {
        // 1. Load raw data
        console.log('1. LOADING RAW DATA');
        console.log('='.repeat(50));
        
        const polishData = await loadPolishData();
        console.log(`✅ Loaded ${polishData.length.toLocaleString()} data points`);
        console.log(`Date range: ${polishData[0]?.datetime} to ${polishData[polishData.length-1]?.datetime}`);
        
        // Show sample of raw data
        console.log('\nSample raw data (first 5 records):');
        polishData.slice(0, 5).forEach((record, i) => {
            console.log(`  ${i + 1}. ${record.datetime}: ${record.price} PLN/MWh`);
        });
        
        // 2. Group data by month
        console.log('\n2. GROUPING DATA BY MONTH');
        console.log('='.repeat(50));
        
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
        console.log(`Found ${groupKeys.length} months: ${groupKeys.join(', ')}`);
        
        // 3. Test optimization for each month
        console.log('\n3. OPTIMIZATION RESULTS BY MONTH');
        console.log('='.repeat(50));
        
        const optimizer = new BatteryOptimizer();
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        
        const results = [];
        
        for (const key of groupKeys) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.price);
            const timestamps = groupData.map(record => record.datetime);
            
            console.log(`\n📅 ${key}: ${prices.length} data points`);
            console.log(`   Price range: ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)} PLN/MWh`);
            console.log(`   Average price: ${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)} PLN/MWh`);
            
            if (prices.length >= 12) {
                try {
                    const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                    
                    if (result.success) {
                        console.log(`   ✅ SUCCESS`);
                        console.log(`      Revenue: ${result.totalRevenue.toFixed(2)} PLN`);
                        console.log(`      Energy charged: ${result.totalEnergyCharged.toFixed(1)} MWh`);
                        console.log(`      Energy discharged: ${result.totalEnergyDischarged.toFixed(1)} MWh`);
                        console.log(`      Efficiency: ${(result.operationalEfficiency * 100).toFixed(1)}%`);
                        console.log(`      Cycles: ${result.cycles.toFixed(1)}`);
                        console.log(`      VWAP charge: ${result.vwapCharge.toFixed(2)} PLN/MWh`);
                        console.log(`      VWAP discharge: ${result.vwapDischarge.toFixed(2)} PLN/MWh`);
                        
                        // Show raw schedule data
                        console.log(`      Schedule length: ${result.schedule.revenue.length}`);
                        console.log(`      Revenue array sample: [${result.schedule.revenue.slice(0, 5).map(r => r.toFixed(2)).join(', ')}...]`);
                        console.log(`      Charging array sample: [${result.schedule.charging.slice(0, 5).map(c => c.toFixed(2)).join(', ')}...]`);
                        console.log(`      Discharging array sample: [${result.schedule.discharging.slice(0, 5).map(d => d.toFixed(2)).join(', ')}...]`);
                        console.log(`      SoC array sample: [${result.schedule.soc.slice(0, 5).map(s => s.toFixed(2)).join(', ')}...]`);
                        
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
                        
                        // Try simplified optimization
                        try {
                            const simpleSchedule = optimizer.simpleOptimize(prices, params);
                            const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                            const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                            const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                            
                            console.log(`   ✅ SIMPLIFIED SUCCESS`);
                            console.log(`      Revenue: ${totalRevenue.toFixed(2)} PLN`);
                            console.log(`      Energy charged: ${totalEnergyCharged.toFixed(1)} MWh`);
                            console.log(`      Energy discharged: ${totalEnergyDischarged.toFixed(1)} MWh`);
                            
                            results.push({
                                period: key,
                                periodStart: groupData[0].datetime,
                                periodEnd: groupData[groupData.length - 1].datetime,
                                dataPoints: prices.length,
                                prices: prices,
                                timestamps: timestamps,
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
                        } catch (simpleError) {
                            console.log(`   ❌ SIMPLIFIED FAILED: ${simpleError.message}`);
                            results.push({
                                period: key,
                                periodStart: groupData[0].datetime,
                                periodEnd: groupData[groupData.length - 1].datetime,
                                dataPoints: prices.length,
                                prices: prices,
                                timestamps: timestamps,
                                success: false,
                                error: simpleError.message
                            });
                        }
                    }
                } catch (optimizationError) {
                    console.log(`   ❌ EXCEPTION: ${optimizationError.message}`);
                    results.push({
                        period: key,
                        periodStart: groupData[0].datetime,
                        periodEnd: groupData[groupData.length - 1].datetime,
                        dataPoints: prices.length,
                        prices: prices,
                        timestamps: timestamps,
                        success: false,
                        error: optimizationError.message
                    });
                }
            } else {
                console.log(`   ⚠️  Insufficient data (${prices.length} < 12 points)`);
                results.push({
                    period: key,
                    periodStart: groupData[0]?.datetime,
                    periodEnd: groupData[groupData.length - 1]?.datetime,
                    dataPoints: prices.length,
                    prices: prices,
                    timestamps: timestamps,
                    success: false,
                    error: `Insufficient data: ${prices.length} points`
                });
            }
        }
        
        // 4. Summary analysis
        console.log('\n4. SUMMARY ANALYSIS');
        console.log('='.repeat(50));
        
        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        console.log(`Total months: ${results.length}`);
        console.log(`Successful optimizations: ${successfulResults.length}`);
        console.log(`Failed optimizations: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            const totalRevenue = successfulResults.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / successfulResults.length;
            const maxRevenue = Math.max(...successfulResults.map(r => r.totalRevenue));
            const minRevenue = Math.min(...successfulResults.map(r => r.totalRevenue));
            
            console.log(`\nRevenue Summary (successful only):`);
            console.log(`  Total Revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`  Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
            console.log(`  Best Month: ${maxRevenue.toFixed(2)} PLN`);
            console.log(`  Worst Month: ${minRevenue.toFixed(2)} PLN`);
        }
        
        if (failedResults.length > 0) {
            console.log(`\nFailed months:`);
            failedResults.forEach(r => {
                console.log(`  ${r.period}: ${r.error}`);
            });
        }
        
        // 5. Show raw result structure
        console.log('\n5. RAW RESULT STRUCTURE');
        console.log('='.repeat(50));
        
        if (successfulResults.length > 0) {
            const sampleResult = successfulResults[0];
            console.log(`Sample result structure for ${sampleResult.period}:`);
            console.log(JSON.stringify(sampleResult, null, 2));
        }
        
        // 6. Check for NaN values
        console.log('\n6. NaN VALUE CHECK');
        console.log('='.repeat(50));
        
        const nanResults = results.filter(r => 
            r.success && (
                isNaN(r.totalRevenue) || 
                isNaN(r.totalEnergyCharged) || 
                isNaN(r.totalEnergyDischarged) ||
                isNaN(r.operationalEfficiency)
            )
        );
        
        if (nanResults.length > 0) {
            console.log(`❌ Found ${nanResults.length} results with NaN values:`);
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
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error stack:', error.stack);
    }
}

// Run the test
showRawOptimizationData(); 