import { loadPolishData, groupDataByPeriod } from './src/utils/dataLoaders.js';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';

async function testStoreDebug() {
    console.log('🔍 Testing Store State Debug\n');
    
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
        
        console.log('\n📊 SIMULATING STORE DATA STRUCTURE:');
        console.log('='.repeat(80));
        
        const results = [];
        const warnings = [];
        
        for (const key of groupKeys) {
            const groupData = groups[key];
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            if (prices.length >= 12) {
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, 'zscore', { lowThreshold: -0.5, highThreshold: 0.5 }, timestamps);
                    
                    if (result.success) {
                        // Create the exact data structure that would be stored in the store
                        const storeResult = {
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
                        
                        results.push(storeResult);
                        
                        console.log(`✅ ${key}: ${result.totalRevenue.toFixed(2)} PLN`);
                        
                        // Check for any NaN values in the result
                        const nanFields = [];
                        Object.entries(storeResult).forEach(([field, value]) => {
                            if (typeof value === 'number' && isNaN(value)) {
                                nanFields.push(field);
                            }
                        });
                        
                        if (nanFields.length > 0) {
                            console.log(`   ❌ WARNING: NaN values found in fields: ${nanFields.join(', ')}`);
                        }
                        
                    } else {
                        console.log(`❌ ${key}: Optimization failed - ${result.error}`);
                        warnings.push(`${key}: Optimization failed - ${result.error}`);
                    }
                } catch (optimizationError) {
                    console.log(`❌ ${key}: Exception - ${optimizationError.message}`);
                    warnings.push(`${key}: Exception - ${optimizationError.message}`);
                }
            } else {
                console.log(`⚠️  ${key}: Insufficient data (${prices.length} < 12 points)`);
                warnings.push(`${key}: Insufficient data (${prices.length} < 12 points)`);
            }
        }
        
        // Create the exact backtestResults structure that would be stored
        const backtestResults = {
            results,
            warnings,
            analysisType: 'monthly',
            dateRange: { start: '2024-06-14', end: '2025-07-18' },
            params,
            categorizationMethod: 'zscore',
            categorizationOptions: { lowThreshold: -0.5, highThreshold: 0.5 }
        };
        
        console.log('\n📋 STORE DATA STRUCTURE ANALYSIS:');
        console.log('='.repeat(80));
        
        console.log(`Total results: ${backtestResults.results.length}`);
        console.log(`Total warnings: ${backtestResults.warnings.length}`);
        console.log(`Analysis type: ${backtestResults.analysisType}`);
        console.log(`Date range: ${backtestResults.dateRange.start} to ${backtestResults.dateRange.end}`);
        
        // Check for NaN values in the entire structure
        const checkForNaN = (obj, path = '') => {
            const nanPaths = [];
            
            if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    if (typeof value === 'number' && isNaN(value)) {
                        nanPaths.push(currentPath);
                    } else if (typeof value === 'object' && value !== null) {
                        nanPaths.push(...checkForNaN(value, currentPath));
                    }
                });
            }
            
            return nanPaths;
        };
        
        const nanPaths = checkForNaN(backtestResults);
        
        if (nanPaths.length > 0) {
            console.log('\n❌ NaN VALUES FOUND IN STORE STRUCTURE:');
            nanPaths.forEach(path => {
                console.log(`   ${path}`);
            });
        } else {
            console.log('\n✅ No NaN values found in store structure');
        }
        
        // Test the data that would be passed to RevenueChart
        console.log('\n📊 TESTING REVENUECHART DATA:');
        console.log('='.repeat(80));
        
        const revenueChartData = backtestResults.results;
        console.log(`RevenueChart would receive ${revenueChartData.length} results`);
        
        // Check each result for the fields that RevenueChart expects
        const revenueChartIssues = [];
        revenueChartData.forEach((result, index) => {
            const issues = [];
            
            if (typeof result.totalRevenue !== 'number' || isNaN(result.totalRevenue)) {
                issues.push('totalRevenue is not a valid number');
            }
            
            if (typeof result.totalEnergyDischarged !== 'number' || isNaN(result.totalEnergyDischarged)) {
                issues.push('totalEnergyDischarged is not a valid number');
            }
            
            if (typeof result.dataPoints !== 'number' || isNaN(result.dataPoints)) {
                issues.push('dataPoints is not a valid number');
            }
            
            if (!result.period) {
                issues.push('period is missing');
            }
            
            if (issues.length > 0) {
                revenueChartIssues.push(`${result.period}: ${issues.join(', ')}`);
            }
        });
        
        if (revenueChartIssues.length > 0) {
            console.log('\n❌ REVENUECHART DATA ISSUES:');
            revenueChartIssues.forEach(issue => {
                console.log(`   ${issue}`);
            });
        } else {
            console.log('\n✅ All RevenueChart data is valid');
        }
        
        // Test the summary calculations that RevenueChart would do
        console.log('\n💰 TESTING REVENUECHART CALCULATIONS:');
        console.log('='.repeat(80));
        
        if (revenueChartData.length > 0) {
            const totalRevenue = revenueChartData.reduce((sum, r) => sum + r.totalRevenue, 0);
            const avgRevenue = totalRevenue / revenueChartData.length;
            const maxRevenue = Math.max(...revenueChartData.map(r => r.totalRevenue));
            const minRevenue = Math.min(...revenueChartData.map(r => r.totalRevenue));
            
            console.log(`Total Revenue: ${totalRevenue.toFixed(2)} PLN`);
            console.log(`Average Revenue: ${avgRevenue.toFixed(2)} PLN`);
            console.log(`Best Period: ${maxRevenue.toFixed(2)} PLN`);
            console.log(`Worst Period: ${minRevenue.toFixed(2)} PLN`);
            
            // Check if any of these calculations result in NaN
            if (isNaN(totalRevenue) || isNaN(avgRevenue) || isNaN(maxRevenue) || isNaN(minRevenue)) {
                console.log('\n❌ WARNING: Summary calculations resulted in NaN values!');
            } else {
                console.log('\n✅ All summary calculations are valid');
            }
        }
        
        // Test the sorting logic
        console.log('\n📊 TESTING SORTING LOGIC:');
        console.log('='.repeat(80));
        
        const sortedResults = [...revenueChartData].sort((a, b) => {
            const dateA = new Date(a.periodStart || a.period);
            const dateB = new Date(b.periodStart || b.period);
            return dateA - dateB;
        });
        
        console.log(`Sorted periods: ${sortedResults.map(r => r.period).join(', ')}`);
        
        // Test period formatting
        console.log('\n📅 TESTING PERIOD FORMATTING:');
        console.log('='.repeat(80));
        
        const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                           'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
        
        sortedResults.forEach(r => {
            try {
                const [year, month] = r.period.split('-');
                const formattedPeriod = `${monthNames[parseInt(month) - 1]} ${year}`;
                console.log(`   ${r.period} -> ${formattedPeriod}: ${r.totalRevenue.toFixed(2)} PLN`);
            } catch (error) {
                console.log(`   ❌ Error formatting period ${r.period}: ${error.message}`);
            }
        });
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testStoreDebug(); 