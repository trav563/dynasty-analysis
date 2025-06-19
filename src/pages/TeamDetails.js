import React, { useContext, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LeagueContext } from '../contexts/LeagueContext';
import SeasonSelector from '../components/SeasonSelector';
import TeamRoster from '../components/TeamRoster';
import TeamStats from '../components/TeamStats';
import TeamPerformanceChart from '../components/TeamPerformanceChart';
import SleeperApiService from '../services/sleeperApi';

const TeamDetails = () => {
  const { rosterId } = useParams();
  const { rosters, users, matchups, loading, error, league, selectedSeason, nflState } = useContext(LeagueContext);
  const [selectedWeek, setSelectedWeek] = useState(1);
  
  // Check if we're viewing a future season with no matchups
  const isFutureSeason = nflState && selectedSeason && parseInt(selectedSeason) > parseInt(nflState.season);
  const hasNoMatchups = matchups && matchups.length === 0;

  // Get roster and user data
  const rosterData = useMemo(() => {
    if (!rosters || !users || !rosterId) return null;
    
    const roster = rosters.find(r => r.roster_id === parseInt(rosterId));
    if (!roster) return null;
    
    const user = users.find(u => u.user_id === roster.owner_id);
    if (!user) return null;
    
    return {
      roster,
      user,
    };
  }, [rosters, users, rosterId]);

  // Get all available weeks from matchups
  const availableWeeks = useMemo(() => {
    if (!matchups || !matchups.length) return [];
    
    const weeks = [...new Set(matchups.map(m => m.week))].sort((a, b) => a - b);
    return weeks;
  }, [matchups]);

  // Handle week change
  const handleWeekChange = (e) => {
    setSelectedWeek(Number(e.target.value));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  if (loading || !rosterData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">
          &larr; Back to Dashboard
        </Link>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const { user, roster } = rosterData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
        <SeasonSelector />
      </div>
      
      {isFutureSeason && hasNoMatchups && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Future Season Notice: </strong>
          <span className="block sm:inline">
            You're viewing the {selectedSeason} season which hasn't started yet. 
            No matchups are available from the Sleeper API for future seasons.
            Statistics and matchups will appear here once the season begins.
          </span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {user.avatar && (
            <div className="flex-shrink-0">
              <img
                src={SleeperApiService.getAvatarUrl(user.avatar)}
                alt={`${user.display_name} avatar`}
                className="w-24 h-24 rounded-full"
              />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{user.display_name}</h1>
            {league && (
              <p className="text-gray-600 mt-1">
                {league.name} - {league.season} Season
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="bg-gray-100 px-3 py-1 rounded-md text-sm">
                <span className="font-medium">Roster ID:</span> {roster.roster_id}
              </div>
              {roster.settings && (
                <>
                  <div className="bg-gray-100 px-3 py-1 rounded-md text-sm">
                    <span className="font-medium">Record:</span> {roster.settings.wins}-{roster.settings.losses}{roster.settings.ties > 0 ? `-${roster.settings.ties}` : ''}
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded-md text-sm">
                    <span className="font-medium">Points For:</span> {roster.settings.fpts?.toFixed(2) || 0}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Team Stats */}
        <div className="lg:col-span-2">
          <TeamStats rosterId={rosterId} />
        </div>

        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <TeamPerformanceChart rosterId={rosterId} />
        </div>
      </div>

      {/* Team Roster */}
      <div className="mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Roster</h2>
            {availableWeeks.length > 0 && (
              <div className="flex items-center space-x-2">
                <label htmlFor="roster-week-select" className="text-sm font-medium">
                  Week:
                </label>
                <select
                  id="roster-week-select"
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
            )}
          </div>
        </div>
        <TeamRoster rosterId={rosterId} week={selectedWeek} />
      </div>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Data provided by Sleeper API</p>
        <p className="mt-1">© {new Date().getFullYear()} Dynasty Analysis</p>
      </footer>
    </div>
  );
};

export default TeamDetails;
