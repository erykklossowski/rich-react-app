// Path: src/components/ChartComponents.jsx

import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// Register Chart.js components. This is crucial for Chart.js to work.
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);


// Component for displaying Electricity Prices.
export const PriceChart = ({ data, priceCategories, title }) => {
    const hours = Array.from({ length: data.length }, (_, i) => i + 1);
    const chartData = {
        labels: hours,
        datasets: [{
            label: 'Price (€/MWh)',
            data: data,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            pointBackgroundColor: hours.map((_, i) => {
                const cat = priceCategories[i];
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
            y: { beginAtZero: false, title: { display: true, text: 'Price (€/MWh)' } },
            x: { title: { display: true, text: 'Hour' } }
        }
    };
    return <Line data={chartData} options={options} />;
};

// Component for displaying Battery State of Charge.
export const SoCChart = ({ data, title }) => {
    const hours = Array.from({ length: data.length }, (_, i) => i + 1);
    const chartData = {
        labels: hours,
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
            x: { title: { display: true, text: 'Hour' } }
        }
    };
    return <Line data={chartData} options={options} />;
};

// Component for displaying Battery Charging/Discharging Power.
export const PowerChart = ({ charging, discharging, title }) => {
    const hours = Array.from({ length: charging.length }, (_, i) => i + 1);
    const chartData = {
        labels: hours,
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
            x: { title: { display: true, text: 'Hour' } }
        }
    };
    return <Bar data={chartData} options={options} />;
};

// Component for displaying Hourly Revenue.
export const RevenueChart = ({ data, title }) => {
    const hours = Array.from({ length: data.length }, (_, i) => i + 1);
    const chartData = {
        labels: hours,
        datasets: [{
            label: 'Hourly Revenue (€)',
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
            y: { title: { display: true, text: 'Revenue (€)' } },
            x: { title: { display: true, text: 'Hour' } }
        }
    };
    return <Bar data={chartData} options={options} />;
};