import React, { useContext, useMemo } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';
import { splitRosterByRole } from '../utils/dataUtils';
import SleeperApiService from '../services/sleeperApi';

const TeamRoster = ({ rosterId, week }) => {
  const { rosters, players, matchups, loading } = useContext(LeagueContext);

  const roster = useMemo(() => {
    if (!rosters || !rosterId) return null;
    return rosters.find(r => r.roster_id === parseInt(rosterId));
  }, [rosters, rosterId]);

  const matchup = useMemo(() => {
    if (!matchups || !matchups.length || !rosterId || !week) return null;
    return matchups.find(m => m.roster_id === parseInt(rosterId) && m.week === parseInt(week));
  }, [matchups, rosterId, week]);

  const rosterPlayers = useMemo(() => {
    if (!roster || !players) return { starters: [], bench: [] };
    
    // If we have a matchup for the specific week, use those starters
    const starters = matchup ? matchup.starters : roster.starters || [];
    const allPlayers = roster.players || [];
    
    return splitRosterByRole(allPlayers, starters, players);
  }, [roster, players, matchup]);

  const getPositionColor = (position) => {
    const positionColors = {
      QB: 'bg-red-100 text-red-800',
      RB: 'bg-blue-100 text-blue-800',
      WR: 'bg-green-100 text-green-800',
      TE: 'bg-purple-100 text-purple-800',
      K: 'bg-yellow-100 text-yellow-800',
      DEF: 'bg-gray-100 text-gray-800',
      DL: 'bg-indigo-100 text-indigo-800',
      LB: 'bg-pink-100 text-pink-800',
      DB: 'bg-orange-100 text-orange-800',
    };
    
    return positionColors[position] || 'bg-gray-100 text-gray-800';
  };

  const renderPlayerRow = (player, index) => {
    if (!player) return null;
    
    const position = player.position || 'Unknown';
    const team = player.team || '';
    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
    const points = matchup && matchup.players_points && player.playerId in matchup.players_points
      ? matchup.players_points[player.playerId]
      : null;
    
    return (
      <tr key={player.playerId || index} className="hover:bg-gray-50">
        <td className="px-4 py-2 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <img 
                className="h-10 w-10 rounded-full" 
                src={SleeperApiService.getPlayerThumbnailUrl(player.playerId) || 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                alt={fullName} 
              />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{fullName}</div>
              <div className="text-sm text-gray-500">
                {team && (
                  <img 
                    src={SleeperApiService.getTeamLogoUrl(team)} 
                    alt={team} 
                    className="inline-block h-4 w-4 mr-1" 
                  />
                )}
                {team}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPositionColor(position)}`}>
            {position}
          </span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
          <span className="text-gray-400">Not available</span>
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div className="p-4 text-center">Loading roster...</div>;
  }

  if (!roster) {
    return <div className="p-4 text-center">Roster not found.</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-gray-800 text-white">
        <h3 className="text-lg leading-6 font-medium">Team Roster</h3>
        {week && <p className="mt-1 max-w-2xl text-sm">Week {week} Lineup</p>}
      </div>
      
      {/* Starters Section */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-100">
          <h4 className="text-md font-semibold">Starters</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rosterPlayers.starters.length > 0 ? (
                rosterPlayers.starters.map((player, index) => renderPlayerRow(player, index))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-center text-sm text-gray-500">
                    No starters data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Bench Section */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-100">
          <h4 className="text-md font-semibold">Bench</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rosterPlayers.bench.length > 0 ? (
                rosterPlayers.bench.map((player, index) => renderPlayerRow(player, index))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-center text-sm text-gray-500">
                    No bench players data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamRoster;
