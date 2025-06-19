import React, { createContext, useState, useEffect, useCallback } from 'react';
import SleeperApiService from '../services/sleeperApi';
import { getHistoricalLeagueIds, getSeasonFromLeague } from '../utils/dataUtils';
import { saveToCache, loadFromCache, shouldUseCache } from '../utils/cacheUtils';

// Create the context
export const LeagueContext = createContext();

export const LeagueProvider = ({ children }) => {
  // Default league ID from requirements
  const DEFAULT_LEAGUE_ID = '1180160954902351872';
  
  // State variables
  const [leagueId, setLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [league, setLeague] = useState(null);
  const [users, setUsers] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('2025'); // Default to 2025
  const [seasonLeagueIds, setSeasonLeagueIds] = useState({});
  
  // Global, non-league-specific data
  const [allPlayersData, setAllPlayersData] = useState(null);
  const [nflStateData, setNflStateData] = useState(null);

  // Fetch NFL state once on mount
  useEffect(() => {
    SleeperApiService.getNflState()
      .then(data => {
        setNflStateData(data);
        // Initialize selectedSeason based on current NFL season if default '2025' is different
        // and availableSeasons isn't populated yet.
        if (data && data.season && data.season !== selectedSeason && availableSeasons.length === 0) {
          setSelectedSeason(data.season);
        }
      })
      .catch(err => {
        console.error('Error fetching NFL state:', err);
        setError(prev => prev || 'Failed to fetch NFL state');
      });
  }, []); // Fetch NFL state only once on mount

  // Fetch all players data once on mount
  useEffect(() => {
    SleeperApiService.getAllPlayers()
      .then(setAllPlayersData)
      .catch(err => {
        console.error('Error fetching all players data:', err);
        setError(prev => prev || 'Failed to fetch all players data');
      });
  }, []);

  // Main data fetching effect: runs when leagueId changes or global data is ready
  useEffect(() => {
    if (!allPlayersData || !nflStateData) {
      setLoading(true); // Waiting for global data
      return;
    }

    if (!leagueId) {
      setLoading(false); // Global data ready, but no league ID to fetch
      // Clear league-specific data
      setLeague(null); setUsers([]); setRosters([]); setMatchups([]);
      setError(null);
      return;
    }
    
    // Check if selected season is in the future
    const isFutureSeason = nflStateData && selectedSeason && parseInt(selectedSeason) > parseInt(nflStateData.season);
    const isCurrentNflSeason = selectedSeason === nflStateData.season;
    const shouldUseCacheForSeason = shouldUseCache(selectedSeason, nflStateData.season);

    const fetchAllLeagueData = async () => {
      setLoading(true);
      setError(null);
      // Clear previous league-specific data for a cleaner transition
      setLeague(null); setUsers([]); setRosters([]); setMatchups([]);

      try {
        // Try to load league data from cache for past seasons
        let currentLeagueData = null;
        let leagueUsersData = null;
        let leagueRostersData = null;
        let allMatchupsData = [];
        
        // Check cache for past seasons
        if (shouldUseCacheForSeason) {
          console.log(`Attempting to load ${selectedSeason} data from cache for league ${leagueId}`);
          currentLeagueData = loadFromCache('league', leagueId, selectedSeason);
          leagueUsersData = loadFromCache('users', leagueId, selectedSeason);
          leagueRostersData = loadFromCache('rosters', leagueId, selectedSeason);
          const cachedMatchups = loadFromCache('matchups', leagueId, selectedSeason);
          if (cachedMatchups) allMatchupsData = cachedMatchups;
        }
        
        // If not in cache, fetch from API
        if (!currentLeagueData) {
          currentLeagueData = await SleeperApiService.getLeague(leagueId);
          if (shouldUseCacheForSeason) {
            saveToCache('league', leagueId, selectedSeason, currentLeagueData);
          }
        }
        setLeague(currentLeagueData);

        if (!leagueUsersData) {
          leagueUsersData = await SleeperApiService.getLeagueUsers(leagueId);
          if (shouldUseCacheForSeason) {
            saveToCache('users', leagueId, selectedSeason, leagueUsersData);
          }
        }
        setUsers(leagueUsersData);

        if (!leagueRostersData) {
          leagueRostersData = await SleeperApiService.getLeagueRosters(leagueId);
          if (shouldUseCacheForSeason) {
            saveToCache('rosters', leagueId, selectedSeason, leagueRostersData);
          }
        }
        setRosters(leagueRostersData);

        // If matchups not in cache or it's current/future season, fetch them
        if (allMatchupsData.length === 0 && !isFutureSeason) {
          const seasonForMatchups = currentLeagueData.season || nflStateData.season;
          
          // For future seasons, we still want to try to fetch matchups (they might exist)
          // For current season during offseason, we might not have matchups yet
          const skipMatchups = isCurrentNflSeason && 
                              nflStateData.season_type !== 'regular' && 
                              nflStateData.season_type !== 'post';
          
          if (!skipMatchups) {
            const maxWeeksToFetch = 17; // League runs weeks 1-17 only
            
            // Fetch matchups in batches to avoid overwhelming the API
            // Fetch first 6 weeks
            for (let week = 1; week <= 6; week++) {
              try {
                const weekMatchups = await SleeperApiService.getMatchups(leagueId, week);
                if (weekMatchups && weekMatchups.length > 0) {
                  weekMatchups.forEach(matchup => matchup.week = week);
                  allMatchupsData.push(...weekMatchups);
                  // Update matchups incrementally for better UX
                  if (week === 6) {
                    setMatchups([...allMatchupsData]);
                  }
                }
              } catch (err) {
                // console.log(`No matchups for week ${week} in league ${leagueId}`);
              }
            }
            
            // Fetch second batch (weeks 7-12)
            for (let week = 7; week <= 12; week++) {
              try {
                const weekMatchups = await SleeperApiService.getMatchups(leagueId, week);
                if (weekMatchups && weekMatchups.length > 0) {
                  weekMatchups.forEach(matchup => matchup.week = week);
                  allMatchupsData.push(...weekMatchups);
                  // Update matchups incrementally for better UX
                  if (week === 12) {
                    setMatchups([...allMatchupsData]);
                  }
                }
              } catch (err) {
                // console.log(`No matchups for week ${week} in league ${leagueId}`);
              }
            }
            
            // Fetch final batch (weeks 13-18)
            for (let week = 13; week <= maxWeeksToFetch; week++) {
              try {
                const weekMatchups = await SleeperApiService.getMatchups(leagueId, week);
                if (weekMatchups && weekMatchups.length > 0) {
                  weekMatchups.forEach(matchup => matchup.week = week);
                  allMatchupsData.push(...weekMatchups);
                }
              } catch (err) {
                // console.log(`No matchups for week ${week} in league ${leagueId}`);
              }
            }
            
            // Cache matchups for past seasons
            if (shouldUseCacheForSeason && allMatchupsData.length > 0) {
              saveToCache('matchups', leagueId, selectedSeason, allMatchupsData);
            }
          }
        }
        
        // Set matchups state
        if (allMatchupsData.length > 0) {
          setMatchups(allMatchupsData);
        } else {
          setMatchups([]);
        }

        // Fetch historical league IDs and seasons
        const historicalIds = await getHistoricalLeagueIds(leagueId, SleeperApiService.getLeague);
        const seasonsMap = {};
        const currentLeagueSeason = getSeasonFromLeague(currentLeagueData) || nflStateData.season;
        if (currentLeagueSeason) {
            seasonsMap[currentLeagueSeason] = leagueId;
        }

        for (const id of historicalIds) {
          if (id === leagueId && seasonsMap[currentLeagueSeason] === leagueId) continue; // Already processed
          try {
            const histLeague = await SleeperApiService.getLeague(id);
            const season = getSeasonFromLeague(histLeague);
            if (season && !seasonsMap[season]) { // Add if season not already mapped
              seasonsMap[season] = id;
            }
          } catch (err) {
            console.error(`Error fetching league data for ID ${id} during history scan:`, err);
          }
        }
        
        // Fallback seasons if history is sparse
        const defaultSeasonYears = [nflStateData.season, String(parseInt(nflStateData.season) - 1), String(parseInt(nflStateData.season) - 2)];
        defaultSeasonYears.forEach(year => {
            if (!seasonsMap[year]) {
                seasonsMap[year] = leagueId; // Map to current league ID if no historical found for that year
            }
        });

        setSeasonLeagueIds(seasonsMap);
        const sortedAvailable = Object.keys(seasonsMap).sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableSeasons(sortedAvailable);

        // This logic ensures selectedSeason is one of the available seasons, defaulting to the latest.
        // It might trigger a re-run of this effect if selectedSeason changes.
        // This is generally safe if it's correcting an invalid state.
        if (nflStateData) { // Ensure nflStateData is available for fallback
          if (sortedAvailable.length > 0 && !sortedAvailable.includes(selectedSeason)) {
            const newSelectedSeason = sortedAvailable[0];
            // Only update if different to prevent potential loops if logic is slightly off
            if (newSelectedSeason !== selectedSeason) setSelectedSeason(newSelectedSeason);
          } else if (sortedAvailable.length === 0) {
            const fallbackSeason = nflStateData.season || '2025';
            if (selectedSeason !== fallbackSeason) setSelectedSeason(fallbackSeason);
          }
        }

      } catch (err) {
        console.error('Error fetching league-specific data:', err);
        setError(`Failed to fetch data for League ID ${leagueId}. Please check the ID and try again.`);
        // Clear data on error
        setLeague(null); setUsers([]); setRosters([]);
        setMatchups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLeagueData();
  }, [leagueId, allPlayersData, nflStateData, selectedSeason]); // Effect dependencies

  // Change league ID
  const changeLeagueId = useCallback((id) => {
    if (!id || id === leagueId) return; // Only update if the ID is different
    setLeagueId(id);
    // The main useEffect will handle fetching data for the new leagueId
  }, [leagueId]); // Depends on current leagueId to avoid redundant state sets

  // Change season
  const changeSeason = useCallback((season) => {
    if (!season || !seasonLeagueIds[season] || season === selectedSeason) return;

    console.log('Changing season to:', season);
    const newLeagueIdForSeason = seasonLeagueIds[season];
    
    // Set loading true for immediate feedback while data fetches
    setLoading(true);
    
    // Clear data for a clean transition
    setMatchups([]);
    setRosters([]);
    setUsers([]);
    setLeague(null);
    
    // Set the selected season. This will trigger the main useEffect if it's a new season.
    setSelectedSeason(season);
    
    // If the league ID for the new season is different from the current leagueId,
    // update leagueId. This will also trigger the main useEffect.
    if (newLeagueIdForSeason !== leagueId) {
      console.log(`Updating league ID from ${leagueId} to ${newLeagueIdForSeason} for season ${season}`);
      setLeagueId(newLeagueIdForSeason);
    }
    
    // The main useEffect will handle fetching the new data since selectedSeason changed
    // If leagueId is the same, the change to selectedSeason will still trigger the main useEffect
    // to re-evaluate data fetching (e.g., for caching logic or if matchups depend on selectedSeason).
  }, [seasonLeagueIds, selectedSeason, leagueId, setLoading, setMatchups, setRosters, setUsers, setLeague, setSelectedSeason, setLeagueId]);


  // Context value
  const contextValue = {
    leagueId,
    league,
    users,
    rosters,
    players: allPlayersData, // Provide allPlayersData as 'players'
    matchups,
    loading,
    error,
    availableSeasons,
    selectedSeason,
    nflState: nflStateData, // Provide nflStateData as 'nflState'
    changeLeagueId,
    changeSeason,
  };

  return (
    <LeagueContext.Provider value={contextValue}>
      {children}
    </LeagueContext.Provider>
  );
};

export default LeagueProvider;
