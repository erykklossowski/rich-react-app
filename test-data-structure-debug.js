// Test script to debug data structure mismatch
import { loadPolishData, filterDataByDateRange, groupDataByPeriod } from './src/utils/dataLoaders.js';

async function debugDataStructure() {
    console.log('🔍 DATA STRUCTURE DEBUG\n');
    console.log('='.repeat(80));
    
    try {
        // 1. Load data
        console.log('1. Loading Polish data...');
        const polishData = await loadPolishData();
        console.log(`✅ Loaded ${polishData.length} records`);
        
        // 2. Show sample data structure
        console.log('\n2. Sample data structure:');
        console.log('First 3 records:');
        polishData.slice(0, 3).forEach((record, i) => {
            console.log(`Record ${i + 1}:`, {
                datetime: record.datetime,
                price: record.price,
                has_csdac_pln: 'csdac_pln' in record,
                has_price: 'price' in record,
                keys: Object.keys(record)
            });
        });
        
        // 3. Filter data
        console.log('\n3. Filtering data...');
        const startDate = '2024-06-14';
        const endDate = '2025-07-18';
        const filteredData = filterDataByDateRange(polishData, startDate, endDate);
        console.log(`✅ Filtered to ${filteredData.length} records`);
        
        // 4. Group data
        console.log('\n4. Grouping data by month...');
        const groups = groupDataByPeriod(filteredData, 'monthly');
        const groupKeys = Object.keys(groups).sort();
        console.log(`✅ Created ${groupKeys.length} monthly groups`);
        
        // 5. Check first group structure
        if (groupKeys.length > 0) {
            const firstKey = groupKeys[0];
            const firstGroup = groups[firstKey];
            console.log(`\n5. First group (${firstKey}) structure:`);
            console.log(`Records: ${firstGroup.length}`);
            
            console.log('\nSample records from first group:');
            firstGroup.slice(0, 3).forEach((record, i) => {
                console.log(`Record ${i + 1}:`, {
                    datetime: record.datetime,
                    price: record.price,
                    has_csdac_pln: 'csdac_pln' in record,
                    has_price: 'price' in record,
                    keys: Object.keys(record)
                });
            });
            
            // 6. Test price extraction
            console.log('\n6. Testing price extraction:');
            const prices1 = firstGroup.map(record => record.csdac_pln || record.price);
            const prices2 = firstGroup.map(record => record.price);
            const prices3 = firstGroup.map(record => record.csdac_pln);
            
            console.log(`Method 1 (csdac_pln || price): ${prices1.length} prices, range: ${Math.min(...prices1)} - ${Math.max(...prices1)}`);
            console.log(`Method 2 (price only): ${prices2.length} prices, range: ${Math.min(...prices2)} - ${Math.max(...prices2)}`);
            console.log(`Method 3 (csdac_pln only): ${prices3.length} prices, range: ${prices3.filter(p => p !== undefined).length > 0 ? Math.min(...prices3.filter(p => p !== undefined)) + ' - ' + Math.max(...prices3.filter(p => p !== undefined)) : 'undefined'}`);
            
            console.log('\nSample prices (Method 1):', prices1.slice(0, 10));
            console.log('Sample prices (Method 2):', prices2.slice(0, 10));
            console.log('Sample prices (Method 3):', prices3.slice(0, 10));
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugDataStructure(); 