// Path: src/components/ChartComponents.jsx

import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// Register Chart.js components. This is crucial for Chart.js to work.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);


// Component for displaying Electricity Prices.
export const PriceChart = ({ data, priceCategories, title, timestamps = null }) => {
    // Generate labels: use timestamps if available, otherwise use indices
    const labels = timestamps ? timestamps.map(ts => {
        try {
            const date = new Date(ts);
            return date.toLocaleString('pl-PL', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return ts;
        }
    }) : Array.from({ length: data.length }, (_, i) => i + 1);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Price (PLN/MWh)',
            data: data,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            pointBackgroundColor: labels.map((_, i) => {
                const cat = priceCategories ? priceCategories[i] : 2;
                return cat === 1 ? '#3498db' : cat === 2 ? '#f39c12' : '#e74c3c';
            }),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            fill: true
        }]
    };
    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: title },
            legend: { display: true }
        },
        scales: {
            y: { beginAtZero: false, title: { display: true, text: 'Price (PLN/MWh)' } },
            x: { 
                title: { display: true, text: timestamps ? 'Date & Time' : 'Time Period' },
                ticks: {
                    maxTicksLimit: timestamps ? 10 : 20,
                    maxRotation: 45
                }
            }
        }
    };
    return <Line data={chartData} options={options} />;
};

// Component for displaying Battery State of Charge.
export const SoCChart = ({ data, title, timestamps = null }) => {
    // Debug: Log SoC data being passed to chart
    console.log('SoCChart Debug:');
    console.log('  Data length:', data.length);
    console.log('  First 5 SoC values:', data.slice(0, 5));
    console.log('  Last 5 SoC values:', data.slice(-5));
    console.log('  Min SoC:', Math.min(...data));
    console.log('  Max SoC:', Math.max(...data));
    console.log('  SoC range:', Math.max(...data) - Math.min(...data));
    
    // Generate labels: use timestamps if available, otherwise use indices
    const labels = timestamps ? timestamps.map(ts => {
        try {
            const date = new Date(ts);
            return date.toLocaleString('pl-PL', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return ts;
        }
    }) : Array.from({ length: data.length }, (_, i) => i + 1);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'State of Charge (MWh)',
            data: data,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            pointBackgroundColor: '#27ae60',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            fill: true
        }]
    };
    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: title },
            legend: { display: true }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Energy (MWh)' } },
            x: { 
                title: { display: true, text: timestamps ? 'Date & Time' : 'Hour' },
                ticks: {
                    maxTicksLimit: timestamps ? 10 : 20,
                    maxRotation: 45
                }
            }
        }
    };
    return <Line data={chartData} options={options} />;
};

// Component for displaying Battery Charging/Discharging Power.
export const PowerChart = ({ charging, discharging, title, timestamps = null }) => {
    // Generate labels: use timestamps if available, otherwise use indices
    const labels = timestamps ? timestamps.map(ts => {
        try {
            const date = new Date(ts);
            return date.toLocaleString('pl-PL', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return ts;
        }
    }) : Array.from({ length: charging.length }, (_, i) => i + 1);
    
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Charging Power (MW)',
                data: charging.map(p => -p), // Negative values for charging
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: '#3498db',
                borderWidth: 1
            },
            {
                label: 'Discharging Power (MW)',
                data: discharging,
                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                borderColor: '#e74c3c',
                borderWidth: 1
            }
        ]
    };
    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: title },
            legend: { display: true }
        },
        scales: {
            y: { title: { display: true, text: 'Power (MW)' } },
            x: { 
                title: { display: true, text: timestamps ? 'Date & Time' : 'Hour' },
                ticks: {
                    maxTicksLimit: timestamps ? 10 : 20,
                    maxRotation: 45
                }
            }
        }
    };
    return <Bar data={chartData} options={options} />;
};

// Component for displaying Hourly Revenue.
export const RevenueChart = ({ data, title, timestamps = null }) => {
    // Generate labels: use timestamps if available, otherwise use indices
    const labels = timestamps ? timestamps.map(ts => {
        try {
            const date = new Date(ts);
            return date.toLocaleString('pl-PL', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return ts;
        }
    }) : Array.from({ length: data.length }, (_, i) => i + 1);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Hourly Revenue (PLN)',
            data: data,
            backgroundColor: data.map(r => r >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)'),
            borderColor: data.map(r => r >= 0 ? '#27ae60' : '#e74c3c'),
            borderWidth: 1
        }]
    };
    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: title },
            legend: { display: true }
        },
        scales: {
            y: { title: { display: true, text: 'Revenue (PLN)' } },
            x: { 
                title: { display: true, text: timestamps ? 'Date & Time' : 'Time Period' },
                ticks: {
                    maxTicksLimit: timestamps ? 10 : 20,
                    maxRotation: 45
                }
            }
        }
    };
    return <Bar data={chartData} options={options} />;
};