// Path: src/utils/afrrHMMModel.js

// Hidden Markov Model implementation for aFRR capacity bidding
class AFRRHMMModel {
    constructor(numStates = 3, numObservations = 3) {
        this.numStates = numStates;
        this.numObservations = numObservations;
        
        // HMM parameters
        this.initialProbabilities = null; // π (pi)
        this.transitionMatrix = null;     // A
        this.emissionMatrix = null;       // B
        
        // State mappings
        this.stateNames = {
            1: 'S_1MW_Down_Capacity_cleared',
            2: 'S_1MW_Up_Capacity_cleared',
            3: 'S_no_1MW_Capacity_cleared'
        };
        
        // Training history
        this.trainingHistory = [];
        this.isTrained = false;
    }

    // Initialize HMM parameters randomly
    initializeParameters() {
        console.log('Initializing HMM parameters...');
        
        // Initialize initial state probabilities (uniform)
        this.initialProbabilities = Array(this.numStates).fill(1.0 / this.numStates);
        
        // Initialize transition matrix (with some randomness but maintaining structure)
        this.transitionMatrix = [];
        for (let i = 0; i < this.numStates; i++) {
            const row = [];
            for (let j = 0; j < this.numStates; j++) {
                // Add some randomness but keep diagonal elements higher (states tend to persist)
                const baseProb = i === j ? 0.6 : 0.2;
                const randomFactor = (Math.random() - 0.5) * 0.1;
                row.push(Math.max(0.01, baseProb + randomFactor));
            }
            // Normalize row
            const sum = row.reduce((a, b) => a + b, 0);
            for (let j = 0; j < this.numStates; j++) {
                row[j] /= sum;
            }
            this.transitionMatrix.push(row);
        }
        
        // Initialize emission matrix (Gaussian mixture model approximation)
        this.emissionMatrix = [];
        for (let i = 0; i < this.numStates; i++) {
            const row = [];
            for (let j = 0; j < this.numObservations; j++) {
                // Initialize with some structure based on expected relationships
                const baseProb = 0.3 + (Math.random() - 0.5) * 0.2;
                row.push(Math.max(0.01, baseProb));
            }
            // Normalize row
            const sum = row.reduce((a, b) => a + b, 0);
            for (let j = 0; j < this.numObservations; j++) {
                row[j] /= sum;
            }
            this.emissionMatrix.push(row);
        }
        
        console.log('HMM parameters initialized');
        this.logParameters();
    }

    // Forward algorithm (alpha)
    forward(observations) {
        const T = observations.length;
        const alpha = Array(T).fill().map(() => Array(this.numStates).fill(0));
        
        // Initialization
        for (let i = 0; i < this.numStates; i++) {
            alpha[0][i] = this.initialProbabilities[i] * this.getEmissionProbability(i, observations[0]);
        }
        
        // Induction
        for (let t = 1; t < T; t++) {
            for (let j = 0; j < this.numStates; j++) {
                let sum = 0;
                for (let i = 0; i < this.numStates; i++) {
                    sum += alpha[t-1][i] * this.transitionMatrix[i][j];
                }
                alpha[t][j] = sum * this.getEmissionProbability(j, observations[t]);
            }
        }
        
        return alpha;
    }

    // Backward algorithm (beta)
    backward(observations) {
        const T = observations.length;
        const beta = Array(T).fill().map(() => Array(this.numStates).fill(0));
        
        // Initialization
        for (let i = 0; i < this.numStates; i++) {
            beta[T-1][i] = 1.0;
        }
        
        // Induction
        for (let t = T-2; t >= 0; t--) {
            for (let i = 0; i < this.numStates; i++) {
                let sum = 0;
                for (let j = 0; j < this.numStates; j++) {
                    sum += this.transitionMatrix[i][j] * 
                           this.getEmissionProbability(j, observations[t+1]) * 
                           beta[t+1][j];
                }
                beta[t][i] = sum;
            }
        }
        
        return beta;
    }



