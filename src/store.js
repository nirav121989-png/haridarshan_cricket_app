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
             if (inning.wickets >= 10) {
                 match.inningEnded = true;
                 if (match.currentInning === 1) match.matchEnded = true;
             }
         }

         if (match.strikerId === batsmanId) match.strikerId = null;
         if (match.nonStrikerId === batsmanId) match.nonStrikerId = null;
         
         match.innings[inningIdx] = inning;
         
         return { 
             activeMatch: match,
             undoStack: [...state.undoStack, oldStateStr].slice(-20)
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

      addScore: ({ runs, isWide, isNoBall, isWicket, wicketType = null, fielderId = null }) => set((state) => {
         if (!state.activeMatch || !state.activeMatch.strikerId || !state.activeMatch.currentBowlerId) return state;
         
         const oldStateStr = JSON.stringify(state.activeMatch);

         const match = { ...state.activeMatch };
         const inning = { ...match.innings[match.currentInning] };
         const bs = { ...inning.battingState };
         const bws = { ...inning.bowlingState };
         
         const sId = match.strikerId;
         const bId = match.currentBowlerId;

         let totalBallRuns = runs;
         if (isWide || isNoBall) totalBallRuns += 1;

         inning.runs += totalBallRuns;
         if (isWide || isNoBall) inning.extras += 1;
         
         if (!isWide && bs[sId]) bs[sId].balls += 1;
         if (bs[sId]) {
             bs[sId].runs += runs;
             if (runs === 4) bs[sId].fours += 1;
             if (runs === 6) bs[sId].sixes += 1;
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
             if (bs[sId]) {
                 bs[sId].status = 'out';
                 bs[sId].howOut = wicketType;
                 bs[sId].outBowlerId = bId;
                 bs[sId].outFielderId = fielderId;
             }
             match.strikerId = null;
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

         if (inning.balls >= match.config.totalBalls || inning.wickets >= 10) { 
             match.inningEnded = true;
             if (match.currentInning === 1) match.matchEnded = true;
         }
         
         if (match.currentInning === 1 && inning.runs > match.innings[0].runs) {
             match.matchEnded = true;
             match.inningEnded = true;
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

      calculateMatchStats: (matchInfo) => {
         const points = {};
         const processInning = (inning) => {
             Object.entries(inning.battingState || {}).forEach(([pid, stats]) => {
                 if (stats.balls > 0 || stats.runs > 0 || stats.status !== 'yet_to_bat') {
                     if (!points[pid]) points[pid] = { id: pid, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     points[pid].runsScored += stats.runs;
                     points[pid].totalPoints += stats.runs;
                 }
             });
             Object.entries(inning.bowlingState || {}).forEach(([pid, stats]) => {
                 if (stats.balls > 0 || stats.runsGiven > 0) {
                     if (!points[pid]) points[pid] = { id: pid, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     points[pid].runsGiven += stats.runsGiven;
                     points[pid].wicketsTaken += stats.wickets;
                     points[pid].totalPoints += (stats.wickets * 20) - stats.runsGiven;
                 }
             });
             (inning.ballLog || []).forEach(ball => {
                 if (ball.isWicket && ball.fielderId) {
                     if (!points[ball.fielderId]) points[ball.fielderId] = { id: ball.fielderId, runsScored: 0, runsGiven: 0, wicketsTaken: 0, fieldingPoints: 0, totalPoints: 0, matchCount: 0 };
                     points[ball.fielderId].fieldingPoints += 10;
                     points[ball.fielderId].totalPoints += 10;
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
