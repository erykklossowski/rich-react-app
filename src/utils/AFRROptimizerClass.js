import fetch from 'node-fetch';

class AFRROptimizer {
    constructor() {
        this.baseUrl = process.env.VITE_API_URL || '';
        this.stateNames = {
            1: 'Undercontracted',
            2: 'Balanced', 
            3: 'Overcontracted'
        };
    }

    // Load aFRR data from backend API
    async loadAFRRData(startDate, endDate) {
        try {
            const response = await fetch(`${this.baseUrl}/api/afrr/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate,
                    endDate
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error loading aFRR data:', error);
            throw error;
        }
    }

    // Run aFRR analysis via backend API
    async analyzeAFRR(contractingValues, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/afrr/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contractingValues,
                    options
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error analyzing aFRR:', error);
            throw error;
        }
    }

    // Run aFRR backtest via backend API
    async runAFRRBacktest(parameters) {
        try {
            const response = await fetch(`${this.baseUrl}/api/afrr/backtest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(parameters),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error running aFRR backtest:', error);
            throw error;
        }
    }

    // Get aFRR statistics via backend API
    async getAFRRStatistics(startDate, endDate) {
        try {
            const response = await fetch(`${this.baseUrl}/api/afrr/statistics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate,
                    endDate
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting aFRR statistics:', error);
            throw error;
        }
    }

    // Get state names for display
    getStateNames() {
        return this.stateNames;
    }
}

export default AFRROptimizer; 