import React, { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LeagueContext } from '../contexts/LeagueContext';
import { formatPoints } from '../utils/dataUtils';
import SleeperApiService from '../services/sleeperApi';

const WeeklyScorecard = () => {
  const { matchups, users, rosters, loading, nflState } = useContext(LeagueContext);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Get all available weeks from matchups
  const availableWeeks = useMemo(() => {
    if (!matchups || !matchups.length) return [];
    
    const weeks = [...new Set(matchups.map(m => m.week))].sort((a, b) => a - b);
    return weeks;
  }, [matchups]);

  // Get current week from NFL state or default to the last available week
  const currentWeek = useMemo(() => {
    if (nflState && nflState.week) {
      return nflState.week;
    }
    
    if (availableWeeks.length) {
      return availableWeeks[availableWeeks.length - 1];
    }
    
    return 1;
  }, [nflState, availableWeeks]);

  // Set selected week to current week when it changes
  React.useEffect(() => {
    if (currentWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek]);

  // Get matchups for the selected week
  const weekMatchups = useMemo(() => {
    if (!matchups || !matchups.length) return [];
    
    // Filter matchups for the selected week
    const filteredMatchups = matchups.filter(m => m.week === selectedWeek);
    
    // Group matchups by matchup_id
    const groupedMatchups = filteredMatchups.reduce((acc, matchup) => {
      if (!acc[matchup.matchup_id]) {
        acc[matchup.matchup_id] = [];
      }
      acc[matchup.matchup_id].push(matchup);
      return acc;
    }, {});
    
    // Convert to array of matchup pairs
    return Object.values(groupedMatchups);
  }, [matchups, selectedWeek]);

  // Get team info by roster ID
  const getTeamInfo = (rosterId) => {
    if (!rosters || !users) return { name: `Team ${rosterId}`, avatar: null };
    
    const roster = rosters.find(r => r.roster_id === rosterId);
    if (!roster) return { name: `Team ${rosterId}`, avatar: null };
    
    const user = users.find(u => u.user_id === roster.owner_id);
    if (!user) return { name: `Team ${rosterId}`, avatar: null };
    
    return {
      name: user.display_name || `Team ${rosterId}`,
      avatar: user.avatar,
    };
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(Number(e.target.value));
  };

  if (loading) {
    return <div className="p-4 text-center">Loading matchups...</div>;
  }

  if (!weekMatchups.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Weekly Matchups</h2>
          <div className="flex items-center space-x-2">
            <label htmlFor="week-select" className="text-sm font-medium">
              Week:
            </label>
            <select
              id="week-select"
              value={selectedWeek}
              onChange={handleWeekChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              {availableWeeks.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 text-center">No matchups available for Week {selectedWeek}.</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Weekly Matchups</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="week-select" className="text-sm font-medium">
            Week:
          </label>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={handleWeekChange}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
          >
            {availableWeeks.map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weekMatchups.map((matchup, index) => {
          if (matchup.length !== 2) return null;
          
          const team1 = matchup[0];
          const team2 = matchup[1];
          
          const team1Info = getTeamInfo(team1.roster_id);
          const team2Info = getTeamInfo(team2.roster_id);
          
          const team1Points = team1.points || 0;
          const team2Points = team2.points || 0;
          
          const team1Winner = team1Points > team2Points;
          const team2Winner = team2Points > team1Points;
          const isTie = team1Points === team2Points;
          
          return (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-gray-700">Matchup {index + 1}</h3>
              </div>
              
              <div className="p-4">
                {/* Team 1 */}
                <Link to={`/team/${team1.roster_id}`} className="block">
                  <div className={`flex items-center justify-between mb-3 p-2 rounded ${team1Winner ? 'bg-green-50' : isTie ? 'bg-gray-50' : 'bg-red-50'}`}>
                    <div className="flex items-center">
                      {team1Info.avatar && (
                        <img 
                          src={SleeperApiService.getAvatarUrl(team1Info.avatar)} 
                          alt={`${team1Info.name} avatar`}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      )}
                      <span className="font-medium">{team1Info.name}</span>
                    </div>
                    <div className={`text-lg font-bold ${team1Winner ? 'text-green-600' : isTie ? 'text-gray-600' : 'text-red-600'}`}>
                      {formatPoints(team1Points)}
                    </div>
                  </div>
                </Link>
                
                {/* VS Divider */}
                <div className="flex items-center justify-center my-2">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="mx-2 text-sm text-gray-500">VS</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>
                
                {/* Team 2 */}
                <Link to={`/team/${team2.roster_id}`} className="block">
                  <div className={`flex items-center justify-between p-2 rounded ${team2Winner ? 'bg-green-50' : isTie ? 'bg-gray-50' : 'bg-red-50'}`}>
                    <div className="flex items-center">
                      {team2Info.avatar && (
                        <img 
                          src={SleeperApiService.getAvatarUrl(team2Info.avatar)} 
                          alt={`${team2Info.name} avatar`}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      )}
                      <span className="font-medium">{team2Info.name}</span>
                    </div>
                    <div className={`text-lg font-bold ${team2Winner ? 'text-green-600' : isTie ? 'text-gray-600' : 'text-red-600'}`}>
                      {formatPoints(team2Points)}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyScorecard;
