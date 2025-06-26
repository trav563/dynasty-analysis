import React, { useState, useEffect, useContext, useCallback } from 'react';
import { LeagueContext } from '../contexts/LeagueContext';
import SleeperApiService from '../services/sleeperApi';
import { loadFromCache, saveToCache } from '../utils/cacheUtils';

const PlayerTradeHistoryModal = ({ player, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const { seasonLeagueIds, players: allPlayersData } = useContext(LeagueContext);

  // Helper function to get player's full name
  const getPlayerName = useCallback((player) => {
    if (!player) return 'Unknown Player';
    return `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
  }, []);

  // Helper function to get player's full name by ID
  const getPlayerNameById = useCallback((pId) => {
    const p = allPlayersData?.[pId];
    return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `Player ${pId}`;
  }, [allPlayersData]);

  // Helper function to get manager name from roster ID
  const getManagerName = useCallback((rosterId, histRosters, histUsers) => {
    if (!histRosters || !histUsers || !rosterId) return 'Unknown Manager';
    
    const roster = histRosters.find(r => r.roster_id === parseInt(rosterId));
    if (!roster) return `Roster ${rosterId}`;
    
    const user = histUsers.find(u => u.user_id === roster.owner_id);
    return user?.display_name || `Roster ${rosterId}`;
  }, []);

  useEffect(() => {
    // These functions depend on the useCallback helpers and data fetched inside the effect.
    // Defining them here makes them part of the effect's closure and avoids dependency array issues.
    const formatDraftPick = (pick, histRosters, histUsers, allSeasonsDrafts, allSeasonsPicks) => {
      const originalOwnerName = pick.original_owner_id ? getManagerName(pick.original_owner_id, histRosters, histUsers) : 'Unknown';
      const currentOwnerName = pick.roster_id ? getManagerName(pick.roster_id, histRosters, histUsers) : 'Unknown';
      const round = pick.round || '?';
      const year = pick.season || 'Unknown Year';
      const pickNumber = pick.pick || ''; // This is the overall pick number
  
      let pickString = `${year} Round ${round}`;
  
      // Check if it's a past draft pick and we have player data
      if (parseInt(year) < new Date().getFullYear() && pick.pick) {
        // Find the draft metadata for the pick's season from the master list of all drafts.
        const draftsForYear = allSeasonsDrafts[year];
        if (draftsForYear && draftsForYear.length > 0) {
          // Assuming one main draft per season for simplicity.
          const targetDraft = draftsForYear[0];
          const draftPicksForThisDraft = allSeasonsPicks[targetDraft.draft_id];
          if (draftPicksForThisDraft) {
            // Find the pick by matching the overall pick number. The 'pick' property on a traded
            // pick object from a transaction appears to represent the overall pick number ('pick_no').
            // We use Number() to guard against type mismatches (e.g., '17' vs 17).
            const draftedPlayerPick = draftPicksForThisDraft.find(
              draftedPick => Number(draftedPick.pick_no) === Number(pick.pick)
            );
            if (draftedPlayerPick && draftedPlayerPick.player_id) {
              const draftedPlayerName = getPlayerNameById(draftedPlayerPick.player_id);
              // Use the round from the completed pick for accuracy
              const actualRound = draftedPlayerPick.round || round;
              pickString = `${draftedPlayerName} (${year} Round ${actualRound} Pick ${draftedPlayerPick.draft_slot})`;
              
              // Add ownership narrative
              if (originalOwnerName !== currentOwnerName) {
                pickString += ` (orig. ${originalOwnerName} to ${currentOwnerName})`;
              } else {
                pickString += ` (owned by ${currentOwnerName})`;
              }
              return pickString;
            }
          }
        }
      }
      
      // Fallback for future picks or if player not found
      if (pickNumber) {
          pickString += ` Pick ${pickNumber}`;
      }
      if (originalOwnerName !== currentOwnerName) {
          pickString += ` (orig. ${originalOwnerName} to ${currentOwnerName})`;
      } else {
          pickString += ` (owned by ${currentOwnerName})`;
      }
      return pickString;
    };

    const getTransactionNarrative = (transaction, playerId, histRosters, histUsers, allSeasonsDrafts, allSeasonsPicks) => {
      let fromTeam = '';
      let toTeam = '';
      let description = '';
      
      const addedToRosterId = transaction.adds?.[playerId];
      const droppedFromRosterId = transaction.drops?.[playerId];
      
      // Identify other players involved
      const otherPlayersInvolved = [];
      const draftPicksInvolved = [];
  
      // Identify other players involved in the transaction
      for (const pId in transaction.adds) {
        if (pId !== playerId) {
          otherPlayersInvolved.push(getPlayerNameById(pId));
        }
      }
      for (const pId in transaction.drops) {
        if (pId !== playerId) {
          // Only add if not already in adds (to avoid duplicates for players swapped)
          if (!transaction.adds || !transaction.adds[pId]) {
            otherPlayersInvolved.push(getPlayerNameById(pId));
          }
        }
      }
  
      // Identify draft picks involved
      if (transaction.draft_picks && transaction.draft_picks.length > 0) {
        transaction.draft_picks.forEach(pick => {
          draftPicksInvolved.push(formatDraftPick(pick, histRosters, histUsers, allSeasonsDrafts, allSeasonsPicks));
        });
      }
  
      // Function to add additional info to the base description
      const baseDescription = (base) => {
        let additionalInfo = [];
        if (otherPlayersInvolved.length > 0) {
          additionalInfo.push(`Other players: ${otherPlayersInvolved.join(', ')}`);
        }
        if (draftPicksInvolved.length > 0) {
          additionalInfo.push(`Draft picks: ${draftPicksInvolved.join('; ')}`);
        }
        
        if (additionalInfo.length > 0) {
          return `${base}. ${additionalInfo.join('. ')}.`;
        }
        return base;
      };
      
      if (transaction.type === 'trade') {
        if (addedToRosterId) {
          toTeam = getManagerName(addedToRosterId, histRosters, histUsers);
          
          if (droppedFromRosterId) {
            fromTeam = getManagerName(droppedFromRosterId, histRosters, histUsers);
            
            // Check if there were other players involved in the trade
            const otherPlayersTraded = Object.keys(transaction.adds || {}).length + 
                                      Object.keys(transaction.drops || {}).length - 2; // Subtract 2 for this player's add and drop
            
            if (otherPlayersTraded > 0) {
              description = `Traded from ${fromTeam} to ${toTeam} along with ${otherPlayersTraded} other player(s)/pick(s)`;
            } else {
              description = `Traded from ${fromTeam} to ${toTeam}`;
            }
            
            // Add draft pick information if available
            if (transaction.draft_picks && transaction.draft_picks.length > 0) {
              description += ` (trade included ${transaction.draft_picks.length} draft pick(s))`;
            }
          } else {
            // This case implies player was added in a trade, but the 'from' team isn't clear from 'drops'
            // This might happen in complex multi-team trades or if the player was a draft pick
            
            // Try to determine the source team from the roster_ids
            let sourceTeam = 'Unknown';
            if (transaction.roster_ids && transaction.roster_ids.length > 1) {
              // Find a roster ID that's not the destination roster
              const otherRosterId = transaction.roster_ids.find(id => id !== addedToRosterId);
              if (otherRosterId) {
                sourceTeam = getManagerName(otherRosterId, histRosters, histUsers);
                fromTeam = sourceTeam;
                description = `Acquired by ${toTeam} in a trade with ${sourceTeam}`;
              } else {
                fromTeam = 'Unknown';
                description = `Acquired by ${toTeam} via trade (source not explicitly recorded)`;
              }
            } else {
              fromTeam = 'Unknown';
              description = `Acquired by ${toTeam} via trade (source not explicitly recorded)`;
            }
            
            // Add draft pick information if available
            if (transaction.draft_picks && transaction.draft_picks.length > 0) {
              description += ` (trade included ${transaction.draft_picks.length} draft pick(s))`;
            }
          }
        } else if (droppedFromRosterId) {
          // Player was dropped in a trade but not explicitly added to another team in this transaction
          fromTeam = getManagerName(droppedFromRosterId, histRosters, histUsers);
          
          // Try to determine the destination team from the roster_ids
          let destinationTeam = 'Unknown';
          if (transaction.roster_ids && transaction.roster_ids.length > 1) {
            // Find a roster ID that's not the source roster
            const otherRosterId = transaction.roster_ids.find(id => id !== droppedFromRosterId);
            if (otherRosterId) {
              destinationTeam = getManagerName(otherRosterId, histRosters, histUsers);
              toTeam = destinationTeam;
              description = `Traded from ${fromTeam} to ${destinationTeam}`;
            } else {
              toTeam = 'Unknown';
              description = `Traded away by ${fromTeam} (destination not explicitly recorded)`;
            }
          } else {
            toTeam = 'Unknown';
            description = `Traded away by ${fromTeam} (destination not explicitly recorded)`;
          }
          
          // Add draft pick information if available
          if (transaction.draft_picks && transaction.draft_picks.length > 0) {
            description += ` (trade included ${transaction.draft_picks.length} draft pick(s))`;
          }
        }
      } else if (transaction.type === 'waiver') {
        if (addedToRosterId) {
          toTeam = getManagerName(addedToRosterId, histRosters, histUsers);
          fromTeam = 'Waivers';
          
          // Add FAAB amount if available
          if (transaction.settings && transaction.settings.waiver_bid !== undefined) {
            const faabAmount = transaction.settings.waiver_bid;
            description = `Claimed off waivers by ${toTeam} for $${faabAmount} FAAB`;
          } else {
            description = `Claimed off waivers by ${toTeam}`;
          }
          
          // Add waiver priority if available
          if (transaction.settings && transaction.settings.waiver_priority !== undefined) {
            const waiverPriority = transaction.settings.waiver_priority;
            description += ` (waiver priority: ${waiverPriority})`;
          }
        } else if (droppedFromRosterId) {
          fromTeam = getManagerName(droppedFromRosterId, histRosters, histUsers);
          toTeam = 'Waivers';
          description = `Waived by ${fromTeam}`;
        }
      } else if (transaction.type === 'free_agent') {
        if (addedToRosterId) {
          toTeam = getManagerName(addedToRosterId, histRosters, histUsers);
          fromTeam = 'Free Agency';
          description = `Signed as free agent by ${toTeam}`;
          
          // Check if any player was dropped to make room for this signing
          const droppedPlayers = Object.keys(transaction.drops || {}).length;
          if (droppedPlayers > 0) {
            description += ` (${droppedPlayers} player(s) dropped)`;
          }
        } else if (droppedFromRosterId) {
          fromTeam = getManagerName(droppedFromRosterId, histRosters, histUsers);
          toTeam = 'Free Agency';
          description = `Released to free agency by ${fromTeam}`;
        }
      } else if (transaction.type === 'commissioner') {
        if (addedToRosterId) {
          toTeam = getManagerName(addedToRosterId, histRosters, histUsers);
          fromTeam = 'Commissioner';
          description = `Added to ${toTeam} by commissioner action`;
        } else if (droppedFromRosterId) {
          fromTeam = getManagerName(droppedFromRosterId, histRosters, histUsers);
          toTeam = 'Commissioner';
          description = `Removed from ${fromTeam} by commissioner action`;
        }
      } else if (transaction.type === 'draft') {
        if (addedToRosterId) {
          toTeam = getManagerName(addedToRosterId, histRosters, histUsers);
          fromTeam = 'Draft';
          
          // Add draft position information if available
          if (transaction.metadata && transaction.metadata.pick) {
            const pick = transaction.metadata.pick;
            const round = transaction.metadata.round || '?';
            description = `Drafted by ${toTeam} (Round ${round}, Pick ${pick})`;
          } else {
            description = `Drafted by ${toTeam}`;
          }
        }
      } else {
        // Fallback for unhandled types
        description = `Involved in a ${transaction.type || 'unknown'} transaction`;
      }
      
      return { fromTeam, toTeam, description: baseDescription(description) };
    };

    const fetchTransactions = async () => {
      if (!player || !player.playerId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      // Determine current year for filtering past/future drafts
      const currentYear = new Date().getFullYear();
      
      console.log(`Fetching transaction history for player ${player.playerId} (${getPlayerName(player)})`);
      console.log(`Available season league IDs:`, seasonLeagueIds);
      
      try {
        const allTransactions = [];
        const seenTransactionIds = new Set(); // Track transaction IDs to prevent duplicates
        
        // Pre-fetch all historical draft data to handle cross-season pick trades
        const allSeasonsDrafts = {}; // { '2022': [draft_obj], '2021': [draft_obj] }
        const allSeasonsPicks = {};  // { 'draft_id_1': [picks], 'draft_id_2': [picks] }

        // First, fetch all draft data for all past seasons
        for (const season in seasonLeagueIds) {
          if (parseInt(season) < currentYear) {
            const leagueId = seasonLeagueIds[season];
            let draftsForSeason = loadFromCache('drafts', leagueId, season);
            if (!draftsForSeason) {
              try {
                draftsForSeason = await SleeperApiService.getLeagueDrafts(leagueId);
                saveToCache('drafts', leagueId, season, draftsForSeason);
              } catch (error) {
                console.warn(`Could not fetch drafts for league ${leagueId} season ${season}:`, error);
                draftsForSeason = [];
              }
            }
            allSeasonsDrafts[season] = draftsForSeason;

            for (const draft of draftsForSeason) {
              if (!allSeasonsPicks[draft.draft_id]) { // Avoid re-fetching if already present
                let picksForDraft = loadFromCache('draft_picks', draft.draft_id);
                if (!picksForDraft) {
                  try {
                    picksForDraft = await SleeperApiService.getDraftPicks(draft.draft_id);
                    saveToCache('draft_picks', draft.draft_id, null, picksForDraft);
                  } catch (error) {
                    console.warn(`Could not fetch picks for draft ${draft.draft_id}:`, error);
                    picksForDraft = [];
                  }
                }
                allSeasonsPicks[draft.draft_id] = picksForDraft;
              }
            }
          }
        }
        
        // Now fetch transactions for each season
        for (const season in seasonLeagueIds) {
          const leagueId = seasonLeagueIds[season];
          console.log(`  Processing season: ${season}, League ID: ${leagueId}`);
          
          try {
            // Fetch historical roster and user data for this season
            let histRosters = loadFromCache('rosters', leagueId, season);
            if (!histRosters) {
              histRosters = await SleeperApiService.getLeagueRosters(leagueId);
              saveToCache('rosters', leagueId, season, histRosters);
            }
            
            let histUsers = loadFromCache('users', leagueId, season);
            if (!histUsers) {
              histUsers = await SleeperApiService.getLeagueUsers(leagueId);
              saveToCache('users', leagueId, season, histUsers);
            }
            
            // Fetch all transactions for the league
            let leagueTransactions = loadFromCache('transactions', leagueId, season);
            if (!leagueTransactions) {
              try {
                console.log(`    Fetching transactions for ${season} (League ${leagueId}) - fetching all weeks in parallel...`);
                leagueTransactions = await SleeperApiService.getTransactions(leagueId);
                saveToCache('transactions', leagueId, season, leagueTransactions);
                console.log(`    Fetched ${leagueTransactions.length} transactions for ${season} (League ${leagueId})`);
              } catch (error) {
                console.error(`Error fetching transactions for league ${leagueId}:`, error);
                // If we get errors, it means transactions aren't available for this league
                // This is common for older seasons or leagues that don't have transaction data
                leagueTransactions = [];
                console.log(`    No transactions found or error for ${season} (League ${leagueId}), setting to empty.`);
              }
            } else {
              console.log(`    Loaded ${leagueTransactions.length} transactions from cache for ${season} (League ${leagueId})`);
            }
            
            // Filter transactions that involve the player
            const playerTransactions = leagueTransactions.filter(t => 
              (t.adds && t.adds[player.playerId]) || 
              (t.drops && t.drops[player.playerId])
            );
            
            console.log(`    Found ${playerTransactions.length} transactions involving player ${player.playerId} in ${season}.`);
            
            // Process each transaction to create a narrative
            for (const transaction of playerTransactions) {
              // Skip duplicate transactions (same transaction ID)
              if (transaction.transaction_id && seenTransactionIds.has(transaction.transaction_id)) {
                console.log(`    Skipping duplicate transaction ${transaction.transaction_id}`);
                continue;
              }
              
              // Add to seen transaction IDs if it has an ID
              if (transaction.transaction_id) {
                seenTransactionIds.add(transaction.transaction_id);
              }
              
              const processedTransaction = {
                id: transaction.transaction_id,
                type: transaction.type,
                timestamp: transaction.status_updated,
                season: season,
                leagueId: leagueId,
                rawTransaction: transaction
              };
              
              // Format the date
              processedTransaction.date = formatDate(transaction.status_updated);
              
              // Get the manager names and create a narrative
              const { fromTeam, toTeam, description } = getTransactionNarrative(
                transaction, 
                player.playerId,
                histRosters,
                histUsers,
                allSeasonsDrafts, // Pass the master draft metadata
                allSeasonsPicks   // Pass the master picks data
              );
              
              processedTransaction.fromTeam = fromTeam;
              processedTransaction.toTeam = toTeam;
              processedTransaction.description = description;
              
              allTransactions.push(processedTransaction);
            }
          } catch (error) {
            console.error(`Error processing transactions for league ${leagueId}:`, error);
            console.log(`    Skipping season ${season} due to processing error.`);
          }
        }
        
        // Sort transactions by date (oldest first to show journey)
        allTransactions.sort((a, b) => a.timestamp - b.timestamp);
        
        setTransactions(allTransactions);
        console.log(`Total transactions found for player: ${allTransactions.length}`);
      } catch (error) {
        console.error('Error fetching player transactions:', error);
      } finally {
        // Set loading to false after a short delay to ensure UI updates
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    };
    
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, seasonLeagueIds, getPlayerName, getPlayerNameById, getManagerName]); // Dependencies are correct now


  // Format transaction date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get transaction type display name
  const getTransactionTypeDisplay = (type) => {
    switch (type) {
      case 'trade': return 'Trade';
      case 'waiver': return 'Waiver Claim';
      case 'free_agent': return 'Free Agent';
      case 'commissioner': return 'Commissioner Action';
      case 'draft': return 'Draft';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    }
  };

  // Get color for transaction type
  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'trade': return 'bg-blue-100 text-blue-800';
      case 'waiver': return 'bg-purple-100 text-purple-800';
      case 'free_agent': return 'bg-green-100 text-green-800';
      case 'commissioner': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{getPlayerName(player)} - Transaction History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-lg font-medium">No transaction history found for this player.</p>
              <p className="mt-1">This could be because the player hasn't been traded or the transaction data isn't available for this league.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${getTransactionTypeColor(transaction.type)}`}>
                          {getTransactionTypeDisplay(transaction.type)}
                        </span>
                        <div className="font-semibold text-lg">
                          {transaction.date}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Season {transaction.season}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-gray-700">
                    {transaction.description}
                  </div>
                  {transaction.fromTeam && transaction.toTeam && (
                    <div className="mt-2 flex items-center text-sm">
                      <span className="font-medium text-red-600">{transaction.fromTeam}</span>
                      <svg className="h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-medium text-green-600">{transaction.toTeam}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerTradeHistoryModal;
