// Path: src/utils/afrrDataProcessor.js

// Data processor for aFRR capacity bidding HMM model
class AFRRDataProcessor {
    constructor() {
        this.processedData = null;
        this.hiddenStates = null;
        this.observations = null;
    }

    // Generate synthetic historical data for testing (mock data)
    generateMockData(numPeriods = 1000) {
        console.log(`Generating ${numPeriods} periods of mock aFRR data...`);
        
        const mockData = [];
        const baseTime = new Date('2024-01-01T00:00:00Z');
        
        for (let i = 0; i < numPeriods; i++) {
            const timestamp = new Date(baseTime.getTime() + i * 15 * 60 * 1000); // 15-minute intervals
            
            // Generate realistic sk_d1_fcst values (contracting status)
            const baseContracting = -50 + (Math.random() - 0.5) * 200; // Range: -150 to +50 MW
            const contractingValue = baseContracting + Math.sin(i * 0.1) * 100; // Add some cyclical pattern
            
            // Determine system forecast status based on contracting value
            let systemForecastStatus;
            if (contractingValue < -50) {
                systemForecastStatus = 'undercontracted';
            } else if (contractingValue > 50) {
                systemForecastStatus = 'overcontracted';
            } else {
                systemForecastStatus = 'balanced';
            }
            
            // Generate aFRR capacity volumes (realistic ranges)
            const baseUpCapacity = 200 + Math.random() * 100; // 200-300 MW
            const baseDownCapacity = 150 + Math.random() * 100; // 150-250 MW
            
            // Adjust based on system status
            let afrrUpCapacityMw, afrrDownCapacityMw;
            if (systemForecastStatus === 'undercontracted') {
                afrrUpCapacityMw = baseUpCapacity * (0.8 + Math.random() * 0.4); // Higher up capacity
                afrrDownCapacityMw = baseDownCapacity * (0.3 + Math.random() * 0.4); // Lower down capacity
            } else if (systemForecastStatus === 'overcontracted') {
                afrrUpCapacityMw = baseUpCapacity * (0.3 + Math.random() * 0.4); // Lower up capacity
                afrrDownCapacityMw = baseDownCapacity * (0.8 + Math.random() * 0.4); // Higher down capacity
            } else {
                afrrUpCapacityMw = baseUpCapacity * (0.5 + Math.random() * 0.3); // Balanced
                afrrDownCapacityMw = baseDownCapacity * (0.5 + Math.random() * 0.3); // Balanced
            }
            
            // Generate capacity prices (realistic ranges)
            const baseUpPrice = 50 + Math.random() * 100; // 50-150 EUR/MW
            const baseDownPrice = 30 + Math.random() * 80; // 30-110 EUR/MW
            
            // Add some correlation with volumes
            const afrrUpCapacityMarginalPriceEurPerMw = baseUpPrice * (1 + (afrrUpCapacityMw - 250) / 500);
            const afrrDownCapacityMarginalPriceEurPerMw = baseDownPrice * (1 + (afrrDownCapacityMw - 200) / 400);
            
            mockData.push({
                timestamp: timestamp.toISOString(),
                sk_d1_fcst: Math.round(contractingValue * 100) / 100,
                system_forecast_status: systemForecastStatus,
                afrr_up_capacity_mw: Math.round(afrrUpCapacityMw * 100) / 100,
                afrr_down_capacity_mw: Math.round(afrrDownCapacityMw * 100) / 100,
                afrr_up_capacity_marginal_price_eur_per_mw: Math.round(afrrUpCapacityMarginalPriceEurPerMw * 100) / 100,
                afrr_down_capacity_marginal_price_eur_per_mw: Math.round(afrrDownCapacityMarginalPriceEurPerMw * 100) / 100
            });
        }
        
        console.log(`Generated ${mockData.length} mock data points`);
        return mockData;
    }

