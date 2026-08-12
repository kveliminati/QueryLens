import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { DollarSign, ShoppingCart, Package, TrendingUp, BarChart2, LineChart } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function ResultsVisualizer({ kpis, queryResult }) {
  const [chartType, setChartType] = useState('bar');

  const formattedRevenue = kpis?.totalRevenue ? `$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
  const formattedQuantity = kpis?.totalQuantity ? kpis.totalQuantity.toLocaleString() : '0';
  const formattedOrders = kpis?.totalOrders ? kpis.totalOrders.toLocaleString() : '0';
  const formattedAov = kpis?.avgOrderValue ? `$${kpis.avgOrderValue.toFixed(2)}` : '$0.00';

  // Prepare chart data from query result
  const columns = queryResult?.columns || [];
  const rows = queryResult?.data || [];

  const labelCol = columns[0] || 'Entity';
  const valCol = columns[1] || 'Metric';

  const chartLabels = rows.map(r => String(r[labelCol] || 'N/A').substring(0, 25));
  const chartValues = rows.map(r => Number(r[valCol]) || 0);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: valCol,
        data: chartValues,
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        borderRadius: 6,
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        ticks: { color: '#9ca3af', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title">Total Revenue</span>
            <DollarSign size={18} color="var(--accent-cyan)" />
          </div>
          <div className="kpi-value">{formattedRevenue}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title">Total Units Sold</span>
            <Package size={18} color="var(--accent-green)" />
          </div>
          <div className="kpi-value">{formattedQuantity}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title">Total Invoices</span>
            <ShoppingCart size={18} color="var(--accent-purple)" />
          </div>
          <div className="kpi-value">{formattedOrders}</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kpi-title">Avg Order Value</span>
            <TrendingUp size={18} color="var(--accent-amber)" />
          </div>
          <div className="kpi-value">{formattedAov}</div>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Query Results Visualization
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: chartType === 'bar' ? 'var(--accent-blue)' : 'transparent' }}
              onClick={() => setChartType('bar')}
            >
              <BarChart2 size={14} /> Bar
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: chartType === 'line' ? 'var(--accent-blue)' : 'transparent' }}
              onClick={() => setChartType('line')}
            >
              <LineChart size={14} /> Line
            </button>
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          {chartType === 'bar' ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
}
