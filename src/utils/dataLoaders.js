// Path: src/utils/dataLoaders.js

// Configuration for the data source.
const POLAND_CSV_URL = 'https://raw.githubusercontent.com/erykklossowski/resslv/refs/heads/main/Poland.csv';

// Loads historical electricity data from a CSV URL.
export const loadPolishData = async () => {
    try {
        console.log('Loading data from:', POLAND_CSV_URL);

        const response = await fetch(POLAND_CSV_URL, {
            method: 'GET',
            headers: { 'Accept': 'text/csv,text/plain,*/*' }
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            if (response.status === 404) errorMsg += ' - File not found.';
            else if (response.status === 403) errorMsg += ' - Access forbidden.';
            throw new Error(errorMsg);
        }

        const csvData = await response.text();
        const lines = csvData.split('\n').filter(line => line.trim());

        if (lines.length === 0) throw new Error('CSV file is empty');

        const header = lines[0];
        const headerColumns = header.split(',').map(col => col.trim());

        // Find column indices for datetime and price.
        const datetimeIndex = headerColumns.findIndex(col =>
            col.toLowerCase().includes('datetime') ||
            col.toLowerCase().includes('date') ||
            col.toLowerCase().includes('time')
        );
        const priceIndex = headerColumns.findIndex(col =>
            col.toLowerCase().includes('price') ||
            col.toLowerCase().includes('eur') ||
            col.toLowerCase().includes('mwh')
        );

        if (datetimeIndex === -1 || priceIndex === -1) {
            throw new Error(`Could not find required columns. Available: ${headerColumns.join(', ')}`);
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(val => val.trim());
            if (values.length > Math.max(datetimeIndex, priceIndex)) {
                const datetime = values[datetimeIndex];
                const price = parseFloat(values[priceIndex]);

                if (!isNaN(price) && datetime) {
                    data.push({ datetime, price });
                }
            }
        }

        if (data.length === 0) throw new Error('No valid data rows found');

        return data;

    } catch (error) {
        console.error('Error loading data:', error);
        throw error; // Re-throw to be caught by the component
    }
};

// Filters data records based on a specified date range.
export const filterDataByDateRange = (data, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end date to end of day for inclusive range

    if (!Array.isArray(data)) return [];
    return data.filter(record => {
        const recordDate = new Date(record.datetime);
        return recordDate >= start && recordDate <= end;
    });
};

// Groups data by specified period type (monthly, quarterly, yearly).
export const groupDataByPeriod = (data, periodType) => {
    const groups = {};
    if (!Array.isArray(data)) return {};

    data.forEach(record => {
        const date = new Date(record.datetime);
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