import React, { useContext, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { LeagueContext } from '../contexts/LeagueContext';
import { getTrendingTeams } from '../utils/dataUtils';
import SleeperApiService from '../services/sleeperApi';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TrendingTeamsChart = () => {
  const { matchups, users, rosters, loading, selectedSeason } = useContext(LeagueContext);
  const [weeksToConsider, setWeeksToConsider] = useState(3);
  const [excludedTeams, setExcludedTeams] = useState([]);

  const trendingTeams = useMemo(() => {
    // Create a map of roster_id to owner_id from rosters data
    const rosterOwnerMap = {};
    if (rosters && rosters.length > 0) {
      rosters.forEach(roster => {
        rosterOwnerMap[roster.roster_id] = roster.owner_id;
      });
    }
    
    // Add owner_id to each matchup
    const matchupsWithOwners = matchups.map(matchup => ({
      ...matchup,
      owner_id: rosterOwnerMap[matchup.roster_id]
    }));
    
    return getTrendingTeams(matchupsWithOwners, users, weeksToConsider);
  }, [matchups, users, weeksToConsider, rosters]);

  const handleToggleTeam = (rosterId) => {
    setExcludedTeams(prev => 
      prev.includes(rosterId)
        ? prev.filter(id => id !== rosterId)
        : [...prev, rosterId]
    );
  };

  const chartData = useMemo(() => {
    if (!trendingTeams.length) return null;

    const filteredTeams = trendingTeams.filter(team => !excludedTeams.includes(team.rosterId));
    
    return {
      labels: filteredTeams.map(team => team.teamName),
      datasets: [
        {
          label: 'Point Trend',
          data: filteredTeams.map(team => team.trend),
          backgroundColor: filteredTeams.map(team => 
            team.trend >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
          ),
          borderColor: filteredTeams.map(team => 
            team.trend >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [trendingTeams, excludedTeams]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Team Performance Trends',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `Trend: ${value > 0 ? '+' : ''}${value.toFixed(2)} points`;
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Point Differential from Average',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return <div className="p-4 text-center">Loading trending teams data...</div>;
  }

  if (!trendingTeams.length) {
    return <div className="p-4 text-center">No trending teams data available.</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Trending Teams</h2>
          <p className="text-sm text-gray-600 mt-1">
            Compares each team's most recent week's performance to their average in previous weeks.
            Positive values indicate improvement, negative values indicate decline.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="weeks-select" className="text-sm font-medium">
            Weeks to consider:
          </label>
          <select
            id="weeks-select"
            value={weeksToConsider}
            onChange={(e) => setWeeksToConsider(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value={2}>2 Weeks</option>
            <option value={3}>3 Weeks</option>
            <option value={4}>4 Weeks</option>
            <option value={5}>5 Weeks</option>
          </select>
        </div>
      </div>

      <div className="h-80 mb-4">
        {chartData && <Bar data={chartData} options={chartOptions} />}
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Toggle Teams</h3>
        <div className="flex flex-wrap gap-2">
          {trendingTeams.map((team) => (
            <button
              key={team.rosterId}
              onClick={() => handleToggleTeam(team.rosterId)}
              className={`flex items-center px-3 py-1 rounded-full text-sm ${
                excludedTeams.includes(team.rosterId)
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {team.avatar && (
                <img
                  src={SleeperApiService.getAvatarUrl(team.avatar)}
                  alt={`${team.teamName} avatar`}
                  className="w-5 h-5 rounded-full mr-1"
                />
              )}
              {team.teamName}
              <span className="ml-1 font-semibold">
                {team.trend > 0 ? '+' : ''}
                {team.trend.toFixed(1)}
              </span>
              <span 
                className="ml-1 text-xs text-gray-500 cursor-help"
                title={`Most recent week (${team.debug?.mostRecentWeek}): ${team.debug?.mostRecentPoints.toFixed(1)} pts
Previous weeks avg (${team.debug?.previousWeeks.join(', ')}): ${team.debug?.previousWeeksAvg.toFixed(1)} pts`}
              >
                ℹ️
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingTeamsChart;
