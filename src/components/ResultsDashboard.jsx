import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import RevenueChart from './RevenueChart';
import MetricsGrid from './MetricsGrid';
import BacktestSummary from './BacktestSummary';

const ResultsDashboard = ({ results }) => {
  if (!results) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No results available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <BacktestSummary results={results} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart results={results} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsGrid results={results} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsDashboard; 