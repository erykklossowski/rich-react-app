class AFRRHMMModel {
    constructor() {
        this.numStates = 3;
        this.stateNames = {
            0: 'Undercontracted',
            1: 'Balanced',
            2: 'Overcontracted'
        };
        
        // Initialize HMM parameters
        this.transitionMatrix = null;
        this.emissionMatrix = null;
        this.initialProbabilities = null;
    }

    // Initialize HMM parameters
    initializeParameters() {
        // Initialize transition matrix (3x3)
        this.transitionMatrix = [
            [0.7, 0.2, 0.1], // Undercontracted -> [Under, Balanced, Over]
            [0.2, 0.6, 0.2], // Balanced -> [Under, Balanced, Over]
            [0.1, 0.2, 0.7]  // Overcontracted -> [Under, Balanced, Over]
        ];

        // Initialize emission matrix (3x3 for 3 categories)
        this.emissionMatrix = [
            [0.8, 0.15, 0.05], // Undercontracted emits [Low, Medium, High]
            [0.2, 0.6, 0.2],   // Balanced emits [Low, Medium, High]
            [0.05, 0.15, 0.8]  // Overcontracted emits [Low, Medium, High]
        ];

        // Initial state probabilities
        this.initialProbabilities = [0.33, 0.34, 0.33];
    }

    // Categorize contracting values into states
    categorizeContractingValues(contractingValues, method = 'quantile') {
        if (!Array.isArray(contractingValues) || contractingValues.length === 0) {
            throw new Error('Invalid or empty contracting values array');
        }

        const categories = [];
        
        switch (method) {
            case 'quantile':
                const sorted = [...contractingValues].sort((a, b) => a - b);
                const q33 = sorted[Math.floor(sorted.length * 0.33)];
                const q67 = sorted[Math.floor(sorted.length * 0.67)];
                
                contractingValues.forEach(value => {
                    if (value <= q33) {
                        categories.push(0); // Low (Undercontracted)
                    } else if (value <= q67) {
                        categories.push(1); // Medium (Balanced)
                    } else {
                        categories.push(2); // High (Overcontracted)
                    }
                });
                break;
                
            case 'threshold':
                const mean = contractingValues.reduce((sum, val) => sum + val, 0) / contractingValues.length;
                const std = Math.sqrt(contractingValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / contractingValues.length);
                
                contractingValues.forEach(value => {
                    const zScore = (value - mean) / std;
                    if (zScore < -0.5) {
                        categories.push(0); // Undercontracted
                    } else if (zScore > 0.5) {
                        categories.push(2); // Overcontracted
                    } else {
                        categories.push(1); // Balanced
                    }
                });
                break;
                
            default:
                throw new Error(`Unknown categorization method: ${method}`);
        }
        
        return categories;
    }

    // Train HMM using Baum-Welch algorithm
    train(observations, hiddenStates = null, maxIterations = 50, tolerance = 1e-6) {
        if (!Array.isArray(observations) || observations.length === 0) {
            throw new Error('Invalid or empty observations array');
        }

        console.log(`Training HMM with ${observations.length} observations...`);
        
        let iteration = 0;
        let prevLogLikelihood = -Infinity;
        let converged = false;

        while (iteration < maxIterations && !converged) {
            // Forward-Backward algorithm
            const { alpha, beta, scalingFactors } = this.forwardBackward(observations);
            
            // Calculate log likelihood
            const logLikelihood = scalingFactors.reduce((sum, factor) => sum + Math.log(factor), 0);
            
            // Check convergence
            if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
                converged = true;
                console.log(`HMM converged at iteration ${iteration}`);
            }
            
            // Update parameters
            this.updateParameters(observations, alpha, beta, scalingFactors);
            
            prevLogLikelihood = logLikelihood;
            iteration++;
        }

        return {
            iterations: iteration,
            converged: converged,
            finalLogLikelihood: prevLogLikelihood
        };
    }

    // Forward-Backward algorithm
    forwardBackward(observations) {
        const T = observations.length;
        const alpha = Array(T).fill().map(() => Array(this.numStates).fill(0));
        const beta = Array(T).fill().map(() => Array(this.numStates).fill(0));
        const scalingFactors = [];

        // Forward pass
        for (let t = 0; t < T; t++) {
            const obs = observations[t];
            let scalingFactor = 0;
            
            for (let i = 0; i < this.numStates; i++) {
                if (t === 0) {
                    alpha[t][i] = this.initialProbabilities[i] * this.emissionMatrix[i][obs];
                } else {
                    alpha[t][i] = 0;
                    for (let j = 0; j < this.numStates; j++) {
                        alpha[t][i] += alpha[t-1][j] * this.transitionMatrix[j][i];
                    }
                    alpha[t][i] *= this.emissionMatrix[i][obs];
                }
                scalingFactor += alpha[t][i];
            }
            
            // Scale alpha values
            for (let i = 0; i < this.numStates; i++) {
                alpha[t][i] /= scalingFactor;
            }
            scalingFactors.push(scalingFactor);
        }

        // Backward pass
        for (let t = T - 1; t >= 0; t--) {
            const obs = observations[t];
            
            for (let i = 0; i < this.numStates; i++) {
                if (t === T - 1) {
                    beta[t][i] = 1;
                } else {
                    beta[t][i] = 0;
                    for (let j = 0; j < this.numStates; j++) {
                        beta[t][i] += this.transitionMatrix[i][j] * 
                                    this.emissionMatrix[j][observations[t+1]] * 
                                    beta[t+1][j];
                    }
                }
                beta[t][i] /= scalingFactors[t];
            }
        }

        return { alpha, beta, scalingFactors };
    }

    // Update HMM parameters
    updateParameters(observations, alpha, beta, scalingFactors) {
        const T = observations.length;
        
        // Calculate gamma (state probabilities)
        const gamma = Array(T).fill().map(() => Array(this.numStates).fill(0));
        for (let t = 0; t < T; t++) {
            for (let i = 0; i < this.numStates; i++) {
                gamma[t][i] = alpha[t][i] * beta[t][i];
            }
        }

        // Calculate xi (transition probabilities)
        const xi = Array(T-1).fill().map(() => 
            Array(this.numStates).fill().map(() => Array(this.numStates).fill(0))
        );
        
        for (let t = 0; t < T - 1; t++) {
            const obs = observations[t + 1];
            for (let i = 0; i < this.numStates; i++) {
                for (let j = 0; j < this.numStates; j++) {
                    xi[t][i][j] = alpha[t][i] * this.transitionMatrix[i][j] * 
                                 this.emissionMatrix[j][obs] * beta[t+1][j];
                }
            }
        }

        // Update initial probabilities
        for (let i = 0; i < this.numStates; i++) {
            this.initialProbabilities[i] = gamma[0][i];
        }

        // Update transition matrix
        for (let i = 0; i < this.numStates; i++) {
            const sumGamma = gamma.reduce((sum, t) => sum + t[i], 0);
            for (let j = 0; j < this.numStates; j++) {
                const sumXi = xi.reduce((sum, t) => sum + t[i][j], 0);
                this.transitionMatrix[i][j] = sumXi / sumGamma;
            }
        }

        // Update emission matrix
        for (let i = 0; i < this.numStates; i++) {
            const sumGamma = gamma.reduce((sum, t) => sum + t[i], 0);
            for (let k = 0; k < 3; k++) { // 3 observation categories
                const sumGammaObs = gamma.reduce((sum, t) => 
                    sum + (observations[t] === k ? t[i] : 0), 0);
                this.emissionMatrix[i][k] = sumGammaObs / sumGamma;
            }
        }
    }

    // Viterbi algorithm for state sequence decoding
    viterbiDecode(observations) {
        if (!Array.isArray(observations) || observations.length === 0) {
            throw new Error('Invalid or empty observations array');
        }

        const T = observations.length;
        const delta = Array(T).fill().map(() => Array(this.numStates).fill(0));
        const psi = Array(T).fill().map(() => Array(this.numStates).fill(0));
        const path = Array(T).fill(0);

        // Initialize
        for (let i = 0; i < this.numStates; i++) {
            delta[0][i] = this.initialProbabilities[i] * this.emissionMatrix[i][observations[0]];
        }

        // Forward pass
        for (let t = 1; t < T; t++) {
            for (let j = 0; j < this.numStates; j++) {
                let maxDelta = -Infinity;
                let maxState = 0;
                
                for (let i = 0; i < this.numStates; i++) {
                    const currentDelta = delta[t-1][i] * this.transitionMatrix[i][j];
                    if (currentDelta > maxDelta) {
                        maxDelta = currentDelta;
                        maxState = i;
                    }
                }
                
                delta[t][j] = maxDelta * this.emissionMatrix[j][observations[t]];
                psi[t][j] = maxState;
            }
        }

        // Backward pass
        let maxDelta = -Infinity;
        for (let i = 0; i < this.numStates; i++) {
            if (delta[T-1][i] > maxDelta) {
                maxDelta = delta[T-1][i];
                path[T-1] = i;
            }
        }

        for (let t = T - 2; t >= 0; t--) {
            path[t] = psi[t+1][path[t+1]];
        }

        return path;
    }

    // Analyze contracting status using HMM
    analyze(contractingValues, categorizationMethod = 'quantile') {
        try {
            console.log('Starting aFRR contracting status analysis...');
            
            if (!Array.isArray(contractingValues) || contractingValues.length === 0) {
                return { success: false, error: 'Invalid or empty contracting values' };
            }

            // Categorize contracting values
            const observations = this.categorizeContractingValues(contractingValues, categorizationMethod);
            console.log(`Categorized ${observations.length} observations into ${categorizationMethod} categories`);

            // Train HMM
            const trainingResult = this.train(observations);
            console.log(`HMM training completed in ${trainingResult.iterations} iterations`);

            // Decode state sequence
            const viterbiPath = this.viterbiDecode(observations);
            console.log(`Viterbi path calculated: ${viterbiPath.length} states`);

            // Calculate statistics
            const stateCounts = {};
            const viterbiStateCounts = {};
            
            observations.forEach(obs => {
                stateCounts[obs] = (stateCounts[obs] || 0) + 1;
            });
            
            viterbiPath.forEach(state => {
                viterbiStateCounts[state] = (viterbiStateCounts[state] || 0) + 1;
            });

            console.log('aFRR analysis completed successfully');

            return {
                success: true,
                viterbiPath,
                stateCounts,
                viterbiStateCounts,
                observations,
                trainingResult,
                transitionMatrix: this.transitionMatrix,
                emissionMatrix: this.emissionMatrix,
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

    // Test HMM model functionality
    testHMMModel() {
        try {
            // Test with sample data
            const sampleObservations = [0, 1, 2, 1, 0, 2, 1, 0, 1, 2];
            
            this.initializeParameters();
            const trainingResult = this.train(sampleObservations);
            const viterbiPath = this.viterbiDecode(sampleObservations);
            
            return {
                success: true,
                trainingIterations: trainingResult.iterations,
                converged: trainingResult.converged,
                viterbiPathLength: viterbiPath.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default AFRRHMMModel; 