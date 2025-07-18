// Path: src/utils/dataLoaders.js

// Import dynamic configuration
import { CSDAC_PLN_URL, MBP_TP_URL, CMBP_TP_URL, SK_DATA_URL, getDataConfig } from './dataConfig.js';

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

// Load reserve volumes (MBP TP)
export const loadMBPTPData = async () => {
    return await fetchDataFromGitHub(MBP_TP_URL, 'MBP TP volumes');
};

// Load reserve prices (CMBP TP)
export const loadCMBPTPData = async () => {
    return await fetchDataFromGitHub(CMBP_TP_URL, 'CMBP TP prices');
};

// Load system contracting status (SK data)
export const loadSKData = async () => {
    return await fetchDataFromGitHub(SK_DATA_URL, 'SK contracting status');
};

// Load all PSE data sources
export const loadAllPSEData = async () => {
    try {
        console.log('Loading all PSE data sources...');
        
        const [csdacData, mbpData, cmbpData, skData] = await Promise.all([
            loadCSDACPLNData(),
            loadMBPTPData(),
            loadCMBPTPData(),
            loadSKData()
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

// Legacy function for backward compatibility - now uses CSDAC PLN data aggregated to hourly
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

// Aggregate 15-minute data to hourly data
const aggregateToHourly = (data) => {
    const hourlyMap = new Map();
    
    data.forEach(record => {
        const date = new Date(record.dtime);
        // Round to the nearest hour
        const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0);
        
        // Use local time string to avoid timezone shift
        const hourKeyStr = hourKey.getFullYear() + '-' + 
                          String(hourKey.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(hourKey.getDate()).padStart(2, '0') + ' ' + 
                          String(hourKey.getHours()).padStart(2, '0') + ':00:00';
        
        if (!hourlyMap.has(hourKeyStr)) {
            hourlyMap.set(hourKeyStr, {
                dtime: hourKeyStr,
                dtime_utc: hourKey.toISOString(),
                business_date: record.business_date,
                period: date.getHours(),
                prices: [],
                count: 0
            });
        }
        
        const hourlyRecord = hourlyMap.get(hourKeyStr);
        hourlyRecord.prices.push(record.csdac_pln);
        hourlyRecord.count++;
    });
    
    // Calculate average price for each hour
    const hourlyData = Array.from(hourlyMap.values()).map(record => ({
        ...record,
        csdac_pln: record.prices.reduce((sum, price) => sum + price, 0) / record.prices.length,
        price_count: record.count
    }));
    
    // Sort by time
    hourlyData.sort((a, b) => new Date(a.dtime) - new Date(b.dtime));
    
    return hourlyData;
};

// Get aFRR specific data (combines volumes and prices)
export const loadAFRRData = async () => {
    try {
        console.log('Loading aFRR specific data...');
        
        const [mbpData, cmbpData] = await Promise.all([
            loadMBPTPData(),
            loadCMBPTPData()
        ]);

        // Combine MBP and CMBP data by matching timestamps
        const afrrData = [];
        const mbpMap = new Map();
        
        // Create lookup map for MBP data
        mbpData.forEach(record => {
            const key = record.dtime;
            if (!mbpMap.has(key)) {
                mbpMap.set(key, []);
            }
            mbpMap.get(key).push(record);
        });

        // Match with CMBP data
        cmbpData.forEach(cmbpRecord => {
            const mbpRecords = mbpMap.get(cmbpRecord.dtime);
            if (mbpRecords) {
                mbpRecords.forEach(mbpRecord => {
                    afrrData.push({
                        dtime: cmbpRecord.dtime,
                        dtime_utc: cmbpRecord.dtime_utc,
                        business_date: cmbpRecord.business_date,
                        period: cmbpRecord.onmb,
                        // Volumes from MBP
                        afrr_d_volume: mbpRecord.afrr_d,
                        afrr_g_volume: mbpRecord.afrr_g,
                        // Prices from CMBP
                        afrr_d_price: cmbpRecord.afrr_d,
                        afrr_g_price: cmbpRecord.afrr_g,
                        // Other reserves for context
                        fcr_d_volume: mbpRecord.fcr_d,
                        fcr_g_volume: mbpRecord.fcr_g,
                        fcr_d_price: cmbpRecord.fcr_d,
                        fcr_g_price: cmbpRecord.fcr_g,
                        mfrrd_d_volume: mbpRecord.mfrrd_d,
                        mfrrd_g_volume: mbpRecord.mfrrd_g,
                        mfrrd_d_price: cmbpRecord.mfrrd_d,
                        mfrrd_g_price: cmbpRecord.mfrrd_g
                    });
                });
            }
        });

        console.log(`Combined ${afrrData.length} aFRR data records`);
        return afrrData;

    } catch (error) {
        console.error('Error loading aFRR data:', error);
        throw error;
    }
};

// Get comprehensive market data for analysis
export const loadMarketData = async () => {
    try {
        console.log('Loading comprehensive market data...');
        
        const [csdacData, afrrData, skData] = await Promise.all([
            loadCSDACPLNData(),
            loadAFRRData(),
            loadSKData()
        ]);

        // Create a comprehensive dataset with all market information
        const marketData = [];
        const afrrMap = new Map();
        const skMap = new Map();

        // Create lookup maps with more flexible matching
        afrrData.forEach(record => {
            // Use both exact time and hour-based matching
            const exactKey = record.dtime;
            const hourKey = record.dtime.split(':')[0] + ':00:00'; // Extract hour
            
            if (!afrrMap.has(exactKey)) {
                afrrMap.set(exactKey, []);
            }
            if (!afrrMap.has(hourKey)) {
                afrrMap.set(hourKey, []);
            }
            
            afrrMap.get(exactKey).push(record);
            afrrMap.get(hourKey).push(record);
        });

        skData.forEach(record => {
            const exactKey = record.dtime;
            const hourKey = record.dtime.split(':')[0] + ':00:00';
            
            if (!skMap.has(exactKey)) {
                skMap.set(exactKey, []);
            }
            if (!skMap.has(hourKey)) {
                skMap.set(hourKey, []);
            }
            
            skMap.get(exactKey).push(record);
            skMap.get(hourKey).push(record);
        });

        // Combine all data sources with flexible matching
        csdacData.forEach(csdacRecord => {
            const exactKey = csdacRecord.dtime;
            const hourKey = csdacRecord.dtime.split(':')[0] + ':00:00';
            
            // Try exact match first, then hour-based match
            let afrrRecords = afrrMap.get(exactKey) || afrrMap.get(hourKey) || [];
            let skRecords = skMap.get(exactKey) || skMap.get(hourKey) || [];

            const marketRecord = {
                // Day-ahead price data
                dtime: csdacRecord.dtime,
                dtime_utc: csdacRecord.dtime_utc,
                business_date: csdacRecord.business_date,
                period: csdacRecord.period,
                csdac_pln: csdacRecord.csdac_pln,
                
                // aFRR data (take first match if multiple)
                afrr_d_volume: afrrRecords[0]?.afrr_d_volume || null,
                afrr_g_volume: afrrRecords[0]?.afrr_g_volume || null,
                afrr_d_price: afrrRecords[0]?.afrr_d_price || null,
                afrr_g_price: afrrRecords[0]?.afrr_g_price || null,
                
                // System contracting status (take first match if multiple)
                sk_cost: skRecords[0]?.sk_cost || null,
                sk_d_fcst: skRecords[0]?.sk_d_fcst || null,
                sk_d1_fcst: skRecords[0]?.sk_d1_fcst || null
            };

            marketData.push(marketRecord);
        });

        console.log(`Created comprehensive market dataset with ${marketData.length} records`);
        
        // Log matching statistics
        const withAFRR = marketData.filter(r => r.afrr_d_price !== null || r.afrr_g_price !== null).length;
        const withSK = marketData.filter(r => r.sk_d1_fcst !== null).length;
        console.log(`  Records with aFRR data: ${withAFRR}`);
        console.log(`  Records with SK data: ${withSK}`);
        
        return marketData;

    } catch (error) {
        console.error('Error loading market data:', error);
        throw error;
    }
};

// Filters data records based on a specified date range.
export const filterDataByDateRange = (data, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end date to end of day for inclusive range

    if (!Array.isArray(data)) return [];
    return data.filter(record => {
        const recordDate = new Date(record.dtime || record.datetime);
        // Ensure we only include records within the exact date range
        return recordDate >= start && recordDate <= end && !isNaN(recordDate.getTime());
    });
};

// Groups data by specified period type (monthly, quarterly, yearly).
export const groupDataByPeriod = (data, periodType) => {
    const groups = {};
    if (!Array.isArray(data)) return {};

    data.forEach(record => {
        const date = new Date(record.dtime || record.datetime);
        let key;

        switch (periodType) {
            case 'monthly':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            case 'quarterly':
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                key = `${date.getFullYear()}-Q${quarter}`;
                break;
            case 'yearly':
                key = `${date.getFullYear()}`;
                break;
            default:
                key = 'continuous'; // For continuous analysis, all data is in one group
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
    });

    return groups;
};

// Utility function to get the latest available data date
export const getLatestDataDate = (data) => {
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const dates = data
        .map(record => new Date(record.dtime || record.datetime))
        .filter(date => !isNaN(date.getTime()));
    
    if (dates.length === 0) return null;
    
    return new Date(Math.max(...dates));
};

// Utility function to get data statistics
export const getDataStatistics = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            count: 0,
            dateRange: null,
            priceStats: null
        };
    }

    const dates = data
        .map(record => new Date(record.dtime || record.datetime))
        .filter(date => !isNaN(date.getTime()));

    const prices = data
        .map(record => record.csdac_pln || record.price)
        .filter(price => typeof price === 'number' && !isNaN(price));

    return {
        count: data.length,
        dateRange: dates.length > 0 ? {
            start: new Date(Math.min(...dates)),
            end: new Date(Math.max(...dates))
        } : null,
        priceStats: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
            count: prices.length
        } : null
    };
};