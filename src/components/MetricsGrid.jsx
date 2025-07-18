import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const MetricsGrid = ({ results }) => {
  if (!results || !results.metrics) {
    return (
      <div className="text-center text-gray-500">
        No metrics available
      </div>
    );
  }

  const { metrics } = results;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {metrics.totalRevenue?.toLocaleString('pl-PL', { 
                style: 'currency', 
                currency: 'PLN' 
              }) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {metrics.totalCycles?.toFixed(0) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Total Cycles</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {metrics.averageEfficiency?.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Average Efficiency</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {metrics.totalEnergyDischarged?.toFixed(1) || 'N/A'} MWh
            </div>
            <div className="text-sm text-gray-600">Total Energy Discharged</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {metrics.totalEnergyCharged?.toFixed(1) || 'N/A'} MWh
            </div>
            <div className="text-sm text-gray-600">Total Energy Charged</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-indigo-600">
              {metrics.revenuePerMWh?.toFixed(2) || 'N/A'} PLN/MWh
            </div>
            <div className="text-sm text-gray-600">Revenue per MWh</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsGrid; 