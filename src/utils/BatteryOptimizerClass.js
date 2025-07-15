// Path: src/utils/BatteryOptimizerClass.js

// The BatteryOptimizer class contains the core logic for HMM, Viterbi, and battery scheduling.
class BatteryOptimizer {
    constructor() {
        this.priceCategories = [];
        this.transitionMatrix = [];
        this.emissionMatrix = [];
        this.viterbiPath = [];
    }

    // Categorizes prices into Low, Medium, High based on quantiles.
    categorizePrices(prices) {
        const sorted = [...prices].sort((a, b) => a - b);
        const q33 = sorted[Math.floor(sorted.length / 3)]; // 33rd percentile
        const q67 = sorted[Math.floor(2 * sorted.length / 3)]; // 67th percentile

        return prices.map(price => {
            if (price <= q33) return 1; // Low price category
            if (price <= q67) return 2; // Medium price category
            return 3; // High price category
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
    initializeEmissionMatrix(prices) {
        const categories = this.categorizePrices(prices);
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

    // Optimizes battery charge/discharge schedule based on Viterbi path and market prices.
    optimizeBatterySchedule(prices, viterbiPath, params) {
        const T = prices.length;
        const schedule = {
            charging: Array(T).fill(0),
            discharging: Array(T).fill(0),
            soc: Array(T).fill(0),
            revenue: Array(T).fill(0),
            actions: Array(T).fill('idle')
        };

        if (T === 0) return schedule;

        // Start at a more balanced SoC level to enable full range utilization
        let currentSoC = (params.socMin + params.socMax) / 2; // Start at middle of range
        schedule.soc[0] = currentSoC;

        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        // Calculate price percentiles for more dynamic thresholds
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const lowPriceThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.3)]; // 30th percentile
        const highPriceThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.7)]; // 70th percentile

        for (let t = 0; t < T; t++) {
            const state = viterbiPath[t]; // HMM predicted state for current hour
            const price = prices[t];

            let charge = 0, discharge = 0;
            let action = 'idle';

            // Dynamic price thresholds based on actual price distribution
            const isLowPrice = price <= lowPriceThreshold;
            const isHighPrice = price >= highPriceThreshold;
            const isMediumPrice = price > lowPriceThreshold && price < highPriceThreshold;
            
            // Very minimal buffers to use full SoC range
            const canCharge = currentSoC < params.socMax - 0.001;
            const canDischarge = currentSoC > params.socMin + 0.001;

            // Calculate SoC utilization and price advantage
            const socUtilization = (currentSoC - params.socMin) / (params.socMax - params.socMin);
            const priceAdvantage = (avgPrice - price) / avgPrice; // Positive = good for charging
            
            // Force aggressive utilization of full SoC range
            if (state === 1 && (isLowPrice || isMediumPrice) && canCharge) {
                // Charge aggressively in low price state
                const maxCharge = Math.min(
                    params.pMax,
                    (params.socMax - currentSoC) / params.efficiency
                );
                
                // Force charging to reach max SoC
                let chargeFactor = 1.0;
                if (isLowPrice) {
                    chargeFactor = 1.0; // Full capacity on low prices
                } else if (currentSoC < params.socMax * 0.8) {
                    chargeFactor = 0.9; // Aggressive charging when below 80%
                } else {
                    chargeFactor = 0.7; // Moderate charging when near max
                }
                
                charge = maxCharge * chargeFactor;
                currentSoC += charge * params.efficiency;
                action = 'charge';
            } else if (state === 3 && (isHighPrice || isMediumPrice) && canDischarge) {
                // Discharge aggressively in high price state
                const maxDischarge = Math.min(
                    params.pMax,
                    currentSoC - params.socMin
                );
                
                // Force discharging to reach min SoC
                let dischargeFactor = 1.0;
                if (isHighPrice) {
                    dischargeFactor = 1.0; // Full capacity on high prices
                } else if (currentSoC > params.socMax * 0.2) {
                    dischargeFactor = 0.9; // Aggressive discharging when above 20%
                } else {
                    dischargeFactor = 0.7; // Moderate discharging when near min
                }
                
                discharge = maxDischarge * dischargeFactor;
                currentSoC -= discharge;
                action = 'discharge';
            } else if (state === 2) {
                // Medium state: be opportunistic based on price and SoC
                if (isHighPrice && canDischarge && currentSoC > params.socMax * 0.3) {
                    // Discharge on high prices if SoC is above 30%
                    const maxDischarge = Math.min(
                        params.pMax * 0.8,
                        currentSoC - params.socMin
                    );
                    discharge = maxDischarge * 0.8;
                    currentSoC -= discharge;
                    action = 'discharge';
                } else if (isLowPrice && canCharge && currentSoC < params.socMax * 0.7) {
                    // Charge on low prices if SoC is below 70%
                    const maxCharge = Math.min(
                        params.pMax * 0.8,
                        (params.socMax - currentSoC) / params.efficiency
                    );
                    charge = maxCharge * 0.8;
                    currentSoC += charge * params.efficiency;
                    action = 'charge';
                } else if (isMediumPrice) {
                    // On medium prices, balance SoC towards middle
                    if (currentSoC > params.socMax * 0.6 && canDischarge) {
                        // Discharge if too high
                        const maxDischarge = Math.min(
                            params.pMax * 0.6,
                            currentSoC - params.socMin
                        );
                        discharge = maxDischarge * 0.6;
                        currentSoC -= discharge;
                        action = 'discharge';
                    } else if (currentSoC < params.socMax * 0.4 && canCharge) {
                        // Charge if too low
                        const maxCharge = Math.min(
                            params.pMax * 0.6,
                            (params.socMax - currentSoC) / params.efficiency
                        );
                        charge = maxCharge * 0.6;
                        currentSoC += charge * params.efficiency;
                        action = 'charge';
                    }
                }
            }

            // Store calculated values for the current hour.
            schedule.charging[t] = charge;
            schedule.discharging[t] = discharge;
            schedule.soc[t] = Math.max(params.socMin, Math.min(params.socMax, currentSoC)); // Ensure SoC stays within bounds
            schedule.revenue[t] = discharge * price - charge * price; // Calculate hourly revenue
            schedule.actions[t] = action;

            currentSoC = schedule.soc[t]; // Update current SoC for next iteration
        }

        return schedule;
    }

