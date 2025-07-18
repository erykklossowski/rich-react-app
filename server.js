import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import BatteryOptimizer from './src/utils/BatteryOptimizerClass.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mock data for testing
const MOCK_PRICES = [
  150, 160, 140, 180, 170, 190, 200, 180, 160, 140, 130, 120,
  110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5,
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120,
  130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240,
  250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360,
  370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480
];

// Mock data structure
const MOCK_DATA = MOCK_PRICES.map((price, index) => ({
  datetime: new Date(2024, 5, 14 + Math.floor(index / 24), index % 24).toISOString(),
  price: price,
  dtime_utc: new Date(2024, 5, 14 + Math.floor(index / 24), index % 24).toISOString(),
  business_date: new Date(2024, 5, 14 + Math.floor(index / 24)).toISOString().split('T')[0],
  period: index % 24
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint for Gemini API
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Backtest API endpoint
app.post('/api/backtest', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      batteryCapacity,
      batteryEfficiency,
      maxPower,
      minPower,
      initialSOC,
      targetSOC
    } = req.body;

    console.log('Backtest request received:', {
      startDate,
      endDate,
      batteryCapacity,
      batteryEfficiency,
      maxPower,
      minPower,
      initialSOC,
      targetSOC
    });

    // Use mock data instead of loading from GitHub
    const allData = MOCK_DATA;
    
    // Filter data by date range
    const filteredData = allData.filter(record => {
      const recordDate = new Date(record.datetime);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return recordDate >= start && recordDate <= end;
    });

    if (filteredData.length === 0) {
      return res.status(400).json({ 
        error: 'No data found for the specified date range' 
      });
    }

    console.log(`Filtered data: ${filteredData.length} records`);

    // Group data by month
    const monthlyGroups = {};
    filteredData.forEach(record => {
      const date = new Date(record.datetime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(record);
    });

    // Run optimization for each month
    const results = [];
    let totalRevenue = 0;
    let totalCycles = 0;
    let totalEnergyDischarged = 0;
    let totalEnergyCharged = 0;
    let totalEfficiency = 0;

    for (const [month, monthData] of Object.entries(monthlyGroups)) {
      try {
        // Create optimizer instance
        const optimizer = new BatteryOptimizer();
        
        // Set up parameters
        const params = {
          pMax: maxPower,
          socMin: 0,
          socMax: batteryCapacity,
          efficiency: batteryEfficiency,
          initialSOC: initialSOC * batteryCapacity,
          targetSOC: targetSOC * batteryCapacity
        };

        // Extract prices for the month
        const prices = monthData.map(record => record.price).filter(p => !isNaN(p));
        
        if (prices.length === 0) {
          console.log(`Skipping ${month}: no valid prices`);
          continue;
        }

        // Run optimization
        const optimizationResult = optimizer.optimize(prices, params);
        
        if (optimizationResult && optimizationResult.success) {
          const monthResult = {
            month,
            revenue: optimizationResult.totalRevenue,
            cycles: optimizationResult.cycles || 0,
            energyDischarged: optimizationResult.totalEnergyDischarged || 0,
            energyCharged: optimizationResult.totalEnergyCharged || 0,
            efficiency: batteryEfficiency
          };

          results.push(monthResult);
          
          totalRevenue += monthResult.revenue;
          totalCycles += monthResult.cycles;
          totalEnergyDischarged += monthResult.energyDischarged;
          totalEnergyCharged += monthResult.energyCharged;
          totalEfficiency += monthResult.efficiency;
        }
      } catch (error) {
        console.error(`Error optimizing ${month}:`, error);
      }
    }

    // Calculate summary metrics
    const summary = {
      totalRevenue,
      totalCycles,
      totalEnergyDischarged,
      totalEnergyCharged,
      averageEfficiency: results.length > 0 ? totalEfficiency / results.length : 0,
      revenuePerMWh: totalEnergyDischarged > 0 ? totalRevenue / totalEnergyDischarged : 0,
      startDate,
      endDate,
      periodsAnalyzed: results.length
    };

    // Prepare monthly data for chart
    const monthlyData = results.map(result => ({
      month: result.month,
      revenue: result.revenue
    }));

    // Prepare metrics
    const metrics = {
      totalRevenue,
      totalCycles,
      totalEnergyDischarged,
      totalEnergyCharged,
      averageEfficiency: summary.averageEfficiency,
      revenuePerMWh: summary.revenuePerMWh
    };

    const response = {
      summary,
      monthlyData,
      metrics,
      results
    };

    console.log('Backtest completed successfully:', {
      totalRevenue,
      periodsAnalyzed: results.length,
      dateRange: `${startDate} to ${endDate}`
    });

    res.json(response);

  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ 
      error: 'Backtest failed: ' + error.message 
    });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 