// Test script to check for zero-revenue months and validate fixes
import { loadPolishData, groupDataByPeriod, filterDataByDateRange } from './src/utils/dataLoaders.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

async function testZeroRevenueMonths() {
    console.log('=== TESTING ZERO-REVENUE MONTHS ===');
    console.log('Checking for periods with zero revenue and validating fixes...\n');

    try {
        // Load data
        console.log('1. Loading Polish electricity market data...');
        const allData = await loadPolishData();
        console.log(`   Loaded ${allData.length} records`);
        
        if (allData.length === 0) {
            throw new Error('No data loaded');
        }

        // Get date range
        const firstDate = new Date(allData[0].datetime);
        const lastDate = new Date(allData[allData.length - 1].datetime);
        console.log(`   Date range: ${firstDate.toISOString().split('T')[0]} to ${lastDate.toISOString().split('T')[0]}`);

        // Group by months
        console.log('\n2. Grouping data by months...');
        const monthlyGroups = groupDataByPeriod(allData, 'monthly');
        const monthKeys = Object.keys(monthlyGroups).sort();
        console.log(`   Found ${monthKeys.length} months: ${monthKeys.join(', ')}`);

        // Initialize optimizer
        console.log('\n3. Initializing battery optimizer...');
        const optimizer = new BatteryOptimizer();
        const params = {
            pMax: 10,
            socMin: 10,
            socMax: 40,
            efficiency: 0.85
        };

        // Test each month
        console.log('\n4. Testing each month for revenue generation...');
        const results = [];
        let zeroRevenueMonths = 0;
        let invalidScheduleMonths = 0;

        for (const monthKey of monthKeys) {
            const monthData = monthlyGroups[monthKey];
            const prices = monthData.map(record => record.price || record.csdac_pln);
            
            console.log(`\n   Testing ${monthKey}:`);
            console.log(`     Records: ${monthData.length}`);
            console.log(`     Price range: ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)} PLN/MWh`);
            console.log(`     Average price: ${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)} PLN/MWh`);

            if (prices.length < 24) {
                console.log(`     ⚠️  Skipping: insufficient data (${prices.length} < 24)`);
                continue;
            }

            try {
                // Extract timestamps
                const timestamps = monthData.map(record => record.datetime);
                
                // Run optimization
                const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                
                if (result.success) {
                    console.log(`     ✓ Optimization successful`);
                    console.log(`     Revenue: ${result.totalRevenue.toFixed(2)} PLN`);
                    console.log(`     Energy charged: ${result.totalEnergyCharged.toFixed(2)} MWh`);
                    console.log(`     Energy discharged: ${result.totalEnergyDischarged.toFixed(2)} MWh`);
                    
                    // Check if schedule data is valid
                    const hasValidSchedule = result.schedule && 
                        Array.isArray(result.schedule.soc) && 
                        Array.isArray(result.schedule.charging) && 
                        Array.isArray(result.schedule.discharging) && 
                        Array.isArray(result.schedule.revenue) &&
                        result.schedule.soc.length > 0;

                    if (!hasValidSchedule) {
                        console.log(`     ❌ Invalid schedule data`);
                        invalidScheduleMonths++;
                    } else {
                        console.log(`     ✓ Valid schedule data (${result.schedule.soc.length} points)`);
                    }

                    // Check for zero revenue
                    if (result.totalRevenue === 0) {
                        console.log(`     ⚠️  ZERO REVENUE DETECTED`);
                        zeroRevenueMonths++;
                    }

                    results.push({
                        month: monthKey,
                        success: true,
                        revenue: result.totalRevenue,
                        energyCharged: result.totalEnergyCharged,
                        energyDischarged: result.totalEnergyDischarged,
                        dataPoints: prices.length,
                        hasValidSchedule,
                        schedule: result.schedule
                    });

                } else {
                    console.log(`     ❌ Optimization failed: ${result.error}`);
                    results.push({
                        month: monthKey,
                        success: false,
                        error: result.error,
                        dataPoints: prices.length
                    });
                }

            } catch (error) {
                console.log(`     ❌ Exception: ${error.message}`);
                results.push({
                    month: monthKey,
                    success: false,
                    error: error.message,
                    dataPoints: prices.length
                });
            }
        }

        // Summary
        console.log('\n=== SUMMARY ===');
        console.log(`Total months tested: ${results.length}`);
        console.log(`Successful optimizations: ${results.filter(r => r.success).length}`);
        console.log(`Failed optimizations: ${results.filter(r => !r.success).length}`);
        console.log(`Zero revenue months: ${zeroRevenueMonths}`);
        console.log(`Invalid schedule months: ${invalidScheduleMonths}`);

        // Detailed zero revenue analysis
        if (zeroRevenueMonths > 0) {
            console.log('\n=== ZERO REVENUE ANALYSIS ===');
            const zeroRevenueResults = results.filter(r => r.success && r.revenue === 0);
            
            zeroRevenueResults.forEach(result => {
                console.log(`\nMonth: ${result.month}`);
                console.log(`  Data points: ${result.dataPoints}`);
                console.log(`  Energy charged: ${result.energyCharged.toFixed(2)} MWh`);
                console.log(`  Energy discharged: ${result.energyDischarged.toFixed(2)} MWh`);
                console.log(`  Has valid schedule: ${result.hasValidSchedule}`);
                
                if (result.schedule) {
                    const nonZeroCharging = result.schedule.charging.filter(c => c > 0).length;
                    const nonZeroDischarging = result.schedule.discharging.filter(d => d > 0).length;
                    console.log(`  Non-zero charging periods: ${nonZeroCharging}`);
                    console.log(`  Non-zero discharging periods: ${nonZeroDischarging}`);
                }
            });
        }

        // Test specific zero-revenue month if found
        if (zeroRevenueMonths > 0) {
            console.log('\n=== TESTING ZERO-REVENUE MONTH DETAIL VIEW ===');
            const firstZeroRevenue = results.find(r => r.success && r.revenue === 0);
            
            if (firstZeroRevenue) {
                console.log(`\nTesting detail view for ${firstZeroRevenue.month}...`);
                
                // Simulate what happens when clicking on a zero-revenue month
                const detailData = {
                    result: firstZeroRevenue,
                    prices: monthlyGroups[firstZeroRevenue.month].map(r => r.price || r.csdac_pln),
                    params: params,
                    title: `Detailed Period: ${firstZeroRevenue.month}`
                };

                console.log('Detail data structure:');
                console.log(`  Title: ${detailData.title}`);
                console.log(`  Prices length: ${detailData.prices.length}`);
                console.log(`  Has schedule: ${!!detailData.result.schedule}`);
                console.log(`  Schedule valid: ${detailData.result.hasValidSchedule}`);
                
                if (detailData.result.schedule) {
                    console.log(`  Schedule properties:`);
                    console.log(`    soc: ${Array.isArray(detailData.result.schedule.soc) ? detailData.result.schedule.soc.length : 'NOT ARRAY'}`);
                    console.log(`    charging: ${Array.isArray(detailData.result.schedule.charging) ? detailData.result.schedule.charging.length : 'NOT ARRAY'}`);
                    console.log(`    discharging: ${Array.isArray(detailData.result.schedule.discharging) ? detailData.result.schedule.discharging.length : 'NOT ARRAY'}`);
                    console.log(`    revenue: ${Array.isArray(detailData.result.schedule.revenue) ? detailData.result.schedule.revenue.length : 'NOT ARRAY'}`);
                }
            }
        }

        // Recommendations
        console.log('\n=== RECOMMENDATIONS ===');
        if (zeroRevenueMonths > 0) {
            console.log('❌ ISSUES FOUND:');
            console.log(`  - ${zeroRevenueMonths} months have zero revenue`);
            console.log(`  - ${invalidScheduleMonths} months have invalid schedule data`);
            console.log('  - The ResultsDashboard validation should catch these cases');
            console.log('  - Need to investigate why optimization produces zero revenue');
        } else {
            console.log('✅ NO ZERO-REVENUE MONTHS FOUND');
            console.log('  - All months generate some revenue');
            console.log('  - Optimization is working correctly');
        }

        return {
            totalMonths: results.length,
            successfulOptimizations: results.filter(r => r.success).length,
            zeroRevenueMonths,
            invalidScheduleMonths,
            results
        };

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Run the test
testZeroRevenueMonths()
    .then(results => {
        console.log('\n=== TEST COMPLETED ===');
        console.log('Results:', JSON.stringify(results, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    }); 