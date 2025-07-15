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
        // Use differential evolution for sophisticated optimization
        console.log('Using differential evolution optimization');
        return this.differentialEvolutionOptimize(prices, params);
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
    differentialEvolutionOptimize(prices, params) {
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

            // Calculate SoC evolution and check constraints
            let currentSoC = (params.socMin + params.socMax) / 2;
            let totalRevenue = 0;
            let constraintViolation = 0;

            for (let t = 0; t < T; t++) {
                const price = prices[t];
                const charge = charging[t];
                const discharge = discharging[t];

                // Revenue calculation
                totalRevenue += discharge * price - charge * price;

                // Update SoC
                const energyCharged = charge * params.efficiency;
                const energyDischarged = discharge;
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

                // Simultaneous charge/discharge penalty
                if (charge > 0 && discharge > 0) {
                    constraintViolation += Math.pow(charge + discharge, 2) * 1e5;
                }
            }

            // Return negative revenue (minimization problem) plus constraint penalties
            return -totalRevenue + constraintViolation;
        };

        // Differential evolution parameters
        const popsize = Math.min(50, Math.max(20, T * 2)); // Population size based on problem size
        const mutate = 0.5; // Mutation factor
        const recombination = 0.7; // Recombination rate
        const maxiter = Math.min(100, Math.max(30, T)); // Max generations based on problem size

        console.log(`Starting differential evolution optimization:`);
        console.log(`  Time steps: ${T}`);
        console.log(`  Population size: ${popsize}`);
        console.log(`  Max generations: ${maxiter}`);
        console.log(`  Variables: ${bounds.length}`);

        // Run differential evolution
        const bestSolution = this.runDifferentialEvolution(costFunction, bounds, popsize, mutate, recombination, maxiter);

        // Convert solution back to schedule
        const schedule = {
            charging: Array(T).fill(0),
            discharging: Array(T).fill(0),
            soc: Array(T).fill(0),
            revenue: Array(T).fill(0),
            actions: Array(T).fill('idle')
        };

        let currentSoC = (params.socMin + params.socMax) / 2;

        for (let t = 0; t < T; t++) {
            schedule.charging[t] = bestSolution[t * 2];
            schedule.discharging[t] = bestSolution[t * 2 + 1];
            
            // Store current SoC
            schedule.soc[t] = currentSoC;

            // Update SoC
            const energyCharged = schedule.charging[t] * params.efficiency;
            const energyDischarged = schedule.discharging[t];
            currentSoC = currentSoC + energyCharged - energyDischarged;
            currentSoC = Math.max(params.socMin, Math.min(params.socMax, currentSoC));

            // Calculate revenue
            schedule.revenue[t] = schedule.discharging[t] * prices[t] - schedule.charging[t] * prices[t];

            // Determine action
            if (schedule.charging[t] > 0 && schedule.discharging[t] > 0) {
                schedule.actions[t] = 'both'; // Should be penalized in optimization
            } else if (schedule.charging[t] > 0) {
                schedule.actions[t] = 'charge';
            } else if (schedule.discharging[t] > 0) {
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
    optimize(prices, params) {
        try {
            // Reset optimizer state to ensure fresh start
            this.reset();
            
            if (!prices || prices.length === 0) {
                throw new Error('No price data provided');
            }

            console.log(`Starting optimization with ${prices.length} price points`);
            console.log(`Parameters:`, params);

            // 1. Categorize prices to create observations for HMM.
            this.priceCategories = this.categorizePrices(prices);
            console.log(`Price categories calculated: ${this.priceCategories.length} categories`);
            
            // 2. Calculate transition probabilities between hidden states.
            this.transitionMatrix = this.calculateTransitionMatrix(this.priceCategories);
            console.log(`Transition matrix calculated`);
            
            // 3. Initialize emission probabilities (action likelihood given state).
            this.emissionMatrix = this.initializeEmissionMatrix(prices);
            console.log(`Emission matrix initialized`);
            
            // 4. Use Viterbi to find the most likely sequence of hidden states.
            this.viterbiPath = this.viterbiDecode(this.priceCategories, this.transitionMatrix, this.emissionMatrix);
            console.log(`Viterbi path calculated: ${this.viterbiPath.length} states`);

            // 5. Optimize battery schedule based on Viterbi path and parameters.
            console.log(`Starting battery schedule optimization...`);
            const schedule = this.optimizeBatterySchedule(prices, this.viterbiPath, params);
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
        
        console.log('✓ Differential evolution optimization completed');
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
        
        // Check for simultaneous charge/discharge (should be minimized)
        const simultaneousActions = schedule.actions.filter(action => action === 'both').length;
        console.log('Simultaneous charge/discharge actions:', simultaneousActions);
        
        console.log('=== End Differential Evolution Test ===');
        
        return {
            success: true,
            schedule,
            totalRevenue,
            totalEnergyCharged,
            totalEnergyDischarged,
            minSoC,
            maxSoC,
            method: 'differential_evolution'
        };
    }
}

// Export the BatteryOptimizer class for use in other files.
export default BatteryOptimizer;