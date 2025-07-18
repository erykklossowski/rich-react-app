// Comprehensive debugging procedure to trace data flow from backend to frontend
// Goal: Ensure "frontend" - "backend" = 0

import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';
import { useOptimizationStore } from './src/store/optimizationStore.js';

async function debugFrontendBackendDataFlow() {
    console.log('🔍 FRONTEND-BACKEND DATA FLOW DEBUG\n');
    console.log('='.repeat(80));
    console.log('Goal: Ensure "frontend" - "backend" = 0\n');
    
    const debugResults = {
        backend: {},
        frontend: {},
        mismatches: [],
        summary: {}
    };
    
    try {
        // ========================================
        // STEP 1: BACKEND DATA FLOW TRACE
        // ========================================
        console.log('1. BACKEND DATA FLOW TRACE');
        console.log('='.repeat(50));
        
        // 1.1 Load raw data
        console.log('1.1 Loading raw data...');
        const polishData = await loadPolishData();
        console.log(`✅ Backend loaded ${polishData.length} records`);
        
        // 1.2 Filter data
        console.log('1.2 Filtering data...');
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        console.log(`✅ Backend filtered to ${filteredData.length} records`);
        
        // 1.3 Group data
        console.log('1.3 Grouping data...');
        const analysisType = 'monthly';
        const groups = groupDataByPeriod(filteredData, analysisType);
        const groupKeys = Object.keys(groups).sort();
        console.log(`✅ Backend created ${groupKeys.length} monthly groups`);
        
        // 1.4 Run backend optimization
        console.log('1.4 Running backend optimization...');
        const optimizer = new BatteryOptimizer();
        optimizer.reset();
        
        const params = { pMax: 10, socMin: 10, socMax: 40, efficiency: 0.85 };
        const categorizationMethod = 'zscore';
        const categorizationOptions = { lowThreshold: -0.5, highThreshold: 0.5 };
        
        const backendResults = [];
        const backendWarnings = [];
        
        // Data completeness validation (same as frontend)
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
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            // Validate data completeness
            const completeness = validateDataCompleteness(groupData, analysisType);
            
            if (!completeness.isValid) {
                backendWarnings.push(`${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        backendResults.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            ...result
                        });
                    } else {
                        // Try simplified optimization as fallback
                        const simpleSchedule = optimizer.simpleOptimize(prices, params);
                        const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                        const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                        const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                        
                        backendResults.push({
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
                    console.error(`Backend optimization failed for ${key}:`, optimizationError.message);
                }
            }
        }
        
        // Store backend results
        debugResults.backend = {
            rawDataCount: polishData.length,
            filteredDataCount: filteredData.length,
            groupCount: groupKeys.length,
            results: backendResults,
            warnings: backendWarnings,
            totalRevenue: backendResults.reduce((sum, r) => sum + r.totalRevenue, 0),
            avgRevenue: backendResults.reduce((sum, r) => sum + r.totalRevenue, 0) / backendResults.length
        };
        
        console.log(`✅ Backend completed: ${backendResults.length} results, ${backendWarnings.length} warnings`);
        console.log(`✅ Backend total revenue: ${debugResults.backend.totalRevenue.toFixed(2)} PLN`);
        
        // ========================================
        // STEP 2: FRONTEND DATA FLOW TRACE
        // ========================================
        console.log('\n2. FRONTEND DATA FLOW TRACE');
        console.log('='.repeat(50));
        
        // 2.1 Check store state
        console.log('2.1 Checking store state...');
        const store = useOptimizationStore.getState();
        
        // 2.2 Simulate frontend backtest execution
        console.log('2.2 Simulating frontend backtest...');
        
        // Reset store
        store.resetResults();
        store.setLoading(true);
        store.setProgress(0);
        store.setProgressText('Preparing backtest...');
        store.setStatusMessage({ type: 'info', text: 'Running historical backtest...' });
        
        // Load data (same as frontend)
        let currentPolishData = store.polishData;
        if (!currentPolishData || currentPolishData.length === 0) {
            currentPolishData = await loadPolishData();
            store.setPolishData(currentPolishData);
        }
        
        // Filter data (same as frontend)
        const frontendFilteredData = filterDataByDateRange(currentPolishData, startDate, endDate);
        
        // Group data (same as frontend)
        const frontendGroups = groupDataByPeriod(frontendFilteredData, analysisType);
        const frontendGroupKeys = Object.keys(frontendGroups).sort();
        
        // Run optimization (same as frontend)
        const frontendResults = [];
        const frontendWarnings = [];
        
        for (const [index, key] of frontendGroupKeys.entries()) {
            const groupData = frontendGroups[key];
            const prices = groupData.map(record => record.csdac_pln || record.price);
            
            // Validate data completeness
            const completeness = validateDataCompleteness(groupData, analysisType);
            
            if (!completeness.isValid) {
                frontendWarnings.push(`${key}: ${completeness.reason}`);
                continue;
            }
            
            if (prices.length >= 12) {
                try {
                    const timestamps = groupData.map(record => record.datetime);
                    const result = optimizer.optimize(prices, params, categorizationMethod, categorizationOptions, timestamps);
                    
                    if (result.success) {
                        frontendResults.push({
                            period: key,
                            periodStart: groupData[0].datetime,
                            periodEnd: groupData[groupData.length - 1].datetime,
                            dataPoints: prices.length,
                            prices: prices,
                            ...result
                        });
                    } else {
                        // Try simplified optimization as fallback
                        const simpleSchedule = optimizer.simpleOptimize(prices, params);
                        const totalRevenue = simpleSchedule.revenue.reduce((sum, rev) => sum + rev, 0);
                        const totalEnergyCharged = simpleSchedule.charging.reduce((sum, charge) => sum + charge, 0);
                        const totalEnergyDischarged = simpleSchedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
                        
                        frontendResults.push({
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
                    console.error(`Frontend optimization failed for ${key}:`, optimizationError.message);
                }
            }
        }
        
        // Store frontend results
        debugResults.frontend = {
            rawDataCount: currentPolishData.length,
            filteredDataCount: frontendFilteredData.length,
            groupCount: frontendGroupKeys.length,
            results: frontendResults,
            warnings: frontendWarnings,
            totalRevenue: frontendResults.reduce((sum, r) => sum + r.totalRevenue, 0),
            avgRevenue: frontendResults.reduce((sum, r) => sum + r.totalRevenue, 0) / frontendResults.length
        };
        
        console.log(`✅ Frontend completed: ${frontendResults.length} results, ${frontendWarnings.length} warnings`);
        console.log(`✅ Frontend total revenue: ${debugResults.frontend.totalRevenue.toFixed(2)} PLN`);
        
        // ========================================
        // STEP 3: COMPARISON AND MISMATCH DETECTION
        // ========================================
        console.log('\n3. COMPARISON AND MISMATCH DETECTION');
        console.log('='.repeat(50));
        
        // 3.1 Compare data counts
        console.log('3.1 Comparing data counts...');
        if (debugResults.backend.rawDataCount !== debugResults.frontend.rawDataCount) {
            debugResults.mismatches.push(`Raw data count mismatch: Backend=${debugResults.backend.rawDataCount}, Frontend=${debugResults.frontend.rawDataCount}`);
        }
        
        if (debugResults.backend.filteredDataCount !== debugResults.frontend.filteredDataCount) {
            debugResults.mismatches.push(`Filtered data count mismatch: Backend=${debugResults.backend.filteredDataCount}, Frontend=${debugResults.frontend.filteredDataCount}`);
        }
        
        if (debugResults.backend.groupCount !== debugResults.frontend.groupCount) {
            debugResults.mismatches.push(`Group count mismatch: Backend=${debugResults.backend.groupCount}, Frontend=${debugResults.frontend.groupCount}`);
        }
        
        // 3.2 Compare results count
        console.log('3.2 Comparing results count...');
        if (debugResults.backend.results.length !== debugResults.frontend.results.length) {
            debugResults.mismatches.push(`Results count mismatch: Backend=${debugResults.backend.results.length}, Frontend=${debugResults.frontend.results.length}`);
        }
        
        // 3.3 Compare individual results
        console.log('3.3 Comparing individual results...');
        const backendPeriods = debugResults.backend.results.map(r => r.period).sort();
        const frontendPeriods = debugResults.frontend.results.map(r => r.period).sort();
        
        if (JSON.stringify(backendPeriods) !== JSON.stringify(frontendPeriods)) {
            debugResults.mismatches.push(`Period mismatch: Backend=${backendPeriods}, Frontend=${frontendPeriods}`);
        }
        
        // 3.4 Compare revenue values
        console.log('3.4 Comparing revenue values...');
        const revenueDiff = Math.abs(debugResults.backend.totalRevenue - debugResults.frontend.totalRevenue);
        if (revenueDiff > 0.01) { // Allow for floating point precision
            debugResults.mismatches.push(`Revenue mismatch: Backend=${debugResults.backend.totalRevenue.toFixed(2)}, Frontend=${debugResults.frontend.totalRevenue.toFixed(2)}, Diff=${revenueDiff.toFixed(2)}`);
        }
        
        // 3.5 Compare individual period revenues
        for (const backendResult of debugResults.backend.results) {
            const frontendResult = debugResults.frontend.results.find(r => r.period === backendResult.period);
            if (!frontendResult) {
                debugResults.mismatches.push(`Missing frontend result for period ${backendResult.period}`);
                continue;
            }
            
            const periodRevenueDiff = Math.abs(backendResult.totalRevenue - frontendResult.totalRevenue);
            if (periodRevenueDiff > 0.01) {
                debugResults.mismatches.push(`Period ${backendResult.period} revenue mismatch: Backend=${backendResult.totalRevenue.toFixed(2)}, Frontend=${frontendResult.totalRevenue.toFixed(2)}, Diff=${periodRevenueDiff.toFixed(2)}`);
            }
        }
        
        // ========================================
        // STEP 4: SUMMARY AND RECOMMENDATIONS
        // ========================================
        console.log('\n4. SUMMARY AND RECOMMENDATIONS');
        console.log('='.repeat(50));
        
        debugResults.summary = {
            totalMismatches: debugResults.mismatches.length,
            isAligned: debugResults.mismatches.length === 0,
            backendRevenue: debugResults.backend.totalRevenue,
            frontendRevenue: debugResults.frontend.totalRevenue,
            revenueDifference: Math.abs(debugResults.backend.totalRevenue - debugResults.frontend.totalRevenue)
        };
        
        console.log(`Total mismatches found: ${debugResults.mismatches.length}`);
        console.log(`Data flow aligned: ${debugResults.summary.isAligned ? '✅ YES' : '❌ NO'}`);
        console.log(`Revenue difference: ${debugResults.summary.revenueDifference.toFixed(2)} PLN`);
        
        if (debugResults.mismatches.length > 0) {
            console.log('\n❌ MISMATCHES FOUND:');
            debugResults.mismatches.forEach((mismatch, index) => {
                console.log(`  ${index + 1}. ${mismatch}`);
            });
        } else {
            console.log('\n✅ PERFECT ALIGNMENT: "frontend" - "backend" = 0');
        }
        
        // ========================================
        // STEP 5: DETAILED COMPARISON TABLE
        // ========================================
        console.log('\n5. DETAILED COMPARISON TABLE');
        console.log('='.repeat(50));
        
        console.log('Period\t\tBackend Revenue\tFrontend Revenue\tDifference\tStatus');
        console.log('-'.repeat(80));
        
        for (const backendResult of debugResults.backend.results) {
            const frontendResult = debugResults.frontend.results.find(r => r.period === backendResult.period);
            const diff = frontendResult ? Math.abs(backendResult.totalRevenue - frontendResult.totalRevenue) : 'MISSING';
            const status = frontendResult ? (diff < 0.01 ? '✅' : '❌') : '❌';
            
            console.log(`${backendResult.period}\t${backendResult.totalRevenue.toFixed(2)}\t\t${frontendResult ? frontendResult.totalRevenue.toFixed(2) : 'N/A'}\t\t${diff}\t${status}`);
        }
        
        return debugResults;
        
    } catch (error) {
        console.error('❌ Debug procedure failed:', error);
        return { error: error.message };
    }
}

// Run the debug procedure
debugFrontendBackendDataFlow().then(results => {
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG PROCEDURE COMPLETE');
    console.log('='.repeat(80));
    
    if (results.error) {
        console.log('❌ Debug failed:', results.error);
    } else {
        console.log(`Final Status: ${results.summary.isAligned ? '✅ ALIGNED' : '❌ MISALIGNED'}`);
        console.log(`Mismatches: ${results.summary.totalMismatches}`);
        console.log(`Revenue Difference: ${results.summary.revenueDifference.toFixed(2)} PLN`);
    }
}); 