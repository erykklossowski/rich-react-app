import fetch from 'node-fetch';

// Configuration for aFRR data sources
const AFRR_CONFIG = {
    dataSources: {
        csdac: 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/csdac_pln.json',
        mbp: 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/mbp_tp.json',
        cmbp: 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/cmbp_tp.json',
        sk: 'https://raw.githubusercontent.com/erykklossowski/polish-electricity-market-data/main/data/sk.json'
    },
    fallbackData: {
        // Mock data for testing when GitHub is unavailable
        csdac: [
            { dtime: '2024-06-14 00:15:00', csdac_pln: 150.5, period: '00:15 - 00:30', business_date: '2024-06-14' },
            { dtime: '2024-06-14 00:30:00', csdac_pln: 160.2, period: '00:30 - 00:45', business_date: '2024-06-14' },
            { dtime: '2024-06-14 00:45:00', csdac_pln: 140.8, period: '00:45 - 01:00', business_date: '2024-06-14' },
            { dtime: '2024-06-14 01:00:00', csdac_pln: 180.3, period: '01:00 - 01:15', business_date: '2024-06-14' },
            { dtime: '2024-06-14 01:15:00', csdac_pln: 170.1, period: '01:15 - 01:30', business_date: '2024-06-14' }
        ],
        sk: [
            { dtime: '2024-06-14 00:15:00', sk_d1_fcst: 45.67, period: '00:15 - 00:30', business_date: '2024-06-14' },
            { dtime: '2024-06-14 00:30:00', sk_d1_fcst: -23.45, period: '00:30 - 00:45', business_date: '2024-06-14' },
            { dtime: '2024-06-14 00:45:00', sk_d1_fcst: 67.89, period: '00:45 - 01:00', business_date: '2024-06-14' },
            { dtime: '2024-06-14 01:00:00', sk_d1_fcst: -12.34, period: '01:00 - 01:15', business_date: '2024-06-14' },
            { dtime: '2024-06-14 01:15:00', sk_d1_fcst: 89.12, period: '01:15 - 01:30', business_date: '2024-06-14' }
        ]
    }
};

// Fetch data from GitHub repository
async function fetchDataFromGitHub(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`Failed to fetch from GitHub: ${url}`, error.message);
        return null;
    }
}

// Load CSDAC PLN data (day-ahead prices)
export async function loadCSDACPLNData() {
    console.log('Loading CSDAC PLN prices from:', AFRR_CONFIG.dataSources.csdac);
    
    const data = await fetchDataFromGitHub(AFRR_CONFIG.dataSources.csdac);
    
    if (data) {
        console.log(`Loaded ${data.length} CSDAC PLN records`);
        return data;
    } else {
        console.log('Using fallback CSDAC PLN data');
        return AFRR_CONFIG.fallbackData.csdac;
    }
}

// Load system contracting status data
export async function loadSystemContractingData(options = {}) {
    const { startDate, endDate, maxRecords = 1000 } = options;
    
    console.log('Loading system contracting status data...');
    
    const data = await fetchDataFromGitHub(AFRR_CONFIG.dataSources.sk);
    
    if (data) {
        console.log(`Loaded ${data.length} system contracting records`);
        
        // Filter by date range if specified
        let filteredData = data;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredData = data.filter(record => {
                const recordDate = new Date(record.dtime);
                return recordDate >= start && recordDate <= end;
            });
        }
        
        // Limit records if specified
        if (maxRecords && filteredData.length > maxRecords) {
            filteredData = filteredData.slice(-maxRecords);
        }
        
        return {
            data: filteredData,
            totalRecords: data.length,
            filteredRecords: filteredData.length
        };
    } else {
        console.log('Using fallback system contracting data');
        return {
            data: AFRR_CONFIG.fallbackData.sk,
            totalRecords: AFRR_CONFIG.fallbackData.sk.length,
            filteredRecords: AFRR_CONFIG.fallbackData.sk.length
        };
    }
}

// Load comprehensive market data
export async function loadComprehensiveMarketData(options = {}) {
    const { startDate, endDate } = options;
    
    console.log('Loading comprehensive market data...');
    
    try {
        const [csdacData, skData] = await Promise.all([
            loadCSDACPLNData(),
            loadSystemContractingData({ startDate, endDate })
        ]);
        
        // Align data by timestamp
        const alignedData = [];
        const csdacMap = new Map();
        
        // Create map of CSDAC data by timestamp
        csdacData.forEach(record => {
            const timestamp = new Date(record.dtime).toISOString();
            csdacMap.set(timestamp, record);
        });
        
        // Align SK data with CSDAC data
        skData.data.forEach(skRecord => {
            const timestamp = new Date(skRecord.dtime).toISOString();
            const csdacRecord = csdacMap.get(timestamp);
            
            if (csdacRecord) {
                alignedData.push({
                    timestamp,
                    price: csdacRecord.csdac_pln,
                    contractingStatus: skRecord.sk_d1_fcst,
                    period: skRecord.period,
                    businessDate: skRecord.business_date
                });
            }
        });
        
        console.log(`Aligned ${alignedData.length} comprehensive market records`);
        
        return {
            data: alignedData,
            statistics: {
                priceRange: {
                    min: Math.min(...alignedData.map(d => d.price)),
                    max: Math.max(...alignedData.map(d => d.price)),
                    avg: alignedData.reduce((sum, d) => sum + d.price, 0) / alignedData.length
                },
                contractingRange: {
                    min: Math.min(...alignedData.map(d => d.contractingStatus)),
                    max: Math.max(...alignedData.map(d => d.contractingStatus)),
                    avg: alignedData.reduce((sum, d) => sum + d.contractingStatus, 0) / alignedData.length
                }
            }
        };
        
    } catch (error) {
        console.error('Error loading comprehensive market data:', error);
        throw error;
    }
}

// Extract contracting values for HMM analysis
export function extractContractingValues(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or empty data array');
    }
    
    const contractingValues = data.map(record => {
        if (record.contractingStatus !== undefined) {
            return record.contractingStatus;
        } else if (record.sk_d1_fcst !== undefined) {
            return record.sk_d1_fcst;
        } else {
            throw new Error('No contracting status field found in data');
        }
    });
    
    return {
        contractingValues,
        timestamps: data.map(record => record.timestamp || record.dtime),
        count: contractingValues.length
    };
}

// Get contracting statistics
export function getContractingStatistics(contractingValues) {
    if (!Array.isArray(contractingValues) || contractingValues.length === 0) {
        throw new Error('Invalid or empty contracting values array');
    }
    
    const sum = contractingValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / contractingValues.length;
    const variance = contractingValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / contractingValues.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        minimum: Math.min(...contractingValues),
        maximum: Math.max(...contractingValues),
        average: mean,
        standardDeviation: stdDev,
        count: contractingValues.length
    };
}

// Get last 24 hours of data
export function getLast24Hours(data, hours = 24) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or empty data array');
    }
    
    const recordsPerHour = Math.ceil(data.length / (data.length > 96 ? 96 : 24)); // Assume 96 points for 24 hours
    const lastRecords = data.slice(-hours * recordsPerHour);
    
    return {
        data: lastRecords,
        contractingValues: extractContractingValues(lastRecords).contractingValues,
        count: lastRecords.length
    };
} 