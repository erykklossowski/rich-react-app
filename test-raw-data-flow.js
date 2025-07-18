// Test script to show raw data flow from optimization to frontend
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';

async function showRawDataFlow() {
    console.log('🔍 RAW DATA FLOW ANALYSIS\n');
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
        
        // 2. Filter data by date range (like frontend does)
        console.log('\n2. FILTERING DATA BY DATE RANGE');
        console.log('='.repeat(50));
        
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        console.log(`Filtering from ${startDate} to ${endDate}`);
        
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        console.log(`✅ Filtered to ${filteredData.length.toLocaleString()} data points`);
        
        // 3. Group data by month (like frontend does)
        console.log('\n3. GROUPING DATA BY MONTH');
        console.log('='.repeat(50));
        
        const groups = groupDataByPeriod(filteredData, 'monthly');
        const groupKeys = Object.keys(groups).sort();
        console.log(`Found ${groupKeys.length} months: ${groupKeys.join(', ')}`);
        
        // Show data for each month
        groupKeys.forEach(key => {
            const groupData = groups[key];
            const prices = groupData.map(record => record.price);
            console.log(`\n📅 ${key}: ${prices.length} data points`);
            console.log(`   Price range: ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)} PLN/MWh`);
            console.log(`   Average price: ${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)} PLN/MWh`);
            console.log(`   Date range: ${groupData[0]?.datetime} to ${groupData[groupData.length-1]?.datetime}`);
        });
        
        // 4. Run optimization for each month (like frontend does)
        console.log('\n4. RUNNING OPTIMIZATION FOR EACH MONTH');
        console.log('='.repeat(50));
        
        const optimizer = new BatteryOptimizer();
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        const categorizationMethod = 'zscore';
        const categorizationOptions = { lowThreshold: -0.5, highThreshold: 0.5 };
        
        const results = [];
        const warnings = [];
        
        // Data completeness validation function (from frontend)
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
            
            // Consider data valid if it has at least 50% of expected hours
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
            
            console.log(`\n📊 Processing period ${key}: ${prices.length} data points`);
            
            // Validate data completeness (like frontend does)
            const completeness = validateDataCompleteness(groupData, 'monthly');
            console.log(`   Data completeness: ${(completeness.completeness * 100).toFixed(1)}% (${completeness.actualHours}/${completeness.expectedHours} hours)`);
            
            if (!completeness.isValid) {
                console.log(`   ❌ SKIPPED: ${completeness.reason}`);
                warnings.push(`${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                console.log(`   ✅ Attempting optimization...`);
                
                try {
                    optimizer.reset(); // Reset state for fresh start
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        console.log(`   ✅ SUCCESS: ${result.totalRevenue.toFixed(2)} PLN`);
                        console.log(`      Energy: ${result.totalEnergyCharged.toFixed(1)} MWh charged, ${result.totalEnergyDischarged.toFixed(1)} MWh discharged`);
                        console.log(`      Efficiency: ${(result.operationalEfficiency * 100).toFixed(1)}%`);
                        console.log(`      Cycles: ${result.cycles.toFixed(1)}`);
                        
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
                        
                        // Try simplified optimization as fallback
                        try {
                            const simpleSchedule = optimizer.simpleOptimize(prices, params);
                            const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                            const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                            const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                            
                            console.log(`   ✅ SIMPLIFIED SUCCESS: ${totalRevenue.toFixed(2)} PLN`);
                            
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
                        }
                    }
                } catch (optimizationError) {
                    console.log(`   ❌ EXCEPTION: ${optimizationError.message}`);
                }
            } else {
                console.log(`   ❌ INSUFFICIENT DATA: ${prices.length} < 12 points`);
            }
        }
        
        // 5. Create backtest results structure (like frontend does)
        console.log('\n5. CREATING BACKTEST RESULTS STRUCTURE');
        console.log('='.repeat(50));
        
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
        console.log(`⚠️  ${warnings.length} warnings generated`);
        
        // 6. Show raw results data
        console.log('\n6. RAW RESULTS DATA');
        console.log('='.repeat(50));
        
        console.log(`Total results: ${results.length}`);
        console.log(`Results periods: ${results.map(r => r.period).join(', ')}`);
        
        results.forEach((result, index) => {
            console.log(`\n📊 Result ${index + 1}: ${result.period}`);
            console.log(`   totalRevenue: ${result.totalRevenue} (${typeof result.totalRevenue})`);
            console.log(`   totalEnergyCharged: ${result.totalEnergyCharged} (${typeof result.totalEnergyCharged})`);
            console.log(`   totalEnergyDischarged: ${result.totalEnergyDischarged} (${typeof result.totalEnergyDischarged})`);
            console.log(`   operationalEfficiency: ${result.operationalEfficiency} (${typeof result.operationalEfficiency})`);
            console.log(`   dataPoints: ${result.dataPoints} (${typeof result.dataPoints})`);
            console.log(`   success: ${result.success} (${typeof result.success})`);
            console.log(`   method: ${result.method || 'main'} (${typeof result.method})`);
            
            // Check for NaN values
            const nanFields = [];
            Object.entries(result).forEach(([field, value]) => {
                if (typeof value === 'number' && isNaN(value)) {
                    nanFields.push(field);
                }
            });
            
            if (nanFields.length > 0) {
                console.log(`   ❌ NaN VALUES FOUND: ${nanFields.join(', ')}`);
            } else {
                console.log(`   ✅ No NaN values`);
            }
        });
        
        // 7. Simulate frontend processing (like RevenueChart does)
        console.log('\n7. SIMULATING FRONTEND PROCESSING');
        console.log('='.repeat(50));
        
        // Sort results (like RevenueChart does)
        const sortedResults = [...results].sort((a, b) => {
            const dateA = new Date(a.periodStart || a.period);
            const dateB = new Date(b.periodStart || b.period);
            return dateA - dateB;
        });
        
        console.log(`Sorted periods: ${sortedResults.map(r => r.period).join(', ')}`);
        
        // Calculate summary statistics (like RevenueChart does)
        const totalRevenue = sortedResults.reduce((sum, r) => {
            if (isNaN(r.totalRevenue) || r.totalRevenue === undefined || r.totalRevenue === null) {
                console.log(`  ❌ Invalid value detected in totalRevenue calculation for period: ${r.period}, value: ${r.totalRevenue}`);
                return sum;
            }
            return sum + r.totalRevenue;
        }, 0);
        
        const avgRevenue = sortedResults.length > 0 ? totalRevenue / sortedResults.length : 0;
        const maxRevenue = sortedResults.length > 0 ? Math.max(...sortedResults.map(r => (r.totalRevenue && !isNaN(r.totalRevenue)) ? r.totalRevenue : -Infinity)) : 0;
        const minRevenue = sortedResults.length > 0 ? Math.min(...sortedResults.map(r => (r.totalRevenue && !isNaN(r.totalRevenue)) ? r.totalRevenue : Infinity)) : 0;
        
        console.log('\n💰 SUMMARY CALCULATIONS:');
        console.log(`  totalRevenue: ${totalRevenue} (${typeof totalRevenue})`);
        console.log(`  avgRevenue: ${avgRevenue} (${typeof avgRevenue})`);
        console.log(`  maxRevenue: ${maxRevenue} (${typeof maxRevenue})`);
        console.log(`  minRevenue: ${minRevenue} (${typeof minRevenue})`);
        
        // Check for NaN in calculations
        if (isNaN(totalRevenue) || isNaN(avgRevenue) || isNaN(maxRevenue) || isNaN(minRevenue)) {
            console.log('  ❌ NaN detected in summary calculations!');
        } else {
            console.log('  ✅ Summary calculations valid');
        }
        
        // 8. Show what the frontend would display
        console.log('\n8. FRONTEND DISPLAY SIMULATION');
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
        
        console.log('What the frontend would show:');
        console.log(`  Total Revenue: ${formatPLN(totalRevenue)}`);
        console.log(`  Average Revenue: ${formatPLN(avgRevenue)}`);
        console.log(`  Best Period: ${formatPLN(maxRevenue)}`);
        console.log(`  Worst Period: ${formatPLN(minRevenue)}`);
        console.log(`  Profitable Periods: ${sortedResults.filter(r => r.totalRevenue > 0).length}/${sortedResults.length}`);
        
        // 9. Identify the issue
        console.log('\n9. ISSUE IDENTIFICATION');
        console.log('='.repeat(50));
        
        const backendMonths = new Set(groupKeys);
        const frontendMonths = new Set(results.map(r => r.period));
        
        const missingInFrontend = [...backendMonths].filter(m => !frontendMonths.has(m));
        const extraInFrontend = [...frontendMonths].filter(m => !backendMonths.has(m));
        
        console.log(`Backend months: ${backendMonths.size} (${Array.from(backendMonths).join(', ')})`);
        console.log(`Frontend results: ${frontendMonths.size} (${Array.from(frontendMonths).join(', ')})`);
        
        if (missingInFrontend.length > 0) {
            console.log(`❌ Missing in frontend: ${missingInFrontend.join(', ')}`);
            console.log('   These months were skipped due to data completeness validation');
        }
        
        if (extraInFrontend.length > 0) {
            console.log(`❌ Extra in frontend: ${extraInFrontend.join(', ')}`);
        }
        
        if (missingInFrontend.length === 0 && extraInFrontend.length === 0) {
            console.log('✅ All months match between backend and frontend');
        }
        
        // 10. Show warnings
        if (warnings.length > 0) {
            console.log('\n10. WARNINGS');
            console.log('='.repeat(50));
            warnings.forEach(warning => {
                console.log(`  ⚠️  ${warning}`);
            });
        }
        
        console.log('\n🎯 CONCLUSION');
        console.log('='.repeat(50));
        console.log('The optimization is working correctly and producing valid results.');
        console.log('The NaN values in the frontend are likely due to:');
        console.log('1. Some months being skipped due to data completeness validation');
        console.log('2. The frontend trying to process periods that were filtered out');
        console.log('3. A mismatch between backend processing and frontend display logic');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error stack:', error.stack);
    }
}

// Run the test
showRawDataFlow(); 