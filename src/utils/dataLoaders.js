// Path: src/utils/dataLoaders.js

// GitHub URLs for Polish electricity market data
const CSDAC_PLN_URL = 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/csdac_pln.json';
const MBP_TP_URL = 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/mbp_tp.json';
const CMBP_TP_URL = 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/cmbp_tp.json';
const SK_DATA_URL = 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/sk_data.json';

// Generic data fetcher with error handling
const fetchDataFromGitHub = async (url, dataType) => {
    try {
        console.log(`Loading ${dataType} from:`, url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json,text/plain,*/*' }
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            if (response.status === 404) errorMsg += ' - File not found.';
            else if (response.status === 403) errorMsg += ' - Access forbidden.';
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`${dataType} data is empty or invalid format`);
        }

        console.log(`Successfully loaded ${data.length} records of ${dataType}`);
        return data;

    } catch (error) {
        console.error(`Error loading ${dataType}:`, error);
        throw error;
    }
};

// Load day-ahead prices (CSDAC PLN)
export const loadCSDACPLNData = async () => {
    return await fetchDataFromGitHub(CSDAC_PLN_URL, 'CSDAC PLN prices');
};

// Load all PSE data sources
export const loadAllPSEData = async () => {
    try {
        console.log('Loading all PSE data sources...');
        
        const [csdacData, mbpData, cmbpData, skData] = await Promise.all([
            loadCSDACPLNData(),
            fetchDataFromGitHub(MBP_TP_URL, 'MBP TP volumes'),
            fetchDataFromGitHub(CMBP_TP_URL, 'CMBP TP prices'),
            fetchDataFromGitHub(SK_DATA_URL, 'SK contracting status')
        ]);

        return {
            csdac_pln: csdacData,
            mbp_tp: mbpData,
            cmbp_tp: cmbpData,
            sk_data: skData
        };

    } catch (error) {
        console.error('Error loading PSE data:', error);
        throw error;
    }
};

// Main function for loading Polish data - aggregates 15-minute data to hourly
export const loadPolishData = async () => {
    try {
        console.log('Loading CSDAC PLN data as Polish data (hourly aggregation)...');
        const csdacData = await loadCSDACPLNData();
        
        // Aggregate 15-minute data to hourly data for battery optimization
        const hourlyData = aggregateToHourly(csdacData);
        
        console.log(`Aggregated ${csdacData.length} 15-minute records to ${hourlyData.length} hourly records`);
        
        // Transform to match the expected format
        return hourlyData.map(record => ({
            datetime: record.dtime,
            price: record.csdac_pln,
            dtime_utc: record.dtime_utc,
            business_date: record.business_date,
            period: record.period
        }));

    } catch (error) {
        console.error('Error loading Polish data:', error);
        throw error;
    }
};

// Aggregates 15-min resolution data into hourly averages
const aggregateToHourly = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.log('No data to aggregate');
        return [];
    }

    console.log(`Starting aggregation of ${data.length} 15-minute records to hourly`);
    
    // Group records by hour
    const hourlyGroups = {};
    let processedRecords = 0;
    let skippedRecords = 0;
    
    data.forEach(record => {
        try {
            // Validate record
            if (!record.dtime || !record.csdac_pln || isNaN(record.csdac_pln)) {
                skippedRecords++;
                return;
            }
            
            const date = new Date(record.dtime);
            
            // Validate date
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date in record: ${record.dtime}`);
                skippedRecords++;
                return;
            }
            
            // Create a key for each hour (YYYY-MM-DD HH)
            const hourKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}`;
            
            if (!hourlyGroups[hourKey]) {
                hourlyGroups[hourKey] = [];
            }
            hourlyGroups[hourKey].push(record.csdac_pln);
            processedRecords++;
            
        } catch (error) {
            console.warn(`Error processing record: ${error.message}`, record);
            skippedRecords++;
        }
    });
    
    console.log(`Processed ${processedRecords} records, skipped ${skippedRecords} records`);
    
    // Calculate hourly averages
    const hourlyData = [];
    let completeHours = 0;
    let incompleteHours = 0;
    
    for (const hourKey in hourlyGroups) {
        const prices = hourlyGroups[hourKey];
        if (prices.length === 4) { // Only aggregate if we have all 4 quarters
            const avgPrice = prices.reduce((a, b) => a + b, 0) / 4;
            hourlyData.push({
                dtime: `${hourKey}:00:00`,
                dtime_utc: new Date(`${hourKey}:00:00`).toISOString(),
                business_date: hourKey.split(' ')[0],
                period: parseInt(hourKey.split(' ')[1]),
                csdac_pln: avgPrice,
                price_count: 4
            });
            completeHours++;
        } else {
            incompleteHours++;
            console.warn(`Skipping incomplete hour ${hourKey}: ${prices.length}/4 quarters`);
        }
    }
    
    // Sort by time
    hourlyData.sort((a, b) => new Date(a.dtime) - new Date(b.dtime));
    
    console.log(`Aggregation complete: ${hourlyData.length} hourly records created`);
    console.log(`Complete hours: ${completeHours}, Incomplete hours: ${incompleteHours}`);
    
    if (hourlyData.length > 0) {
        console.log(`Date range: ${hourlyData[0]?.dtime} to ${hourlyData[hourlyData.length-1]?.dtime}`);
    }
    
    return hourlyData;
};