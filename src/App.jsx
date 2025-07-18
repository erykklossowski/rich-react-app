import React from 'react';
import { useOptimizationStore } from './store/optimizationStore';
import BacktestForm from './components/BacktestForm';
import ResultsDashboard from './components/ResultsDashboard';
import './index.css';

function App() {
  const { results, isRunning } = useOptimizationStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Battery Energy Storage Optimization
          </h1>
          <p className="text-lg text-gray-600">
            Optimize battery operation using real Polish electricity market data
          </p>
        </header>

        <div className="space-y-8">
          <BacktestForm />
          
          {results && (
            <ResultsDashboard results={results} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
