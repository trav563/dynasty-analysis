/**
 * Utility functions for caching data in localStorage
 */

// Cache keys
const CACHE_PREFIX = 'dynasty_analysis_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate a cache key for a specific data type, league ID, and season
 * @param {string} dataType - Type of data (league, users, rosters, matchups)
 * @param {string} leagueId - League ID
 * @param {string} season - Season year
 * @returns {string} - Cache key
 */
const getCacheKey = (dataType, leagueId, season) => {
  return `${CACHE_PREFIX}${dataType}_${leagueId}_${season}`;
};

/**
 * Save data to cache
 * @param {string} dataType - Type of data (league, users, rosters, matchups)
 * @param {string} leagueId - League ID
 * @param {string} season - Season year
 * @param {any} data - Data to cache
 */
export const saveToCache = (dataType, leagueId, season, data) => {
  if (!data || !leagueId || !season) return;
  
  try {
    const cacheKey = getCacheKey(dataType, leagueId, season);
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`Cached ${dataType} data for league ${leagueId}, season ${season}`);
  } catch (error) {
    console.error(`Error caching ${dataType} data:`, error);
  }
};

/**
 * Load data from cache
 * @param {string} dataType - Type of data (league, users, rosters, matchups)
 * @param {string} leagueId - League ID
 * @param {string} season - Season year
 * @returns {any|null} - Cached data or null if not found or expired
 */
export const loadFromCache = (dataType, leagueId, season) => {
  if (!leagueId || !season) return null;
  
  try {
    const cacheKey = getCacheKey(dataType, leagueId, season);
    const cachedItem = localStorage.getItem(cacheKey);
    
    if (!cachedItem) return null;
    
    const { data, timestamp } = JSON.parse(cachedItem);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log(`Loaded ${dataType} data from cache for league ${leagueId}, season ${season}`);
    return data;
  } catch (error) {
    console.error(`Error loading ${dataType} data from cache:`, error);
    return null;
  }
};

/**
 * Check if data should be loaded from cache based on season
 * @param {string} season - Season year
 * @param {string} currentNflSeason - Current NFL season
 * @returns {boolean} - Whether to use cache for this season
 */
export const shouldUseCache = (season, currentNflSeason) => {
  if (!season || !currentNflSeason) return false;
  
  // Always use cache for past seasons
  return parseInt(season) < parseInt(currentNflSeason);
};

/**
 * Clear all cached data for a specific league ID
 * @param {string} leagueId - League ID
 */
export const clearCacheForLeague = (leagueId) => {
  if (!leagueId) return;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(leagueId)) {
        localStorage.removeItem(key);
      }
    });
    console.log(`Cleared cache for league ${leagueId}`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};
