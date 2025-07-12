import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useOptimizationStore } from '../store/optimizationStore'
import { Sparkles, Brain, Loader2 } from 'lucide-react'

const AIInsights = ({ onGetInsights, result, params }) => {
  const { llmInsight, llmLoading } = useOptimizationStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Get strategic recommendations and analysis from AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => onGetInsights(result, params)}
            disabled={llmLoading}
            className="w-full"
            size="lg"
            variant="gradient"
          >
            {llmLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get Optimization Insights
              </>
            )}
          </Button>

          <AnimatePresence mode="wait">
            {llmLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Analyzing optimization results...
                    </p>
                    <p className="text-xs text-blue-700">
                      AI is processing your data to provide strategic insights
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {llmInsight && !llmLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Strategic Analysis
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                        {llmInsight}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default AIInsights 