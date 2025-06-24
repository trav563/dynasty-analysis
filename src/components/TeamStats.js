import React, { useContext, useMemo } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';
import { calculateAveragePoints, calculateWinRate, formatPoints, formatPercentage, getWinRateColor } from '../utils/dataUtils';


const TeamStats = ({ rosterId }) => {
  const { rosters, users, matchups, loading, league } = useContext(LeagueContext);

  const roster = useMemo(() => {
    if (!rosters || !rosterId) return null;
    return rosters.find(r => r.roster_id === parseInt(rosterId));
  }, [rosters, rosterId]);

  const user = useMemo(() => {
    if (!users || !roster) return null;
    return users.find(u => u.user_id === roster.owner_id);
  }, [users, roster]);

  // Calculate regular season and playoff stats
  const stats = useMemo(() => {
    if (!matchups.length || !league || !rosterId) return null;

    // Determine playoff weeks based on league settings
    const playoffStartWeek = league.settings?.playoff_week_start || 15;
    
    // For win rate, we need all matchups to find opponents
    const allRegularSeasonMatchups = matchups.filter(m => m.week < playoffStartWeek);
    const allPlayoffMatchups = matchups.filter(m => m.week >= playoffStartWeek);
    
    const regularSeasonWinRate = calculateWinRate(allRegularSeasonMatchups, rosterId);
    const playoffWinRate = calculateWinRate(allPlayoffMatchups, rosterId);
    const overallWinRate = calculateWinRate(matchups, rosterId);
    
    // For point calculations, we only need the specific team's matchups
    const teamMatchups = matchups.filter(m => m.roster_id === parseInt(rosterId));
    const teamRegularSeasonMatchups = teamMatchups.filter(m => m.week < playoffStartWeek);
    const teamPlayoffMatchups = teamMatchups.filter(m => m.week >= playoffStartWeek);

    const avgPointsRegular = calculateAveragePoints(teamRegularSeasonMatchups, rosterId);
    const avgPointsPlayoff = calculateAveragePoints(teamPlayoffMatchups, rosterId);
    const avgPointsOverall = calculateAveragePoints(teamMatchups, rosterId);
    
    // Calculate highest and lowest scores
    const scores = teamMatchups.map(m => m.points || 0);
    const highestScore = scores.length ? Math.max(...scores) : 0;
    const lowestScore = scores.length ? Math.min(...scores) : 0;

    return {
      regularSeasonWinRate,
      playoffWinRate,
      overallWinRate,
      avgPointsRegular,
      avgPointsPlayoff,
      avgPointsOverall,
      highestScore,
      lowestScore,
      totalGames: teamMatchups.length,
      regularSeasonGames: teamRegularSeasonMatchups.length,
      playoffGames: teamPlayoffMatchups.length,
    };
  }, [matchups, league, rosterId]);

  if (loading) {
    return <div className="p-4 text-center">Loading team stats...</div>;
  }

  if (!roster || !user) {
    return <div className="p-4 text-center">Team not found.</div>;
  }

  if (!stats) {
    return <div className="p-4 text-center">No stats available for this team.</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-gray-800 text-white"><h3 className="text-lg leading-6 font-medium">Team Performance Stats</h3></div>
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Performance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold mb-4">Overall Performance</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Win Rate</span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getWinRateColor(stats.overallWinRate) }}
                  >
                    {formatPercentage(stats.overallWinRate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${stats.overallWinRate}%`,
                      backgroundColor: getWinRateColor(stats.overallWinRate)
                    }}
                  ></div>
                </div>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  Win Rate: {stats.overallWinRate.toFixed(2)}% (Width: {stats.overallWinRate}%)
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Points</p>
                  <p className="text-lg font-semibold">{formatPoints(stats.avgPointsOverall)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Games</p>
                  <p className="text-lg font-semibold">{stats.totalGames}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Highest Score</p>
                  <p className="text-lg font-semibold">{formatPoints(stats.highestScore)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lowest Score</p>
                  <p className="text-lg font-semibold">{formatPoints(stats.lowestScore)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Regular Season Performance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold mb-4">Regular Season Performance</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Win Rate</span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getWinRateColor(stats.regularSeasonWinRate) }}
                  >
                    {formatPercentage(stats.regularSeasonWinRate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${stats.regularSeasonWinRate}%`,
                      backgroundColor: getWinRateColor(stats.regularSeasonWinRate)
                    }}
                  ></div>
                </div>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  Win Rate: {stats.regularSeasonWinRate.toFixed(2)}% (Width: {stats.regularSeasonWinRate}%)
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Points</p>
                  <p className="text-lg font-semibold">{formatPoints(stats.avgPointsRegular)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Games Played</p>
                  <p className="text-lg font-semibold">{stats.regularSeasonGames}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Playoff Performance */}
          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h4 className="text-lg font-semibold mb-4">Playoff Performance</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Win Rate</span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getWinRateColor(stats.playoffWinRate) }}
                  >
                    {formatPercentage(stats.playoffWinRate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${stats.playoffWinRate}%`,
                      backgroundColor: getWinRateColor(stats.playoffWinRate)
                    }}
                  ></div>
                </div>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  Win Rate: {stats.playoffWinRate.toFixed(2)}% (Width: {stats.playoffWinRate}%)
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Points</p>
                  <p className="text-lg font-semibold">{formatPoints(stats.avgPointsPlayoff)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Playoff Games</p>
                  <p className="text-lg font-semibold">{stats.playoffGames}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamStats;
