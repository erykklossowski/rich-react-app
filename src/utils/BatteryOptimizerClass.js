// Path: src/utils/BatteryOptimizerClass.js

// The BatteryOptimizer class contains the core logic for HMM, Viterbi, and battery scheduling.
class BatteryOptimizer {
    constructor() {
        this.priceCategories = [];
        this.transitionMatrix = [];
        this.emissionMatrix = [];
        this.viterbiPath = [];
    }

    // Reset all instance state to ensure fresh start for each optimization
    reset() {
        this.priceCategories = [];
        this.transitionMatrix = [];
        this.emissionMatrix = [];
        this.viterbiPath = [];
    }

    // Enhanced price categorization with multiple methods
    categorizePrices(prices, method = 'quantile', options = {}) {
        switch (method) {
            case 'quantile':
                return this.categorizeByQuantiles(prices, options);
            case 'kmeans':
                return this.categorizeByKMeans(prices, options);
            case 'volatility':
                return this.categorizeByVolatility(prices, options);
            case 'adaptive':
                return this.categorizeByAdaptiveThresholds(prices, options);
            case 'zscore':
                return this.categorizeByZScore(prices, options);
            default:
                return this.categorizeByQuantiles(prices, options);
        }
    }

    // Original quantile-based categorization
    categorizeByQuantiles(prices, options = {}) {
        const { lowPercentile = 33, highPercentile = 67 } = options;
        const sorted = [...prices].sort((a, b) => a - b);
        const qLow = sorted[Math.floor(sorted.length * lowPercentile / 100)];
        const qHigh = sorted[Math.floor(sorted.length * highPercentile / 100)];

        return prices.map(price => {
            if (price <= qLow) return 1; // Low price category
            if (price <= qHigh) return 2; // Medium price category
            return 3; // High price category
        });
    }

