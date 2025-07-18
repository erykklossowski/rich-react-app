// Path: src/utils/afrrDataLoaders.js

import { loadAllPSEData, loadAFRRData, loadMarketData, filterDataByDateRange, getDataStatistics } from './dataLoaders.js';
import { getDataConfig } from './dataConfig.js';

// Configuration for aFRR analysis
const AFRR_CONFIG = {
    // Default parameters for 1 MW aFRR bid
    bidCapacity: 1.0, // MW
    maxBidPrice: 1000, // PLN/MW
    minBidPrice: 0, // PLN/MW
    
    // Historical analysis parameters
    defaultLookbackDays: 30,
    confidenceLevel: 0.95,
    
    // Data processing parameters
    minDataPoints: 100,
    maxDataPoints: 10000
};

// Load and preprocess aFRR data for analysis
export const loadAFRRDataForAnalysis = async (options = {}) => {
    try {
        console.log('Loading aFRR data for analysis...');
        
        const {
            startDate = null,
            endDate = null,
            lookbackDays = AFRR_CONFIG.defaultLookbackDays,
            maxRecords = AFRR_CONFIG.maxDataPoints
        } = options;

        // Load all PSE data
        const pseData = await loadAllPSEData();
        
        // Extract aFRR specific data
        const afrrData = pseData.mbp_tp.map((mbpRecord, index) => {
            const cmbpRecord = pseData.cmbp_tp[index];
            return {
                dtime: mbpRecord.dtime,
                dtime_utc: mbpRecord.dtime_utc,
                business_date: mbpRecord.business_date,
                period: mbpRecord.onmb,
                
                // Volumes from MBP
                afrr_d_volume: mbpRecord.afrr_d,
                afrr_g_volume: mbpRecord.afrr_g,
                fcr_d_volume: mbpRecord.fcr_d,
                fcr_g_volume: mbpRecord.fcr_g,
                mfrrd_d_volume: mbpRecord.mfrrd_d,
                mfrrd_g_volume: mbpRecord.mfrrd_g,
                
                // Prices from CMBP
                afrr_d_price: cmbpRecord?.afrr_d || null,
                afrr_g_price: cmbpRecord?.afrr_g || null,
                fcr_d_price: cmbpRecord?.fcr_d || null,
                fcr_g_price: cmbpRecord?.fcr_g || null,
                mfrrd_d_price: cmbpRecord?.mfrrd_d || null,
                mfrrd_g_price: cmbpRecord?.mfrrd_g || null
            };
        }).filter(record => 
            record.afrr_d_volume !== null || record.afrr_g_volume !== null
        );

        console.log(`Loaded ${afrrData.length} aFRR data records`);

        // Filter by date range if specified
        let filteredData = afrrData;
        if (startDate && endDate) {
            filteredData = filterDataByDateRange(afrrData, startDate, endDate);
            console.log(`Filtered to ${filteredData.length} records in date range`);
        } else if (lookbackDays) {
            // Use lookback period from dynamic data end date
            const config = await getDataConfig();
            const historicalEndDate = new Date(config.dataEndDate);
            const startDate = new Date(historicalEndDate);
            startDate.setDate(startDate.getDate() - lookbackDays);
            filteredData = filterDataByDateRange(afrrData, startDate.toISOString().split('T')[0], historicalEndDate.toISOString().split('T')[0]);
            console.log(`Filtered to ${filteredData.length} records in last ${lookbackDays} days from historical data`);
        }

        // Limit number of records if specified
        if (maxRecords && filteredData.length > maxRecords) {
            filteredData = filteredData.slice(-maxRecords);
            console.log(`Limited to ${filteredData.length} most recent records`);
        }

        // Validate data quality
        const validRecords = filteredData.filter(record => 
            (record.afrr_d_volume !== null && record.afrr_d_price !== null) ||
            (record.afrr_g_volume !== null && record.afrr_g_price !== null)
        );

        if (validRecords.length < AFRR_CONFIG.minDataPoints) {
            throw new Error(`Insufficient valid data: ${validRecords.length} records (minimum: ${AFRR_CONFIG.minDataPoints})`);
        }

        console.log(`Valid aFRR records for analysis: ${validRecords.length}`);

        // Calculate data statistics
        const stats = getDataStatistics(validRecords);
        console.log('Data statistics:', stats);

        return {
            data: validRecords,
            statistics: stats,
            config: AFRR_CONFIG
        };

    } catch (error) {
        console.error('Error loading aFRR data for analysis:', error);
        throw error;
    }
};

