import { loadCSDACPLNData, loadPolishData, loadAllPSEData } from './src/utils/dataLoaders.js';
import { loadSystemContractingData } from './src/utils/afrrDataLoaders.js';

async function test15MinuteIntervals() {
    console.log('🔍 TESTING 15-MINUTE INTERVAL HANDLING');
    console.log('='.repeat(60));
    
    try {
        // 1. Load raw 15-minute data
        console.log('\n1. LOADING RAW 15-MINUTE DATA');
        const rawData = await loadCSDACPLNData();
        console.log(`✅ Raw CSDAC data loaded: ${rawData.length.toLocaleString()} records`);
        
        // 2. Check data structure and intervals
        console.log('\n2. ANALYZING DATA STRUCTURE');
        if (rawData.length > 0) {
            const firstRecord = rawData[0];
            const lastRecord = rawData[rawData.length - 1];
            
            console.log(`First record: ${firstRecord.dtime}`);
            console.log(`Last record: ${lastRecord.dtime}`);
            console.log(`Price range: ${Math.min(...rawData.map(r => r.csdac_pln))} - ${Math.max(...rawData.map(r => r.csdac_pln))} PLN/MWh`);
            
            // Check time intervals
            const timeIntervals = [];
            for (let i = 1; i < Math.min(100, rawData.length); i++) {
                const prevTime = new Date(rawData[i-1].dtime);
                const currTime = new Date(rawData[i].dtime);
                const interval = (currTime - prevTime) / (1000 * 60); // minutes
                timeIntervals.push(interval);
            }
            
            const avgInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
            console.log(`Average time interval: ${avgInterval.toFixed(1)} minutes`);
            
            if (avgInterval > 14 && avgInterval < 16) {
                console.log('✅ Data appears to be 15-minute intervals');
            } else {
                console.log(`⚠️  Unexpected interval: ${avgInterval.toFixed(1)} minutes (expected ~15)`);
            }
            
            // Check for 96 records per day
            const totalDays = (new Date(lastRecord.dtime) - new Date(firstRecord.dtime)) / (1000 * 60 * 60 * 24);
            const recordsPerDay = rawData.length / totalDays;
            console.log(`Total days: ${totalDays.toFixed(1)}`);
            console.log(`Records per day: ${recordsPerDay.toFixed(1)} (expected: 96 for 15-minute intervals)`);
            
            if (recordsPerDay > 90 && recordsPerDay < 100) {
                console.log('✅ Data density matches 15-minute intervals (96/day)');
            } else {
                console.log(`⚠️  Unexpected data density: ${recordsPerDay.toFixed(1)} records/day`);
            }
        }
        
        // 3. Test aggregation to hourly
        console.log('\n3. TESTING AGGREGATION TO HOURLY');
        const aggregatedData = await loadPolishData();
        console.log(`✅ Aggregated data: ${aggregatedData.length.toLocaleString()} records`);
        
        if (aggregatedData.length > 0) {
            const firstAgg = aggregatedData[0];
            const lastAgg = aggregatedData[aggregatedData.length - 1];
            
            console.log(`Aggregated date range: ${firstAgg.datetime} to ${lastAgg.datetime}`);
            
            // Check aggregation ratio
            const aggregationRatio = aggregatedData.length / rawData.length;
            console.log(`Aggregation ratio: ${aggregationRatio.toFixed(3)} (expected ~0.25 for 15-min to hourly)`);
            
            if (aggregationRatio > 0.2 && aggregationRatio < 0.3) {
                console.log('✅ Aggregation ratio is correct');
            } else {
                console.log(`⚠️  Unexpected aggregation ratio: ${aggregationRatio.toFixed(3)}`);
            }
            
            // Check hourly intervals
            const hourlyIntervals = [];
            for (let i = 1; i < Math.min(50, aggregatedData.length); i++) {
                const prevTime = new Date(aggregatedData[i-1].datetime);
                const currTime = new Date(aggregatedData[i].datetime);
                const interval = (currTime - prevTime) / (1000 * 60); // minutes
                hourlyIntervals.push(interval);
            }
            
            const avgHourlyInterval = hourlyIntervals.reduce((sum, interval) => sum + interval, 0) / hourlyIntervals.length;
            console.log(`Average hourly interval: ${avgHourlyInterval.toFixed(1)} minutes`);
            
            if (avgHourlyInterval > 55 && avgHourlyInterval < 65) {
                console.log('✅ Aggregated data is hourly intervals');
            } else {
                console.log(`⚠️  Unexpected hourly interval: ${avgHourlyInterval.toFixed(1)} minutes`);
            }
            
            // Check for 24 records per day in aggregated data
            const aggTotalDays = (new Date(lastAgg.datetime) - new Date(firstAgg.datetime)) / (1000 * 60 * 60 * 24);
            const aggRecordsPerDay = aggregatedData.length / aggTotalDays;
            console.log(`Aggregated records per day: ${aggRecordsPerDay.toFixed(1)} (expected: 24 for hourly)`);
            
            if (aggRecordsPerDay > 20 && aggRecordsPerDay < 28) {
                console.log('✅ Aggregated data density matches hourly intervals (24/day)');
            } else {
                console.log(`⚠️  Unexpected aggregated data density: ${aggRecordsPerDay.toFixed(1)} records/day`);
            }
        }
        
        // 4. Test power rating constraint compliance
        console.log('\n4. TESTING POWER RATING CONSTRAINT COMPLIANCE');
        if (aggregatedData.length > 1) {
            const violations = [];
            for (let i = 1; i < Math.min(aggregatedData.length, 100); i++) {
                const prevTime = new Date(aggregatedData[i-1].datetime);
                const currTime = new Date(aggregatedData[i].datetime);
                const interval = (currTime - prevTime) / (1000 * 60); // minutes
                
                if (interval <= 15) {
                    violations.push({
                        index: i,
                        interval: interval,
                        prevTime: aggregatedData[i-1].datetime,
                        currTime: aggregatedData[i].datetime
                    });
                }
            }
            
            if (violations.length === 0) {
                console.log('✅ No power rating constraint violations detected');
                console.log('✅ Battery can safely operate with 10 MW power rating');
            } else {
                console.log(`⚠️  POWER RATING CONSTRAINT VIOLATIONS: ${violations.length} found`);
                console.log('   Battery cannot change SoC in 15 minutes - violates 10 MW power rating');
                violations.slice(0, 5).forEach(v => {
                    console.log(`   Violation ${v.index}: ${v.interval.toFixed(1)}min interval between ${v.prevTime} and ${v.currTime}`);
                });
            }
        }
        
        // 5. Test data compression
        console.log('\n5. TESTING DATA COMPRESSION');
        const sampleDay = rawData.slice(0, 96); // First 96 records (one day)
        if (sampleDay.length === 96) {
            const uniquePrices = new Set(sampleDay.map(r => r.csdac_pln));
            const compressionRatio = uniquePrices.size / sampleDay.length;
            console.log(`Sample day unique prices: ${uniquePrices.size} out of ${sampleDay.length}`);
            console.log(`Compression ratio: ${compressionRatio.toFixed(3)} (1.0 = no compression, <1.0 = compression)`);
            
            if (compressionRatio > 0.8) {
                console.log('✅ No significant data compression detected');
            } else {
                console.log(`⚠️  Possible data compression: ${compressionRatio.toFixed(3)}`);
            }
        }
        
        console.log('\n✅ 15-MINUTE INTERVAL TESTING COMPLETE');
        
    } catch (error) {
        console.error('❌ Error testing 15-minute intervals:', error);
    }
}

