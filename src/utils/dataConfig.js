// Dynamic Data Configuration System
// Calculates date ranges and configuration from actual data instead of hardcoded values

// Configuration for the data sources from GitHub repository
export const DATA_BASE_URL = 'https://raw.githubusercontent.com/erykklossowski/resslv/main';
export const CSDAC_PLN_URL = `${DATA_BASE_URL}/csdac_pln_data.json`;
export const MBP_TP_URL = `${DATA_BASE_URL}/mbp_tp_data.json`;
export const CMBP_TP_URL = `${DATA_BASE_URL}/cmbp_tp_data.json`;
export const SK_DATA_URL = `${DATA_BASE_URL}/sk_data.json`;

// Default configuration values (will be overridden by actual data)
export const DEFAULT_CONFIG = {
    // Date ranges (will be calculated from actual data)
    dataStartDate: null,
    dataEndDate: null,
    
    // Data characteristics
    totalRecords: 0,
    priceRange: { min: 0, max: 0, avg: 0 },
    currency: 'PLN',
    
    // Analysis parameters
    defaultLookbackDays: 30,
    confidenceLevel: 0.95,
    minDataPoints: 100,
    maxDataPoints: 10000,
    
    // Battery optimization defaults
    defaultPMax: 10,
    defaultSocMin: 10,
    defaultSocMax: 40,
    defaultEfficiency: 0.85,
    
    // Categorization defaults
    defaultCategorizationMethod: 'zscore',
    defaultCategorizationOptions: { lowThreshold: -0.5, highThreshold: 0.5 }
};

// Cache for calculated configuration
let calculatedConfig = null;

// Calculate configuration from actual data
export const calculateDataConfig = async () => {
    if (calculatedConfig) {
        return calculatedConfig;
    }

    try {
        console.log('Calculating dynamic data configuration...');
        
        // Load CSDAC PLN data to determine date ranges
        const response = await fetch(CSDAC_PLN_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch data for configuration: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No data available for configuration calculation');
        }

        // Calculate date range from actual data
        const dates = data
            .map(record => new Date(record.dtime))
            .filter(date => !isNaN(date.getTime()))
            .sort((a, b) => a - b);

        const dataStartDate = dates[0];
        const dataEndDate = dates[dates.length - 1];

        // Calculate price statistics
        const prices = data
            .map(record => record.csdac_pln)
            .filter(price => typeof price === 'number' && !isNaN(price));

        const priceRange = {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((sum, p) => sum + p, 0) / prices.length
        };

        // Create dynamic configuration
        calculatedConfig = {
            ...DEFAULT_CONFIG,
            dataStartDate: dataStartDate.toISOString().split('T')[0],
            dataEndDate: dataEndDate.toISOString().split('T')[0],
            totalRecords: data.length,
            priceRange,
            currency: 'PLN'
        };

        console.log('Dynamic configuration calculated:', calculatedConfig);
        return calculatedConfig;

    } catch (error) {
        console.error('Error calculating data configuration:', error);
        
        // Fallback to default configuration
        calculatedConfig = {
            ...DEFAULT_CONFIG,
            dataStartDate: '2024-06-14',
            dataEndDate: '2025-07-18',
            totalRecords: 38400,
            priceRange: { min: -567.92, max: 2748.07, avg: 445.40 },
            currency: 'PLN'
        };
        
        console.log('Using fallback configuration:', calculatedConfig);
        return calculatedConfig;
    }
};

// Get current configuration
export const getDataConfig = async () => {
    return await calculateDataConfig();
};

// Get date range for UI components
export const getDateRange = async () => {
    const config = await getDataConfig();
    return {
        startDate: config.dataStartDate,
        endDate: config.dataEndDate
    };
};

// Get preset scenarios based on actual data
export const getPresetScenarios = async () => {
    const config = await getDataConfig();
    const endDate = new Date(config.dataEndDate);
    
    // Calculate relative dates based on actual data end date
    const last7Days = new Date(endDate);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const last30Days = new Date(endDate);
    last30Days.setDate(last30Days.getDate() - 30);
    
    const currentMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    return [
        { 
            name: 'Last 7 Days', 
            start: last7Days.toISOString().split('T')[0], 
            end: config.dataEndDate, 
            type: 'continuous' 
        },
        { 
            name: 'Last 30 Days', 
            start: last30Days.toISOString().split('T')[0], 
            end: config.dataEndDate, 
            type: 'continuous' 
        },
        { 
            name: 'Current Month', 
            start: currentMonth.toISOString().split('T')[0], 
            end: config.dataEndDate, 
            type: 'continuous' 
        }
    ];
};

// Reset configuration cache (useful for testing or data updates)
export const resetConfigCache = () => {
    calculatedConfig = null;
};

// Export default configuration for immediate use
export default DEFAULT_CONFIG; 