    // Discretize continuous observation to discrete bins
    discretizeObservation(observation) {
        // Simple discretization: average the observation values and bin them
        const avgObs = observation.reduce((sum, val) => sum + val, 0) / observation.length;
        
        // Ensure we return valid indices (0, 1, 2)
        if (avgObs < 0.33) return 0;
        if (avgObs < 0.67) return 1;
        return 2;
    }

    // Get emission probability for continuous observations (improved version)
    getEmissionProbability(state, observation) {
        // For continuous observations, we use a simplified approach
        // In a full implementation, you might use Gaussian mixture models
        
        // Convert continuous observation to discrete bins
        const obsIndex = this.discretizeObservation(observation);
        
        // Ensure valid indices and add smoothing
        const validIndex = Math.max(0, Math.min(obsIndex, this.numObservations - 1));
        const emissionProb = this.emissionMatrix[state][validIndex] || 0.001;
        
        return Math.max(0.001, emissionProb); // Ensure non-zero probability
    }

    // Baum-Welch algorithm for training
    train(observations, hiddenStates = null, maxIterations = 100, tolerance = 1e-6) {
        console.log('Starting Baum-Welch training...');
        console.log(`Training on ${observations.length} observations`);
        
        this.trainingHistory = [];
        let iteration = 0;
        let logLikelihood = -Infinity;
        let converged = false;
        
        while (iteration < maxIterations && !converged) {
            const T = observations.length;
            
            // Forward pass
            const alpha = this.forward(observations);
            
            // Backward pass
            const beta = this.backward(observations);
            
            // Calculate gamma (state probabilities)
            const gamma = Array(T).fill().map(() => Array(this.numStates).fill(0));
            const scalingFactors = [];
            
            for (let t = 0; t < T; t++) {
                let scalingFactor = 0;
                for (let i = 0; i < this.numStates; i++) {
                    gamma[t][i] = alpha[t][i] * beta[t][i];
                    scalingFactor += gamma[t][i];
                }
                
                // Scale to prevent underflow
                if (scalingFactor > 0) {
                    for (let i = 0; i < this.numStates; i++) {
                        gamma[t][i] /= scalingFactor;
                    }
                }
                scalingFactors.push(scalingFactor);
            }
            
            // Calculate xi (transition probabilities)
            const xi = Array(T-1).fill().map(() => 
                Array(this.numStates).fill().map(() => Array(this.numStates).fill(0))
            );
            
            for (let t = 0; t < T-1; t++) {
                let scalingFactor = 0;
                for (let i = 0; i < this.numStates; i++) {
                    for (let j = 0; j < this.numStates; j++) {
                        xi[t][i][j] = alpha[t][i] * 
                                     this.transitionMatrix[i][j] * 
                                     this.getEmissionProbability(j, observations[t+1]) * 
                                     beta[t+1][j];
                        scalingFactor += xi[t][i][j];
                    }
                }
                
                // Scale
                if (scalingFactor > 0) {
                    for (let i = 0; i < this.numStates; i++) {
                        for (let j = 0; j < this.numStates; j++) {
                            xi[t][i][j] /= scalingFactor;
                        }
                    }
                }
            }
            
            // Update parameters
            this.updateParameters(gamma, xi, observations);
            
            // Calculate new log likelihood
            const newLogLikelihood = this.calculateLogLikelihood(observations);
            
            // Check convergence
            const improvement = newLogLikelihood - logLikelihood;
            converged = Math.abs(improvement) < tolerance;
            
            this.trainingHistory.push({
                iteration,
                logLikelihood: newLogLikelihood,
                improvement
            });
            
            logLikelihood = newLogLikelihood;
            iteration++;
            
            if (iteration % 10 === 0) {
                console.log(`Iteration ${iteration}: Log likelihood = ${logLikelihood.toFixed(6)}, Improvement = ${improvement.toFixed(6)}`);
            }
        }
        
        this.isTrained = true;
        console.log(`Training completed after ${iteration} iterations`);
        console.log(`Final log likelihood: ${logLikelihood.toFixed(6)}`);
        
        return {
            iterations: iteration,
            converged,
            finalLogLikelihood: logLikelihood,
            trainingHistory: this.trainingHistory
        };
    }