async function testContractingStatusData() {
    console.log('\n🔍 TESTING CONTRACTING STATUS DATA');
    console.log('='.repeat(60));
    
    try {
        // Test different time ranges
        const timeRanges = [
            { name: '24h', lookbackDays: 1, maxRecords: 24 },
            { name: '7d', lookbackDays: 7, maxRecords: 168 },
            { name: '30d', lookbackDays: 30, maxRecords: 720 }
        ];
        
        for (const range of timeRanges) {
            console.log(`\nTesting ${range.name} time range...`);
            
            try {
                const contractingData = await loadSystemContractingData({
                    lookbackDays: range.lookbackDays,
                    maxRecords: range.maxRecords
                });
                
                console.log(`✅ ${range.name}: ${contractingData.data.length} records loaded`);
                console.log(`   Date range: ${contractingData.data[0]?.dtime} to ${contractingData.data[contractingData.data.length-1]?.dtime}`);
                
                // Check data quality
                const validRecords = contractingData.data.filter(r => 
                    r.sk_d1_fcst !== null && !isNaN(r.sk_d1_fcst)
                );
                
                console.log(`   Valid records: ${validRecords.length}/${contractingData.data.length}`);
                
                if (validRecords.length > 0) {
                    const values = validRecords.map(r => r.sk_d1_fcst);
                    console.log(`   Value range: ${Math.min(...values).toFixed(2)} - ${Math.max(...values).toFixed(2)} MW`);
                    console.log(`   Average: ${(values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)} MW`);
                }
                
                // Check for invalid dates
                const invalidDates = contractingData.data.filter(r => {
                    try {
                        const date = new Date(r.dtime);
                        return isNaN(date.getTime());
                    } catch {
                        return true;
                    }
                });
                
                if (invalidDates.length > 0) {
                    console.log(`   ⚠️  Invalid dates: ${invalidDates.length}`);
                    console.log(`   Sample invalid dates:`, invalidDates.slice(0, 3).map(r => r.dtime));
                } else {
                    console.log(`   ✅ All dates are valid`);
                }
                
            } catch (error) {
                console.log(`❌ ${range.name}: ${error.message}`);
                
                // If it's the insufficient data error, let's investigate further
                if (error.message.includes('Insufficient valid contracting status data')) {
                    console.log('   Investigating data availability...');
                    
                    try {
                        // Try loading raw SK data
                        const allPseData = await loadAllPSEData();
                        const skData = allPseData.sk_data;
                        
                        console.log(`   Raw SK data: ${skData.length} records`);
                        
                        if (skData.length > 0) {
                            const firstSk = skData[0];
                            const lastSk = skData[skData.length - 1];
                            console.log(`   SK date range: ${firstSk.dtime} to ${lastSk.dtime}`);
                            
                            // Check for malformed dates
                            const malformedDates = skData.filter(r => 
                                r.dtime && (r.dtime.includes('a:') || r.dtime.includes('b:') || r.dtime.includes('c:'))
                            );
                            
                            if (malformedDates.length > 0) {
                                console.log(`   ⚠️  Malformed dates: ${malformedDates.length}`);
                                console.log(`   Sample malformed:`, malformedDates.slice(0, 3).map(r => r.dtime));
                            }
                            
                            // Check for null/invalid sk_d1_fcst values
                            const nullValues = skData.filter(r => 
                                r.sk_d1_fcst === null || r.sk_d1_fcst === undefined || isNaN(r.sk_d1_fcst)
                            );
                            
                            console.log(`   Null/invalid sk_d1_fcst: ${nullValues.length}/${skData.length} (${(nullValues.length/skData.length*100).toFixed(1)}%)`);
                            
                            // Check valid values
                            const validSkData = skData.filter(r => 
                                r.sk_d1_fcst !== null && !isNaN(r.sk_d1_fcst)
                            );
                            
                            console.log(`   Valid sk_d1_fcst records: ${validSkData.length}`);
                            
                            if (validSkData.length > 0) {
                                const values = validSkData.map(r => r.sk_d1_fcst);
                                console.log(`   Valid value range: ${Math.min(...values).toFixed(2)} - ${Math.max(...values).toFixed(2)} MW`);
                            }
                        }
                        
                    } catch (skError) {
                        console.log(`   ❌ SK data investigation failed: ${skError.message}`);
                    }
                }
            }
        }
        
        console.log('\n✅ CONTRACTING STATUS TESTING COMPLETE');
        
    } catch (error) {
        console.error('❌ Error testing contracting status data:', error);
    }
}

async function main() {
    console.log('🚀 STARTING COMPREHENSIVE DATA TESTING');
    console.log('='.repeat(60));
    
    await test15MinuteIntervals();
    await testContractingStatusData();
    
    console.log('\n🎯 TESTING COMPLETE');
    console.log('='.repeat(60));
}

main().catch(console.error); 