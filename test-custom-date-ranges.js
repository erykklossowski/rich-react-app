import { loadSystemContractingData } from './src/utils/afrrDataLoaders.js';

async function testCustomDateRanges() {
    console.log('🔍 TESTING CUSTOM DATE RANGES FOR CONTRACTING STATUS');
    console.log('='.repeat(60));
    
    const testRanges = [
        { name: '1 Day', startDate: '2025-07-17', endDate: '2025-07-18' },
        { name: '5 Days', startDate: '2025-07-13', endDate: '2025-07-18' },
        { name: '7 Days', startDate: '2025-07-11', endDate: '2025-07-18' },
        { name: '30 Days', startDate: '2025-06-18', endDate: '2025-07-18' },
        { name: '90 Days', startDate: '2025-04-19', endDate: '2025-07-18' },
        { name: 'Custom Range 1', startDate: '2024-12-01', endDate: '2024-12-31' },
        { name: 'Custom Range 2', startDate: '2025-01-01', endDate: '2025-01-31' },
        { name: 'Custom Range 3', startDate: '2025-03-01', endDate: '2025-03-31' }
    ];
    
    for (const range of testRanges) {
        console.log(`\nTesting ${range.name}: ${range.startDate} to ${range.endDate}`);
        
        try {
            const contractingData = await loadSystemContractingData({
                startDate: range.startDate,
                endDate: range.endDate,
                maxRecords: 10000
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
                
                // Calculate days covered
                const startDate = new Date(contractingData.data[0].dtime);
                const endDate = new Date(contractingData.data[contractingData.data.length-1].dtime);
                const daysCovered = (endDate - startDate) / (1000 * 60 * 60 * 24);
                console.log(`   Days covered: ${daysCovered.toFixed(1)} days`);
                console.log(`   Records per day: ${(validRecords.length / daysCovered).toFixed(1)} (expected ~24 for hourly)`);
            }
            
        } catch (error) {
            console.log(`❌ ${range.name}: ${error.message}`);
        }
    }
    
    console.log('\n✅ CUSTOM DATE RANGE TESTING COMPLETE');
}

testCustomDateRanges().catch(console.error); 