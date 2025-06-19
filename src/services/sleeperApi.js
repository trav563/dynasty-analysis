import axios from 'axios';

const BASE_URL = 'https://api.sleeper.app/v1';

/**
 * Helper function to add delay between API calls
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Service for interacting with the Sleeper API
 */
const SleeperApiService = {
  /**
   * Get league information by league ID
   * @param {string} leagueId - The Sleeper league ID
   * @returns {Promise} - Promise with league data
   */
  getLeague: async (leagueId) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/league/${leagueId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league:', error);
      throw error;
    }
  },

  /**
   * Get users in a league
   * @param {string} leagueId - The Sleeper league ID
   * @returns {Promise} - Promise with league users data
   */
  getLeagueUsers: async (leagueId) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/league/${leagueId}/users`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league users:', error);
      throw error;
    }
  },

  /**
   * Get rosters in a league
   * @param {string} leagueId - The Sleeper league ID
   * @returns {Promise} - Promise with league rosters data
   */
  getLeagueRosters: async (leagueId) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/league/${leagueId}/rosters`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league rosters:', error);
      throw error;
    }
  },

  /**
   * Get matchups for a specific week
   * @param {string} leagueId - The Sleeper league ID
   * @param {number} week - The week number
   * @returns {Promise} - Promise with matchups data
   */
  getMatchups: async (leagueId, week) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/league/${leagueId}/matchups/${week}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching matchups for week ${week}:`, error);
      throw error;
    }
  },

  /**
   * Get all players data
   * @returns {Promise} - Promise with all players data
   */
  getAllPlayers: async () => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/players/nfl`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all players:', error);
      throw error;
    }
  },

  /**
   * Get NFL state (current week, season, etc.)
   * @returns {Promise} - Promise with NFL state data
   */
  getNflState: async () => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/state/nfl`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NFL state:', error);
      throw error;
    }
  },

  /**
   * Get previous league ID for historical data
   * @param {string} leagueId - The current Sleeper league ID
   * @returns {Promise} - Promise with previous league ID
   */
  getPreviousLeagueId: async (leagueId) => {
    try {
      const league = await SleeperApiService.getLeague(leagueId);
      return league.previous_league_id;
    } catch (error) {
      console.error('Error fetching previous league ID:', error);
      throw error;
    }
  },

  /**
   * Get league transactions
   * @param {string} leagueId - The Sleeper league ID
   * @param {number} week - The week number (optional)
   * @returns {Promise} - Promise with transactions data
   */
  getTransactions: async (leagueId, week = null) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const url = week 
        ? `${BASE_URL}/league/${leagueId}/transactions/${week}` 
        : `${BASE_URL}/league/${leagueId}/transactions`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  /**
   * Get user information by user ID
   * @param {string} userId - The Sleeper user ID
   * @returns {Promise} - Promise with user data
   */
  getUser: async (userId) => {
    try {
      await delay(300); // Add delay to prevent rate limiting
      const response = await axios.get(`${BASE_URL}/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  /**
   * Get avatar URL for a user
   * @param {string} avatarId - The avatar ID
   * @returns {string} - The avatar URL
   */
  getAvatarUrl: (avatarId) => {
    if (!avatarId) return null;
    return `https://sleepercdn.com/avatars/${avatarId}`;
  },

  /**
   * Get team logo URL
   * @param {string} teamId - The team ID (abbreviation)
   * @returns {string} - The team logo URL
   */
  getTeamLogoUrl: (teamId) => {
    if (!teamId) return null;
    return `https://sleepercdn.com/images/team_logos/nfl/${teamId.toLowerCase()}.png`;
  },

  /**
   * Get player thumbnail URL
   * @param {string} playerId - The player ID
   * @returns {string} - The player thumbnail URL
   */
  getPlayerThumbnailUrl: (playerId) => {
    if (!playerId) return null;
    return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
  }
};

export default SleeperApiService;