    // Generate synthetic hidden states based on system forecast status and capacity volumes
    generateSyntheticHiddenStates(data) {
        console.log('Generating synthetic hidden states...');
        
        const hiddenStates = [];
        const stateMapping = {
            'S_1MW_Down_Capacity_cleared': 1,
            'S_1MW_Up_Capacity_cleared': 2,
            'S_no_1MW_Capacity_cleared': 3
        };
        
        for (const record of data) {
            let hiddenState;
            
            // Logic for synthetic hidden state generation
            if (record.system_forecast_status === 'overcontracted' && record.afrr_down_capacity_mw > 0) {
                // System is overcontracted and down capacity is being procured
                // Assume our 1 MW down capacity bid clears with some probability
                const clearingProbability = Math.min(record.afrr_down_capacity_mw / 500, 0.8); // Max 80% probability
                hiddenState = Math.random() < clearingProbability ? 
                    stateMapping['S_1MW_Down_Capacity_cleared'] : 
                    stateMapping['S_no_1MW_Capacity_cleared'];
            } else if (record.system_forecast_status === 'undercontracted' && record.afrr_up_capacity_mw > 0) {
                // System is undercontracted and up capacity is being procured
                // Assume our 1 MW up capacity bid clears with some probability
                const clearingProbability = Math.min(record.afrr_up_capacity_mw / 500, 0.8); // Max 80% probability
                hiddenState = Math.random() < clearingProbability ? 
                    stateMapping['S_1MW_Up_Capacity_cleared'] : 
                    stateMapping['S_no_1MW_Capacity_cleared'];
            } else {
                // Balanced system or no capacity being procured
                hiddenState = stateMapping['S_no_1MW_Capacity_cleared'];
            }
            
            hiddenStates.push(hiddenState);
        }
        
        console.log(`Generated ${hiddenStates.length} hidden states`);
        console.log('Hidden state distribution:', this.getStateDistribution(hiddenStates));
        
        return hiddenStates;
    }

    // Create observation sequences from the data
    createObservationSequences(data) {
        console.log('Creating observation sequences...');
        
        const observations = [];
        
        for (const record of data) {
            // Create observation vector: [sk_d1_fcst_normalized, up_capacity_normalized, down_capacity_normalized]
            const skNormalized = (record.sk_d1_fcst + 200) / 400; // Normalize to [0,1] range
            const upCapacityNormalized = record.afrr_up_capacity_mw / 500; // Normalize to [0,1] range
            const downCapacityNormalized = record.afrr_down_capacity_mw / 500; // Normalize to [0,1] range
            
            observations.push([skNormalized, upCapacityNormalized, downCapacityNormalized]);
        }
        
        console.log(`Created ${observations.length} observation sequences`);
        return observations;
    }

    // Process data and prepare for HMM training
    processData(data = null) {
        const sourceData = data || this.generateMockData();
        
        console.log('Processing aFRR data for HMM training...');
        
        // Generate synthetic hidden states
        const hiddenStates = this.generateSyntheticHiddenStates(sourceData);
        
        // Create observation sequences
        const observations = this.createObservationSequences(sourceData);
        
        // Store processed data
        this.processedData = sourceData;
        this.hiddenStates = hiddenStates;
        this.observations = observations;
        
        // Calculate statistics
        const stats = this.calculateStatistics(sourceData, hiddenStates);
        
        console.log('Data processing completed');
        console.log('Statistics:', stats);
        
        return {
            data: sourceData,
            hiddenStates,
            observations,
            statistics: stats
        };
    }

