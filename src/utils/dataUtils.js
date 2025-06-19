/**
 * Utility functions for data processing and analysis
 */

/**
 * Calculate average points per week for a team
 * @param {Array} matchups - Array of matchup data for all weeks
 * @param {string} rosterId - The roster ID to calculate for
 * @returns {number} - Average points per week
 */
export const calculateAveragePoints = (matchups, rosterId) => {
  if (!matchups || !matchups.length) return 0;
  
  const teamMatchups = matchups.filter(matchup => matchup.roster_id === parseInt(rosterId));
  if (!teamMatchups.length) return 0;
  
  const totalPoints = teamMatchups.reduce((sum, matchup) => sum + (matchup.points || 0), 0);
  return totalPoints / teamMatchups.length;
};

/**
 * Calculate win rate for a team
 * @param {Array} matchups - Array of matchup data for all weeks
 * @param {string} rosterId - The roster ID to calculate for
 * @returns {number} - Win rate as a percentage (0-100)
 */
export const calculateWinRate = (matchups, rosterId) => {
  if (!matchups || !matchups.length) return 0;
  
  // Group matchups by week
  const matchupsByWeek = matchups.reduce((acc, matchup) => {
    if (!acc[matchup.matchup_id]) {
      acc[matchup.matchup_id] = [];
    }
    acc[matchup.matchup_id].push(matchup);
    return acc;
  }, {});
  
  let wins = 0;
  let totalGames = 0;
  
  // For each matchup, determine if the team won
  Object.values(matchupsByWeek).forEach(weekMatchup => {
    const teamMatchup = weekMatchup.find(m => m.roster_id === parseInt(rosterId));
    if (!teamMatchup) return;
    
    const opponentMatchup = weekMatchup.find(m => m.roster_id !== parseInt(rosterId));
    if (!opponentMatchup) return;
    
    totalGames++;
    if (teamMatchup.points > opponentMatchup.points) {
      wins++;
    }
  });
  
  return totalGames > 0 ? (wins / totalGames) * 100 : 0;
};

/**
 * Get standings data sorted by wins, points for as tiebreaker
 * @param {Array} rosters - Array of roster data
 * @param {Array} users - Array of user data
 * @returns {Array} - Sorted standings data
 */
export const getStandings = (rosters, users) => {
  if (!rosters || !users) return [];
  
  return rosters
    .map(roster => {
      const user = users.find(u => u.user_id === roster.owner_id);
      return {
        rosterId: roster.roster_id,
        teamName: user?.display_name || `Team ${roster.roster_id}`,
        avatar: user?.avatar,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        ties: roster.settings?.ties || 0,
        pointsFor: roster.settings?.fpts || 0,
        pointsAgainst: roster.settings?.fpts_against || 0,
        rank: roster.settings?.rank || 0,
      };
    })
    .sort((a, b) => {
      // Sort by wins first
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Then by points for as tiebreaker
      return b.pointsFor - a.pointsFor;
    });
};

/**
 * Get trending teams based on recent performance
 * @param {Array} matchups - Array of matchup data for all weeks
 * @param {Array} users - Array of user data
 * @param {number} weeksToConsider - Number of recent weeks to consider
 * @returns {Array} - Trending teams data
 */
export const getTrendingTeams = (matchups, users, weeksToConsider = 3) => {
  if (!matchups || !matchups.length || !users) return [];
  
  // Group matchups by week
  const matchupsByWeek = matchups.reduce((acc, matchup) => {
    if (!acc[matchup.week]) {
      acc[matchup.week] = [];
    }
    acc[matchup.week].push(matchup);
    return acc;
  }, {});
  
  // Get the weeks in descending order
  const weeks = Object.keys(matchupsByWeek)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, weeksToConsider);
  
  // Calculate recent performance for each team
  const teamPerformance = {};
  
  weeks.forEach(week => {
    matchupsByWeek[week].forEach(matchup => {
      if (!teamPerformance[matchup.roster_id]) {
        const user = users.find(u => {
          const roster = matchup.roster_id;
          return u.roster_id === roster;
        });
        
        teamPerformance[matchup.roster_id] = {
          rosterId: matchup.roster_id,
          teamName: user?.display_name || `Team ${matchup.roster_id}`,
          avatar: user?.avatar,
          points: [],
          trend: 0,
        };
      }
      
      teamPerformance[matchup.roster_id].points.push(matchup.points || 0);
    });
  });
  
  // Calculate trend (positive or negative)
  Object.values(teamPerformance).forEach(team => {
    if (team.points.length >= 2) {
      // Calculate trend as the difference between most recent week and average of previous weeks
      const mostRecent = team.points[0];
      const previousAvg = team.points.slice(1).reduce((sum, p) => sum + p, 0) / (team.points.length - 1);
      team.trend = mostRecent - previousAvg;
    }
  });
  
  // Return teams sorted by trend (highest first)
  return Object.values(teamPerformance)
    .sort((a, b) => b.trend - a.trend);
};

