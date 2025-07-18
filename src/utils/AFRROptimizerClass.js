// Path: src/utils/AFRROptimizerClass.js

// The AFRROptimizer class contains the core logic for HMM, Viterbi, and aFRR capacity bidding analysis.
class AFRROptimizer {
    constructor() {
        this.contractingStates = [];
        this.transitionMatrix = [];
        this.emissionMatrix = [];
        this.viterbiPath = [];
    }

    // Reset all instance state to ensure fresh start for each optimization
    reset() {
        this.contractingStates = [];
        this.transitionMatrix = [];
        this.emissionMatrix = [];
        this.viterbiPath = [];
    }

    // Enhanced contracting status categorization with multiple methods
    categorizeContractingStatus(contractingValues, method = 'quantile', options = {}) {
        switch (method) {
            case 'quantile':
                return this.categorizeByQuantiles(contractingValues, options);
            case 'kmeans':
                return this.categorizeByKMeans(contractingValues, options);
            case 'volatility':
                return this.categorizeByVolatility(contractingValues, options);
            case 'adaptive':
                return this.categorizeByAdaptiveThresholds(contractingValues, options);
            case 'zscore':
                return this.categorizeByZScore(contractingValues, options);
            case 'threshold':
                return this.categorizeByThresholds(contractingValues, options);
            default:
                return this.categorizeByQuantiles(contractingValues, options);
        }
    }

    // Original quantile-based categorization
    categorizeByQuantiles(contractingValues, options = {}) {
        const { lowPercentile = 33, highPercentile = 67 } = options;
        const sorted = [...contractingValues].sort((a, b) => a - b);
        const qLow = sorted[Math.floor(sorted.length * lowPercentile / 100)];
        const qHigh = sorted[Math.floor(sorted.length * highPercentile / 100)];

        return contractingValues.map(value => {
            if (value <= qLow) return 1; // Undercontracted (low contracting status)
            if (value <= qHigh) return 2; // Balanced (medium contracting status)
            return 3; // Overcontracted (high contracting status)
        });
    }