    // Calculate statistics for the processed data
    calculateStatistics(data, hiddenStates) {
        const stateNames = {
            1: 'S_1MW_Down_Capacity_cleared',
            2: 'S_1MW_Up_Capacity_cleared', 
            3: 'S_no_1MW_Capacity_cleared'
        };
        
        // State distribution
        const stateDistribution = this.getStateDistribution(hiddenStates);
        
        // Revenue analysis
        let totalRevenue = 0;
        let upRevenue = 0;
        let downRevenue = 0;
        let upClearedCount = 0;
        let downClearedCount = 0;
        
        for (let i = 0; i < data.length; i++) {
            if (hiddenStates[i] === 1) { // Down capacity cleared
                totalRevenue += data[i].afrr_down_capacity_marginal_price_eur_per_mw;
                downRevenue += data[i].afrr_down_capacity_marginal_price_eur_per_mw;
                downClearedCount++;
            } else if (hiddenStates[i] === 2) { // Up capacity cleared
                totalRevenue += data[i].afrr_up_capacity_marginal_price_eur_per_mw;
                upRevenue += data[i].afrr_up_capacity_marginal_price_eur_per_mw;
                upClearedCount++;
            }
        }
        
        // System forecast status distribution
        const statusDistribution = data.reduce((acc, record) => {
            acc[record.system_forecast_status] = (acc[record.system_forecast_status] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalPeriods: data.length,
            stateDistribution,
            statusDistribution,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            upRevenue: Math.round(upRevenue * 100) / 100,
            downRevenue: Math.round(downRevenue * 100) / 100,
            upClearedCount,
            downClearedCount,
            averageRevenuePerPeriod: Math.round((totalRevenue / data.length) * 100) / 100,
            averageRevenueWhenCleared: Math.round((totalRevenue / (upClearedCount + downClearedCount)) * 100) / 100
        };
    }

    // Get distribution of states
    getStateDistribution(states) {
        return states.reduce((acc, state) => {
            acc[state] = (acc[state] || 0) + 1;
            return acc;
        }, {});
    }

    // Split data into training and testing sets
    splitData(data, hiddenStates, observations, trainRatio = 0.8) {
        const splitIndex = Math.floor(data.length * trainRatio);
        
        return {
            train: {
                data: data.slice(0, splitIndex),
                hiddenStates: hiddenStates.slice(0, splitIndex),
                observations: observations.slice(0, splitIndex)
            },
            test: {
                data: data.slice(splitIndex),
                hiddenStates: hiddenStates.slice(splitIndex),
                observations: observations.slice(splitIndex)
            }
        };
    }

    // Test the data processor
    testDataProcessor() {
        console.log('=== Testing AFRR Data Processor ===');
        
        try {
            // Generate and process mock data
            const result = this.processData();
            
            console.log('✓ Data processing successful');
            console.log('Data points:', result.data.length);
            console.log('Hidden states:', result.hiddenStates.length);
            console.log('Observations:', result.observations.length);
            
            // Test data splitting
            const split = this.splitData(result.data, result.hiddenStates, result.observations);
            console.log('✓ Data splitting successful');
            console.log('Training set:', split.train.data.length, 'points');
            console.log('Test set:', split.test.data.length, 'points');
            
            // Show sample data
            console.log('\nSample processed data:');
            for (let i = 0; i < Math.min(5, result.data.length); i++) {
                console.log(`Period ${i}:`);
                console.log(`  sk_d1_fcst: ${result.data[i].sk_d1_fcst}`);
                console.log(`  System status: ${result.data[i].system_forecast_status}`);
                console.log(`  Up capacity: ${result.data[i].afrr_up_capacity_mw} MW`);
                console.log(`  Down capacity: ${result.data[i].afrr_down_capacity_mw} MW`);
                console.log(`  Hidden state: ${result.hiddenStates[i]}`);
                console.log(`  Observation: [${result.observations[i].map(x => x.toFixed(3)).join(', ')}]`);
            }
            
            console.log('\n=== Data Processor Test Complete ===');
            
            return {
                success: true,
                processedData: result.data.length,
                statistics: result.statistics
            };
            
        } catch (error) {
            console.error('✗ Data processor test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the AFRRDataProcessor class
export default AFRRDataProcessor; 