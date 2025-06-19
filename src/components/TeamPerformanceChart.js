import React, { useContext, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { LeagueContext } from '../contexts/LeagueContext';
import { formatPoints } from '../utils/dataUtils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TeamPerformanceChart = ({ rosterId }) => {
  const { matchups, loading } = useContext(LeagueContext);

  const teamMatchups = useMemo(() => {
    if (!matchups || !matchups.length || !rosterId) return [];
    
    return matchups
      .filter(m => m.roster_id === parseInt(rosterId))
      .sort((a, b) => a.week - b.week);
  }, [matchups, rosterId]);

  const chartData = useMemo(() => {
    if (!teamMatchups.length) return null;
    
    const weeks = teamMatchups.map(m => `Week ${m.week}`);
    const points = teamMatchups.map(m => m.points || 0);
    
    // Calculate average points per week
    const avgPoints = points.reduce((sum, p) => sum + p, 0) / points.length;
    
    return {
      labels: weeks,
      datasets: [
        {
          label: 'Points',
          data: points,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.1,
        },
        {
          label: 'Average',
          data: Array(weeks.length).fill(avgPoints),
          borderColor: 'rgb(107, 114, 128)',
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
        },
      ],
    };
  }, [teamMatchups]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Season Performance',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${formatPoints(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Points',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        min: 0,
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return <div className="p-4 text-center">Loading performance data...</div>;
  }

  if (!teamMatchups.length) {
    return <div className="p-4 text-center">No performance data available.</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="h-80">
        {chartData && <Line data={chartData} options={chartOptions} />}
      </div>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Highest</p>
          <p className="text-lg font-semibold">
            {formatPoints(Math.max(...teamMatchups.map(m => m.points || 0)))}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Lowest</p>
          <p className="text-lg font-semibold">
            {formatPoints(Math.min(...teamMatchups.map(m => m.points || 0)))}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Average</p>
          <p className="text-lg font-semibold">
            {formatPoints(teamMatchups.reduce((sum, m) => sum + (m.points || 0), 0) / teamMatchups.length)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-500">Games</p>
          <p className="text-lg font-semibold">{teamMatchups.length}</p>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformanceChart;
