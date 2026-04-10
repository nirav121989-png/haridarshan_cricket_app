import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';

localforage.config({
  name: 'SpellCricketDB',
  storeName: 'spell_cricket_store'
});

const storage = {
  getItem: async (name) => {
    const value = await localforage.getItem(name);
    return value ? value : null;
  },
  setItem: async (name, value) => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name) => {
    await localforage.removeItem(name);
  },
};

const initialState = {
  darkMode: false,
  players: [],
  weeklyTeams: {
    teamA: { name: 'Team A', captainId: null, viceCaptainId: null, playerIds: [] },
    teamB: { name: 'Team B', captainId: null, viceCaptainId: null, playerIds: [] }
  },
  activeSeriesId: null, 
  totalSeriesCount: 0,
  matches: [],
  activeMatch: null, 
  undoStack: [],
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      // --- PLAYER MANAGEMENT ---
      addPlayer: (player) => set((state) => ({ 
        players: [...state.players, { ...player, id: player.id || crypto.randomUUID(), createdAt: Date.now(), career: { runs: 0, wickets: 0, matches: 0 } }] 
      })),
      updatePlayer: (id, updates) => set((state) => ({
        players: state.players.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      // --- WEEKLY TEAMS ---
      updateWeeklyTeams: (teams) => set({ weeklyTeams: teams }),

      // --- SERIES MANAGEMENT ---
      startSeries: (teams) => set((state) => {
          const date = new Date();
          const ddmmyyyy = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getFullYear()}`;
          const newCount = state.totalSeriesCount + 1;
          return { 
              activeSeriesId: `series_${ddmmyyyy}_${newCount}`,
              totalSeriesCount: newCount,
              weeklyTeams: teams
          };
      }),
      
      endSeries: () => set({ 
          activeSeriesId: null, 
          weeklyTeams: { 
              teamA: { name: 'Team A', captainId: null, viceCaptainId: null, playerIds: [] }, 
              teamB: { name: 'Team B', captainId: null, viceCaptainId: null, playerIds: [] } 
          }
      }),

      // --- SYSTEM DATA ---
      resetAllData: () => set({ ...initialState, darkMode: get().darkMode }),
      
      importFullState: (newState) => {
          // Basic validation
          if (newState && typeof newState === 'object' && newState.players) {
              set({ ...newState, undoStack: [] });
              return true;
          }
          return false;
      },

      // --- MATCH HISTORY ---
      saveCompletedMatch: (matchData) => set((state) => ({
        matches: [...state.matches, { ...matchData, id: crypto.randomUUID(), finishedAt: Date.now() }]
      })),

      // --- ACTIVE MATCH STATE ---
      startMatch: (matchInfo) => set((state) => {
        const initBatting = (teamKey) => {
          const s = {};
          if (!state.weeklyTeams[teamKey]) return s;
          state.weeklyTeams[teamKey].playerIds.forEach(id => {
             s[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'yet_to_bat' };
          });
          return s;
        };
        const initBowling = (teamKey) => {
          const s = {};
          if (!state.weeklyTeams[teamKey]) return s;
          state.weeklyTeams[teamKey].playerIds.forEach(id => {
             s[id] = { balls: 0, runsGiven: 0, wickets: 0, wides: 0, noBalls: 0, isCompleted: false };
          });
          return s;
        };

        const teamABatsFirst = (matchInfo.tossWinnerBatting && matchInfo.tossWinner === 'teamA') || (!matchInfo.tossWinnerBatting && matchInfo.tossWinner === 'teamB');

        const teamA_batting = teamABatsFirst ? initBatting('teamA') : initBatting('teamB');
        const teamB_bowling = teamABatsFirst ? initBowling('teamB') : initBowling('teamA');
        const teamB_batting = teamABatsFirst ? initBatting('teamB') : initBatting('teamA');
        const teamA_bowling = teamABatsFirst ? initBowling('teamA') : initBowling('teamB');

        const date = new Date();
        const ddmmyyyy = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getFullYear()}`;
        const timecode = `${date.getHours()}${date.getMinutes()}`;

        return {
          undoStack: [],
          activeMatch: {
            id: `Match_${ddmmyyyy}_${timecode}`,
            seriesId: state.activeSeriesId,
            startTime: Date.now(),
            config: matchInfo.config,
            teamNames: {
                teamA: state.weeklyTeams.teamA.name,
                teamB: state.weeklyTeams.teamB.name
            },
            innings: [
              { 
                team: teamABatsFirst ? 'teamA' : 'teamB', 
                runs: 0, wickets: 0, balls: 0, extras: 0, 
                battingState: teamA_batting, 
                bowlingState: teamB_bowling, 
                ballLog: [], 
                spells: []
              },
              { 
                team: teamABatsFirst ? 'teamB' : 'teamA', 
                runs: 0, wickets: 0, balls: 0, extras: 0, 
                battingState: teamB_batting, 
                bowlingState: teamA_bowling, 
                ballLog: [],
                spells: []
              }
            ],
            currentInning: 0,
            strikerId: null,
            nonStrikerId: null,
            bowler1Id: null,
            bowler2Id: null,
            currentBowlerId: null,
            inningEnded: false,
            matchEnded: false,
          }
        };
      }),
      
      endActiveMatch: () => set((state) => {
         if (state.activeMatch) {
             const stats = get().calculateMatchStats(state.activeMatch);
             const matchToSave = { ...state.activeMatch, stats, finishedAt: Date.now() };
             return {
                matches: [...state.matches, matchToSave],
                activeMatch: null,
                undoStack: []
             };
         }
         return { activeMatch: null };
      }),

      recalculateAllMatchStats: () => set((state) => {
          const updatedMatches = state.matches.map(m => {
              const newStats = get().calculateMatchStats(m);
              return { ...m, stats: newStats };
          });
          return { matches: updatedMatches };
      }),

      resumePreviousMatch: (matchId) => set((state) => {
          const matchToResume = state.matches.find(m => m.id === matchId);
          if (!matchToResume) return state;
          
          return {
              activeMatch: { ...matchToResume, matchEnded: false, inningEnded: false },
              matches: state.matches.filter(m => m.id !== matchId),
              undoStack: []
          };
      }),

      restartMatch: () => set((state) => {
          if (!state.activeMatch) return state;
          const matchInfo = {
             config: state.activeMatch.config,
             tossWinnerBatting: true, // simplified assumption based on who is actually batting
             tossWinner: state.activeMatch.innings[0].team
          };
          // call the internal startMatch logic without re-rendering manually
          // but we need the new activeMatch object
          get().startMatch(matchInfo);
          // Wait, get().startMatch sets the state directly, so we just return the newly updated state object
          return { activeMatch: get().activeMatch, undoStack: [] };
      }),

      undoLastBall: () => set((state) => {
          if (state.undoStack.length === 0) return state;
          const prevMatch = JSON.parse(state.undoStack[state.undoStack.length - 1]);
          return {
              activeMatch: prevMatch,
              undoStack: state.undoStack.slice(0, -1)
          };
      }),

      updateMatchConfig: (newConfig) => set((state) => {
          if (!state.activeMatch) return state;
          return { activeMatch: { ...state.activeMatch, config: { ...state.activeMatch.config, ...newConfig } } };
      }),
      
      setActivePlayers: (updates) => set((state) => {
         if (!state.activeMatch) return state;
         
         const oldStateStr = JSON.stringify(state.activeMatch);
         let match = { ...state.activeMatch };
         const inning = { ...match.innings[match.currentInning] };
         inning.battingState = { ...inning.battingState };
         inning.bowlingState = { ...inning.bowlingState };
         
         const oldB1 = match.bowler1Id;
         const oldB2 = match.bowler2Id;

         if (updates.strikerId !== undefined) {
             match.strikerId = updates.strikerId;
             if (updates.strikerId && inning.battingState[updates.strikerId]) {
                 if (inning.battingState[updates.strikerId].status === 'yet_to_bat') {
                     // Assign entry order for scorecard sorting
                     const maxOrder = Math.max(0, ...Object.values(inning.battingState).map(s => s.batOrder || 0));
                     inning.battingState[updates.strikerId].batOrder = maxOrder + 1;
                 }
                 inning.battingState[updates.strikerId].status = 'batting';
             }
         }
         if (updates.nonStrikerId !== undefined) {
             match.nonStrikerId = updates.nonStrikerId;
             if (updates.nonStrikerId && inning.battingState[updates.nonStrikerId]) {
                 if (inning.battingState[updates.nonStrikerId].status === 'yet_to_bat') {
                     const maxOrder = Math.max(0, ...Object.values(inning.battingState).map(s => s.batOrder || 0));
                     inning.battingState[updates.nonStrikerId].batOrder = maxOrder + 1;
                 }
                 inning.battingState[updates.nonStrikerId].status = 'batting';
             }
         }

         if (updates.bowler1Id === null && oldB1) {
             if (inning.bowlingState[oldB1]) inning.bowlingState[oldB1].isCompleted = true;
         }
         if (updates.bowler2Id === null && oldB2) {
             if (inning.bowlingState[oldB2]) inning.bowlingState[oldB2].isCompleted = true;
         }

         if (updates.bowler1Id !== undefined) match.bowler1Id = updates.bowler1Id;
         if (updates.bowler2Id !== undefined) match.bowler2Id = updates.bowler2Id;

         if (match.bowler1Id && !match.currentBowlerId) match.currentBowlerId = match.bowler1Id;
         if (updates.bowler1Id === null && updates.bowler2Id === null) match.currentBowlerId = null;

         if (match.bowler1Id && match.bowler2Id) {
             const lastSpell = inning.spells && inning.spells.length > 0 ? inning.spells[inning.spells.length - 1] : null;
             const isSameAsLast = lastSpell && lastSpell.bowler1Id === match.bowler1Id && lastSpell.bowler2Id === match.bowler2Id;
             
             if (!isSameAsLast) {
                // BUG FIX: Only start a new spell if BOTH current bowlers have bowled at least 1 ball in the existing spell.
                // If the previous spell is "empty" or "half-empty" (one bowler hasn't bowled), we just update the bowlers in the current spell.
                let bothBowled = false;
                if (lastSpell) {
                    const b1Balls = inning.bowlingState[lastSpell.bowler1Id]?.balls || 0;
                    const b2Balls = inning.bowlingState[lastSpell.bowler2Id]?.balls || 0;
                    // We check balls relative to start of spell
                    // Note: This check is simplified. A better way is tracking balls *within* spell.
                    // But the user's requirement is "at least 1 ball each".
                    // Let's check the ball log from spell start.
                    const spellBalls = (inning.ballLog || []).slice(lastSpell.logIdxAtStart);
                    const b1InSpell = spellBalls.some(b => b.bowlerId === lastSpell.bowler1Id && !b.isWide && !b.isNoBall);
                    const b2InSpell = spellBalls.some(b => b.bowlerId === lastSpell.bowler2Id && !b.isWide && !b.isNoBall);
                    bothBowled = b1InSpell && b2InSpell;
                }

                if (lastSpell && !bothBowled) {
                    // Update current spell bowlers instead of a new one
                    lastSpell.bowler1Id = match.bowler1Id;
                    lastSpell.bowler2Id = match.bowler2Id;
                } else {
                    // Start fresh spell
                    const newSpell = {
                        id: Date.now(),
                        bowler1Id: match.bowler1Id,
                        bowler2Id: match.bowler2Id,
                        runsAtStart: inning.runs,
                        wicketsAtStart: inning.wickets,
                        ballsAtStart: inning.balls,
                        logIdxAtStart: (inning.ballLog || []).length,
                        runsAtEnd: inning.runs,
                        wicketsAtEnd: inning.wickets,
                        ballsAtEnd: inning.balls
                    };
                    inning.spells = [...(inning.spells || []), newSpell];
                }
             }
         }

         match.innings[match.currentInning] = inning;
         return { 
           activeMatch: match,
           undoStack: [...state.undoStack, oldStateStr].slice(-20)
         };
      }),

      addPlayerToTeamMidMatch: (teamKey, playerId) => set((state) => {
          if (!playerId) return state;
          
          const newTeams = { ...state.weeklyTeams };
          if (newTeams[teamKey].playerIds.includes(playerId)) return state;
          
          newTeams[teamKey].playerIds = [...newTeams[teamKey].playerIds, playerId];
          
          if (!state.activeMatch) return { weeklyTeams: newTeams };

          const match = { ...state.activeMatch };
          
          // Update both innings for the new player
          match.innings = match.innings.map((inning, idx) => {
              const belongsToInningBatting = inning.team === teamKey;
              const belongsToInningBowling = inning.team !== teamKey;
              
              const newBattingState = { ...inning.battingState };
              const newBowlingState = { ...inning.bowlingState };
              
              if (belongsToInningBatting && !newBattingState[playerId]) {
                  newBattingState[playerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'yet_to_bat' };
              }
              if (belongsToInningBowling && !newBowlingState[playerId]) {
                  newBowlingState[playerId] = { balls: 0, runsGiven: 0, wickets: 0, wides: 0, noBalls: 0, isCompleted: false };
              }
              
              return { ...inning, battingState: newBattingState, bowlingState: newBowlingState };
          });

          return { weeklyTeams: newTeams, activeMatch: match };
      }),

      removePlayerFromTeamMidMatch: (teamKey, playerId) => set((state) => {
          const newTeams = { ...state.weeklyTeams };
          newTeams[teamKey].playerIds = newTeams[teamKey].playerIds.filter(id => id !== playerId);
          
          if (!state.activeMatch) return { weeklyTeams: newTeams };
          
          const match = { ...state.activeMatch };
          if (match.strikerId === playerId) match.strikerId = null;
          if (match.nonStrikerId === playerId) match.nonStrikerId = null;
          if (match.bowler1Id === playerId) match.bowler1Id = null;
          if (match.bowler2Id === playerId) match.bowler2Id = null;
          if (match.currentBowlerId === playerId) match.currentBowlerId = null;
          
          return { weeklyTeams: newTeams, activeMatch: match };
      }),

      revivePlayer: (playerId) => set((state) => {
          if (!state.activeMatch) return state;
          const oldStateStr = JSON.stringify(state.activeMatch);
          const match = { ...state.activeMatch };
          const inning = { ...match.innings[match.currentInning] };
          
          // Find the wicket ball for this player
          const wicketBallIndex = inning.ballLog.findIndex(b => b.strikerId === playerId && b.isWicket);
          if (wicketBallIndex === -1 && inning.battingState[playerId]?.status !== 'out') return state;

          const wicketBall = inning.ballLog[wicketBallIndex];
          
          // Decrement wicket counts
          inning.wickets = Math.max(0, inning.wickets - 1);
          if (wicketBall && wicketBall.bowlerId && inning.bowlingState[wicketBall.bowlerId]) {
              // Only decrement if it wasn't a runout (since runouts don't give wickets to bowlers usually in our logic)
              if (wicketBall.wicketType !== 'runout') {
                  inning.bowlingState[wicketBall.bowlerId].wickets = Math.max(0, inning.bowlingState[wicketBall.bowlerId].wickets - 1);
              }
          }

          // Restore batsman state
          if (inning.battingState[playerId]) {
              inning.battingState[playerId].status = 'yet_to_bat'; // handleSelect will set it to 'batting'
              delete inning.battingState[playerId].howOut;
              delete inning.battingState[playerId].outBowlerId;
              delete inning.battingState[playerId].outFielderId;
          }

          // Remove the wicket status from the ball log entry
          if (wicketBallIndex !== -1) {
              inning.ballLog[wicketBallIndex].isWicket = false;
              inning.ballLog[wicketBallIndex].wicketType = null;
              inning.ballLog[wicketBallIndex].fielderId = null;
          }

          match.innings[match.currentInning] = inning;
          return {
              activeMatch: match,
              undoStack: [...state.undoStack, oldStateStr].slice(-20)
          };
      }),

      retireBatsman: (batsmanId, isOut = false) => set((state) => {
         if (!state.activeMatch) return state;
         
         const oldStateStr = JSON.stringify(state.activeMatch);

         let match = { ...state.activeMatch };
         const inningIdx = match.currentInning;
         const inning = { ...match.innings[inningIdx] };
         
         if (inning.battingState[batsmanId]) {
             inning.battingState[batsmanId].status = isOut ? 'out' : 'retired';
             if (isOut) inning.battingState[batsmanId].howOut = 'retired_out';
         }
         
         if (isOut) {
             inning.wickets += 1;
             inning.ballLog.push({ runs: 0, isWide: false, isNoBall: false, isWicket: true, wicketType: 'retired_out', fielderId: null, bowlerId: match.currentBowlerId, strikerId: batsmanId });
         }

         if (match.strikerId === batsmanId) match.strikerId = null;
         if (match.nonStrikerId === batsmanId) match.nonStrikerId = null;
         
         match.innings[inningIdx] = inning;
         
         return { 
             activeMatch: match,
             undoStack: [...state.undoStack, oldStateStr].slice(-20)
         };
      }),

      endCurrentInning: () => set((state) => {
          if (!state.activeMatch || state.activeMatch.inningEnded) return state;
          const oldStateStr = JSON.stringify(state.activeMatch);
          const match = { ...state.activeMatch, inningEnded: true };
          if (match.currentInning === 1) match.matchEnded = true;
          return { 
              activeMatch: match,
              undoStack: [...state.undoStack, oldStateStr].slice(-20)
          };
       }),

       declareMatchOutcome: ({ outcome, winnerId }) => set((state) => {
          if (!state.activeMatch) return state;
          
          const match = { 
              ...state.activeMatch, 
              matchEnded: true, 
              matchOutcome: outcome, // 'win', 'abandoned', 'tie', 'cancelled'
              winnerId: winnerId || null,
              isDiscarded: (outcome === 'cancelled' || outcome === 'abandoned'),
              endTime: Date.now()
          };
          
          return {
              activeMatch: null,
              matches: [...state.matches, match],
              undoStack: []
          };
       }),

      swapStrike: () => set((state) => {
        if (!state.activeMatch || !state.activeMatch.strikerId || !state.activeMatch.nonStrikerId) return state;
        const oldStateStr = JSON.stringify(state.activeMatch);
        return { 
            activeMatch: { ...state.activeMatch, strikerId: state.activeMatch.nonStrikerId, nonStrikerId: state.activeMatch.strikerId },
            undoStack: [...state.undoStack, oldStateStr].slice(-20)
        };
      }),

      swapBowler: () => set((state) => {
        if (!state.activeMatch || !state.activeMatch.bowler1Id || !state.activeMatch.bowler2Id) return state;
        const oldStateStr = JSON.stringify(state.activeMatch);
        const next = state.activeMatch.currentBowlerId === state.activeMatch.bowler1Id ? state.activeMatch.bowler2Id : state.activeMatch.bowler1Id;
        return { 
            activeMatch: { ...state.activeMatch, currentBowlerId: next },
            undoStack: [...state.undoStack, oldStateStr].slice(-20)
        };
      }),

      startNextInning: () => set((state) => {
        if (!state.activeMatch || state.activeMatch.currentInning !== 0) return state;
        const oldStateStr = JSON.stringify(state.activeMatch);
        return {
            activeMatch: {
                ...state.activeMatch,
                currentInning: 1,
                strikerId: null, nonStrikerId: null,
                bowler1Id: null, bowler2Id: null, currentBowlerId: null,
                inningEnded: false,
            },
            undoStack: [...state.undoStack, oldStateStr].slice(-20)
        }
      }),

      addScore: ({ runs, isWide, isNoBall, isWicket, wicketType = null, fielderId = null, outPlayerId = null }) => set((state) => {
         if (!state.activeMatch || !state.activeMatch.strikerId || !state.activeMatch.currentBowlerId) return state;
         
         const oldStateStr = JSON.stringify(state.activeMatch);

         const match = { ...state.activeMatch };
         const inning = { ...match.innings[match.currentInning] };
         const bs = { ...inning.battingState };
         const bws = { ...inning.bowlingState };
         
         const sId = match.strikerId;
         const bId = match.currentBowlerId;
         
         // In a runout, we might specify outPlayerId. Otherwise, it defaults to the striker.
         const targetOutId = outPlayerId || sId;

         let totalBallRuns = runs;
         if (isWide || isNoBall) totalBallRuns += 1;

         inning.runs += totalBallRuns;
         if (isWide || isNoBall) inning.extras += 1;
         
         const isEffectivelyAWicket = isWicket && (wicketType !== 'runout' || !isWide);

         if (!isWide && bs[sId]) {
             bs[sId].balls += 1;
             // Only give runs to batsman if it's NOT a wide
             bs[sId].runs += runs;
             if (runs === 4) bs[sId].fours += 1;
             if (runs === 6) bs[sId].sixes += 1;
         } else if (isWide) {
             // In a wide, any "runs" are actually byes (extras)
             inning.extras += runs;
         }

         if (bws[bId]) {
             bws[bId].runsGiven += totalBallRuns;
             if (isWide) bws[bId].wides += 1;
             if (isNoBall) bws[bId].noBalls += 1;
             // Only bowler get wicket if NOT a runout
             if (isWicket && wicketType !== 'runout') bws[bId].wickets += 1;

             if (bws[bId].balls === 0 && !isWide && !isNoBall) {
                 const maxOrder = Math.max(0, ...Object.values(bws).map(s => s.bowlOrder || 0));
                 bws[bId].bowlOrder = maxOrder + 1;
             }
         }

         if (!isWide && !isNoBall) {
            inning.balls += 1;
            if (bws[bId]) bws[bId].balls += 1;
         }

         if (isWicket) {
             inning.wickets += 1;
             if (bs[targetOutId]) {
                 bs[targetOutId].status = 'out';
                 bs[targetOutId].howOut = wicketType;
                 bs[targetOutId].outBowlerId = bId;
                 bs[targetOutId].outFielderId = fielderId;
             }

             // Runout specific logic for rotation (User's table)
             if (wicketType === 'runout') {
                 // Runs are already added to striker above (line 502)
                 const oldStriker = match.strikerId;
                 const oldNonStriker = match.nonStrikerId;
                 
                 // Remove the player who is out
                 if (match.strikerId === targetOutId) match.strikerId = null;
                 if (match.nonStrikerId === targetOutId) match.nonStrikerId = null;

                 // Logic for rotation based on crossing
                 // If runs are odd, it means they crossed an odd number of times.
                 // If striker faced and they ran 1 (odd), striker is now at non-striker end.
                 // Specific user requested rules:
                 if (runs === 1) {
                     // 1 run + Non-striker out => Striker was at bowler end (crossing). So Striker (now at non-striker position) stays non-striker.
                     // The empty slot is striker. 
                     // Wait, the user said: "if 1 run and non striker out means 1 run count in striker and new bastman comes on non striker end"
                     // This implies the striker finished the run and is now on strike.
                     if (targetOutId === oldNonStriker) {
                         match.strikerId = oldStriker; // he completed crossing
                         match.nonStrikerId = null;
                     } else {
                         match.nonStrikerId = oldNonStriker;
                         match.strikerId = null;
                     }
                 } else if (runs === 2) {
                     // 2 runs + anyone out => they crossed twice, so ends are back to normal.
                     if (targetOutId === oldStriker) {
                         match.strikerId = null;
                         match.nonStrikerId = oldNonStriker;
                     } else {
                         match.strikerId = oldStriker;
                         match.nonStrikerId = null;
                     }
                 } else if (runs === 3) {
                     // 3 runs => crossed 3 times (ends swapped).
                     if (targetOutId === oldStriker) {
                         match.strikerId = null;
                         match.nonStrikerId = oldNonStriker;
                     } else {
                         match.strikerId = oldStriker;
                         match.nonStrikerId = null;
                     }
                 } else if (runs === 4) {
                     // 4 runs => crossed 4 times (ends normal).
                     if (targetOutId === oldStriker) {
                         match.strikerId = null;
                         match.nonStrikerId = oldNonStriker;
                     } else {
                         match.strikerId = oldStriker;
                         match.nonStrikerId = null;
                     }
                 } else if (runs === 0) {
                     // No runs => ends normal.
                     if (targetOutId === oldStriker) {
                         match.strikerId = null;
                         match.nonStrikerId = oldNonStriker;
                     } else {
                         match.strikerId = oldStriker;
                         match.nonStrikerId = null;
                     }
                 }
             } else {
                 // Normal wicket
                 if (match.strikerId === targetOutId) match.strikerId = null;
                 if (match.nonStrikerId === targetOutId) match.nonStrikerId = null;
             }
         }

         if ((runs === 1 || runs === 3) && match.strikerId && match.nonStrikerId && !isWicket) {
             const temp = match.strikerId;
             match.strikerId = match.nonStrikerId;
             match.nonStrikerId = temp;
         }

         if (inning.spells && inning.spells.length > 0) {
             const sIdx = inning.spells.length - 1;
             inning.spells[sIdx].runsAtEnd = inning.runs;
             inning.spells[sIdx].wicketsAtEnd = inning.wickets;
             inning.spells[sIdx].ballsAtEnd = inning.balls;
         } else if (match.bowler1Id) {
             // Robustness: If no spell exists but we have a bowler, start one from ball 0
             const firstSpell = {
                 id: Date.now(),
                 bowler1Id: match.bowler1Id,
                 bowler2Id: match.bowler2Id,
                 runsAtStart: 0,
                 wicketsAtStart: 0,
                 ballsAtStart: 0,
                 logIdxAtStart: 0,
                 runsAtEnd: inning.runs,
                 wicketsAtEnd: inning.wickets,
                 ballsAtEnd: inning.balls
             };
             inning.spells = [firstSpell];
         }

         if (match.bowler1Id && match.bowler2Id) {
             match.currentBowlerId = (match.currentBowlerId === match.bowler1Id) ? match.bowler2Id : match.bowler1Id;
         }

         if (inning.balls >= match.config.totalBalls) { 
             match.inningEnded = true;
             if (match.currentInning === 1) match.matchEnded = true;
         }

         if (match.currentInning === 1 && !match.matchEnded && !match.targetAchieved) {
             const target = match.innings[0].runs + 1;
             if (inning.runs >= target) {
                 match.targetAchieved = true;
             }
         }

         inning.battingState = bs;
         inning.bowlingState = bws;
         inning.ballLog.push({ runs, isWide, isNoBall, isWicket, wicketType, fielderId, bowlerId: bId, strikerId: sId });
         match.innings[match.currentInning] = inning;
         
         return { 
             activeMatch: match,
             undoStack: [...state.undoStack, oldStateStr].slice(-10) 
         };
      }),

      dismissTargetPopup: () => set((state) => {
          if (!state.activeMatch) return state;
          return { activeMatch: { ...state.activeMatch, targetAchieved: false } };
      }),

       calculateMatchStats: (matchInfo) => {
          const points = {};
          const processInning = (inning) => {
              // Batting Points
              Object.entries(inning.battingState || {}).forEach(([pid, stats]) => {
                  if (stats.balls > 0 || stats.runs > 0) {
                      if (!points[pid]) points[pid] = { id: pid, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, runsGiven: 0, ballsBowled: 0, wides: 0, noBalls: 0, wicketsTaken: 0, catches: 0, runouts: 0, fieldingPoints: 0, totalPoints: 0 };
                      
                      // Base points: 1 per run, +1 for 4, +3 for 6
                      let bPoints = (stats.runs || 0) + ((stats.fours || 0) * 1) + ((stats.sixes || 0) * 3);
                      
                      // Strike Rate Impact (Min 5 balls)
                      if (stats.balls >= 5) {
                          const sr = (stats.runs / stats.balls) * 100;
                          if (sr > 200) bPoints += 15;
                          else if (sr > 150) bPoints += 5;
                          else if (sr < 75) bPoints -= 10;
                      }

                      points[pid].totalPoints += bPoints;
                      points[pid].runsScored += stats.runs;
                      points[pid].ballsFaced += stats.balls;
                      points[pid].fours += (stats.fours || 0);
                      points[pid].sixes += (stats.sixes || 0);
                  }
              });

              // Bowling Points
              Object.entries(inning.bowlingState || {}).forEach(([pid, stats]) => {
                  if (stats.balls > 0 || stats.runsGiven > 0) {
                      if (!points[pid]) points[pid] = { id: pid, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, runsGiven: 0, ballsBowled: 0, wides: 0, noBalls: 0, wicketsTaken: 0, catches: 0, runouts: 0, fieldingPoints: 0, totalPoints: 0 };
                      
                      // Wickets: 15 each
                      let wPoints = (stats.wickets * 15);
                      
                      // Economy Impact (Min 6 balls / 1 over)
                      if (stats.balls >= 6) {
                          const er = (stats.runsGiven / stats.balls) * 6;
                          if (er < 4) wPoints += 15;
                          else if (er < 6) wPoints += 5;
                          else if (er > 12) wPoints -= 10;
                          else if (er > 15) wPoints -= 20;
                      }

                      points[pid].totalPoints += wPoints;
                      points[pid].runsGiven += stats.runsGiven;
                      points[pid].ballsBowled += stats.balls;
                      points[pid].wides += (stats.wides || 0);
                      points[pid].noBalls += (stats.noBalls || 0);
                      points[pid].wicketsTaken += stats.wickets;
                  }
              });

              // Fielding Points
              (inning.ballLog || []).forEach(ball => {
                  if (ball.isWicket && ball.fielderId) {
                      if (!points[ball.fielderId]) points[ball.fielderId] = { id: ball.fielderId, runsScored: 0, ballsFaced: 0, fours: 0, sixes: 0, runsGiven: 0, ballsBowled: 0, wides: 0, noBalls: 0, wicketsTaken: 0, catches: 0, runouts: 0, fieldingPoints: 0, totalPoints: 0 };
                      const isRunout = ball.wicketType === 'runout';
                      const fPts = isRunout ? 10 : 5;
                      
                      if (isRunout) points[ball.fielderId].runouts += 1;
                      else points[ball.fielderId].catches += 1;
                      
                      points[ball.fielderId].fieldingPoints += fPts;
                      points[ball.fielderId].totalPoints += fPts;
                  }
              });
          };

          processInning(matchInfo.innings[0]);
          processInning(matchInfo.innings[1]);
          
          const sorted = Object.values(points).sort((a, b) => b.totalPoints - a.totalPoints);
          return { 
              mvp: sorted.slice(0, 5), 
              worst: sorted.slice(-5).reverse(), 
              allPlayerPoints: points 
          };
       }
    }),
    {
      name: 'spell-cricket-storage-v2', // version bump for critical system updates
      storage: createJSONStorage(() => storage),
    }
  )
);