    // K-means clustering for price categorization
    categorizeByKMeans(prices, options = {}) {
        const { k = 3, maxIterations = 100, tolerance = 0.001 } = options;
        
        // Initialize centroids using k-means++ method
        const centroids = this.kMeansPlusPlus(prices, k);
        
        let iterations = 0;
        let converged = false;
        
        while (!converged && iterations < maxIterations) {
            // Assign points to nearest centroid
            const assignments = prices.map(price => {
                let minDistance = Infinity;
                let bestCentroid = 0;
                
                for (let i = 0; i < k; i++) {
                    const distance = Math.abs(price - centroids[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCentroid = i;
                    }
                }
                return bestCentroid;
            });
            
            // Update centroids
            const newCentroids = Array(k).fill(0).map(() => ({ sum: 0, count: 0 }));
            
            for (let i = 0; i < prices.length; i++) {
                const centroid = assignments[i];
                newCentroids[centroid].sum += prices[i];
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
        
        return prices.map(price => {
            let minDistance = Infinity;
            let bestCentroid = 0;
            
            for (let i = 0; i < k; i++) {
                const distance = Math.abs(price - centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCentroid = centroids[i];
                }
            }
            
            return centroidMap[bestCentroid];
        });
    }

    // K-means++ initialization
    kMeansPlusPlus(prices, k) {
        const centroids = [prices[Math.floor(Math.random() * prices.length)]];
        
        for (let i = 1; i < k; i++) {
            const distances = prices.map(price => {
                let minDistance = Infinity;
                for (const centroid of centroids) {
                    const distance = Math.pow(price - centroid, 2);
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
            
            centroids.push(prices[selectedIndex]);
        }
        
        return centroids;
    }

    // Volatility-based categorization
    categorizeByVolatility(prices, options = {}) {
        const { windowSize = 24, volatilityThreshold = 0.1 } = options;
        const categories = [];
        
        for (let i = 0; i < prices.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = prices.slice(start, i + 1);
            const mean = window.reduce((sum, p) => sum + p, 0) / window.length;
            const variance = window.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / window.length;
            const volatility = Math.sqrt(variance) / mean;
            
            if (volatility > volatilityThreshold) {
                // High volatility periods - categorize based on price relative to local mean
                if (prices[i] < mean * 0.95) {
                    categories.push(1); // Low
                } else if (prices[i] > mean * 1.05) {
                    categories.push(3); // High
                } else {
                    categories.push(2); // Medium
                }
            } else {
                // Low volatility periods - use global statistics
                const globalMean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
                if (prices[i] < globalMean * 0.9) {
                    categories.push(1); // Low
                } else if (prices[i] > globalMean * 1.1) {
                    categories.push(3); // High
                } else {
                    categories.push(2); // Medium
                }
            }
        }
        
        return categories;
    }

    // Adaptive thresholds based on market conditions
    categorizeByAdaptiveThresholds(prices, options = {}) {
        const { sensitivity = 0.2, minSpread = 0.1 } = options;
        const categories = [];
        
        // Calculate rolling statistics
        const windowSize = Math.min(24, Math.floor(prices.length / 4));
        const rollingStats = [];
        
        for (let i = 0; i < prices.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = prices.slice(start, i + 1);
            const mean = window.reduce((sum, p) => sum + p, 0) / window.length;
            const std = Math.sqrt(window.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / window.length);
            
            rollingStats.push({ mean, std });
        }
        
        // Adaptive categorization
        for (let i = 0; i < prices.length; i++) {
            const { mean, std } = rollingStats[i];
            const price = prices[i];
            
            // Adjust thresholds based on volatility
            let lowThreshold = mean - sensitivity * std;
            let highThreshold = mean + sensitivity * std;
            
            // Ensure minimum spread
            const spread = highThreshold - lowThreshold;
            const minSpreadValue = mean * minSpread;
            
            if (spread < minSpreadValue) {
                const adjustment = (minSpreadValue - spread) / 2;
                lowThreshold -= adjustment;
                highThreshold += adjustment;
            }
            
            if (price <= lowThreshold) {
                categories.push(1); // Low
            } else if (price >= highThreshold) {
                categories.push(3); // High
            } else {
                categories.push(2); // Medium
            }
        }
        
        return categories;
    }

    // Z-score based categorization
    categorizeByZScore(prices, options = {}) {
        const { lowThreshold = -0.5, highThreshold = 0.5 } = options;
        const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const std = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length);
        
        return prices.map(price => {
            const zScore = (price - mean) / std;
            
            if (zScore <= lowThreshold) return 1; // Low price category
            if (zScore >= highThreshold) return 3; // High price category
            return 2; // Medium price category
        });
    }

    // Calculates the transition probabilities between price categories (hidden states).
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

    // Initializes the emission matrix (probability of observing an action given a hidden state).
    initializeEmissionMatrix(prices, categorizationMethod = 'quantile', categorizationOptions = {}) {
        const categories = this.categorizePrices(prices, categorizationMethod, categorizationOptions);
        // Initialize counts for charge, idle, discharge for each of the 3 price categories.
        const categoryStats = [
            { charge: 0, idle: 0, discharge: 0 },
            { charge: 0, idle: 0, discharge: 0 },
            { charge: 0, idle: 0, discharge: 0 }
        ];

        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        categories.forEach((cat, i) => {
            const price = prices[i];
            // Simple heuristic for action based on price relative to average.
            if (price < avgPrice * 0.8) { // Low price, likely to charge
                categoryStats[cat - 1].charge++;
            } else if (price > avgPrice * 1.2) { // High price, likely to discharge
                categoryStats[cat - 1].discharge++;
            } else { // Medium price, likely to idle
                categoryStats[cat - 1].idle++;
            }
        });

        // Normalize counts to probabilities, adding smoothing factor.
        return categoryStats.map(stats => {
            const total = stats.charge + stats.idle + stats.discharge + 3; // +3 for Laplace smoothing
            return [
                (stats.charge + 1) / total,
                (stats.idle + 1) / total,
                (stats.discharge + 1) / total
            ];
        });
    }

    // Implements the Viterbi algorithm to find the most likely sequence of hidden states.
    viterbiDecode(observations, transitionMatrix, emissionMatrix, initialProbs = [1/3, 1/3, 1/3]) {
        const T = observations.length; // Number of observations (time steps)
        const N = transitionMatrix.length; // Number of hidden states (price categories)

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

    // Optimizes battery charge/discharge schedule using constrained optimization
    optimizeBatterySchedule(prices, viterbiPath, params, timestamps = null) {
        // Use differential evolution for sophisticated optimization with Viterbi path guidance
        console.log('Using differential evolution optimization with Viterbi path guidance');
        return this.differentialEvolutionOptimize(prices, params, viterbiPath, timestamps);
    }

    // Simplified optimization for testing - bypasses complex constraints
    simpleOptimize(prices, params) {
        const T = prices.length;
        const schedule = {
            charging: Array(T).fill(0),
            discharging: Array(T).fill(0),
            soc: Array(T).fill(0),
            revenue: Array(T).fill(0),
            actions: Array(T).fill('idle')
        };

        if (T === 0) return schedule;

        // Simple greedy strategy: charge at low prices, discharge at high prices
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        let currentSoC = (params.socMin + params.socMax) / 2;

        for (let t = 0; t < T; t++) {
            const price = prices[t];
            
            // Store current SoC
            schedule.soc[t] = currentSoC;

            // Simple decision logic
            if (price < avgPrice * 0.8 && currentSoC < params.socMax * 0.9) {
                // Charge at low prices if we have room
                schedule.charging[t] = Math.min(params.pMax, (params.socMax - currentSoC) / params.efficiency);
                schedule.actions[t] = 'charge';
            } else if (price > avgPrice * 1.2 && currentSoC > params.socMin * 1.1) {
                // Discharge at high prices if we have energy
                schedule.discharging[t] = Math.min(params.pMax, currentSoC - params.socMin);
                schedule.actions[t] = 'discharge';
            } else {
                // Idle
                schedule.actions[t] = 'idle';
            }

            // Update SoC
            const energyCharged = schedule.charging[t] * params.efficiency;
            const energyDischarged = schedule.discharging[t];
            currentSoC = currentSoC + energyCharged - energyDischarged;
            currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));

            // Calculate revenue
            schedule.revenue[t] = schedule.discharging[t] * price - schedule.charging[t] * price;
        }

        return schedule;
    }

    // Differential Evolution optimization for battery scheduling
    differentialEvolutionOptimize(prices, params, viterbiPath, timestamps = null) {
        const T = prices.length;
        if (T === 0) {
            return {
                charging: [],
                discharging: [],
                soc: [],
                revenue: [],
                actions: []
            };
        }
        
        console.log(`Viterbi path integration: ${viterbiPath ? 'Enabled' : 'Disabled'}`);
        if (viterbiPath && viterbiPath.length > 0) {
            const categoryCounts = viterbiPath.reduce((counts, cat) => {
                counts[cat] = (counts[cat] || 0) + 1;
                return counts;
            }, {});
            console.log(`Viterbi path category distribution:`, categoryCounts);
        }

        // Define bounds for each time step (charging and discharging power)
        const bounds = [];
        for (let t = 0; t < T; t++) {
            bounds.push([0, params.pMax]); // Charging power bounds
            bounds.push([0, params.pMax]); // Discharging power bounds
        }

        // Cost function for differential evolution
        const costFunction = (individual) => {
            // Convert individual to charging/discharging schedule
            const charging = [];
            const discharging = [];
            
            for (let t = 0; t < T; t++) {
                charging.push(individual[t * 2]);
                discharging.push(individual[t * 2 + 1]);
            }

            // Calculate price statistics for efficiency-aware optimization
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceSpread = maxPrice - minPrice;
            
            // Efficiency-adjusted thresholds
            const efficiencyLoss = 1 - params.efficiency; // 15% loss for 85% efficiency
            const minProfitableSpread = avgPrice * efficiencyLoss * 3; // More conservative threshold
            
            // Define profitable trading zones
            const lowPriceThreshold = avgPrice - minProfitableSpread;
            const highPriceThreshold = avgPrice + minProfitableSpread;
            
            // Viterbi path guidance: categorize prices consistently with the HMM model
            const priceCategories = prices.map(price => {
                if (price <= avgPrice * 0.8) return 1; // Low price category
                if (price <= avgPrice * 1.2) return 2; // Medium price category
                return 3; // High price category
            });
            
            // Calculate SoC evolution and check constraints
            let currentSoC = (params.socMin + params.socMax) / 2;
            let totalRevenue = 0;
            let constraintViolation = 0;
            let inefficientTradingPenalty = 0;

            for (let t = 0; t < T; t++) {
                const price = prices[t];
                const charge = charging[t];
                const discharge = discharging[t];

                // HARD CONSTRAINT: never allow simultaneous charge/discharge
                if (charge > 0 && discharge > 0) {
                    // Set cost to a very large value and skip further calculation
                    return 1e20;
                }

                // Correct revenue calculation: sell high, buy low
                // Revenue = (energy sold * sell price) - (energy bought * buy price)
                const energyCharged = charge * params.efficiency;
                const energyDischarged = discharge;
                
                // Revenue from selling energy (positive)
                totalRevenue += energyDischarged * price;
                // Cost from buying energy (negative)
                totalRevenue -= charge * price;

                // Update SoC
                currentSoC = currentSoC + energyCharged - energyDischarged;

                // SoC constraint violation penalty
                if (currentSoC < params.socMin) {
                    constraintViolation += Math.pow(params.socMin - currentSoC, 2) * 1e6;
                    currentSoC = params.socMin;
                }
                if (currentSoC > params.socMax) {
                    constraintViolation += Math.pow(currentSoC - params.socMax, 2) * 1e6;
                    currentSoC = params.socMax;
                }

                // Viterbi path-guided trading incentives
                if (viterbiPath && viterbiPath[t] !== undefined) {
                    const predictedCategory = viterbiPath[t];
                    const currentCategory = priceCategories[t];
                    
                    // Viterbi path guidance: follow the predicted price category sequence
                    if (predictedCategory === 1) { // Predicted LOW price
                        if (charge > 0) {
                            // Bonus for charging when Viterbi predicts low prices
                            inefficientTradingPenalty -= charge * 1e3;
                        }
                        if (discharge > 0) {
                            // Heavy penalty for discharging when Viterbi predicts low prices
                            inefficientTradingPenalty += discharge * 1e4;
                        }
                    } else if (predictedCategory === 3) { // Predicted HIGH price
                        if (discharge > 0) {
                            // Bonus for discharging when Viterbi predicts high prices
                            inefficientTradingPenalty -= discharge * 1e3;
                        }
                        if (charge > 0) {
                            // Heavy penalty for charging when Viterbi predicts high prices
                            inefficientTradingPenalty += charge * 1e4;
                        }
                    } else { // Predicted MEDIUM price
                        // Moderate penalties for both charging and discharging
                        if (charge > 0) {
                            inefficientTradingPenalty += charge * 1e2;
                        }
                        if (discharge > 0) {
                            inefficientTradingPenalty += discharge * 1e2;
                        }
                    }
                    
                    // Additional penalty for deviation from predicted category
                    if (currentCategory !== predictedCategory) {
                        inefficientTradingPenalty += 500; // Penalty for category mismatch
                    }
                } else {
                    // Fallback to price-based incentives when Viterbi path is not available
                    if (charge > 0) {
                        if (price > lowPriceThreshold) {
                            // Heavy penalty for charging when price is not low enough
                            inefficientTradingPenalty += charge * (price - lowPriceThreshold) * 1e4;
                        } else {
                            // Bonus for charging at low prices
                            inefficientTradingPenalty -= charge * (lowPriceThreshold - price) * 1e2;
                        }
                    }
                    if (discharge > 0) {
                        if (price < highPriceThreshold) {
                            // Heavy penalty for discharging when price is not high enough
                            inefficientTradingPenalty += discharge * (highPriceThreshold - price) * 1e4;
                        } else {
                            // Bonus for discharging at high prices
                            inefficientTradingPenalty -= discharge * (price - highPriceThreshold) * 1e2;
                        }
                    }
                }


            }

            // Additional penalty for overall unprofitable strategies
            if (totalRevenue < 0) {
                inefficientTradingPenalty += Math.abs(totalRevenue) * 10;
            }

            // Return negative revenue (minimization problem) plus constraint penalties
            return -totalRevenue + constraintViolation + inefficientTradingPenalty;
        };

        // Differential evolution parameters
        const popsize = Math.min(30, Math.max(15, T * 1.5)); // Reduced population size
        const mutate = 0.5; // Mutation factor
        const recombination = 0.7; // Recombination rate
        const maxiter = Math.min(50, Math.max(25, T * 1.5)); // Reduced max generations
        
        // Bias initial population using Viterbi path guidance
        const viterbiLowIndices = [];
        const viterbiHighIndices = [];
        
        if (viterbiPath && viterbiPath.length > 0) {
            // Use Viterbi path to identify low and high price periods
            for (let t = 0; t < T; t++) {
                if (viterbiPath[t] === 1) { // Predicted low price
                    viterbiLowIndices.push(t);
                } else if (viterbiPath[t] === 3) { // Predicted high price
                    viterbiHighIndices.push(t);
                }
            }
        }
        
        // Fallback to price-based sorting if Viterbi path is not available
        const sortedIndices = prices.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
        const lowIndices = viterbiLowIndices.length > 0 ? viterbiLowIndices : sortedIndices.slice(0, Math.floor(T / 3));
        const highIndices = viterbiHighIndices.length > 0 ? viterbiHighIndices : sortedIndices.slice(-Math.floor(T / 3));

        // Initialize population
        const population = [];
        for (let i = 0; i < popsize; i++) {
            const individual = [];
            for (let t = 0; t < T; t++) {
                let charge = 0;
                let discharge = 0;
                if (i < popsize * 0.7) { // 70% of population is biased
                    if (lowIndices.includes(t)) {
                        charge = Math.random() * params.pMax;
                    }
                    if (highIndices.includes(t)) {
                        discharge = Math.random() * params.pMax;
                    }
                } else { // 30% is random
                    charge = Math.random() * params.pMax;
                    discharge = Math.random() * params.pMax;
                }
                // Enforce hard constraint in initial population
                if (charge > 0 && discharge > 0) {
                    if (charge > discharge) {
                        discharge = 0;
                    } else {
                        charge = 0;
                    }
                }
                individual.push(charge);
                individual.push(discharge);
            }
            population.push(individual);
        }

        let bestSolution = null;
        let bestScore = Infinity;

        // Main evolution loop
        for (let generation = 0; generation < maxiter; generation++) {
            const newPopulation = [];

            for (let j = 0; j < popsize; j++) {
                // Select three random individuals (excluding current)
                const candidates = Array.from({length: popsize}, (_, i) => i).filter(i => i !== j);
                const randomIndices = this.shuffleArray(candidates).slice(0, 3);
                
                const x1 = population[randomIndices[0]];
                const x2 = population[randomIndices[1]];
                const x3 = population[randomIndices[2]];
                const target = population[j];

                // Mutation: create donor vector
                const donor = [];
                for (let k = 0; k < target.length; k++) {
                    donor.push(x1[k] + mutate * (x2[k] - x3[k]));
                }

                // Ensure bounds
                for (let k = 0; k < donor.length; k++) {
                    donor[k] = Math.max(bounds[k][0], Math.min(bounds[k][1], donor[k]));
                }

                // Recombination: create trial vector
                const trial = [];
                for (let k = 0; k < target.length; k++) {
                    if (Math.random() <= recombination) {
                        trial.push(donor[k]);
                    } else {
                        trial.push(target[k]);
                    }
                }

                // Selection
                const trialScore = costFunction(trial);
                const targetScore = costFunction(target);

                if (trialScore < targetScore) {
                    newPopulation.push(trial);
                    if (trialScore < bestScore) {
                        bestScore = trialScore;
                        bestSolution = [...trial];
                    }
                } else {
                    newPopulation.push(target);
                    if (targetScore < bestScore) {
                        bestScore = targetScore;
                        bestSolution = [...target];
                    }
                }
            }

            population.length = 0;
            population.push(...newPopulation);

            // Less frequent logging in production mode
            if (generation % (10) === 0) {
                console.log(`  Generation ${generation}: Best score = ${bestScore.toFixed(2)}`);
            }
        }

        // After evolution, reconstruct the schedule from bestSolution
        const schedule = {
            charging: Array(T).fill(0),
            discharging: Array(T).fill(0),
            soc: Array(T).fill(0),
            revenue: Array(T).fill(0),
            actions: Array(T).fill('idle'),
            timestamps: timestamps || Array(T).fill(null) // Use provided timestamps or null
        };
        let currentSoC = (params.socMin + params.socMax) / 2;
        for (let t = 0; t < T; t++) {
            let charge = bestSolution[t * 2];
            let discharge = bestSolution[t * 2 + 1];
            // Enforce hard constraint: only one action per timestep
            if (charge > 0 && discharge > 0) {
                if (charge > discharge) {
                    discharge = 0;
                } else {
                    charge = 0;
                }
            }
            schedule.charging[t] = charge;
            schedule.discharging[t] = discharge;
            // Store current SoC
            schedule.soc[t] = currentSoC;
            // Update SoC
            const energyCharged = charge * params.efficiency;
            const energyDischarged = discharge;
            currentSoC = currentSoC + energyCharged - energyDischarged;
            currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));
            // Calculate revenue (same logic as in cost function)
            schedule.revenue[t] = discharge * prices[t] - charge * prices[t];
            // Determine action
            if (charge > 0) {
                schedule.actions[t] = 'charge';
            } else if (discharge > 0) {
                schedule.actions[t] = 'discharge';
            } else {
                schedule.actions[t] = 'idle';
            }
        }
        console.log(`Differential evolution completed. Best revenue: ${schedule.revenue.reduce((sum, r) => sum + r, 0)}`);
        return schedule;
    }

    // Differential evolution algorithm implementation
    runDifferentialEvolution(costFunc, bounds, popsize, mutate, recombination, maxiter) {
        // Initialize population
        const population = [];
        for (let i = 0; i < popsize; i++) {
            const individual = [];
            for (let j = 0; j < bounds.length; j++) {
                individual.push(bounds[j][0] + Math.random() * (bounds[j][1] - bounds[j][0]));
            }
            population.push(individual);
        }

        let bestSolution = null;
        let bestScore = Infinity;

        // Main evolution loop
        for (let generation = 0; generation < maxiter; generation++) {
            const newPopulation = [];

            for (let j = 0; j < popsize; j++) {
                // Select three random individuals (excluding current)
                const candidates = Array.from({length: popsize}, (_, i) => i).filter(i => i !== j);
                const randomIndices = this.shuffleArray(candidates).slice(0, 3);
                
                const x1 = population[randomIndices[0]];
                const x2 = population[randomIndices[1]];
                const x3 = population[randomIndices[2]];
                const target = population[j];

                // Mutation: create donor vector
                const donor = [];
                for (let k = 0; k < target.length; k++) {
                    donor.push(x1[k] + mutate * (x2[k] - x3[k]));
                }

                // Ensure bounds
                for (let k = 0; k < donor.length; k++) {
                    donor[k] = Math.max(bounds[k][0], Math.min(bounds[k][1], donor[k]));
                }

                // Recombination: create trial vector
                const trial = [];
                for (let k = 0; k < target.length; k++) {
                    if (Math.random() <= recombination) {
                        trial.push(donor[k]);
                    } else {
                        trial.push(target[k]);
                    }
                }

                // Selection
                const trialScore = costFunc(trial);
                const targetScore = costFunc(target);

                if (trialScore < targetScore) {
                    newPopulation.push(trial);
                    if (trialScore < bestScore) {
                        bestScore = trialScore;
                        bestSolution = [...trial];
                    }
                } else {
                    newPopulation.push(target);
                    if (targetScore < bestScore) {
                        bestScore = targetScore;
                        bestSolution = [...target];
                    }
                }
            }

            population.length = 0;
            population.push(...newPopulation);

            if (generation % 10 === 0) {
                console.log(`  Generation ${generation}: Best score = ${bestScore.toFixed(2)}`);
            }
        }

        return bestSolution;
    }

    // Helper function to shuffle array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Calculate actual battery cycles by counting charge/discharge cycles between min and max SoC
    calculateBatteryCycles(socValues, params) {
        if (socValues.length < 2) return 0;
        
        let cycles = 0;
        let currentDirection = 0; // 0 = neutral, 1 = charging, -1 = discharging
        let lastDirection = 0;
        let cycleStartSoC = socValues[0];
        let cycleEndSoC = socValues[0];
        
        // Define cycle thresholds (10% of the SoC range to avoid counting noise)
        const cycleThreshold = (params.socMax - params.socMin) * 0.1;
        const minCycleRange = (params.socMax - params.socMin) * 0.5; // Minimum 50% of range for a valid cycle
        
        console.log('Cycle Calculation Debug:');
        console.log('  SoC Range:', params.socMax - params.socMin, 'MWh');
        console.log('  Cycle threshold:', cycleThreshold.toFixed(2), 'MWh');
        console.log('  Min cycle range:', minCycleRange.toFixed(2), 'MWh');
        
        for (let i = 1; i < socValues.length; i++) {
            const prevSoC = socValues[i - 1];
            const currentSoC = socValues[i];
            const socChange = currentSoC - prevSoC;
            
            // Determine current direction
            if (Math.abs(socChange) > cycleThreshold) {
                currentDirection = socChange > 0 ? 1 : -1;
            } else {
                currentDirection = 0; // Neutral if change is too small
            }
            
            // Debug: Log significant changes
            if (Math.abs(socChange) > cycleThreshold) {
                console.log(`  Hour ${i}: SoC ${prevSoC.toFixed(2)} → ${currentSoC.toFixed(2)} (change: ${socChange.toFixed(2)}, direction: ${currentDirection === 1 ? 'charging' : 'discharging'})`);
            }
            
            // Detect direction change (cycle completion)
            if (lastDirection !== 0 && currentDirection !== 0 && lastDirection !== currentDirection) {
                // We have a direction change - check if it's a valid cycle
                const cycleRange = Math.abs(cycleEndSoC - cycleStartSoC);
                
                console.log(`  Direction change detected: ${lastDirection === 1 ? 'charging' : 'discharging'} → ${currentDirection === 1 ? 'charging' : 'discharging'}, cycle range: ${cycleRange.toFixed(2)} MWh`);
                
                if (cycleRange >= minCycleRange) {
                    cycles += 0.5; // Half cycle (charge or discharge)
                    console.log(`  ✓ Valid cycle ${cycles.toFixed(1)}: ${cycleStartSoC.toFixed(2)} → ${cycleEndSoC.toFixed(2)} (range: ${cycleRange.toFixed(2)} MWh)`);
                } else {
                    console.log(`  ✗ Invalid cycle: range ${cycleRange.toFixed(2)} MWh < minimum ${minCycleRange.toFixed(2)} MWh`);
                }
                
                // Start new cycle
                cycleStartSoC = currentSoC;
                cycleEndSoC = currentSoC;
            }
            
            // Update cycle end point
            cycleEndSoC = currentSoC;
            lastDirection = currentDirection;
        }
        
        // Check for final cycle
        const finalCycleRange = Math.abs(cycleEndSoC - cycleStartSoC);
        if (finalCycleRange >= minCycleRange) {
            cycles += 0.5;
            console.log(`  Final cycle ${cycles.toFixed(1)}: ${cycleStartSoC.toFixed(2)} → ${cycleEndSoC.toFixed(2)} (range: ${finalCycleRange.toFixed(2)} MWh)`);
        }
        
        console.log(`  Total cycles: ${cycles.toFixed(2)}`);
        return cycles;
    }

    // Main optimization function that orchestrates the HMM and scheduling.
    optimize(prices, params, categorizationMethod = 'quantile', categorizationOptions = {}, timestamps = null) {
        try {
            // Reset optimizer state to ensure fresh start
            this.reset();
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data provided');
            }

            console.log(`Starting optimization with ${prices.length} price points`);
            console.log(`Parameters:`, params);
            console.log(`Categorization method: ${categorizationMethod}`);

            // 1. Categorize prices to create observations for HMM.
            this.priceCategories = this.categorizePrices(prices, categorizationMethod, categorizationOptions);
            console.log(`Price categories calculated: ${this.priceCategories.length} categories`);
            
            // 2. Calculate transition probabilities between hidden states.
            this.transitionMatrix = this.calculateTransitionMatrix(this.priceCategories);
            console.log(`Transition matrix calculated`);
            
            // 3. Initialize emission probabilities (action likelihood given state).
            this.emissionMatrix = this.initializeEmissionMatrix(prices, categorizationMethod, categorizationOptions);
            console.log(`Emission matrix initialized`);
            
            // 4. Use Viterbi to find the most likely sequence of hidden states.
            this.viterbiPath = this.viterbiDecode(this.priceCategories, this.transitionMatrix, this.emissionMatrix);
            console.log(`Viterbi path calculated: ${this.viterbiPath.length} states`);

            // 5. Optimize battery schedule based on Viterbi path and parameters.
            console.log(`Starting battery schedule optimization...`);
            const schedule = this.optimizeBatterySchedule(prices, this.viterbiPath, params, timestamps);
            console.log(`Battery schedule optimization completed`);

            // Calculate key performance indicators.
            const totalRevenue = schedule.revenue.reduce((sum, rev) => sum + rev, 0);
            const totalEnergyCharged = schedule.charging.reduce((sum, charge) => sum + charge, 0);
            const totalEnergyDischarged = schedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
            const efficiency = totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0;

            console.log(`Performance metrics calculated: Revenue=${totalRevenue}, Charged=${totalEnergyCharged}, Discharged=${totalEnergyDischarged}`);

            // Calculate actual battery cycles using SoC evolution
            const actualCycles = this.calculateBatteryCycles(schedule.soc, params);

            // Calculate Volume Weighted Average Price (VWAP).
            let vwapChargeNumerator = 0;
            let vwapChargeDenominator = 0;
            let vwapDischargeNumerator = 0;
            let vwapDischargeDenominator = 0;

            for (let i = 0; i < prices.length; i++) {
                if (schedule.charging[i] > 0) {
                    vwapChargeNumerator += schedule.charging[i] * prices[i];
                    vwapChargeDenominator += schedule.charging[i];
                }
                if (schedule.discharging[i] > 0) {
                    vwapDischargeNumerator += schedule.discharging[i] * prices[i];
                    vwapDischargeDenominator += schedule.discharging[i];
                }
            }

            const vwapCharge = vwapChargeDenominator > 0 ? vwapChargeNumerator / vwapChargeDenominator : 0;
            const vwapDischarge = vwapDischargeDenominator > 0 ? vwapDischargeNumerator / vwapDischargeDenominator : 0;

            console.log(`Optimization completed successfully`);

            return {
                success: true,
                schedule,
                priceCategories: this.priceCategories,
                transitionMatrix: this.transitionMatrix,
                emissionMatrix: this.emissionMatrix,
                viterbiPath: this.viterbiPath,
                totalRevenue,
                totalEnergyCharged,
                totalEnergyDischarged,
                operationalEfficiency: efficiency,
                avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                cycles: actualCycles, // Use actual cycle count instead of flawed calculation
                vwapCharge,
                vwapDischarge
            };
        } catch (error) {
            console.error(`Optimization failed with error:`, error);
            console.error(`Error stack:`, error.stack);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test method to verify SoC calculation
    testSoCCalculation() {
        console.log('=== Testing SoC Calculation ===');
        
        // Reset optimizer state
        this.reset();
        
        // Simple test case: 24 hours with known prices
        const testPrices = [
            50, 45, 40, 35, 30, 25,  // Low prices (should charge)
            60, 65, 70, 75, 80, 85,  // Medium prices (should idle)
            90, 95, 100, 105, 110, 115,  // High prices (should discharge)
            80, 75, 70, 65, 60, 55   // Back to medium/low
        ];
        
        const testParams = {
            socMin: 10,
            socMax: 50,
            pMax: 5,
            efficiency: 0.85
        };
        
        console.log('Test parameters:', testParams);
        console.log('Test prices:', testPrices);
        
        const result = this.optimize(testPrices, testParams);
        
        if (result.success) {
            console.log('✓ Optimization successful');
            console.log('Final SoC:', result.schedule.soc[testPrices.length - 1]);
            console.log('SoC range used:', Math.max(...result.schedule.soc) - Math.min(...result.schedule.soc));
            console.log('Total revenue:', result.totalRevenue);
            
            // Verify SoC constraints
            const minSoC = Math.min(...result.schedule.soc);
            const maxSoC = Math.max(...result.schedule.soc);
            const socViolations = result.schedule.soc.filter(soc => 
                soc < testParams.socMin - 0.01 || soc > testParams.socMax + 0.01
            ).length;
            
            console.log('Min SoC achieved:', minSoC);
            console.log('Max SoC achieved:', maxSoC);
            console.log('SoC constraint violations:', socViolations);
            
            if (socViolations === 0) {
                console.log('✓ SoC constraints properly enforced');
            } else {
                console.log('✗ SoC constraint violations detected');
            }
            
            // Show SoC evolution and verify it matches charging/discharging
            console.log('\nSoC Evolution Analysis:');
            let expectedSoC = (testParams.socMin + testParams.socMax) / 2;
            let totalEnergyCharged = 0;
            let totalEnergyDischarged = 0;
            
            for (let t = 0; t < Math.min(10, testPrices.length); t++) {
                const actualSoC = result.schedule.soc[t];
                const charge = result.schedule.charging[t];
                const discharge = result.schedule.discharging[t];
                const energyCharged = charge * testParams.efficiency;
                const energyDischarged = discharge;
                
                totalEnergyCharged += energyCharged;
                totalEnergyDischarged += energyDischarged;
                
                console.log(`Hour ${t}: SoC=${actualSoC.toFixed(2)}, Charge=${charge.toFixed(2)}, Discharge=${discharge.toFixed(2)}, EnergyCharged=${energyCharged.toFixed(2)}, EnergyDischarged=${energyDischarged.toFixed(2)}`);
                
                // Verify SoC calculation
                if (t > 0) {
                    const expectedChange = energyCharged - energyDischarged;
                    const actualChange = actualSoC - result.schedule.soc[t-1];
                    const error = Math.abs(expectedChange - actualChange);
                    
                    if (error > 0.01) {
                        console.log(`  ⚠️ SoC calculation error at hour ${t}: expected change ${expectedChange.toFixed(2)}, actual change ${actualChange.toFixed(2)}`);
                    } else {
                        console.log(`  ✓ SoC calculation correct at hour ${t}`);
                    }
                }
            }
            
            console.log(`\nTotal energy charged: ${totalEnergyCharged.toFixed(2)} MWh`);
            console.log(`Total energy discharged: ${totalEnergyDischarged.toFixed(2)} MWh`);
            console.log(`Net energy change: ${(totalEnergyCharged - totalEnergyDischarged).toFixed(2)} MWh`);
            
            // Show first few and last few SoC values
            console.log('\nSoC evolution (first 5):', result.schedule.soc.slice(0, 5).map(s => s.toFixed(2)));
            console.log('SoC evolution (last 5):', result.schedule.soc.slice(-5).map(s => s.toFixed(2)));
            
        } else {
            console.log('✗ Optimization failed:', result.error);
        }
        
        console.log('=== End Test ===');
        return result;
    }

    // Test simplified optimization
    testSimpleOptimization() {
        console.log('=== Testing Simplified Optimization ===');
        
        // Reset optimizer state
        this.reset();
        
        const testPrices = [
            50, 45, 40, 35, 30, 25,  // Low prices (should charge)
            60, 65, 70, 75, 80, 85,  // Medium prices (should idle)
            90, 95, 100, 105, 110, 115,  // High prices (should discharge)
            80, 75, 70, 65, 60, 55   // Back to medium/low
        ];
        
        const testParams = {
            socMin: 10,
            socMax: 50,
            pMax: 5,
            efficiency: 0.85
        };
        
        console.log('Test parameters:', testParams);
        console.log('Test prices:', testPrices);
        
        const schedule = this.simpleOptimize(testPrices, testParams);
        
        // Calculate metrics
        const totalRevenue = schedule.revenue.reduce((sum, rev) => sum + rev, 0);
        const totalEnergyCharged = schedule.charging.reduce((sum, charge) => sum + charge, 0);
        const totalEnergyDischarged = schedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
        const minSoC = Math.min(...schedule.soc);
        const maxSoC = Math.max(...schedule.soc);
        
        console.log('✓ Simplified optimization completed');
        console.log('Total revenue:', totalRevenue);
        console.log('Total energy charged:', totalEnergyCharged);
        console.log('Total energy discharged:', totalEnergyDischarged);
        console.log('SoC range:', minSoC, '-', maxSoC);
        console.log('SoC range used:', maxSoC - minSoC);
        
        // Verify SoC constraints
        const socViolations = schedule.soc.filter(soc => 
            soc < testParams.socMin - 0.01 || soc > testParams.socMax + 0.01
        ).length;
        
        if (socViolations === 0) {
            console.log('✓ SoC constraints properly enforced');
        } else {
            console.log('✗ SoC constraint violations detected:', socViolations);
        }
        
        // Show action distribution
        const actionCounts = schedule.actions.reduce((counts, action) => {
            counts[action] = (counts[action] || 0) + 1;
            return counts;
        }, {});
        
        console.log('Action distribution:', actionCounts);
        
        console.log('=== End Simple Test ===');
        
        return {
            success: true,
            schedule,
            totalRevenue,
            totalEnergyCharged,
            totalEnergyDischarged,
            minSoC,
            maxSoC
        };
    }

    // Test differential evolution optimization
    testDifferentialEvolution() {
        console.log('=== Testing Differential Evolution Optimization ===');
        
        // Reset optimizer state
        this.reset();
        
        const testPrices = [
            50, 45, 40, 35, 30, 25,  // Low prices (should charge)
            60, 65, 70, 75, 80, 85,  // Medium prices (should idle)
            90, 95, 100, 105, 110, 115,  // High prices (should discharge)
            80, 75, 70, 65, 60, 55   // Back to medium/low
        ];
        
        const testParams = {
            socMin: 10,
            socMax: 50,
            pMax: 5,
            efficiency: 0.85
        };
        
        console.log('Test parameters:', testParams);
        console.log('Test prices:', testPrices);
        
        const schedule = this.differentialEvolutionOptimize(testPrices, testParams);
        
        // Calculate metrics
        const totalRevenue = schedule.revenue.reduce((sum, rev) => sum + rev, 0);
        const totalEnergyCharged = schedule.charging.reduce((sum, charge) => sum + charge, 0);
        const totalEnergyDischarged = schedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
        const minSoC = Math.min(...schedule.soc);
        const maxSoC = Math.max(...schedule.soc);
        
        // Calculate VWAP
        let vwapChargeNumerator = 0;
        let vwapChargeDenominator = 0;
        let vwapDischargeNumerator = 0;
        let vwapDischargeDenominator = 0;

        for (let i = 0; i < testPrices.length; i++) {
            if (schedule.charging[i] > 0) {
                vwapChargeNumerator += schedule.charging[i] * testPrices[i];
                vwapChargeDenominator += schedule.charging[i];
            }
            if (schedule.discharging[i] > 0) {
                vwapDischargeNumerator += schedule.discharging[i] * testPrices[i];
                vwapDischargeDenominator += schedule.discharging[i];
            }
        }

        const vwapCharge = vwapChargeDenominator > 0 ? vwapChargeNumerator / vwapChargeDenominator : 0;
        const vwapDischarge = vwapDischargeDenominator > 0 ? vwapDischargeNumerator / vwapDischargeDenominator : 0;
        
        console.log('✓ Differential evolution optimization completed');
        console.log('Total revenue:', totalRevenue);
        console.log('Total energy charged:', totalEnergyCharged);
        console.log('Total energy discharged:', totalEnergyDischarged);
        console.log('SoC range:', minSoC, '-', maxSoC);
        console.log('SoC range used:', maxSoC - minSoC);
        console.log('VWAP Charge:', vwapCharge.toFixed(2));
        console.log('VWAP Discharge:', vwapDischarge.toFixed(2));
        console.log('VWAP Spread:', (vwapDischarge - vwapCharge).toFixed(2));
        
        // Verify VWAP logic
        if (vwapCharge < vwapDischarge) {
            console.log('✓ VWAP logic correct: buying low, selling high');
        } else {
            console.log('✗ VWAP logic incorrect: buying high, selling low');
        }
        
        // Verify SoC constraints
        const socViolations = schedule.soc.filter(soc => 
            soc < testParams.socMin - 0.01 || soc > testParams.socMax + 0.01
        ).length;
        
        if (socViolations === 0) {
            console.log('✓ SoC constraints properly enforced');
        } else {
            console.log('✗ SoC constraint violations detected:', socViolations);
        }
        
        // Show action distribution
        const actionCounts = schedule.actions.reduce((counts, action) => {
            counts[action] = (counts[action] || 0) + 1;
            return counts;
        }, {});
        
        console.log('Action distribution:', actionCounts);
        
        // Check for simultaneous charge/discharge (should be minimized)
        const simultaneousActions = schedule.actions.filter(action => action === 'both').length;
        console.log('Simultaneous charge/discharge actions:', simultaneousActions);
        
        if (simultaneousActions === 0) {
            console.log('✓ No simultaneous charge/discharge actions');
        } else {
            console.log('✗ Simultaneous charge/discharge actions detected');
        }
        
        console.log('=== End Differential Evolution Test ===');
        
        return {
            success: true,
            schedule,
            totalRevenue,
            totalEnergyCharged,
            totalEnergyDischarged,
            minSoC,
            maxSoC,
            vwapCharge,
            vwapDischarge,
            method: 'differential_evolution'
        };
    }

    // Test and compare different price categorization methods
    testCategorizationMethods(prices, params) {
        console.log('=== Testing Price Categorization Methods ===');
        
        const methods = [
            { name: 'quantile', options: {} },
            { name: 'kmeans', options: { k: 3, maxIterations: 50 } },
            { name: 'volatility', options: { windowSize: 12, volatilityThreshold: 0.15 } },
            { name: 'adaptive', options: { sensitivity: 0.3, minSpread: 0.15 } },
            { name: 'zscore', options: { lowThreshold: -0.7, highThreshold: 0.7 } }
        ];
        
        const results = {};
        
        for (const method of methods) {
            console.log(`\n--- Testing ${method.name} categorization ---`);
            
            try {
                // Reset optimizer state
                this.reset();
                
                // Test categorization
                const categories = this.categorizePrices(prices, method.name, method.options);
                
                // Count category distribution
                const categoryCounts = categories.reduce((counts, cat) => {
                    counts[cat] = (counts[cat] || 0) + 1;
                    return counts;
                }, {});
                
                console.log('Category distribution:', categoryCounts);
                
                // Run full optimization
                const result = this.optimize(prices, params, method.name, method.options);
                
                if (result.success) {
                    results[method.name] = {
                        categories,
                        categoryCounts,
                        totalRevenue: result.totalRevenue,
                        vwapCharge: result.vwapCharge,
                        vwapDischarge: result.vwapDischarge,
                        vwapSpread: result.vwapDischarge - result.vwapCharge,
                        cycles: result.cycles
                    };
                    
                    console.log(`✓ ${method.name}: Revenue=${result.totalRevenue.toFixed(2)}, VWAP Spread=${(result.vwapDischarge - result.vwapCharge).toFixed(2)}`);
                } else {
                    console.log(`✗ ${method.name}: Failed - ${result.error}`);
                }
                
            } catch (error) {
                console.log(`✗ ${method.name}: Error - ${error.message}`);
            }
        }
        
        // Compare results
        console.log('\n=== Categorization Method Comparison ===');
        const sortedResults = Object.entries(results)
            .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);
        
        console.log('Ranking by Revenue:');
        sortedResults.forEach(([method, result], index) => {
            console.log(`${index + 1}. ${method}: Revenue=${result.totalRevenue.toFixed(2)}, VWAP Spread=${result.vwapSpread.toFixed(2)}, Cycles=${result.cycles.toFixed(2)}`);
        });
        
        console.log('\nCategory Distribution Comparison:');
        Object.entries(results).forEach(([method, result]) => {
            console.log(`${method}: ${JSON.stringify(result.categoryCounts)}`);
        });
        
        return results;
    }

    // aFRR analysis function for contracting status analysis
    analyze(contractingValues, categorizationMethod = 'quantile', categorizationOptions = {}) {
        try {
            console.log('Starting aFRR contracting status analysis...');
            
            if (!Array.isArray(contractingValues) || contractingValues.length === 0) {
                return { success: false, error: 'Invalid or empty contracting values' };
            }

            // Reset state for fresh analysis
            this.reset();

            // Categorize contracting values (similar to price categorization)
            this.priceCategories = this.categorizePrices(contractingValues, categorizationMethod, categorizationOptions);
            console.log(`Contracting categories calculated: ${this.priceCategories.length} categories`);

            // Calculate transition matrix
            this.transitionMatrix = this.calculateTransitionMatrix(this.priceCategories);
            console.log('Transition matrix calculated');

            // Initialize emission matrix (simplified for contracting analysis)
            this.emissionMatrix = this.initializeEmissionMatrix(contractingValues, categorizationMethod, categorizationOptions);
            console.log('Emission matrix initialized');

            // Run Viterbi decoding
            this.viterbiPath = this.viterbiDecode(this.priceCategories, this.transitionMatrix, this.emissionMatrix);
            console.log(`Viterbi path calculated: ${this.viterbiPath.length} states`);

            // Calculate statistics
            const stateCounts = {};
            const viterbiStateCounts = {};
            
            this.priceCategories.forEach(category => {
                stateCounts[category] = (stateCounts[category] || 0) + 1;
            });
            
            this.viterbiPath.forEach(state => {
                viterbiStateCounts[state] = (viterbiStateCounts[state] || 0) + 1;
            });

            // Calculate log likelihood (simplified)
            let logLikelihood = 0;
            for (let i = 0; i < this.viterbiPath.length; i++) {
                const state = this.viterbiPath[i];
                const observation = this.priceCategories[i];
                if (this.emissionMatrix[state] && this.emissionMatrix[state][observation]) {
                    logLikelihood += Math.log(this.emissionMatrix[state][observation]);
                }
            }

            console.log('aFRR analysis completed successfully');

            return {
                success: true,
                viterbiPath: this.viterbiPath,
                stateCounts: stateCounts,
                viterbiStateCounts: viterbiStateCounts,
                logLikelihood: logLikelihood,
                transitionMatrix: this.transitionMatrix,
                emissionMatrix: this.emissionMatrix,
                categories: this.priceCategories,
                contractingStats: {
                    min: Math.min(...contractingValues),
                    max: Math.max(...contractingValues),
                    avg: contractingValues.reduce((sum, v) => sum + v, 0) / contractingValues.length,
                    count: contractingValues.length
                }
            };

        } catch (error) {
            console.error('aFRR analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the BatteryOptimizer class for use in other files.
export default BatteryOptimizer;