    // Main optimization function that orchestrates the HMM and scheduling.
    optimize(prices, params) {
        try {
            if (!prices || prices.length === 0) {
                throw new Error('No price data provided');
            }

            // 1. Categorize prices to create observations for HMM.
            this.priceCategories = this.categorizePrices(prices);
            // 2. Calculate transition probabilities between hidden states.
            this.transitionMatrix = this.calculateTransitionMatrix(this.priceCategories);
            // 3. Initialize emission probabilities (action likelihood given state).
            this.emissionMatrix = this.initializeEmissionMatrix(prices);
            // 4. Use Viterbi to find the most likely sequence of hidden states.
            this.viterbiPath = this.viterbiDecode(this.priceCategories, this.transitionMatrix, this.emissionMatrix);

            // 5. Optimize battery schedule based on Viterbi path and parameters.
            const schedule = this.optimizeBatterySchedule(prices, this.viterbiPath, params);

            // Calculate key performance indicators.
            const totalRevenue = schedule.revenue.reduce((sum, rev) => sum + rev, 0);
            const totalEnergyCharged = schedule.charging.reduce((sum, charge) => sum + charge, 0);
            const totalEnergyDischarged = schedule.discharging.reduce((sum, discharge) => sum + discharge, 0);
            const efficiency = totalEnergyCharged > 0 ? totalEnergyDischarged / totalEnergyCharged : 0;

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
                cycles: params.socMax > 0 ? Math.max(totalEnergyCharged, totalEnergyDischarged) / params.socMax : 0, // Avoid division by zero
                vwapCharge,
                vwapDischarge
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the BatteryOptimizer class for use in other files.
export default BatteryOptimizer;