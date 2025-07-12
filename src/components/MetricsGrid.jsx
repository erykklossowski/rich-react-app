import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from './ui/card'
import { 
  Euro, 
  Battery, 
  TrendingUp, 
  Zap, 
  Target, 
  Activity,
  BarChart3,
  Gauge
} from 'lucide-react'
import { formatCurrency, formatNumber, formatPercentage } from '../lib/utils'

const MetricsGrid = ({ result }) => {
  const metrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(result.totalRevenue),
      icon: Euro,
      color: 'from-green-500 to-emerald-600',
      description: 'Total revenue generated'
    },
    {
      title: 'Energy Discharged',
      value: `${formatNumber(result.totalEnergyDischarged)} MWh`,
      icon: Zap,
      color: 'from-blue-500 to-cyan-600',
      description: 'Total energy discharged'
    },
    {
      title: 'Energy Charged',
      value: `${formatNumber(result.totalEnergyCharged)} MWh`,
      icon: Battery,
      color: 'from-purple-500 to-pink-600',
      description: 'Total energy charged'
    },
    {
      title: 'Operational Efficiency',
      value: formatPercentage(result.operationalEfficiency),
      icon: Target,
      color: 'from-orange-500 to-red-600',
      description: 'Round-trip efficiency'
    },
    {
      title: 'Average Price',
      value: formatCurrency(result.avgPrice),
      icon: TrendingUp,
      color: 'from-indigo-500 to-blue-600',
      description: 'Average market price'
    },
    {
      title: 'Battery Cycles',
      value: formatNumber(result.cycles),
      icon: Activity,
      color: 'from-teal-500 to-green-600',
      description: 'Number of cycles'
    },
    {
      title: 'VWAP Charge',
      value: formatCurrency(result.vwapCharge),
      icon: BarChart3,
      color: 'from-yellow-500 to-orange-600',
      description: 'Volume weighted avg charge price'
    },
    {
      title: 'VWAP Discharge',
      value: formatCurrency(result.vwapDischarge),
      icon: Gauge,
      color: 'from-red-500 to-pink-600',
      description: 'Volume weighted avg discharge price'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon
        return (
          <motion.div key={metric.title} variants={itemVariants}>
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${metric.color}`}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium">
                      {metric.title}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export default MetricsGrid 