// Load comprehensive market data including aFRR, day-ahead prices, and system status
export const loadComprehensiveMarketData = async (options = {}) => {
    try {
        console.log('Loading comprehensive market data...');
        
        const {
            startDate = null,
            endDate = null,
            lookbackDays = AFRR_CONFIG.defaultLookbackDays,
            maxRecords = AFRR_CONFIG.maxDataPoints
        } = options;

        // Load comprehensive market data
        const marketData = await loadMarketData();
        
        console.log(`Loaded ${marketData.length} comprehensive market records`);

        // Filter by date range if specified
        let filteredData = marketData;
        if (startDate && endDate) {
            filteredData = filterDataByDateRange(marketData, startDate, endDate);
            console.log(`Filtered to ${filteredData.length} records in date range`);
        } else if (lookbackDays) {
            // Use lookback period from dynamic data end date
            const config = await getDataConfig();
            const historicalEndDate = new Date(config.dataEndDate);
            const startDate = new Date(historicalEndDate);
            startDate.setDate(startDate.getDate() - lookbackDays);
            filteredData = filterDataByDateRange(marketData, startDate.toISOString().split('T')[0], historicalEndDate.toISOString().split('T')[0]);
            console.log(`Filtered to ${filteredData.length} records in last ${lookbackDays} days from historical data`);
        }

        // Limit number of records if specified
        if (maxRecords && filteredData.length > maxRecords) {
            filteredData = filteredData.slice(-maxRecords);
            console.log(`Limited to ${filteredData.length} most recent records`);
        }

        // Validate data quality - be more flexible about requirements
        const validRecords = filteredData.filter(record => 
            record.csdac_pln !== null && !isNaN(record.csdac_pln)
        );

        // Check for aFRR data availability
        const recordsWithAFRR = validRecords.filter(record => 
            record.afrr_d_price !== null || record.afrr_g_price !== null
        );
        
        const recordsWithSK = validRecords.filter(record => 
            record.sk_d1_fcst !== null && !isNaN(record.sk_d1_fcst)
        );

        console.log(`Valid day-ahead price records: ${validRecords.length}`);
        console.log(`Records with aFRR data: ${recordsWithAFRR.length}`);
        console.log(`Records with SK data: ${recordsWithSK.length}`);

        // Use day-ahead price data as the primary dataset
        if (validRecords.length < AFRR_CONFIG.minDataPoints) {
            throw new Error(`Insufficient valid day-ahead price data: ${validRecords.length} records (minimum: ${AFRR_CONFIG.minDataPoints})`);
        }

        // Calculate data statistics
        const stats = getDataStatistics(validRecords);
        console.log('Comprehensive data statistics:', stats);

        return {
            data: validRecords,
            statistics: stats,
            config: AFRR_CONFIG,
            dataAvailability: {
                totalRecords: validRecords.length,
                withAFRR: recordsWithAFRR.length,
                withSK: recordsWithSK.length,
                afrrCoverage: recordsWithAFRR.length / validRecords.length,
                skCoverage: recordsWithSK.length / validRecords.length
            }
        };

    } catch (error) {
        console.error('Error loading comprehensive market data:', error);
        throw error;
    }
};