    // Update HMM parameters based on gamma and xi
    updateParameters(gamma, xi, observations) {
        const T = gamma.length;
        
        // Update initial probabilities
        for (let i = 0; i < this.numStates; i++) {
            this.initialProbabilities[i] = gamma[0][i];
        }
        
        // Update transition matrix
        for (let i = 0; i < this.numStates; i++) {
            let sumGamma = 0;
            for (let t = 0; t < T-1; t++) {
                sumGamma += gamma[t][i];
            }
            
            for (let j = 0; j < this.numStates; j++) {
                let sumXi = 0;
                for (let t = 0; t < T-1; t++) {
                    sumXi += xi[t][i][j];
                }
                
                this.transitionMatrix[i][j] = sumGamma > 0 ? sumXi / sumGamma : 1.0 / this.numStates;
            }
        }
        
        // Update emission matrix (simplified for continuous observations)
        for (let i = 0; i < this.numStates; i++) {
            let sumGamma = 0;
            const obsCounts = Array(this.numObservations).fill(0);
            
            for (let t = 0; t < T; t++) {
                sumGamma += gamma[t][i];
                const obsIndex = this.discretizeObservation(observations[t]);
                obsCounts[obsIndex] += gamma[t][i];
            }
            
            for (let j = 0; j < this.numObservations; j++) {
                this.emissionMatrix[i][j] = sumGamma > 0 ? obsCounts[j] / sumGamma : 1.0 / this.numObservations;
            }
        }
    }

    // Calculate log likelihood
    calculateLogLikelihood(observations) {
        const alpha = this.forward(observations);
        const T = observations.length;
        
        let logLikelihood = 0;
        for (let t = 0; t < T; t++) {
            const sum = alpha[t].reduce((a, b) => a + b, 0);
            if (sum > 0) {
                logLikelihood += Math.log(sum);
            }
        }
        
        return logLikelihood;
    }

    // Viterbi algorithm for finding most likely state sequence
    viterbi(observations) {
        if (!this.isTrained) {
            throw new Error('Model must be trained before running Viterbi algorithm');
        }
        
        const T = observations.length;
        const delta = Array(T).fill().map(() => Array(this.numStates).fill(-Infinity));
        const psi = Array(T).fill().map(() => Array(this.numStates).fill(0));
        
        // Initialization
        for (let i = 0; i < this.numStates; i++) {
            const emissionProb = this.getEmissionProbability(i, observations[0]);
            delta[0][i] = Math.log(this.initialProbabilities[i]) + Math.log(emissionProb);
        }
        
        // Recursion
        for (let t = 1; t < T; t++) {
            for (let j = 0; j < this.numStates; j++) {
                let maxDelta = -Infinity;
                let maxState = 0;
                
                for (let i = 0; i < this.numStates; i++) {
                    const currentDelta = delta[t-1][i] + Math.log(this.transitionMatrix[i][j]);
                    if (currentDelta > maxDelta) {
                        maxDelta = currentDelta;
                        maxState = i;
                    }
                }
                
                const emissionProb = this.getEmissionProbability(j, observations[t]);
                delta[t][j] = maxDelta + Math.log(emissionProb);
                psi[t][j] = maxState;
            }
        }
        
        // Termination
        let maxDelta = -Infinity;
        let bestLastState = 0;
        
        for (let i = 0; i < this.numStates; i++) {
            if (delta[T-1][i] > maxDelta) {
                maxDelta = delta[T-1][i];
                bestLastState = i;
            }
        }
        
        // Backtracking
        const bestPath = Array(T);
        bestPath[T-1] = bestLastState;
        
        for (let t = T-2; t >= 0; t--) {
            bestPath[t] = psi[t+1][bestPath[t+1]];
        }
        
        // Debug: Check state distribution
        const stateCounts = bestPath.reduce((counts, state) => {
            counts[state] = (counts[state] || 0) + 1;
            return counts;
        }, {});
        
        console.log('Viterbi path state distribution:', stateCounts);
        
        return {
            path: bestPath,
            logLikelihood: maxDelta
        };
    }

