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

    // Optimizes battery charge/discharge schedule using constrained optimization
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

        // Debug report collection
        const debugReport = {
            params: {},
            optimization: {},
            energyBalance: {},
            socAnalysis: {},
            hmmAnalysis: {},
            constraints: {},
            socEvolution: []
        };

        // Constrained optimization parameters
        const penaltyWeight = 1e6; // Penalty for violating state constraints
        const utilizationWeight = 1e4; // Weight for utilization incentives
        const socPenaltyWeight = 1e8; // Much stronger penalty for SoC violations
        const maxIterations = 2000; // More iterations for better convergence
        const learningRate = 0.005; // Smaller learning rate for stability
        const socConstraintWeight = 1e7; // Weight for SoC constraint violations during optimization

        // Initialize variables - start at middle to enable full range utilization
        let pCharge = Array(T).fill(0);
        let pDischarge = Array(T).fill(0);

        // Calculate price statistics for better decision making
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const priceThreshold = avgPrice * 0.6; // More conservative threshold
        const highPriceThreshold = avgPrice * 1.4; // Threshold for high prices

        // Gradient descent optimization
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let totalRevenue = 0;
            let totalPenalty = 0;
            let totalUtilization = 0;
            let totalSoCViolation = 0;

            // Forward pass: calculate SoC evolution and objective
            let currentSoC = (params.socMin + params.socMax) / 2; // Start at middle of range
            
            for (let t = 0; t < T; t++) {
                const state = viterbiPath[t];
                const price = prices[t];

                // Revenue calculation
                totalRevenue += pDischarge[t] * price - pCharge[t] * price;

                // State-based penalties with improved logic
                if (state === 1) { // Charging state
                    if (pDischarge[t] > 0) {
                        totalPenalty += penaltyWeight * pDischarge[t]; // Penalty for discharging
                    }
                    // Only charge if price is below threshold and we have room
                    if (price < priceThreshold && currentSoC < params.socMax * 0.95) {
                        totalUtilization += utilizationWeight * (pCharge[t] / params.pMax);
                    } else {
                        // Penalty for charging at high prices or when full
                        totalPenalty += penaltyWeight * 0.5 * pCharge[t];
                    }
                } else if (state === 3) { // Discharging state
                    if (pCharge[t] > 0) {
                        totalPenalty += penaltyWeight * pCharge[t]; // Penalty for charging
                    }
                    // Only discharge if price is above threshold and we have energy
                    if (price > highPriceThreshold && currentSoC > params.socMin * 1.05) {
                        totalUtilization += utilizationWeight * (pDischarge[t] / params.pMax);
                    } else {
                        // Penalty for discharging at low prices or when empty
                        totalPenalty += penaltyWeight * 0.5 * pDischarge[t];
                    }
                } else if (state === 2) { // Idle state
                    if (pCharge[t] > 0 || pDischarge[t] > 0) {
                        totalPenalty += penaltyWeight * (pCharge[t] + pDischarge[t]); // Penalty for any action
                    }
                }

                // Update SoC for next time step
                const energyCharged = pCharge[t] * params.efficiency; // Energy added to battery
                const energyDischarged = pDischarge[t]; // Energy removed from battery
                currentSoC = currentSoC + energyCharged - energyDischarged;
                
                // SoC bounds penalty - much stronger penalties
                if (currentSoC < params.socMin) {
                    totalSoCViolation += socConstraintWeight * Math.pow(params.socMin - currentSoC, 2);
                }
                if (currentSoC > params.socMax) {
                    totalSoCViolation += socConstraintWeight * Math.pow(currentSoC - params.socMax, 2);
                }
                
                // Ensure SoC stays within bounds for next iteration
                currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));
            }

            const objective = totalRevenue + totalUtilization - totalPenalty - totalSoCViolation;

            // Backward pass: calculate gradients and update variables
            currentSoC = (params.socMin + params.socMax) / 2; // Reset for gradient calculation
            
            for (let t = 0; t < T; t++) {
                const state = viterbiPath[t];
                const price = prices[t];

                // Gradient for pCharge[t]
                let gradCharge = -price; // Revenue gradient
                if (state === 1) {
                    if (price < priceThreshold && currentSoC < params.socMax * 0.95) {
                        gradCharge += utilizationWeight / params.pMax; // Utilization incentive
                    } else {
                        gradCharge -= penaltyWeight * 0.5; // Penalty
                    }
                } else if (state === 3) {
                    gradCharge -= penaltyWeight; // State violation penalty
                } else if (state === 2) {
                    gradCharge -= penaltyWeight; // State violation penalty
                }

                // Gradient for pDischarge[t]
                let gradDischarge = price; // Revenue gradient
                if (state === 3) {
                    if (price > highPriceThreshold && currentSoC > params.socMin * 1.05) {
                        gradDischarge += utilizationWeight / params.pMax; // Utilization incentive
                    } else {
                        gradDischarge -= penaltyWeight * 0.5; // Penalty
                    }
                } else if (state === 1) {
                    gradDischarge -= penaltyWeight; // State violation penalty
                } else if (state === 2) {
                    gradDischarge -= penaltyWeight; // State violation penalty
                }

                // SoC constraint gradients
                const energyCharged = pCharge[t] * params.efficiency;
                const energyDischarged = pDischarge[t];
                const newSoC = currentSoC + energyCharged - energyDischarged;
                
                if (newSoC < params.socMin) {
                    const violation = params.socMin - newSoC;
                    gradCharge -= socConstraintWeight * 2 * violation * params.efficiency; // Charge increases SoC
                    gradDischarge += socConstraintWeight * 2 * violation; // Discharge decreases SoC
                } else if (newSoC > params.socMax) {
                    const violation = newSoC - params.socMax;
                    gradCharge += socConstraintWeight * 2 * violation * params.efficiency; // Charge increases SoC
                    gradDischarge -= socConstraintWeight * 2 * violation; // Discharge decreases SoC
                }

                // Update variables with gradient descent
                pCharge[t] = Math.max(0, Math.min(params.pMax, pCharge[t] + learningRate * gradCharge));
                pDischarge[t] = Math.max(0, Math.min(params.pMax, pDischarge[t] + learningRate * gradDischarge));

                // Update SoC for gradient calculation
                const finalEnergyCharged = pCharge[t] * params.efficiency;
                const finalEnergyDischarged = pDischarge[t];
                currentSoC = currentSoC + finalEnergyCharged - finalEnergyDischarged;
                currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));
            }

            // Early stopping if objective is stable
            if (iteration > 500 && Math.abs(objective) < 1e-4) {
                break;
            }

            // Constraint violation check
            if (iteration % 100 === 0) {
                let maxViolation = 0;
                let testSoC = (params.socMin + params.socMax) / 2;
                for (let t = 0; t < T; t++) {
                    const energyCharged = pCharge[t] * params.efficiency;
                    const energyDischarged = pDischarge[t];
                    testSoC = testSoC + energyCharged - energyDischarged;
                    if (testSoC < params.socMin) {
                        maxViolation = Math.max(maxViolation, params.socMin - testSoC);
                    }
                    if (testSoC > params.socMax) {
                        maxViolation = Math.max(maxViolation, testSoC - params.socMax);
                    }
                    testSoC = Math.max(params.socMin, Math.min(params.socMax, testSoC));
                }
                
                // If violations are too large, increase constraint weight
                if (maxViolation > 1.0) {
                    socConstraintWeight *= 1.1;
                }
            }
        }

        // Collect debug information
        debugReport.params = {
            socMin: params.socMin,
            socMax: params.socMax,
            pMax: params.pMax,
            efficiency: params.efficiency,
            socRange: params.socMax - params.socMin,
            avgPrice: avgPrice,
            priceThreshold: priceThreshold,
            highPriceThreshold: highPriceThreshold
        };

        debugReport.optimization = {
            maxChargingPower: Math.max(...pCharge),
            maxDischargingPower: Math.max(...pDischarge),
            totalChargingEnergy: pCharge.reduce((sum, p) => sum + p, 0),
            totalDischargingEnergy: pDischarge.reduce((sum, p) => sum + p, 0)
        };

        // Calculate energy balance
        const totalEnergyCharged = pCharge.reduce((sum, p) => sum + p, 0);
        const totalEnergyDischarged = pDischarge.reduce((sum, p) => sum + p, 0);
        const netEnergyChange = totalEnergyCharged * params.efficiency - totalEnergyDischarged;
        
        debugReport.energyBalance = {
            totalEnergyCharged: totalEnergyCharged,
            totalEnergyDischarged: totalEnergyDischarged,
            netEnergyChange: netEnergyChange,
            requiredDischargeToMin: (params.socMin + params.socMax) / 2 - params.socMin,
            maxPossibleDischarge1h: params.pMax,
            maxPossibleDischargeTotal: params.pMax * pDischarge.length
        };

        // Store initial results from optimization
        for (let t = 0; t < T; t++) {
            const state = viterbiPath[t];
            const price = prices[t];

            // Store results for current time step
            schedule.charging[t] = pCharge[t];
            schedule.discharging[t] = pDischarge[t];
            schedule.revenue[t] = pDischarge[t] * price - pCharge[t] * price;
            schedule.actions[t] = pCharge[t] > 0 ? 'charge' : (pDischarge[t] > 0 ? 'discharge' : 'idle');
        }

        // Final SoC statistics (will be updated after post-processing)
        debugReport.socAnalysis = {
            minSoC: 0,
            maxSoC: 0,
            socRangeUsed: 0,
            socRangeUtilization: 0,
            reachedMinSoC: false,
            reachedMaxSoC: false
        };
        
        // HMM state analysis
        const stateCounts = { 1: 0, 2: 0, 3: 0 };
        const stateDischargePower = { 1: 0, 2: 0, 3: 0 };
        const stateChargePower = { 1: 0, 2: 0, 3: 0 };
        
        for (let t = 0; t < T; t++) {
            const state = viterbiPath[t];
            stateCounts[state]++;
            stateDischargePower[state] += pDischarge[t];
            stateChargePower[state] += pCharge[t];
        }
        
        debugReport.hmmAnalysis = {
            stateDistribution: stateCounts,
            dischargePowerByState: stateDischargePower,
            chargePowerByState: stateChargePower,
            avgDischargeInState3: stateCounts[3] > 0 ? stateDischargePower[3] / stateCounts[3] : 0,
            avgChargeInState1: stateCounts[1] > 0 ? stateChargePower[1] / stateCounts[1] : 0
        };
        
        // Constraint analysis - calculate SoC values first for constraint checking
        let testSoC = (params.socMin + params.socMax) / 2;
        const constraintSoCValues = [];
        
        for (let t = 0; t < T; t++) {
            constraintSoCValues.push(testSoC);
            const energyCharged = pCharge[t] * params.efficiency;
            const energyDischarged = pDischarge[t];
            testSoC = testSoC + energyCharged - energyDischarged;
            testSoC = Math.max(params.socMin, Math.min(params.socMax, testSoC));
        }
        
        debugReport.constraints = {
            hmmDischargeUnderutilized: stateCounts[3] > 0 && (stateDischargePower[3] / stateCounts[3]) < params.pMax * 0.8,
            neverReachedMinSoC: Math.min(...constraintSoCValues) > params.socMin + 1,
            neverReachedMaxSoC: Math.max(...constraintSoCValues) < params.socMax - 1,
            energyConstraint: totalEnergyDischarged < ((params.socMin + params.socMax) / 2 - params.socMin),
            powerConstraint: Math.max(...pDischarge) < params.pMax
        };

        // Store debug report in schedule for access
        schedule.debugReport = debugReport;

        // FINAL SOC CALCULATION - Calculate SoC based on actual charging/discharging actions
        let currentSoC = (params.socMin + params.socMax) / 2; // Start at middle
        
        for (let t = 0; t < T; t++) {
            const state = viterbiPath[t];
            const price = prices[t];

            // Store current SoC BEFORE applying this hour's charging/discharging
            schedule.soc[t] = currentSoC;

            // Apply this hour's charging/discharging to get SoC for next hour
            const energyCharged = schedule.charging[t] * params.efficiency; // Energy added to battery
            const energyDischarged = schedule.discharging[t]; // Energy removed from battery
            currentSoC = currentSoC + energyCharged - energyDischarged;
            
            // Ensure SoC stays within bounds
            currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));
            
            // Collect SoC evolution data for debugging
            const distanceToMin = schedule.soc[t] - params.socMin;
            const distanceToMax = params.socMax - schedule.soc[t];
            
            if (t < 5 || t > T - 5 || distanceToMin < 5 || distanceToMax < 5) {
                debugReport.socEvolution.push({
                    time: t,
                    socStart: schedule.soc[t],
                    charge: schedule.charging[t],
                    discharge: schedule.discharging[t],
                    energyCharged: energyCharged,
                    energyDischarged: energyDischarged,
                    socChange: energyCharged - energyDischarged,
                    socEnd: currentSoC,
                    distanceToMin: distanceToMin,
                    distanceToMax: distanceToMax,
                    hmmState: viterbiPath[t],
                    price: prices[t],
                    nearMinSoC: distanceToMin < 5,
                    nearMaxSoC: distanceToMax < 5
                });
            }
        }
        
        // Update final SoC statistics
        const socValues = schedule.soc;
        debugReport.socAnalysis = {
            minSoC: Math.min(...socValues),
            maxSoC: Math.max(...socValues),
            socRangeUsed: Math.max(...socValues) - Math.min(...socValues),
            socRangeUtilization: ((Math.max(...socValues) - Math.min(...socValues)) / (params.socMax - params.socMin) * 100),
            reachedMinSoC: Math.min(...socValues) <= params.socMin + 0.1,
            reachedMaxSoC: Math.max(...socValues) >= params.socMax - 0.1
        };

        return schedule;
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
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test method to verify SoC calculation
    testSoCCalculation() {
        console.log('=== Testing SoC Calculation ===');
        
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

}

// Export the BatteryOptimizer class for use in other files.
export default BatteryOptimizer;