// Load system contracting status data for HMM analysis
export const loadSystemContractingData = async (options = {}) => {
    try {
        console.log('Loading system contracting status data...');
        
        const {
            startDate = null,
            endDate = null,
            lookbackDays = AFRR_CONFIG.defaultLookbackDays,
            maxRecords = AFRR_CONFIG.maxDataPoints
        } = options;

        // Load all PSE data
        const pseData = await loadAllPSEData();
        const skData = pseData.sk_data;

        console.log(`Loaded ${skData.length} system contracting status records (15-minute resolution)`);

        // Validate and clean SK data
        const validSkData = skData.filter(record => {
            // Check for malformed dates (like "2024-10-27 02a:15:00")
            if (!record.dtime || typeof record.dtime !== 'string') {
                console.warn(`Invalid dtime in SK record: ${record.dtime}`);
                return false;
            }
            
            // Check for malformed date patterns
            if (record.dtime.includes('a:') || record.dtime.includes('b:') || record.dtime.includes('c:')) {
                console.warn(`Malformed date pattern in SK record: ${record.dtime}`);
                return false;
            }
            
            // Validate date parsing
            const date = new Date(record.dtime);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date in SK record: ${record.dtime}`);
                return false;
            }
            
            return true;
        });

        console.log(`Validated ${validSkData.length} SK records (removed ${skData.length - validSkData.length} invalid records)`);

        // Aggregate 15-minute data to hourly for better analysis
        const hourlySkData = aggregateSkDataToHourly(validSkData);
        console.log(`Aggregated to ${hourlySkData.length} hourly records`);

        // Filter by date range if specified
        let filteredData = hourlySkData;
        if (startDate && endDate) {
            filteredData = filterDataByDateRange(hourlySkData, startDate, endDate);
            console.log(`Filtered to ${filteredData.length} records in date range`);
        } else if (lookbackDays) {
            // Use lookback period from dynamic data end date
            const config = await getDataConfig();
            const historicalEndDate = new Date(config.dataEndDate);
            const startDate = new Date(historicalEndDate);
            startDate.setDate(startDate.getDate() - lookbackDays);
            filteredData = filterDataByDateRange(hourlySkData, startDate.toISOString().split('T')[0], historicalEndDate.toISOString().split('T')[0]);
            console.log(`Filtered to ${filteredData.length} records in last ${lookbackDays} days from historical data`);
        }

        // Limit number of records if specified
        if (maxRecords && filteredData.length > maxRecords) {
            filteredData = filteredData.slice(-maxRecords);
            console.log(`Limited to ${filteredData.length} most recent records`);
        }

        // Validate data quality - focus on sk_d1_fcst (day-minus-one forecast)
        const validRecords = filteredData.filter(record => 
            record.sk_d1_fcst !== null && !isNaN(record.sk_d1_fcst)
        );

        // Adjust minimum data points based on time range
        let minRequired = AFRR_CONFIG.minDataPoints;
        
        if (startDate && endDate) {
            // Custom date range - calculate days and adjust minimum
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= 1) {
                minRequired = 20; // Lower requirement for 1 day analysis
            } else if (daysDiff <= 7) {
                minRequired = 50; // Medium requirement for 7 days analysis
            } else if (daysDiff <= 30) {
                minRequired = 100; // Standard requirement for 30 days analysis
            } else {
                minRequired = 200; // Higher requirement for longer periods
            }
        } else if (lookbackDays) {
            // Lookback period
            if (lookbackDays <= 1) {
                minRequired = 20; // Lower requirement for 24h analysis
            } else if (lookbackDays <= 7) {
                minRequired = 50; // Medium requirement for 7d analysis
            }
        }
        
        if (validRecords.length < minRequired) {
            const periodDesc = startDate && endDate ? 
                `${Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days` :
                `${lookbackDays} day${lookbackDays > 1 ? 's' : ''}`;
            
            throw new Error(`Insufficient valid contracting status data: ${validRecords.length} records (minimum: ${minRequired} for ${periodDesc} analysis)`);
        }

        console.log(`Valid system contracting status records: ${validRecords.length}`);

        // Calculate statistics for contracting status
        const contractingValues = validRecords.map(record => record.sk_d1_fcst);
        const stats = {
            count: validRecords.length,
            dateRange: {
                start: new Date(Math.min(...validRecords.map(r => new Date(r.dtime)))),
                end: new Date(Math.max(...validRecords.map(r => new Date(r.dtime))))
            },
            contractingStats: {
                min: Math.min(...contractingValues),
                max: Math.max(...contractingValues),
                avg: contractingValues.reduce((sum, v) => sum + v, 0) / contractingValues.length,
                count: contractingValues.length
            }
        };

        console.log('System contracting status statistics:', stats);

        return {
            data: validRecords,
            statistics: stats,
            config: AFRR_CONFIG
        };

    } catch (error) {
        console.error('Error loading system contracting status data:', error);
        throw error;
    }
};

// Load day-ahead price data for battery optimization
export const loadDayAheadPriceData = async (options = {}) => {
    try {
        console.log('Loading day-ahead price data...');
        
        const {
            startDate = null,
            endDate = null,
            lookbackDays = AFRR_CONFIG.defaultLookbackDays,
            maxRecords = AFRR_CONFIG.maxDataPoints
        } = options;

        // Load CSDAC PLN data
        const { loadCSDACPLNData } = await import('./dataLoaders.js');
        const csdacData = await loadCSDACPLNData();

        console.log(`Loaded ${csdacData.length} day-ahead price records`);

        // Filter by date range if specified
        let filteredData = csdacData;
        if (startDate && endDate) {
            filteredData = filterDataByDateRange(csdacData, startDate, endDate);
            console.log(`Filtered to ${filteredData.length} records in date range`);
        } else if (lookbackDays) {
            // Use lookback period from dynamic data end date
            const config = await getDataConfig();
            const historicalEndDate = new Date(config.dataEndDate);
            const startDate = new Date(historicalEndDate);
            startDate.setDate(startDate.getDate() - lookbackDays);
            filteredData = filterDataByDateRange(csdacData, startDate.toISOString().split('T')[0], historicalEndDate.toISOString().split('T')[0]);
            console.log(`Filtered to ${filteredData.length} records in last ${lookbackDays} days from historical data`);
        }

        // Limit number of records if specified
        if (maxRecords && filteredData.length > maxRecords) {
            filteredData = filteredData.slice(-maxRecords);
            console.log(`Limited to ${filteredData.length} most recent records`);
        }

        // Validate data quality
        const validRecords = filteredData.filter(record => 
            record.csdac_pln !== null && !isNaN(record.csdac_pln)
        );

        if (validRecords.length < AFRR_CONFIG.minDataPoints) {
            throw new Error(`Insufficient valid day-ahead price data: ${validRecords.length} records (minimum: ${AFRR_CONFIG.minDataPoints})`);
        }

        console.log(`Valid day-ahead price records: ${validRecords.length}`);

        // Calculate data statistics
        const stats = getDataStatistics(validRecords);
        console.log('Day-ahead price statistics:', stats);

        return {
            data: validRecords,
            statistics: stats,
            config: AFRR_CONFIG
        };

    } catch (error) {
        console.error('Error loading day-ahead price data:', error);
        throw error;
    }
};

// Aggregate SK data from 15-minute to hourly resolution
const aggregateSkDataToHourly = (data) => {
    const hourlyMap = new Map();
    
    data.forEach(record => {
        try {
            const date = new Date(record.dtime);
            
            // Validate date
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date in SK data: ${record.dtime}`);
                return; // Skip this record
            }
            
            // Round to the nearest hour
            const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0);
            
            // Validate hourKey
            if (isNaN(hourKey.getTime())) {
                console.warn(`Invalid hourKey for date: ${record.dtime}`);
                return; // Skip this record
            }
            
            const hourKeyStr = hourKey.toISOString().slice(0, 19).replace('T', ' ');
        
        if (!hourlyMap.has(hourKeyStr)) {
            hourlyMap.set(hourKeyStr, {
                dtime: hourKeyStr,
                dtime_utc: hourKey.toISOString(),
                business_date: record.business_date,
                period: date.getHours(),
                sk_d1_fcst_values: [],
                sk_d_fcst_values: [],
                sk_cost_values: [],
                count: 0
            });
        }
        
        const hourlyRecord = hourlyMap.get(hourKeyStr);
        if (record.sk_d1_fcst !== null && !isNaN(record.sk_d1_fcst)) {
            hourlyRecord.sk_d1_fcst_values.push(record.sk_d1_fcst);
        }
        if (record.sk_d_fcst !== null && !isNaN(record.sk_d_fcst)) {
            hourlyRecord.sk_d_fcst_values.push(record.sk_d_fcst);
        }
        if (record.sk_cost !== null && !isNaN(record.sk_cost)) {
            hourlyRecord.sk_cost_values.push(record.sk_cost);
        }
        hourlyRecord.count++;
        } catch (error) {
            console.warn(`Error processing SK record: ${record.dtime}`, error.message);
        }
    });
    
    // Calculate average values for each hour
    const hourlyData = Array.from(hourlyMap.values()).map(record => ({
        dtime: record.dtime,
        dtime_utc: record.dtime_utc,
        business_date: record.business_date,
        period: record.period,
        sk_d1_fcst: record.sk_d1_fcst_values.length > 0 ? 
            record.sk_d1_fcst_values.reduce((sum, v) => sum + v, 0) / record.sk_d1_fcst_values.length : null,
        sk_d_fcst: record.sk_d_fcst_values.length > 0 ? 
            record.sk_d_fcst_values.reduce((sum, v) => sum + v, 0) / record.sk_d_fcst_values.length : null,
        sk_cost: record.sk_cost_values.length > 0 ? 
            record.sk_cost_values.reduce((sum, v) => sum + v, 0) / record.sk_cost_values.length : null,
        data_points: record.count
    }));
    
    // Sort by time
    hourlyData.sort((a, b) => new Date(a.dtime) - new Date(b.dtime));
    
    return hourlyData;
};

// Export configuration for use in other modules
export { AFRR_CONFIG }; 