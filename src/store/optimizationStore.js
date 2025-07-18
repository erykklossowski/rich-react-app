import { create } from 'zustand';

const useOptimizationStore = create((set, get) => ({
  // Parameters
  startDate: '2024-06-14',
  endDate: '2024-12-31',
  batteryCapacity: 10,
  batteryEfficiency: 90,
  maxPower: 5,
  minPower: 0,
  initialSOC: 50,
  targetSOC: 50,

  // State
  isRunning: false,
  results: null,
  error: null,

  // Setters
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setBatteryCapacity: (capacity) => set({ batteryCapacity: capacity }),
  setBatteryEfficiency: (efficiency) => set({ batteryEfficiency: efficiency }),
  setMaxPower: (power) => set({ maxPower: power }),
  setMinPower: (power) => set({ minPower: power }),
  setInitialSOC: (soc) => set({ initialSOC: soc }),
  setTargetSOC: (soc) => set({ targetSOC: soc }),

  // Actions
  runBacktest: async () => {
    const state = get();
    
    set({ isRunning: true, error: null });

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: state.startDate,
          endDate: state.endDate,
          batteryCapacity: state.batteryCapacity,
          batteryEfficiency: state.batteryEfficiency / 100, // Convert to decimal
          maxPower: state.maxPower,
          minPower: state.minPower,
          initialSOC: state.initialSOC / 100, // Convert to decimal
          targetSOC: state.targetSOC / 100, // Convert to decimal
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Backtest failed');
      }

      const results = await response.json();
      set({ results, isRunning: false });
    } catch (error) {
      console.error('Backtest error:', error);
      set({ 
        error: error.message || 'An error occurred during backtest',
        isRunning: false 
      });
    }
  },

  clearResults: () => set({ results: null, error: null }),
}));

export { useOptimizationStore }; 