/**
 * Split roster into starters and bench players
 * @param {Array} roster - Array of player IDs
 * @param {Array} starters - Array of starter player IDs
 * @param {Object} players - Object of player data
 * @returns {Object} - Object with starters and bench arrays
 */
export const splitRosterByRole = (roster, starters, players) => {
  if (!roster || !starters || !players) return { starters: [], bench: [] };
  
  const starterPlayers = starters.map(playerId => ({
    playerId,
    ...players[playerId],
    isStarter: true,
  }));
  
  const benchPlayers = roster
    .filter(playerId => !starters.includes(playerId))
    .map(playerId => ({
      playerId,
      ...players[playerId],
      isStarter: false,
    }));
  
  return {
    starters: starterPlayers,
    bench: benchPlayers,
  };
};

/**
 * Helper function to add delay between API calls
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get historical league IDs by traversing previous_league_id
 * @param {string} currentLeagueId - The current league ID
 * @param {Function} getLeagueFunc - Function to get league data
 * @returns {Promise<Array>} - Array of historical league IDs
 */
export const getHistoricalLeagueIds = async (currentLeagueId, getLeagueFunc) => {
  const leagueIds = [currentLeagueId];
  let leagueId = currentLeagueId;
  
  try {
    let attempts = 0;
    const maxAttempts = 5; // Limit the number of attempts to prevent infinite loops
    
    while (attempts < maxAttempts) {
      try {
        // Add delay between requests to prevent rate limiting
        if (attempts > 0) {
          await delay(500);
        }
        
        const league = await getLeagueFunc(leagueId);
        if (!league || !league.previous_league_id) break;
        
        leagueIds.push(league.previous_league_id);
        leagueId = league.previous_league_id;
        attempts++;
      } catch (error) {
        console.error(`Error fetching historical league ID (attempt ${attempts + 1}):`, error);
        // Wait longer after an error
        await delay(1000);
        attempts++;
        
        // If we've had multiple errors, break the loop
        if (attempts >= 2) break;
      }
    }
    
    return leagueIds;
  } catch (error) {
    console.error('Error getting historical league IDs:', error);
    return leagueIds;
  }
};

/**
 * Get season from league data
 * @param {Object} league - League data
 * @returns {string} - Season year
 */
export const getSeasonFromLeague = (league) => {
  if (!league) return '';
  return league.season || '';
};

/**
 * Format points value for display
 * @param {number} points - Points value
 * @returns {string} - Formatted points
 */
export const formatPoints = (points) => {
  if (points === undefined || points === null) return '0.00';
  return points.toFixed(2);
};

/**
 * Format percentage for display
 * @param {number} percentage - Percentage value (0-100)
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (percentage) => {
  if (percentage === undefined || percentage === null) return '0%';
  return `${Math.round(percentage)}%`;
};

/**
 * Get color for win rate percentage
 * @param {number} percentage - Win rate percentage (0-100)
 * @returns {string} - CSS color value (gradient from red to green)
 */
export const getWinRateColor = (percentage) => {
  // Red to green gradient
  if (percentage <= 0) return 'rgb(239, 68, 68)'; // Red
  if (percentage >= 100) return 'rgb(34, 197, 94)'; // Green
  
  // Calculate gradient between red and green
  const red = Math.round(239 - (percentage / 100) * (239 - 34));
  const green = Math.round(68 + (percentage / 100) * (197 - 68));
  const blue = Math.round(68 + (percentage / 100) * (94 - 68));
  
  return `rgb(${red}, ${green}, ${blue})`;
};
