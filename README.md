# Battery Energy Storage Optimization

A React application that uses Hidden Markov Models (HMM) and the Viterbi algorithm to optimize battery charge/discharge schedules based on electricity prices.

## Features

- **Manual Input Mode**: Enter custom electricity prices for optimization
- **Historical Backtesting**: Analyze Polish electricity market data (2015-2025)
- **AI-Powered Insights**: Get strategic recommendations using Gemini API
- **Interactive Charts**: Visualize prices, battery state, power flow, and revenue
- **Multiple Analysis Periods**: Monthly, quarterly, yearly, or continuous analysis

## Security Setup

### API Key Security

The application uses a backend proxy to securely handle the Gemini API key. Follow these steps:

1. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your Gemini API key** to `.env`:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

3. **Never commit the `.env` file** - it's already in `.gitignore`

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the backend server**:
   ```bash
   npm run server
   ```

3. **Start the frontend** (in a new terminal):
   ```bash
   npm run dev
   ```

4. **Or run both simultaneously**:
   ```bash
   npm run dev:full
   ```

## Usage

### Manual Input Mode
- Enter 24-hour electricity prices (comma-separated)
- Set battery parameters (power, capacity, efficiency)
- Click "Optimize Battery Operation" to see results

### Historical Backtesting Mode
- Select date range and analysis period
- Configure battery parameters
- Run backtest to analyze historical performance
- Click on any period for detailed analysis

## Algorithm

The application uses:
- **Hidden Markov Models (HMM)** for price state prediction
- **Viterbi Algorithm** for optimal state sequence decoding
- **Battery constraints** (power limits, SoC bounds, efficiency)
- **Revenue optimization** (buy low, sell high strategy)

## Data Sources

- **Polish Electricity Market**: Historical data from 2015-2025
- **Price Range**: -132.95 to 771.00 EUR/MWh
- **Data Points**: 91,790 hourly records

## Security Features

- ✅ API keys stored server-side only
- ✅ Backend proxy for secure API calls
- ✅ Environment variable protection
- ✅ CORS configuration for local development

## Development

- **Frontend**: React 19 + Vite
- **Charts**: Chart.js + React-Chartjs-2
- **Backend**: Express.js
- **Styling**: Tailwind CSS

## License

MIT License
