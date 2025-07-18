// Simulate the React component rendering logic to find where NaN values are introduced

function simulateRevenueChartRendering(results) {
    console.log('🔍 Simulating RevenueChart Rendering\n');
    
    if (!results || results.length === 0) {
        console.log('❌ No results provided');
        return;
    }
    
    console.log(`📊 Input results: ${results.length} items`);
    
    // Step 1: Check input data
    console.log('\n1. CHECKING INPUT DATA:');
    console.log('='.repeat(50));
    
    results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.period}:`);
        console.log(`      totalRevenue: ${result.totalRevenue} (type: ${typeof result.totalRevenue})`);
        console.log(`      totalEnergyDischarged: ${result.totalEnergyDischarged} (type: ${typeof result.totalEnergyDischarged})`);
        console.log(`      dataPoints: ${result.dataPoints} (type: ${typeof result.dataPoints})`);
        
        if (isNaN(result.totalRevenue)) {
            console.log(`      ❌ WARNING: totalRevenue is NaN!`);
        }
        if (isNaN(result.totalEnergyDischarged)) {
            console.log(`      ❌ WARNING: totalEnergyDischarged is NaN!`);
        }
        if (isNaN(result.dataPoints)) {
            console.log(`      ❌ WARNING: dataPoints is NaN!`);
        }
    });
    
    // Step 2: Sort results (like RevenueChart does)
    console.log('\n2. SORTING RESULTS:');
    console.log('='.repeat(50));
    
    const sortedResults = [...results].sort((a, b) => {
        const dateA = new Date(a.periodStart || a.period);
        const dateB = new Date(b.periodStart || b.period);
        return dateA - dateB;
    });
    
    console.log(`Sorted periods: ${sortedResults.map(r => r.period).join(', ')}`);
    
    // Step 3: Calculate summary statistics (like RevenueChart does)
    console.log('\n3. CALCULATING SUMMARY STATISTICS:');
    console.log('='.repeat(50));
    
    const totalRevenue = sortedResults.reduce((sum, r) => {
        console.log(`   Adding ${r.totalRevenue} to sum ${sum}`);
        return sum + r.totalRevenue;
    }, 0);
    
    const avgRevenue = totalRevenue / sortedResults.length;
    const maxRevenue = Math.max(...sortedResults.map(r => r.totalRevenue));
    const minRevenue = Math.min(...sortedResults.map(r => r.totalRevenue));
    
    console.log(`Total Revenue: ${totalRevenue} (type: ${typeof totalRevenue})`);
    console.log(`Average Revenue: ${avgRevenue} (type: ${typeof avgRevenue})`);
    console.log(`Max Revenue: ${maxRevenue} (type: ${typeof maxRevenue})`);
    console.log(`Min Revenue: ${minRevenue} (type: ${typeof minRevenue})`);
    
    // Check for NaN in calculations
    if (isNaN(totalRevenue)) {
        console.log('❌ WARNING: totalRevenue calculation resulted in NaN!');
    }
    if (isNaN(avgRevenue)) {
        console.log('❌ WARNING: avgRevenue calculation resulted in NaN!');
    }
    if (isNaN(maxRevenue)) {
        console.log('❌ WARNING: maxRevenue calculation resulted in NaN!');
    }
    if (isNaN(minRevenue)) {
        console.log('❌ WARNING: minRevenue calculation resulted in NaN!');
    }
    
    // Step 4: Prepare chart data (like RevenueChart does)
    console.log('\n4. PREPARING CHART DATA:');
    console.log('='.repeat(50));
    
    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 
                       'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    
    const chartData = {
        labels: sortedResults.map(r => {
            const [year, month] = r.period.split('-');
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        }),
        datasets: [{
            label: 'Revenue (PLN)',
            data: sortedResults.map(r => r.totalRevenue),
            backgroundColor: sortedResults.map(r => 
                r.totalRevenue > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
            ),
            borderColor: sortedResults.map(r => 
                r.totalRevenue > 0 ? '#22c55e' : '#ef4444'
            ),
            borderWidth: 2,
            borderRadius: 4,
        }]
    };
    
    console.log(`Chart labels: ${chartData.labels.join(', ')}`);
    console.log(`Chart data: ${chartData.datasets[0].data.join(', ')}`);
    
    // Check for NaN in chart data
    const nanInChartData = chartData.datasets[0].data.some(d => isNaN(d));
    if (nanInChartData) {
        console.log('❌ WARNING: NaN values found in chart data!');
    }
    
    // Step 5: Format currency (like RevenueChart does)
    console.log('\n5. FORMATTING CURRENCY:');
    console.log('='.repeat(50));
    
    const formatPLN = (amount) => {
        if (isNaN(amount)) {
            console.log(`   ❌ WARNING: Trying to format NaN amount: ${amount}`);
            return 'NaN zł';
        }
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
    
    console.log(`Formatted Total Revenue: ${formatPLN(totalRevenue)}`);
    console.log(`Formatted Average Revenue: ${formatPLN(avgRevenue)}`);
    console.log(`Formatted Best Period: ${formatPLN(maxRevenue)}`);
    console.log(`Formatted Worst Period: ${formatPLN(minRevenue)}`);
    
    // Step 6: Table data (like RevenueChart does)
    console.log('\n6. TABLE DATA:');
    console.log('='.repeat(50));
    
    sortedResults.forEach((result, index) => {
        const formattedPeriod = chartData.labels[index];
        const formattedRevenue = formatPLN(result.totalRevenue);
        const formattedEnergy = result.totalEnergyDischarged?.toFixed(1) || 'N/A';
        const dataPoints = result.dataPoints || 'N/A';
        
        console.log(`   ${formattedPeriod}: ${formattedRevenue} | ${formattedEnergy} MWh | ${dataPoints} points`);
    });
    
    return {
        totalRevenue,
        avgRevenue,
        maxRevenue,
        minRevenue,
        chartData,
        hasNaN: isNaN(totalRevenue) || isNaN(avgRevenue) || isNaN(maxRevenue) || isNaN(minRevenue)
    };
}

// Test with sample data that should work
const sampleResults = [
    { period: '2024-06', totalRevenue: 167941.12, totalEnergyDischarged: 1234.5, dataPoints: 400 },
    { period: '2024-07', totalRevenue: 391360.93, totalEnergyDischarged: 2345.6, dataPoints: 744 },
    { period: '2024-08', totalRevenue: 367178.71, totalEnergyDischarged: 3456.7, dataPoints: 744 },
    { period: '2024-09', totalRevenue: 401346.49, totalEnergyDischarged: 4567.8, dataPoints: 720 },
    { period: '2024-10', totalRevenue: 352652.20, totalEnergyDischarged: 5678.9, dataPoints: 744 },
    { period: '2024-11', totalRevenue: 327734.29, totalEnergyDischarged: 6789.0, dataPoints: 720 },
    { period: '2024-12', totalRevenue: 39517.82, totalEnergyDischarged: 7890.1, dataPoints: 744 },
    { period: '2025-01', totalRevenue: 305373.64, totalEnergyDischarged: 8901.2, dataPoints: 744 },
    { period: '2025-02', totalRevenue: 123946.39, totalEnergyDischarged: 9012.3, dataPoints: 672 },
    { period: '2025-03', totalRevenue: 481630.58, totalEnergyDischarged: 10123.4, dataPoints: 744 },
    { period: '2025-04', totalRevenue: 385226.49, totalEnergyDischarged: 11234.5, dataPoints: 720 },
    { period: '2025-05', totalRevenue: 389824.90, totalEnergyDischarged: 12345.6, dataPoints: 744 },
    { period: '2025-06', totalRevenue: 376203.61, totalEnergyDischarged: 13456.7, dataPoints: 720 },
    { period: '2025-07', totalRevenue: 174208.99, totalEnergyDischarged: 14567.8, dataPoints: 426 }
];

console.log('🧪 TESTING WITH SAMPLE DATA:');
console.log('='.repeat(80));

const sampleResult = simulateRevenueChartRendering(sampleResults);

console.log('\n📋 SAMPLE TEST SUMMARY:');
console.log('='.repeat(50));
console.log(`Has NaN values: ${sampleResult.hasNaN}`);
console.log(`Total Revenue: ${sampleResult.totalRevenue}`);
console.log(`Average Revenue: ${sampleResult.avgRevenue}`);

// Test with data that has NaN values
console.log('\n\n🧪 TESTING WITH NaN DATA:');
console.log('='.repeat(80));

const nanResults = [
    { period: '2024-06', totalRevenue: NaN, totalEnergyDischarged: 1234.5, dataPoints: 400 },
    { period: '2024-07', totalRevenue: 391360.93, totalEnergyDischarged: 2345.6, dataPoints: 744 },
    { period: '2024-08', totalRevenue: 367178.71, totalEnergyDischarged: 3456.7, dataPoints: 744 },
    { period: '2024-09', totalRevenue: NaN, totalEnergyDischarged: 4567.8, dataPoints: 720 },
    { period: '2024-10', totalRevenue: 352652.20, totalEnergyDischarged: 5678.9, dataPoints: 744 },
    { period: '2024-11', totalRevenue: 327734.29, totalEnergyDischarged: 6789.0, dataPoints: 720 },
    { period: '2024-12', totalRevenue: 39517.82, totalEnergyDischarged: 7890.1, dataPoints: 744 },
    { period: '2025-01', totalRevenue: 305373.64, totalEnergyDischarged: 8901.2, dataPoints: 744 },
    { period: '2025-02', totalRevenue: 123946.39, totalEnergyDischarged: 9012.3, dataPoints: 672 },
    { period: '2025-03', totalRevenue: 481630.58, totalEnergyDischarged: 10123.4, dataPoints: 744 },
    { period: '2025-04', totalRevenue: NaN, totalEnergyDischarged: 11234.5, dataPoints: 720 },
    { period: '2025-05', totalRevenue: 389824.90, totalEnergyDischarged: 12345.6, dataPoints: 744 },
    { period: '2025-06', totalRevenue: NaN, totalEnergyDischarged: 13456.7, dataPoints: 720 },
    { period: '2025-07', totalRevenue: 174208.99, totalEnergyDischarged: 14567.8, dataPoints: 426 }
];

const nanResult = simulateRevenueChartRendering(nanResults);

console.log('\n📋 NaN TEST SUMMARY:');
console.log('='.repeat(50));
console.log(`Has NaN values: ${nanResult.hasNaN}`);
console.log(`Total Revenue: ${nanResult.totalRevenue}`);
console.log(`Average Revenue: ${nanResult.avgRevenue}`); 