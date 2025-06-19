import React, { createContext, useState, useEffect, useCallback } from 'react';
import SleeperApiService from '../services/sleeperApi';
import { getHistoricalLeagueIds, getSeasonFromLeague } from '../utils/dataUtils';

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
  }, [selectedSeason, availableSeasons.length]);

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

    const fetchAllLeagueData = async () => {
      setLoading(true);
      setError(null);
      // Clear previous league-specific data for a cleaner transition
      setLeague(null); setUsers([]); setRosters([]); setMatchups([]);

      try {
        const currentLeagueData = await SleeperApiService.getLeague(leagueId);
        setLeague(currentLeagueData);

        const leagueUsersData = await SleeperApiService.getLeagueUsers(leagueId);
        setUsers(leagueUsersData);

        const leagueRostersData = await SleeperApiService.getLeagueRosters(leagueId);
        setRosters(leagueRostersData);

        // Fetch matchups
        const seasonForMatchups = currentLeagueData.season || nflStateData.season;
        const isCurrentNflSeason = seasonForMatchups === nflStateData.season;

        // If it's a future season, set empty matchups
        if (isFutureSeason) {
          setMatchups([]);
        } else if (isCurrentNflSeason && nflStateData.season_type !== 'regular' && nflStateData.season_type !== 'post') {
          setMatchups([]);
        } else {
          const allMatchupsData = [];
          const maxWeeksToFetch = 18; // Standard NFL season weeks
          
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
          
          if (allMatchupsData.length === 0 && matchups.length > 0 && leagueId !== league?.league_id) {
             // If no matchups found for new league, clear old ones
             setMatchups([]);
          } else if (allMatchupsData.length > 0) {
             setMatchups(allMatchupsData);
          }
          // Note: This check depends on league?.league_id and matchups.length
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

        // Ensure selectedSeason is valid
        if (sortedAvailable.length > 0 && !sortedAvailable.includes(selectedSeason)) {
          setSelectedSeason(sortedAvailable[0]);
        } else if (sortedAvailable.length === 0) {
          setSelectedSeason(nflStateData.season || '2025'); // Fallback if no seasons derived
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
    setSelectedSeason(season); // Set season first

    if (newLeagueIdForSeason !== leagueId) {
      setLeagueId(newLeagueIdForSeason); // This will trigger the main useEffect
    }
    // If leagueId is the same, data is already for that ID, selectedSeason just updated.
  }, [seasonLeagueIds, selectedSeason, leagueId]);


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
