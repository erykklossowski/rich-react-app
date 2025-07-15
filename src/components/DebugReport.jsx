import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, FileText } from 'lucide-react';

const DebugReport = ({ debugReport }) => {
    if (!debugReport) return null;

    const formatTable = () => {
        const report = debugReport;
        
        let table = `# Battery Optimization Debug Report\n\n`;
        
        // Parameters
        table += `## Parameters\n`;
        table += `| Parameter | Value |\n`;
        table += `|-----------|-------|\n`;
        table += `| Min SoC | ${report.params.socMin} MWh |\n`;
        table += `| Max SoC | ${report.params.socMax} MWh |\n`;
        table += `| SoC Range | ${report.params.socRange} MWh |\n`;
        table += `| Max Power | ${report.params.pMax} MW |\n`;
        table += `| Efficiency | ${(report.params.efficiency * 100).toFixed(1)}% |\n`;
        table += `| Avg Price | ${report.params.avgPrice?.toFixed(2) || 'N/A'} $/MWh |\n`;
        table += `| Price Threshold | ${report.params.priceThreshold?.toFixed(2) || 'N/A'} $/MWh |\n\n`;
        
        // Optimization Results
        table += `## Optimization Results\n`;
        table += `| Metric | Value |\n`;
        table += `|--------|-------|\n`;
        table += `| Max Charging Power | ${report.optimization.maxChargingPower.toFixed(2)} MW |\n`;
        table += `| Max Discharging Power | ${report.optimization.maxDischargingPower.toFixed(2)} MW |\n`;
        table += `| Total Energy Charged | ${report.optimization.totalChargingEnergy.toFixed(2)} MWh |\n`;
        table += `| Total Energy Discharged | ${report.optimization.totalDischargingEnergy.toFixed(2)} MWh |\n\n`;
        
        // Energy Balance
        table += `## Energy Balance\n`;
        table += `| Metric | Value |\n`;
        table += `|--------|-------|\n`;
        table += `| Net Energy Change | ${report.energyBalance.netEnergyChange.toFixed(2)} MWh |\n`;
        table += `| Required Discharge to Min SoC | ${report.energyBalance.requiredDischargeToMin.toFixed(2)} MWh |\n`;
        table += `| Max Possible Discharge (1h) | ${report.energyBalance.maxPossibleDischarge1h} MWh |\n`;
        table += `| Max Possible Discharge (Total) | ${report.energyBalance.maxPossibleDischargeTotal} MWh |\n\n`;
        
        // SoC Analysis
        table += `## SoC Analysis\n`;
        table += `| Metric | Value |\n`;
        table += `|--------|-------|\n`;
        table += `| Min SoC Achieved | ${report.socAnalysis.minSoC.toFixed(2)} MWh |\n`;
        table += `| Max SoC Achieved | ${report.socAnalysis.maxSoC.toFixed(2)} MWh |\n`;
        table += `| SoC Range Used | ${report.socAnalysis.socRangeUsed.toFixed(2)} MWh |\n`;
        table += `| SoC Range Utilization | ${report.socAnalysis.socRangeUtilization.toFixed(1)}% |\n`;
        table += `| Reached Min SoC | ${report.socAnalysis.reachedMinSoC ? '✅ Yes' : '❌ No'} |\n`;
        table += `| Reached Max SoC | ${report.socAnalysis.reachedMaxSoC ? '✅ Yes' : '❌ No'} |\n\n`;
        
        // HMM Analysis
        table += `## HMM State Analysis\n`;
        table += `| State | Count | Discharge Power | Charge Power |\n`;
        table += `|-------|-------|-----------------|--------------|\n`;
        table += `| 1 (Charge) | ${report.hmmAnalysis.stateDistribution[1]} | ${report.hmmAnalysis.dischargePowerByState[1].toFixed(2)} MWh | ${report.hmmAnalysis.chargePowerByState[1].toFixed(2)} MWh |\n`;
        table += `| 2 (Idle) | ${report.hmmAnalysis.stateDistribution[2]} | ${report.hmmAnalysis.dischargePowerByState[2].toFixed(2)} MWh | ${report.hmmAnalysis.chargePowerByState[2].toFixed(2)} MWh |\n`;
        table += `| 3 (Discharge) | ${report.hmmAnalysis.stateDistribution[3]} | ${report.hmmAnalysis.dischargePowerByState[3].toFixed(2)} MWh | ${report.hmmAnalysis.chargePowerByState[3].toFixed(2)} MWh |\n\n`;
        table += `| Metric | Value |\n`;
        table += `|--------|-------|\n`;
        table += `| Avg Discharge in State 3 | ${report.hmmAnalysis.avgDischargeInState3.toFixed(2)} MW |\n`;
        table += `| Avg Charge in State 1 | ${report.hmmAnalysis.avgChargeInState1.toFixed(2)} MW |\n\n`;
        
        // Constraints
        table += `## Constraint Analysis\n`;
        table += `| Constraint | Status |\n`;
        table += `|------------|--------|\n`;
        table += `| HMM Discharge Underutilized | ${report.constraints.hmmDischargeUnderutilized ? '⚠️ Yes' : '✅ No'} |\n`;
        table += `| Never Reached Min SoC | ${report.constraints.neverReachedMinSoC ? '❌ Yes' : '✅ No'} |\n`;
        table += `| Never Reached Max SoC | ${report.constraints.neverReachedMaxSoC ? '❌ Yes' : '✅ No'} |\n`;
        table += `| Energy Constraint | ${report.constraints.energyConstraint ? '❌ Yes' : '✅ No'} |\n`;
        table += `| Power Constraint | ${report.constraints.powerConstraint ? '❌ Yes' : '✅ No'} |\n\n`;
        
        // SoC Evolution (key moments)
        if (report.socEvolution.length > 0) {
            table += `## Key SoC Evolution Moments\n`;
            table += `| Time | SoC Start | Charge | Discharge | SoC Change | SoC End | HMM State | Price | Near Min | Near Max |\n`;
            table += `|------|-----------|--------|-----------|------------|---------|-----------|-------|----------|----------|\n`;
            
            report.socEvolution.forEach(moment => {
                table += `| ${moment.time} | ${moment.socStart.toFixed(2)} | ${moment.charge.toFixed(2)} | ${moment.discharge.toFixed(2)} | ${moment.socChange.toFixed(2)} | ${moment.socEnd.toFixed(2)} | ${moment.hmmState} | ${moment.price.toFixed(2)} | ${moment.nearMinSoC ? '⚠️' : ''} | ${moment.nearMaxSoC ? '⚠️' : ''} |\n`;
            });
        }
        
        return table;
    };

    const copyToClipboard = () => {
        const table = formatTable();
        navigator.clipboard.writeText(table).then(() => {
            // Could add a toast notification here
            console.log('Debug report copied to clipboard');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Debug Report
                </CardTitle>
                <CardDescription>
                    Comprehensive analysis of optimization constraints and SoC behavior
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Parameters */}
                        <div>
                            <h3 className="font-semibold mb-2">Parameters</h3>
                            <div className="text-sm space-y-1">
                                <div>Min SoC: {debugReport.params.socMin} MWh</div>
                                <div>Max SoC: {debugReport.params.socMax} MWh</div>
                                <div>SoC Range: {debugReport.params.socRange} MWh</div>
                                <div>Max Power: {debugReport.params.pMax} MW</div>
                                <div>Efficiency: {(debugReport.params.efficiency * 100).toFixed(1)}%</div>
                                <div>Avg Price: {debugReport.params.avgPrice?.toFixed(2) || 'N/A'} $/MWh</div>
                                <div>Price Threshold: {debugReport.params.priceThreshold?.toFixed(2) || 'N/A'} $/MWh</div>
                            </div>
                        </div>

                        {/* SoC Analysis */}
                        <div>
                            <h3 className="font-semibold mb-2">SoC Analysis</h3>
                            <div className="text-sm space-y-1">
                                <div>Min SoC: {debugReport.socAnalysis.minSoC.toFixed(2)} MWh</div>
                                <div>Max SoC: {debugReport.socAnalysis.maxSoC.toFixed(2)} MWh</div>
                                <div>Range Used: {debugReport.socAnalysis.socRangeUsed.toFixed(2)} MWh</div>
                                <div>Utilization: {debugReport.socAnalysis.socRangeUtilization.toFixed(1)}%</div>
                                <div>Reached Min: {debugReport.socAnalysis.reachedMinSoC ? '✅' : '❌'}</div>
                                <div>Reached Max: {debugReport.socAnalysis.reachedMaxSoC ? '✅' : '❌'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Constraints */}
                    <div>
                        <h3 className="font-semibold mb-2">Key Constraints</h3>
                        <div className="text-sm space-y-1">
                            {debugReport.constraints.neverReachedMinSoC && (
                                <div className="text-red-600">❌ Never reached minimum SoC</div>
                            )}
                            {debugReport.constraints.hmmDischargeUnderutilized && (
                                <div className="text-orange-600">⚠️ HMM discharge state underutilized</div>
                            )}
                            {debugReport.constraints.energyConstraint && (
                                <div className="text-red-600">❌ Energy constraint preventing full discharge</div>
                            )}
                            {debugReport.constraints.powerConstraint && (
                                <div className="text-red-600">❌ Power constraint limiting discharge</div>
                            )}
                            {!debugReport.constraints.neverReachedMinSoC && 
                             !debugReport.constraints.hmmDischargeUnderutilized && 
                             !debugReport.constraints.energyConstraint && 
                             !debugReport.constraints.powerConstraint && (
                                <div className="text-green-600">✅ No major constraints detected</div>
                            )}
                        </div>
                    </div>

                    {/* Copy Button */}
                    <Button 
                        onClick={copyToClipboard}
                        variant="outline"
                        className="w-full"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Full Report to Clipboard
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DebugReport; 