# 🔋 Battery Energy Storage Optimization

A sophisticated React application that uses Hidden Markov Models (HMM) and the Viterbi algorithm to optimize battery charge/discharge schedules based on electricity prices. Built with modern React patterns, state management, and a beautiful UI.

## ✨ Features

### 🎯 Core Functionality
- **Manual Input Mode**: Enter custom electricity prices for optimization
- **Historical Backtesting**: Analyze Polish electricity market data (2015-2025)
- **AI-Powered Insights**: Get strategic recommendations using Gemini API
- **Advanced Analytics**: Interactive charts and detailed performance metrics

### 🎨 Modern UI/UX
- **Component-Based Architecture**: Modular, reusable components
- **State Management**: Zustand for efficient state handling
- **Modern Design System**: Radix UI components with Tailwind CSS
- **Smooth Animations**: Framer Motion for delightful interactions
- **Responsive Design**: Works perfectly on all screen sizes
- **Interactive Controls**: Sliders, real-time updates, and intuitive forms

### 📊 Data Visualization
- **Interactive Charts**: Chart.js with custom styling
- **Metrics Dashboard**: Beautiful cards with animated statistics
- **Performance Tables**: Sortable and filterable data tables
- **HMM Matrices**: Visual representation of transition and emission matrices

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── slider.jsx
│   │   └── tabs.jsx
│   ├── ManualInputForm.jsx    # Manual price input form
│   ├── BacktestForm.jsx       # Historical backtesting form
│   ├── ResultsDashboard.jsx   # Detailed results display
│   ├── BacktestSummary.jsx    # Backtest summary view
│   ├── MetricsGrid.jsx        # Performance metrics grid
│   ├── AIInsights.jsx         # AI-powered insights
│   └── ChartComponents.jsx    # Chart components
├── store/
│   └── optimizationStore.js   # Zustand state management
├── lib/
│   └── utils.js              # Utility functions
├── utils/
│   ├── BatteryOptimizerClass.js  # Core optimization algorithm
│   └── dataLoaders.js        # Data loading utilities
└── App.jsx                   # Main application component
```

### State Management
- **Zustand Store**: Centralized state management
- **Optimized Re-renders**: Efficient component updates
- **Type Safety**: Well-structured state with clear actions

### Design System
- **Radix UI**: Accessible, unstyled components
- **Tailwind CSS**: Utility-first styling
- **Custom Components**: Consistent design patterns
- **Dark Mode Ready**: CSS variables for theming

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rich-react-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Gemini API key
   ```

4. **Start the development server**:
   ```bash
   npm run dev:full
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173`

## 🔧 Development

### Available Scripts
- `npm run dev` - Start frontend only
- `npm run server` - Start backend only  
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run setup` - Run setup script

### Key Technologies

#### Frontend
- **React 19** - Latest React with concurrent features
- **Vite** - Fast build tool and dev server
- **Zustand** - Lightweight state management
- **Framer Motion** - Animation library
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Data visualization
- **Lucide React** - Beautiful icons

#### Backend
- **Express.js** - Node.js web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

#### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type safety (types included)

## 🎯 Usage

### Manual Input Mode
1. Switch to "Manual Input" tab
2. Enter 24-hour electricity prices (comma-separated)
3. Adjust battery parameters using interactive sliders
4. Click "Optimize Battery Operation" to see results
5. View detailed charts and metrics
6. Get AI-powered insights

### Historical Backtesting Mode
1. Switch to "Historical Backtest" tab
2. Select date range and analysis period
3. Configure battery parameters
4. Click "Run Historical Backtest"
5. View summary statistics and trends
6. Click on any period for detailed analysis

## 🔒 Security

### API Key Protection
- **Backend Proxy**: API keys never exposed to frontend
- **Environment Variables**: Secure server-side storage
- **CORS Configuration**: Proper cross-origin handling
- **Error Handling**: Graceful fallbacks

### Data Security
- **Input Validation**: Comprehensive validation
- **Error Boundaries**: Robust error handling
- **Secure Communication**: HTTPS in production

## 📊 Algorithm Details

### Hidden Markov Model (HMM)
- **3-State Model**: Low, Medium, High price categories
- **Transition Matrix**: Probability of state changes
- **Emission Matrix**: Action probabilities per state

### Viterbi Algorithm
- **Optimal Path**: Most likely state sequence
- **Dynamic Programming**: Efficient computation
- **Log Probabilities**: Numerical stability

### Battery Optimization
- **Constraints**: Power limits, SoC bounds, efficiency
- **Revenue Maximization**: Buy low, sell high strategy
- **Real-time Scheduling**: Hour-by-hour optimization

## 🎨 Design Principles

### User Experience
- **Intuitive Navigation**: Clear tab structure
- **Progressive Disclosure**: Information revealed as needed
- **Loading States**: Engaging progress indicators
- **Error Handling**: Helpful error messages

### Visual Design
- **Consistent Spacing**: 8px grid system
- **Color Harmony**: Semantic color usage
- **Typography**: Inter font family
- **Micro-interactions**: Subtle animations

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: WCAG AA compliant
- **Focus Management**: Clear focus indicators

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Set production environment variables
2. Configure API endpoints
3. Set up monitoring and logging
4. Enable HTTPS

### Performance Optimization
- **Code Splitting**: Lazy-loaded components
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Static asset caching
- **CDN**: Content delivery network

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Standards
- **ESLint**: Follow linting rules
- **Component Structure**: Use established patterns
- **State Management**: Use Zustand store
- **Styling**: Use Tailwind CSS utilities

## 📈 Performance

### Optimization Features
- **Memoization**: React.memo and useMemo
- **Lazy Loading**: Component and data lazy loading
- **Efficient Algorithms**: Optimized HMM implementation
- **Bundle Splitting**: Code splitting for faster loads

### Monitoring
- **Performance Metrics**: Core Web Vitals
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Usage patterns and insights

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Polish Electricity Market Data**: Historical price data
- **Google Gemini API**: AI-powered insights
- **Open Source Community**: All the amazing libraries used

---

**Built with ❤️ using modern React and advanced optimization algorithms**
