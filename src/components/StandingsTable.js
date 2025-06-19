import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeagueContext } from '../contexts/LeagueContext';
import { getStandings, formatPoints } from '../utils/dataUtils';
import SleeperApiService from '../services/sleeperApi';

const StandingsTable = () => {
  const { rosters, users, loading } = useContext(LeagueContext);
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');
  const navigate = useNavigate();

  const standings = useMemo(() => {
    return getStandings(rosters, users);
  }, [rosters, users]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedStandings = useMemo(() => {
    if (!standings.length) return [];

    return [...standings].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'teamName') {
        comparison = a.teamName.localeCompare(b.teamName);
      } else if (sortField === 'winPercentage') {
        const aWinPct = a.wins / (a.wins + a.losses + a.ties || 1);
        const bWinPct = b.wins / (b.wins + b.losses + b.ties || 1);
        comparison = aWinPct - bWinPct;
      } else {
        comparison = a[sortField] - b[sortField];
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [standings, sortField, sortDirection]);

  if (loading) {
    return <div className="p-4 text-center">Loading standings...</div>;
  }

  if (!standings.length) {
    return <div className="p-4 text-center">No standings data available.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-lg">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="px-4 py-3 text-left">Rank</th>
            <th 
              className="px-4 py-3 text-left cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('teamName')}
            >
              Team
              {sortField === 'teamName' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('wins')}
            >
              W
              {sortField === 'wins' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('losses')}
            >
              L
              {sortField === 'losses' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('ties')}
            >
              T
              {sortField === 'ties' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('winPercentage')}
            >
              Win %
              {sortField === 'winPercentage' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('pointsFor')}
            >
              PF
              {sortField === 'pointsFor' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('pointsAgainst')}
            >
              PA
              {sortField === 'pointsAgainst' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedStandings.map((team, index) => {
            const totalGames = team.wins + team.losses + team.ties;
            const winPercentage = totalGames > 0 
              ? ((team.wins + (team.ties * 0.5)) / totalGames).toFixed(3)
              : '0.000';
              
            return (
              <tr 
                key={team.rosterId} 
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50`}
                onClick={() => navigate(`/team/${team.rosterId}`)}
              >
                <td className="px-4 py-3 text-gray-900">{team.rank || index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    {team.avatar && (
                      <img 
                        src={SleeperApiService.getAvatarUrl(team.avatar)} 
                        alt={`${team.teamName} avatar`}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    )}
                    <span className="font-medium text-gray-900 hover:text-blue-600">{team.teamName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{team.wins}</td>
                <td className="px-4 py-3 text-center">{team.losses}</td>
                <td className="px-4 py-3 text-center">{team.ties}</td>
                <td className="px-4 py-3 text-center">{winPercentage}</td>
                <td className="px-4 py-3 text-center">{formatPoints(team.pointsFor)}</td>
                <td className="px-4 py-3 text-center">{formatPoints(team.pointsAgainst)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StandingsTable;