    // Calculate capacity revenue based on inferred states
    calculateCapacityRevenue(viterbiPath, data) {
        let totalRevenue = 0;
        let upRevenue = 0;
        let downRevenue = 0;
        let upClearedCount = 0;
        let downClearedCount = 0;
        
        for (let t = 0; t < viterbiPath.length; t++) {
            const state = viterbiPath[t];
            const periodData = data[t];
            
            if (state === 1) { // Down capacity cleared
                const revenue = periodData.afrr_down_capacity_marginal_price_eur_per_mw;
                totalRevenue += revenue;
                downRevenue += revenue;
                downClearedCount++;
            } else if (state === 2) { // Up capacity cleared
                const revenue = periodData.afrr_up_capacity_marginal_price_eur_per_mw;
                totalRevenue += revenue;
                upRevenue += revenue;
                upClearedCount++;
            }
            // State 3: No capacity cleared, no revenue
        }
        
        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            upRevenue: Math.round(upRevenue * 100) / 100,
            downRevenue: Math.round(downRevenue * 100) / 100,
            upClearedCount,
            downClearedCount,
            totalClearedCount: upClearedCount + downClearedCount,
            averageRevenuePerPeriod: Math.round((totalRevenue / viterbiPath.length) * 100) / 100,
            averageRevenueWhenCleared: Math.round((totalRevenue / (upClearedCount + downClearedCount)) * 100) / 100
        };
    }

    // Log current parameters
    logParameters() {
        console.log('\nHMM Parameters:');
        console.log('Initial probabilities:', this.initialProbabilities.map(p => p.toFixed(4)));
        console.log('Transition matrix:');
        this.transitionMatrix.forEach((row, i) => {
            console.log(`  State ${i+1}: [${row.map(p => p.toFixed(4)).join(', ')}]`);
        });
        console.log('Emission matrix:');
        this.emissionMatrix.forEach((row, i) => {
            console.log(`  State ${i+1}: [${row.map(p => p.toFixed(4)).join(', ')}]`);
        });
    }

    // Test the HMM model
    testHMMModel() {
        console.log('=== Testing AFRR HMM Model ===');
        
        try {
            // Initialize model
            this.initializeParameters();
            console.log('✓ Model initialized');
            
            // Generate test data
            const testObservations = [];
            const testHiddenStates = [];
            
            for (let i = 0; i < 100; i++) {
                // Generate synthetic observations
                const obs = [
                    Math.random(), // sk_d1_fcst normalized
                    Math.random(), // up capacity normalized
                    Math.random()  // down capacity normalized
                ];
                testObservations.push(obs);
                
                // Generate synthetic hidden states
                const state = Math.floor(Math.random() * 3) + 1;
                testHiddenStates.push(state);
            }
            
            console.log('✓ Test data generated');
            
            // Train model
            const trainingResult = this.train(testObservations);
            console.log('✓ Model trained');
            console.log(`Training iterations: ${trainingResult.iterations}`);
            console.log(`Converged: ${trainingResult.converged}`);
            
            // Test Viterbi algorithm
            const viterbiResult = this.viterbi(testObservations);
            console.log('✓ Viterbi algorithm executed');
            console.log(`Inferred path length: ${viterbiResult.path.length}`);
            console.log(`Log likelihood: ${viterbiResult.logLikelihood.toFixed(6)}`);
            
            // Test revenue calculation (with mock data)
            const mockData = testObservations.map((obs, i) => ({
                afrr_up_capacity_marginal_price_eur_per_mw: 50 + Math.random() * 100,
                afrr_down_capacity_marginal_price_eur_per_mw: 30 + Math.random() * 80
            }));
            
            const revenueResult = this.calculateCapacityRevenue(viterbiResult.path, mockData);
            console.log('✓ Revenue calculation completed');
            console.log('Revenue results:', revenueResult);
            
            console.log('\n=== HMM Model Test Complete ===');
            
            return {
                success: true,
                trainingResult,
                viterbiResult,
                revenueResult
            };
            
        } catch (error) {
            console.error('✗ HMM model test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the AFRRHMMModel class
export default AFRRHMMModel; 