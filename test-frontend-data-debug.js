import { loadPolishData, groupDataByPeriod } from './src/utils/dataLoaders.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

async function testFrontendDataDebug() {
    console.log('🔍 Testing Frontend Data Flow\n');
    
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
        
        console.log('\n📊 SIMULATING FRONTEND DATA FLOW:');
        console.log('='.repeat(80));
        
        const results = [];
        
        for (const key of groupKeys) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            if (prices.length >= 12) {
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                    
                    if (result.success) {
                        // Simulate the exact data structure that would be passed to RevenueChart
                        const frontendResult = {
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            totalRevenue: result.totalRevenue,
                            totalEnergyCharged: result.totalEnergyCharged,
                            totalEnergyDischarged: result.totalEnergyDischarged,
                            operationalEfficiency: result.operationalEfficiency,
                            avgPrice: result.avgPrice,
                            cycles: result.cycles,
                            vwapCharge: result.vwapCharge,
                            vwapDischarge: result.vwapDischarge,
                            success: true
                        };
                        
                        results.push(frontendResult);
                        
                        console.log(`✅ ${key}: ${result.totalRevenue.toFixed(2)} PLN`);
                        console.log(`   Data structure check:`);
                        console.log(`     period: ${frontendResult.period}`);
                        console.log(`     totalRevenue: ${frontendResult.totalRevenue} (type: ${typeof frontendResult.totalRevenue})`);
                        console.log(`     totalEnergyDischarged: ${frontendResult.totalEnergyDischarged} (type: ${typeof frontendResult.totalEnergyDischarged})`);
                        console.log(`     dataPoints: ${frontendResult.dataPoints} (type: ${typeof frontendResult.dataPoints})`);
                        console.log(`     success: ${frontendResult.success} (type: ${typeof frontendResult.success})`);
                        
                        // Check for NaN values
                        if (isNaN(frontendResult.totalRevenue)) {
                            console.log(`   ❌ WARNING: totalRevenue is NaN!`);
                        }
                        if (isNaN(frontendResult.totalEnergyDischarged)) {
                            console.log(`   ❌ WARNING: totalEnergyDischarged is NaN!`);
                        }
                        
                    } else {
                        console.log(`❌ ${key}: Optimization failed - ${result.error}`);
                    }
                } catch (optimizationError) {
                    console.log(`❌ ${key}: Exception - ${optimizationError.message}`);
                }
            } else {
                console.log(`⚠️  ${key}: Insufficient data (${prices.length} < 12 points)`);
            }
        }
        
        console.log('\n📋 FRONTEND DATA SUMMARY:');
        console.log('='.repeat(80));
        
        console.log(`Total results: ${results.length}`);
        
        // Check for NaN values in the results
        const nanResults = results.filter(r => isNaN(r.totalRevenue));
        const validResults = results.filter(r => !isNaN(r.totalRevenue));
        
        console.log(`Valid results: ${validResults.length}`);
        console.log(`NaN results: ${nanResults.length}`);
        
        if (nanResults.length > 0) {
            console.log('\n❌ RESULTS WITH NaN VALUES:');
            nanResults.forEach(r => {
                console.log(`   ${r.period}: totalRevenue = ${r.totalRevenue}`);
            });
        }
        
        if (validResults.length > 0) {
            console.log('\n✅ VALID RESULTS:');
            validResults.forEach(r => {
                console.log(`   ${r.period}: ${r.totalRevenue.toFixed(2)} PLN`);
            });
            
            // Calculate summary statistics (like RevenueChart does)
            const totalRevenue = validResults.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / validResults.length;
            const maxRevenue = Math.max(...validResults.map(r => r.totalRevenue));
            const minRevenue = Math.min(...validResults.map(r => r.totalRevenue));
            
            console.log('\n💰 SUMMARY STATISTICS:');
            console.log(`Total Revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
            console.log(`Best Period: ${maxRevenue.toFixed(2)} PLN`);
            console.log(`Worst Period: ${minRevenue.toFixed(2)} PLN`);
        }
        
        // Test the sorting logic (like RevenueChart does)
        console.log('\n📊 TESTING SORTING LOGIC:');
        const sortedResults = [...results].sort((a, b) => {
            const dateA = new Date(a.periodStart || a.period);
            const dateB = new Date(b.periodStart || b.period);
            return dateA - dateB;
        });
        
        console.log(`Sorted periods: ${sortedResults.map(r => r.period).join(', ')}`);
        
        // Test the period formatting logic
        console.log('\n📅 TESTING PERIOD FORMATTING:');
        const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                           'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
        
        sortedResults.forEach(r => {
            const [year, month] = r.period.split('-');
            const formattedPeriod = `${monthNames[parseInt(month) - 1]} ${year}`;
            console.log(`   ${r.period} -> ${formattedPeriod}: ${r.totalRevenue.toFixed(2)} PLN`);
        });
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testFrontendDataDebug(); 