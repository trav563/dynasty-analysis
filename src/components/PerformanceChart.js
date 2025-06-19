import React, { useContext, useState, useMemo } from 'react';
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
import SleeperApiService from '../services/sleeperApi';

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

const PerformanceChart = () => {
  const { matchups, users, rosters, loading } = useContext(LeagueContext);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [showAllTeams, setShowAllTeams] = useState(true);

  // Get all available weeks from matchups
  const availableWeeks = useMemo(() => {
    if (!matchups || !matchups.length) return [];
    
    const weeks = [...new Set(matchups.map(m => m.week))].sort((a, b) => a - b);
    return weeks;
  }, [matchups]);

  // Get team data for all teams
  const teamData = useMemo(() => {
    if (!matchups || !matchups.length || !users || !rosters) return [];
    
    // Get unique roster IDs
    const rosterIds = [...new Set(matchups.map(m => m.roster_id))];
    
    // Create team data for each roster
    return rosterIds.map(rosterId => {
      const roster = rosters.find(r => r.roster_id === rosterId);
      if (!roster) return null;
      
      const user = users.find(u => u.user_id === roster.owner_id);
      if (!user) return null;
      
      const teamMatchups = matchups
        .filter(m => m.roster_id === rosterId)
        .sort((a, b) => a.week - b.week);
      
      // Create points data for each week
      const pointsByWeek = {};
      teamMatchups.forEach(m => {
        pointsByWeek[m.week] = m.points || 0;
      });
      
      return {
        rosterId,
        teamName: user.display_name || `Team ${rosterId}`,
        avatar: user.avatar,
        pointsByWeek,
      };
    }).filter(Boolean);
  }, [matchups, users, rosters]);

  // Toggle team selection
  const handleToggleTeam = (rosterId) => {
    setSelectedTeams(prev => {
      if (prev.includes(rosterId)) {
        return prev.filter(id => id !== rosterId);
      } else {
        return [...prev, rosterId];
      }
    });
    
    // If we're showing all teams and user selects a team, switch to selected teams only
    if (showAllTeams) {
      setShowAllTeams(false);
    }
  };

  // Toggle between all teams and selected teams
  const handleToggleAllTeams = () => {
    setShowAllTeams(prev => !prev);
  };

  // Generate chart data
  const chartData = useMemo(() => {
    if (!teamData.length || !availableWeeks.length) return null;
    
    const labels = availableWeeks.map(week => `Week ${week}`);
    
    // Determine which teams to show
    const teamsToShow = showAllTeams 
      ? teamData 
      : teamData.filter(team => selectedTeams.includes(team.rosterId));
    
    // Generate random colors for teams
    const getTeamColor = (index) => {
      const colors = [
        'rgb(59, 130, 246)', // blue
        'rgb(239, 68, 68)',  // red
        'rgb(34, 197, 94)',  // green
        'rgb(168, 85, 247)', // purple
        'rgb(249, 115, 22)', // orange
        'rgb(236, 72, 153)', // pink
        'rgb(20, 184, 166)', // teal
        'rgb(234, 179, 8)',  // yellow
        'rgb(107, 114, 128)', // gray
        'rgb(79, 70, 229)',  // indigo
        'rgb(217, 70, 239)', // fuchsia
        'rgb(6, 182, 212)',  // cyan
      ];
      
      return colors[index % colors.length];
    };
    
    // Create datasets for each team
    const datasets = teamsToShow.map((team, index) => {
      const color = getTeamColor(index);
      
      // Create data points for each week
      const data = availableWeeks.map(week => team.pointsByWeek[week] || null);
      
      return {
        label: team.teamName,
        data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
        tension: 0.1,
      };
    });
    
    return {
      labels,
      datasets,
    };
  }, [teamData, availableWeeks, selectedTeams, showAllTeams]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: false, // Hide the legend since we have custom team toggles
      },
      title: {
        display: true,
        text: 'League Performance Comparison',
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

  if (!teamData.length) {
    return <div className="p-4 text-center">No performance data available.</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <h2 className="text-xl font-semibold">League Performance</h2>
        <div className="flex items-center">
          <button
            onClick={handleToggleAllTeams}
            className={`px-3 py-1 rounded-md text-sm font-medium mr-2 ${
              showAllTeams
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showAllTeams ? 'Showing All' : 'Show All'}
          </button>
          <button
            onClick={() => setSelectedTeams([])}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
            disabled={selectedTeams.length === 0}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div className="h-80 mb-4">
        {chartData && <Line data={chartData} options={chartOptions} />}
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Teams</h3>
        <div className="flex flex-wrap gap-2">
          {teamData.map((team, index) => (
            <button
              key={team.rosterId}
              onClick={() => handleToggleTeam(team.rosterId)}
              className={`flex items-center px-3 py-1 rounded-full text-sm ${
                showAllTeams || selectedTeams.includes(team.rosterId)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
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
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
