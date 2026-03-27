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
        players: [...state.players, { ...player, id: crypto.randomUUID(), createdAt: Date.now(), career: { runs: 0, wickets: 0, matches: 0 } }] 
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
                 inning.battingState[updates.strikerId].status = 'batting';
             }
         }
         if (updates.nonStrikerId !== undefined) {
             match.nonStrikerId = updates.nonStrikerId;
             if (updates.nonStrikerId && inning.battingState[updates.nonStrikerId]) {
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
             if (isWicket && wicketType !== 'runout') bws[bId].wickets += 1;
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
             if (match.strikerId === targetOutId) match.strikerId = null;
             if (match.nonStrikerId === targetOutId) match.nonStrikerId = null;
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
             Object.entries(inning.battingState || {}).forEach(([pid, stats]) => {
                 if (stats.balls > 0 || stats.runs > 0 || stats.status !== 'yet_to_bat') {
                     if (!points[pid]) points[pid] = { id: pid, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     points[pid].runsScored += stats.runs;
                     // Safe math for older matches that might not have fours/sixes
                     const bPoints = (stats.runs || 0) + ((stats.fours || 0) * 1) + ((stats.sixes || 0) * 3);
                     points[pid].totalPoints += bPoints;
                 }
             });
             Object.entries(inning.bowlingState || {}).forEach(([pid, stats]) => {
                 if (stats.balls > 0 || stats.runsGiven > 0) {
                     if (!points[pid]) points[pid] = { id: pid, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     points[pid].runsGiven += stats.runsGiven;
                     points[pid].wicketsTaken += stats.wickets;
                     // 15 per wicket (removed subtraction of runsGiven)
                     points[pid].totalPoints += (stats.wickets * 15);
                 }
             });
             (inning.ballLog || []).forEach(ball => {
                 if (ball.isWicket && ball.fielderId) {
                     if (!points[ball.fielderId]) points[ball.fielderId] = { id: ball.fielderId, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     // 5 for catches/stumps, 10 for runouts (as per "higher points")
                     const fPts = (ball.wicketType === 'runout') ? 10 : 5;
                     points[ball.fielderId].fieldingPoints += fPts;
                     points[ball.fielderId].totalPoints += fPts;
                 }
             });
         };
         processInning(matchInfo.innings[0]);
         processInning(matchInfo.innings[1]);
         const sorted = Object.values(points).sort((a, b) => b.totalPoints - a.totalPoints);
         return { mvp: sorted.slice(0, 5), worst: sorted.slice(-5).reverse() };
      }
    }),
    {
      name: 'spell-cricket-storage-v2', // version bump for critical system updates
      storage: createJSONStorage(() => storage),
    }
  )
);
