import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const BacktestSummary = ({ results }) => {
  if (!results || !results.summary) {
    return null;
  }

  const { summary } = results;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backtest Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.totalRevenue?.toLocaleString('pl-PL', { 
                style: 'currency', 
                currency: 'PLN' 
              }) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalCycles?.toFixed(0) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Total Cycles</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summary.averageEfficiency?.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Average Efficiency</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Date Range:</span> {summary.startDate} to {summary.endDate}
            </div>
            <div>
              <span className="font-medium">Periods Analyzed:</span> {summary.periodsAnalyzed || 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BacktestSummary; 