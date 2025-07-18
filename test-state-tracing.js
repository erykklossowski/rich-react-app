import { loadSystemContractingData } from './src/utils/afrrDataLoaders.js';
import AFRROptimizer from './src/utils/AFRROptimizerClass.js';

async function traceContractingStates() {
    console.log('🔍 TRACING CONTRACTING STATUS DATA FLOW');
    console.log('='.repeat(60));
    
    try {
        // Load contracting data for a specific period
        const contractingData = await loadSystemContractingData({
            startDate: '2025-07-15',
            endDate: '2025-07-16',
            maxRecords: 1000
        });
        
        console.log(`✅ Loaded ${contractingData.data.length} contracting status records`);
        
        // Create optimizer instance
        const optimizer = new AFRROptimizer();
        
        // Extract contracting values
        const contractingValues = contractingData.data.map(record => record.sk_d1_fcst);
        const timestamps = contractingData.data.map(record => record.dtime);
        
        console.log(`\n📊 CONTRACTING VALUES ANALYSIS`);
        console.log(`Total values: ${contractingValues.length}`);
        console.log(`Value range: ${Math.min(...contractingValues).toFixed(2)} to ${Math.max(...contractingValues).toFixed(2)} MW`);
        console.log(`Average: ${(contractingValues.reduce((sum, v) => sum + v, 0) / contractingValues.length).toFixed(2)} MW`);
        
        // Test different categorization methods
        const methods = ['quantile', 'zscore', 'threshold', 'kmeans'];
        
        for (const method of methods) {
            console.log(`\n🔍 TESTING ${method.toUpperCase()} CATEGORIZATION`);
            console.log('-'.repeat(40));
            
            try {
                // Categorize using the method
                const categories = optimizer.categorizeContractingStatus(contractingValues, method, {});
                
                // Count categories
                const categoryCounts = {};
                categories.forEach(cat => {
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });
                
                console.log(`Category distribution:`, categoryCounts);
                
                // Check for overlapping states in time
                const stateTransitions = [];
                for (let i = 1; i < categories.length; i++) {
                    if (categories[i] !== categories[i-1]) {
                        stateTransitions.push({
                            time: timestamps[i],
                            fromState: categories[i-1],
                            toState: categories[i],
                            fromValue: contractingValues[i-1],
                            toValue: contractingValues[i]
                        });
                    }
                }
                
                console.log(`State transitions: ${stateTransitions.length}`);
                
                // Show first few transitions
                if (stateTransitions.length > 0) {
                    console.log(`First 5 transitions:`);
                    stateTransitions.slice(0, 5).forEach((transition, index) => {
                        const stateNames = { 1: 'Undercontracted', 2: 'Balanced', 3: 'Overcontracted' };
                        console.log(`  ${index + 1}. ${transition.time}: ${stateNames[transition.fromState]} (${transition.fromValue.toFixed(2)}) → ${stateNames[transition.toState]} (${transition.toValue.toFixed(2)})`);
                    });
                }
                
                // Check for rapid state changes (potential overlapping)
                const rapidChanges = stateTransitions.filter(transition => {
                    const timeDiff = new Date(transition.time) - new Date(timestamps[timestamps.indexOf(transition.time) - 1]);
                    return timeDiff <= 60 * 60 * 1000; // 1 hour or less
                });
                
                if (rapidChanges.length > 0) {
                    console.log(`⚠️  Found ${rapidChanges.length} rapid state changes (≤1 hour):`);
                    rapidChanges.slice(0, 3).forEach((change, index) => {
                        const stateNames = { 1: 'Undercontracted', 2: 'Balanced', 3: 'Overcontracted' };
                        console.log(`  ${index + 1}. ${change.time}: ${stateNames[change.fromState]} → ${stateNames[change.toState]}`);
                    });
                }
                
                // Run full analysis
                const analysis = optimizer.analyze(contractingValues, method, {});
                
                if (analysis.success) {
                    console.log(`✅ Analysis successful`);
                    console.log(`  Observed states: ${analysis.stateCounts}`);
                    console.log(`  Viterbi states: ${analysis.viterbiStateCounts}`);
                    
                    // Check for inconsistencies between observed and Viterbi
                    const inconsistencies = [];
                    for (let i = 0; i < analysis.contractingStates.length; i++) {
                        if (analysis.contractingStates[i] !== analysis.viterbiPath[i]) {
                            inconsistencies.push({
                                index: i,
                                time: timestamps[i],
                                observed: analysis.contractingStates[i],
                                viterbi: analysis.viterbiPath[i],
                                value: contractingValues[i]
                            });
                        }
                    }
                    
                    console.log(`  Inconsistencies: ${inconsistencies.length}/${analysis.contractingStates.length} (${(inconsistencies.length/analysis.contractingStates.length*100).toFixed(1)}%)`);
                    
                    if (inconsistencies.length > 0) {
                        console.log(`  Sample inconsistencies:`);
                        inconsistencies.slice(0, 3).forEach((inc, index) => {
                            const stateNames = { 1: 'Undercontracted', 2: 'Balanced', 3: 'Overcontracted' };
                            console.log(`    ${index + 1}. ${inc.time}: Observed=${stateNames[inc.observed]}, Viterbi=${stateNames[inc.viterbi]}, Value=${inc.value.toFixed(2)}`);
                        });
                    }
                } else {
                    console.log(`❌ Analysis failed: ${analysis.error}`);
                }
                
            } catch (error) {
                console.log(`❌ ${method} categorization failed: ${error.message}`);
            }
        }
        
        // Check for duplicate timestamps
        console.log(`\n🔍 CHECKING FOR DUPLICATE TIMESTAMPS`);
        console.log('-'.repeat(40));
        
        const timestampCounts = {};
        timestamps.forEach(timestamp => {
            timestampCounts[timestamp] = (timestampCounts[timestamp] || 0) + 1;
        });
        
        const duplicates = Object.entries(timestampCounts).filter(([timestamp, count]) => count > 1);
        
        if (duplicates.length > 0) {
            console.log(`⚠️  Found ${duplicates.length} duplicate timestamps:`);
            duplicates.slice(0, 5).forEach(([timestamp, count]) => {
                console.log(`  ${timestamp}: ${count} occurrences`);
            });
        } else {
            console.log(`✅ No duplicate timestamps found`);
        }
        
        // Check for data aggregation issues
        console.log(`\n🔍 CHECKING DATA AGGREGATION`);
        console.log('-'.repeat(40));
        
        const hourlyGroups = {};
        timestamps.forEach((timestamp, index) => {
            const hour = timestamp.split(':')[0] + ':00:00';
            if (!hourlyGroups[hour]) {
                hourlyGroups[hour] = [];
            }
            hourlyGroups[hour].push({
                index,
                timestamp,
                value: contractingValues[index]
            });
        });
        
        const multiValueHours = Object.entries(hourlyGroups).filter(([hour, records]) => records.length > 1);
        
        if (multiValueHours.length > 0) {
            console.log(`⚠️  Found ${multiValueHours.length} hours with multiple values:`);
            multiValueHours.slice(0, 3).forEach(([hour, records]) => {
                console.log(`  ${hour}: ${records.length} values`);
                records.forEach(record => {
                    console.log(`    ${record.timestamp}: ${record.value.toFixed(2)} MW`);
                });
            });
        } else {
            console.log(`✅ All hours have single values`);
        }
        
        console.log('\n✅ STATE TRACING COMPLETE');
        
    } catch (error) {
        console.error('❌ Error tracing states:', error);
    }
}

traceContractingStates().catch(console.error); 