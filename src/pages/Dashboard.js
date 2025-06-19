import React, { useContext } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';
import SeasonSelector from '../components/SeasonSelector';
import LeagueIdInput from '../components/LeagueIdInput';
import StandingsTable from '../components/StandingsTable';
import TrendingTeamsChart from '../components/TrendingTeamsChart';
import WeeklyScorecard from '../components/WeeklyScorecard';
import PerformanceChart from '../components/PerformanceChart';

const Dashboard = () => {
  const { league, loading, error, matchups, selectedSeason, nflState } = useContext(LeagueContext);
  
  // Check if we're viewing a future season with no matchups
  const isFutureSeason = nflState && selectedSeason && parseInt(selectedSeason) > parseInt(nflState.season);
  const hasNoMatchups = matchups && matchups.length === 0;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <LeagueIdInput />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dynasty Analysis</h1>
          {league && (
            <p className="text-gray-600 mt-1">
              {league.name} - {league.season} Season
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <SeasonSelector />
          <LeagueIdInput />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : isFutureSeason && hasNoMatchups ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Future Season Notice: </strong>
          <span className="block sm:inline">
            You're viewing the {selectedSeason} season which hasn't started yet. 
            No matchups are available from the Sleeper API for future seasons.
            Statistics and matchups will appear here once the season begins.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* League Standings */}
          <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">League Standings</h2>
              <StandingsTable />
            </div>
          </div>

          {/* Weekly Matchups */}
          <div className="lg:col-span-2">
            <WeeklyScorecard />
          </div>

          {/* Performance Chart */}
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>

          {/* Trending Teams */}
          <div className="lg:col-span-2">
            <TrendingTeamsChart />
          </div>
        </div>
      )}

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Data provided by Sleeper API</p>
        <p className="mt-1">© {new Date().getFullYear()} Dynasty Analysis</p>
      </footer>
    </div>
  );
};

export default Dashboard;