    // K-means clustering for contracting status categorization
    categorizeByKMeans(contractingValues, options = {}) {
        const { k = 3, maxIterations = 100, tolerance = 0.001 } = options;
        
        // Initialize centroids using k-means++ method
        const centroids = this.kMeansPlusPlus(contractingValues, k);
        
        let iterations = 0;
        let converged = false;
        
        while (!converged && iterations < maxIterations) {
            // Assign points to nearest centroid
            const assignments = contractingValues.map(value => {
                let minDistance = Infinity;
                let bestCentroid = 0;
                
                for (let i = 0; i < k; i++) {
                    const distance = Math.abs(value - centroids[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCentroid = i;
                    }
                }
                return bestCentroid;
            });
            
            // Update centroids
            const newCentroids = Array(k).fill(0).map(() => ({ sum: 0, count: 0 }));
            
            for (let i = 0; i < contractingValues.length; i++) {
                const centroid = assignments[i];
                newCentroids[centroid].sum += contractingValues[i];
                newCentroids[centroid].count++;
            }
            
            // Check convergence
            let maxChange = 0;
            for (let i = 0; i < k; i++) {
                if (newCentroids[i].count > 0) {
                    const newCentroid = newCentroids[i].sum / newCentroids[i].count;
                    const change = Math.abs(newCentroid - centroids[i]);
                    maxChange = Math.max(maxChange, change);
                    centroids[i] = newCentroid;
                }
            }
            
            converged = maxChange < tolerance;
            iterations++;
        }
        
        // Sort centroids to ensure consistent ordering (low to high)
        const sortedCentroids = [...centroids].sort((a, b) => a - b);
        const centroidMap = {};
        sortedCentroids.forEach((centroid, index) => {
            centroidMap[centroid] = index + 1; // 1-indexed categories
        });
        
        return contractingValues.map(value => {
            let minDistance = Infinity;
            let bestCentroid = 0;
            
            for (let i = 0; i < k; i++) {
                const distance = Math.abs(value - centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCentroid = centroids[i];
                }
            }
            
            return centroidMap[bestCentroid];
        });
    }

    // K-means++ initialization
    kMeansPlusPlus(contractingValues, k) {
        const centroids = [contractingValues[Math.floor(Math.random() * contractingValues.length)]];
        
        for (let i = 1; i < k; i++) {
            const distances = contractingValues.map(value => {
                let minDistance = Infinity;
                for (const centroid of centroids) {
                    const distance = Math.pow(value - centroid, 2);
                    minDistance = Math.min(minDistance, distance);
                }
                return minDistance;
            });
            
            const totalDistance = distances.reduce((sum, d) => sum + d, 0);
            let random = Math.random() * totalDistance;
            let selectedIndex = 0;
            
            for (let j = 0; j < distances.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            
            centroids.push(contractingValues[selectedIndex]);
        }
        
        return centroids;
    }

    // Volatility-based categorization
    categorizeByVolatility(contractingValues, options = {}) {
        const { windowSize = 96, volatilityThreshold = 0.1 } = options; // 96 = 24 hours at 15-min resolution
        const categories = [];
        
        for (let i = 0; i < contractingValues.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = contractingValues.slice(start, i + 1);
            const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
            const variance = window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length;
            const volatility = Math.sqrt(variance) / Math.abs(mean);
            
            if (volatility > volatilityThreshold) {
                // High volatility periods - categorize based on value relative to local mean
                if (contractingValues[i] < mean * 0.95) {
                    categories.push(1); // Undercontracted
                } else if (contractingValues[i] > mean * 1.05) {
                    categories.push(3); // Overcontracted
                } else {
                    categories.push(2); // Balanced
                }
            } else {
                // Low volatility periods - use global statistics
                const globalMean = contractingValues.reduce((sum, v) => sum + v, 0) / contractingValues.length;
                if (contractingValues[i] < globalMean * 0.9) {
                    categories.push(1); // Undercontracted
                } else if (contractingValues[i] > globalMean * 1.1) {
                    categories.push(3); // Overcontracted
                } else {
                    categories.push(2); // Balanced
                }
            }
        }
        
        return categories;
    }

    // Adaptive thresholds based on market conditions
    categorizeByAdaptiveThresholds(contractingValues, options = {}) {
        const { sensitivity = 0.2, minSpread = 0.1 } = options;
        const categories = [];
        
        // Calculate rolling statistics
        const windowSize = Math.min(96, Math.floor(contractingValues.length / 4)); // 24 hours
        const rollingStats = [];
        
        for (let i = 0; i < contractingValues.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = contractingValues.slice(start, i + 1);
            const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
            const std = Math.sqrt(window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length);
            
            rollingStats.push({ mean, std });
        }
        
        // Adaptive categorization
        for (let i = 0; i < contractingValues.length; i++) {
            const { mean, std } = rollingStats[i];
            const value = contractingValues[i];
            
            // Adjust thresholds based on volatility
            let lowThreshold = mean - sensitivity * std;
            let highThreshold = mean + sensitivity * std;
            
            // Ensure minimum spread
            const spread = highThreshold - lowThreshold;
            const minSpreadValue = Math.abs(mean) * minSpread;
            
            if (spread < minSpreadValue) {
                const adjustment = (minSpreadValue - spread) / 2;
                lowThreshold -= adjustment;
                highThreshold += adjustment;
            }
            
            if (value <= lowThreshold) {
                categories.push(1); // Undercontracted
            } else if (value >= highThreshold) {
                categories.push(3); // Overcontracted
            } else {
                categories.push(2); // Balanced
            }
        }
        
        return categories;
    }

    // Z-score based categorization
    categorizeByZScore(contractingValues, options = {}) {
        const { lowThreshold = -0.5, highThreshold = 0.5 } = options;
        const mean = contractingValues.reduce((sum, v) => sum + v, 0) / contractingValues.length;
        const std = Math.sqrt(contractingValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / contractingValues.length);
        
        return contractingValues.map(value => {
            const zScore = (value - mean) / std;
            
            if (zScore <= lowThreshold) return 1; // Undercontracted
            if (zScore >= highThreshold) return 3; // Overcontracted
            return 2; // Balanced
        });
    }

    // Threshold-based categorization for aFRR market
    categorizeByThresholds(contractingValues, options = {}) {
        const { undercontractedThreshold = -100, overcontractedThreshold = 100 } = options;
        
        return contractingValues.map(value => {
            if (value <= undercontractedThreshold) return 1; // Undercontracted
            if (value >= overcontractedThreshold) return 3; // Overcontracted
            return 2; // Balanced
        });
    }

    // Calculates the transition probabilities between contracting states
    calculateTransitionMatrix(categories) {
        const transitions = Array(3).fill().map(() => Array(3).fill(0)); // Initialize 3x3 matrix with zeros

        for (let i = 0; i < categories.length - 1; i++) {
            const from = categories[i] - 1; // Convert 1-indexed category to 0-indexed array index
            const to = categories[i + 1] - 1;
            transitions[from][to]++; // Increment transition count
        }

        // Normalize counts to probabilities, adding a small smoothing factor (0.1) to avoid zero probabilities.
        return transitions.map(row => {
            const sum = row.reduce((a, b) => a + b, 0);
            if (sum === 0) return [1/3, 1/3, 1/3]; // Fallback if no transitions from a state
            return row.map(val => (val + 0.1) / (sum + 0.3)); // Laplace smoothing
        });
    }

    // Initializes the emission matrix for aFRR market actions
    initializeEmissionMatrix(contractingValues, categorizationMethod = 'quantile', categorizationOptions = {}) {
        const categories = this.categorizeContractingStatus(contractingValues, categorizationMethod, categorizationOptions);
        // Initialize counts for bid_up, no_bid, bid_down for each of the 3 contracting states
        const categoryStats = [
            { bid_up: 0, no_bid: 0, bid_down: 0 },
            { bid_up: 0, no_bid: 0, bid_down: 0 },
            { bid_up: 0, no_bid: 0, bid_down: 0 }
        ];

        const avgValue = contractingValues.reduce((a, b) => a + b, 0) / contractingValues.length;
        
        categories.forEach((cat, i) => {
            const value = contractingValues[i];
            // Heuristic for aFRR action based on contracting status
            if (value < avgValue * 0.8) { // Undercontracted, likely to bid up
                categoryStats[cat - 1].bid_up++;
            } else if (value > avgValue * 1.2) { // Overcontracted, likely to bid down
                categoryStats[cat - 1].bid_down++;
            } else { // Balanced, likely to no bid
                categoryStats[cat - 1].no_bid++;
            }
        });

        // Normalize counts to probabilities, adding smoothing factor.
        return categoryStats.map(stats => {
            const total = stats.bid_up + stats.no_bid + stats.bid_down + 3; // +3 for Laplace smoothing
            return [
                (stats.bid_up + 1) / total,
                (stats.no_bid + 1) / total,
                (stats.bid_down + 1) / total
            ];
        });
    }

    // Implements the Viterbi algorithm to find the most likely sequence of contracting states
    viterbiDecode(observations, transitionMatrix, emissionMatrix, initialProbs = [1/3, 1/3, 1/3]) {
        const T = observations.length; // Number of observations (time steps)
        const N = transitionMatrix.length; // Number of hidden states (contracting states)

        if (T === 0) return []; // Handle empty observation sequence

        // Viterbi matrix: stores the maximum probability of a path ending at state s at time t.
        const viterbi = Array(T).fill().map(() => Array(N).fill(-Infinity));
        // Path matrix: stores the predecessor state that led to the maximum probability.
        const path = Array(T).fill().map(() => Array(N).fill(0));

        // Initialization step (t=0).
        for (let s = 0; s < N; s++) {
            const emission = emissionMatrix[s][observations[0] - 1] || 0.001; // Get emission probability, use 0.001 for smoothing
            viterbi[0][s] = Math.log(initialProbs[s]) + Math.log(emission); // Use log probabilities to prevent underflow
        }

        // Recursion step (t=1 to T-1).
        for (let t = 1; t < T; t++) {
            for (let s = 0; s < N; s++) {
                let maxProb = -Infinity;
                let maxState = 0;

                for (let prevS = 0; prevS < N; prevS++) {
                    const trans = transitionMatrix[prevS][s] || 0.001; // Transition probability
                    const prob = viterbi[t-1][prevS] + Math.log(trans);
                    if (prob > maxProb) {
                        maxProb = prob;
                        maxState = prevS;
                    }
                }

                const emission = emissionMatrix[s][observations[t] - 1] || 0.001;
                viterbi[t][s] = maxProb + Math.log(emission);
                path[t][s] = maxState;
            }
        }

        // Termination and Path Backtracking.
        const bestPath = Array(T);
        let maxProb = -Infinity;
        let bestLastState = 0;

        // Find the last state with the highest probability.
        for (let s = 0; s < N; s++) {
            if (viterbi[T-1][s] > maxProb) {
                maxProb = viterbi[T-1][s];
                bestLastState = s;
            }
        }

        bestPath[T-1] = bestLastState + 1; // Convert back to 1-indexed
        // Backtrack to find the full path.
        for (let t = T-2; t >= 0; t--) {
            bestPath[t] = path[t+1][bestPath[t+1] - 1] + 1;
        }

        return bestPath;
    }

    // Main analysis function that orchestrates the HMM and contracting status analysis
    analyze(contractingValues, categorizationMethod = 'quantile', categorizationOptions = {}) {
        try {
            // Reset optimizer state to ensure fresh start
            this.reset();
            
            if (!contractingValues || contractingValues.length === 0) {
                throw new Error('No contracting status data provided');
            }

            console.log(`Starting aFRR analysis with ${contractingValues.length} data points`);
            console.log(`Categorization method: ${categorizationMethod}`);

            // 1. Categorize contracting values to create observations for HMM
            this.contractingStates = this.categorizeContractingStatus(contractingValues, categorizationMethod, categorizationOptions);
            console.log(`Contracting states calculated: ${this.contractingStates.length} states`);
            
            // 2. Calculate transition probabilities between hidden states
            this.transitionMatrix = this.calculateTransitionMatrix(this.contractingStates);
            console.log(`Transition matrix calculated`);
            
            // 3. Initialize emission probabilities (action likelihood given state)
            this.emissionMatrix = this.initializeEmissionMatrix(contractingValues, categorizationMethod, categorizationOptions);
            console.log(`Emission matrix initialized`);
            
            // 4. Use Viterbi to find the most likely sequence of hidden states
            this.viterbiPath = this.viterbiDecode(this.contractingStates, this.transitionMatrix, this.emissionMatrix);
            console.log(`Viterbi path calculated: ${this.viterbiPath.length} states`);

            // Calculate key performance indicators
            const avgContractingValue = contractingValues.reduce((a, b) => a + b, 0) / contractingValues.length;
            const minContractingValue = Math.min(...contractingValues);
            const maxContractingValue = Math.max(...contractingValues);
            const stdContractingValue = Math.sqrt(contractingValues.reduce((sum, v) => sum + Math.pow(v - avgContractingValue, 2), 0) / contractingValues.length);

            // Count state distributions
            const stateCounts = this.contractingStates.reduce((counts, state) => {
                counts[state] = (counts[state] || 0) + 1;
                return counts;
            }, {});

            const viterbiStateCounts = this.viterbiPath.reduce((counts, state) => {
                counts[state] = (counts[state] || 0) + 1;
                return counts;
            }, {});

            console.log(`aFRR analysis completed successfully`);

            return {
                success: true,
                contractingStates: this.contractingStates,
                transitionMatrix: this.transitionMatrix,
                emissionMatrix: this.emissionMatrix,
                viterbiPath: this.viterbiPath,
                avgContractingValue,
                minContractingValue,
                maxContractingValue,
                stdContractingValue,
                stateCounts,
                viterbiStateCounts,
                categorizationMethod,
                categorizationOptions
            };
        } catch (error) {
            console.error(`aFRR analysis failed with error:`, error);
            console.error(`Error stack:`, error.stack);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test method to verify the analysis
    testAnalysis() {
        console.log('=== Testing aFRR Analysis ===');
        
        // Reset optimizer state
        this.reset();
        
        // Simple test case: 96 periods (24 hours at 15-min resolution) with known contracting values
        const testContractingValues = [
            // Undercontracted periods (negative values)
            -200, -180, -160, -140, -120, -100, -80, -60,
            // Balanced periods (around zero)
            -40, -20, 0, 20, 40, 60, 80, 100,
            // Overcontracted periods (positive values)
            120, 140, 160, 180, 200, 220, 240, 260,
            // Back to balanced
            200, 180, 160, 140, 120, 100, 80, 60
        ];
        
        console.log('Test contracting values:', testContractingValues);
        
        const result = this.analyze(testContractingValues, 'quantile');
        
        if (result.success) {
            console.log('✓ aFRR analysis successful');
            console.log('Average contracting value:', result.avgContractingValue.toFixed(2));
            console.log('State distribution:', result.stateCounts);
            console.log('Viterbi state distribution:', result.viterbiStateCounts);
            
            // Verify state categorization
            const undercontractedCount = result.stateCounts[1] || 0;
            const balancedCount = result.stateCounts[2] || 0;
            const overcontractedCount = result.stateCounts[3] || 0;
            
            console.log(`Undercontracted periods: ${undercontractedCount}`);
            console.log(`Balanced periods: ${balancedCount}`);
            console.log(`Overcontracted periods: ${overcontractedCount}`);
            
            // Show transition matrix
            console.log('Transition Matrix:');
            result.transitionMatrix.forEach((row, i) => {
                const stateNames = ['Undercontracted', 'Balanced', 'Overcontracted'];
                console.log(`${stateNames[i]}: [${row.map(p => p.toFixed(3)).join(', ')}]`);
            });
            
        } else {
            console.log('✗ aFRR analysis failed:', result.error);
        }
        
        console.log('=== End Test ===');
        return result;
    }

    // Test and compare different categorization methods
    testCategorizationMethods(contractingValues) {
        console.log('=== Testing Contracting Status Categorization Methods ===');
        
        const methods = [
            { name: 'quantile', options: {} },
            { name: 'kmeans', options: { k: 3, maxIterations: 50 } },
            { name: 'volatility', options: { windowSize: 48, volatilityThreshold: 0.15 } },
            { name: 'adaptive', options: { sensitivity: 0.3, minSpread: 0.15 } },
            { name: 'zscore', options: { lowThreshold: -0.7, highThreshold: 0.7 } },
            { name: 'threshold', options: { undercontractedThreshold: -100, overcontractedThreshold: 100 } }
        ];
        
        const results = {};
        
        for (const method of methods) {
            console.log(`\n--- Testing ${method.name} categorization ---`);
            
            try {
                // Reset optimizer state
                this.reset();
                
                // Test categorization
                const categories = this.categorizeContractingStatus(contractingValues, method.name, method.options);
                
                // Count category distribution
                const categoryCounts = categories.reduce((counts, cat) => {
                    counts[cat] = (counts[cat] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('Category distribution:', categoryCounts);
                
                // Run full analysis
                const result = this.analyze(contractingValues, method.name, method.options);
                
                if (result.success) {
                    results[method.name] = {
                        categories,
                        categoryCounts,
                        avgContractingValue: result.avgContractingValue,
                        stdContractingValue: result.stdContractingValue,
                        stateCounts: result.stateCounts
                    };
                    
                    console.log(`✓ ${method.name}: Avg=${result.avgContractingValue.toFixed(2)}, Std=${result.stdContractingValue.toFixed(2)}`);
                } else {
                    console.log(`✗ ${method.name}: Failed - ${result.error}`);
                }
                
            } catch (error) {
                console.log(`✗ ${method.name}: Error - ${error.message}`);
            }
        }
        
        // Compare results
        console.log('\n=== Categorization Method Comparison ===');
        console.log('Category Distribution Comparison:');
        Object.entries(results).forEach(([method, result]) => {
            console.log(`${method}: ${JSON.stringify(result.categoryCounts)}`);
        });
        
        return results;
    }
}

// Export the AFRROptimizer class for use in other files
export default AFRROptimizer; 