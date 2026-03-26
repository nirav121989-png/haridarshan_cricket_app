import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, RefreshCw, BarChart2, Users, Clock, Undo2, Trophy, User } from 'lucide-react';

export default function ScorePage() {
  const navigate = useNavigate();
  const { 
    activeMatch, players, weeklyTeams, undoStack,
    endActiveMatch, restartMatch, startMatch, swapStrike, swapBowler, setActivePlayers, startNextInning, addScore, undoLastBall, retireBatsman 
  } = useAppStore();
  
  const [showSelectModal, setShowSelectModal] = useState(null); 
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketDetails, setWicketDetails] = useState({ type: null, step: 'type' });
  const [showPastSpells, setShowPastSpells] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!activeMatch) navigate('/');
  }, [activeMatch, navigate]);

  if (!activeMatch || !activeMatch.innings) return <div className="p-10 text-center">Loading match data...</div>;

  const currentInningIdx = activeMatch.currentInning || 0;
  const currentInning = activeMatch.innings[currentInningIdx];
  if (!currentInning) return <div className="p-10 text-center">Inning data corrupted.</div>;

  const config = activeMatch.config || { totalBalls: 90 };
  const battingTeamKey = currentInning.team || (currentInningIdx === 0 ? 'teamA' : 'teamB');
  const bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';
  
  const battingTeam = weeklyTeams?.[battingTeamKey] || { name: 'Batting Team', playerIds: [] };
  const bowlingTeam = weeklyTeams?.[bowlingTeamKey] || { name: 'Bowling Team', playerIds: [] };

  const handleSelect = (playerId) => {
      const updates = {};
      if (showSelectModal === 'striker') updates.strikerId = playerId;
      if (showSelectModal === 'nonStriker') updates.nonStrikerId = playerId;
      if (showSelectModal === 'bowler1') updates.bowler1Id = playerId;
      if (showSelectModal === 'bowler2') updates.bowler2Id = playerId;
      setActivePlayers(updates);
      setShowSelectModal(null);
  };

  const striker = players.find(p => p.id === activeMatch.strikerId);
  const nonStriker = players.find(p => p.id === activeMatch.nonStrikerId);
  const bowler1 = players.find(p => p.id === activeMatch.bowler1Id);
  const bowler2 = players.find(p => p.id === activeMatch.bowler2Id);
  
  const strikerStats = activeMatch.strikerId ? currentInning.battingState?.[activeMatch.strikerId] : null;
  const nonStrikerStats = activeMatch.nonStrikerId ? currentInning.battingState?.[activeMatch.nonStrikerId] : null;
  const bowler1Stats = activeMatch.bowler1Id ? currentInning.bowlingState?.[activeMatch.bowler1Id] : null;
  const bowler2Stats = activeMatch.bowler2Id ? currentInning.bowlingState?.[activeMatch.bowler2Id] : null;

  const hasPlayersAssigned = striker && nonStriker && bowler1 && bowler2;

  const handleRun = (runs) => {
      addScore({ runs, isWide: false, isNoBall: false, isWicket: false });
  };
  
  const processWicket = (type, fielderId = null) => {
      addScore({ runs: 0, isWide: false, isNoBall: false, isWicket: true, wicketType: type, fielderId });
      setShowWicketModal(false);
      setShowSelectModal('striker'); 
  };
  
  const handleExtra = (type) => {
      if (type === 'wide') addScore({ runs: 0, isWide: true, isNoBall: false, isWicket: false });
      if (type === 'noBall') addScore({ runs: 0, isWide: false, isNoBall: true, isWicket: false });
  };

  const currentSpell = (currentInning.spells && currentInning.spells.length > 0) ? currentInning.spells[currentInning.spells.length - 1] : null;
  const csRuns = currentSpell ? (currentSpell.runsAtEnd - currentSpell.runsAtStart) : 0;
  const csWkts = currentSpell ? (currentSpell.wicketsAtEnd - currentSpell.wicketsAtStart) : 0;
  const csBalls = currentSpell ? (currentSpell.ballsAtEnd - currentSpell.ballsAtStart) : 0;

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '-';

  return (
    <div className="flex-col" style={{ height: '100vh', background: 'var(--background)' }}>
      <header className="header-sticky glass">
        <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 style={{ fontSize: '0.85rem', fontWeight: '800' }}>{battingTeam.name.toUpperCase()}</h2>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>{currentInningIdx === 0 ? '1ST INN' : '2ND INN'}</p>
            </div>
            <div className="flex gap-2 text-primary items-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => setShowPastSpells(!showPastSpells)}><Clock size={16} /></button>
              {undoStack.length > 0 && <button className="btn btn-surface btn-sm" style={{ padding: '6px', color: 'var(--primary)' }} onClick={undoLastBall}><Undo2 size={16} /></button>}
              <button className="btn btn-surface btn-sm" style={{ padding: '6px', fontSize: '9px', fontWeight: '800', background: 'var(--danger-glow)', color: 'var(--danger)' }} 
                  onClick={() => setConfirmAction({ msg: 'Restart current match? All scoring will be permanently wiped.', act: () => restartMatch() })}>
                  RESTART
              </button>
              <button className="btn btn-surface btn-sm" style={{ padding: '6px', fontSize: '9px', fontWeight: '800', background: 'var(--danger-glow)', color: 'var(--danger)' }} 
                  onClick={() => setConfirmAction({ msg: 'End Match Early? This completes the match as-is.', act: () => { endActiveMatch(); navigate('/'); } })}>
                  END MATCH
              </button>
              <button className="btn btn-surface btn-sm" style={{ padding: '6px', fontSize: '10px' }} onClick={() => navigate('/scorecard')}>CARD</button>
            </div>
        </div>
      </header>

      <div className="container flex-col" style={{ flex: 1, paddingBottom: '320px', overflowY: 'auto' }}>
         
         <div className="flex-col items-center pt-2">
             <h1 style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
               {currentInning.runs}-{currentInning.wickets}
             </h1>
             <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>BALLS: {currentInning.balls} / {config.totalBalls}</p>
             
             {currentInningIdx === 1 && activeMatch.innings?.[0] && (
                <div style={{ marginTop: '10px', background: 'var(--secondary-glow)', padding: '6px 16px', borderRadius: '100px' }}>
                   <p style={{ margin: 0, color: 'var(--secondary)', fontWeight: '800', fontSize: '0.7rem' }}>
                      NEED {Math.max(0, (activeMatch.innings[0].runs + 1) - currentInning.runs)} IN {config.totalBalls - currentInning.balls}
                   </p>
                </div>
             )}
         </div>

         {currentSpell && (
             <div className="flex justify-between items-center px-4 py-3" style={{ background: 'var(--primary-glow)', borderRadius: '12px', border: '1px solid var(--primary)', marginTop: '16px', marginBottom: '16px' }}>
                 <div className="flex items-center gap-2">
                     <Clock size={14} color="var(--primary)" />
                     <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)' }}>CURRENT SPELL</span>
                 </div>
                 <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>{csRuns}/{csWkts} <span style={{fontSize: '10px', opacity: 0.7}}>({csBalls}b)</span></span>
             </div>
         )}

         {showPastSpells && (
             <div className="card flex-col gap-2 mb-4" style={{ background: 'var(--surface-muted)', borderStyle: 'dashed' }}>
                 <h4 style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>PAST SPELLS</h4>
                 {currentInning.spells && currentInning.spells.length > 1 ? currentInning.spells.slice(0, -1).reverse().map((s, i) => (
                      <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>{getPlayerName(s.bowler1Id).split(' ')[0]} & {getPlayerName(s.bowler2Id).split(' ')[0]}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{s.runsAtEnd - s.runsAtStart}/{s.wicketsAtEnd - s.wicketsAtStart} ({s.ballsAtEnd - s.ballsAtStart}b)</span>
                      </div>
                 )) : <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>No past spells found.</p>}
             </div>
         )}

         <div className="flex-col gap-3">
             <div className="flex gap-2">
                 {[
                     { player: striker, stats: strikerStats, type: 'striker', label: 'STRIKER' },
                     { player: nonStriker, stats: nonStrikerStats, type: 'nonStriker', label: 'NON-STR' }
                 ].map((slot, i) => {
                    const isStriker = activeMatch.strikerId && slot.player?.id === activeMatch.strikerId;
                    return (
                     <div key={i} className={`card flex-1 flex-col ${isStriker ? 'striker-active' : ''}`} 
                          style={{ padding: '8px', borderStyle: slot.player ? 'solid' : 'dashed', opacity: slot.player ? 1 : 0.6, minHeight: '80px' }}
                          onClick={() => setShowSelectModal(slot.type)}>
                        <div className="flex justify-between items-start">
                            <div className="flex-col" style={{ flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: '0.55rem', color: isStriker ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '900' }}>{slot.label} {isStriker ? '🏏' : ''}</span>
                                <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                    {slot.player ? slot.player.name.toUpperCase() : 'SET BAT'}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: isStriker ? 'var(--primary)' : 'var(--text-main)' }}>
                                    {slot.stats ? `${slot.stats.runs}(${slot.stats.balls})` : '0(0)'}
                                </p>
                            </div>
                            {slot.player?.image && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', marginLeft: '4px' }}>
                                    <img src={slot.player.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                     </div>
                    )
                 })}
                 <button className="btn btn-surface" style={{ padding: '8px' }} onClick={swapStrike}><RefreshCw size={14} /></button>
             </div>

             <div className="flex gap-2">
                 {[
                     { player: bowler1, stats: bowler1Stats, type: 'bowler1', label: 'BOWL 1' },
                     { player: bowler2, stats: bowler2Stats, type: 'bowler2', label: 'BOWL 2' }
                 ].map((slot, i) => {
                     const isActive = activeMatch.currentBowlerId === slot.player?.id && slot.player?.id;
                     return (
                        <div key={i} className={`card flex-1 flex-col ${isActive ? 'bowler-active' : ''}`} 
                            style={{ padding: '8px', borderStyle: slot.player ? 'solid' : 'dashed', opacity: slot.player ? 1 : 0.6, minHeight: '80px' }}
                            onClick={() => setShowSelectModal(slot.type)}>
                            <div className="flex justify-between items-start">
                                <div className="flex-col" style={{ flex: 1, overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.55rem', color: isActive ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: '900' }}>
                                        {isActive ? 'BOWLING ⚽' : slot.label}
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                        {slot.player ? slot.player.name.toUpperCase() : 'SET BOWL'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '900', color: isActive ? 'var(--secondary)' : 'var(--text-main)' }}>
                                        {slot.stats ? `${slot.stats.wickets}W-${slot.stats.runsGiven}R` : '0W-0R'}
                                    </p>
                                </div>
                                {slot.player?.image && (
                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', marginLeft: '4px' }}>
                                        <img src={slot.player.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                     )
                 })}
                 <button className="btn btn-surface" style={{ padding: '8px' }} onClick={swapBowler}><RefreshCw size={14} /></button>
             </div>
         </div>
      </div>

      {hasPlayersAssigned && !activeMatch.inningEnded && (
          <div className="glass" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px 16px', borderTop: '1px solid var(--border-color)', zIndex: 150 }}>
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                 <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>SCORING PAD</p>
                 <div className="flex items-center gap-3">
                     <button className="btn" style={{ padding: '8px 16px', fontWeight: '900', background: 'var(--secondary)', color: '#000', borderRadius: '8px', fontSize: '0.8rem', boxShadow: '0 4px 10px var(--secondary-glow)' }} 
                        onClick={() => setConfirmAction({ msg: 'Start new spell? Old bowlers will be locked.', act: () => setActivePlayers({ bowler1Id: null, bowler2Id: null }) })}>
                        NEW SPELL
                     </button>
                 </div>
            </div>

            <div className="scoring-grid">
                {[0, 1, 2, 3, 4, 6].map(val => (
                    <button key={val} className="score-num-btn" onClick={() => handleRun(val)}>{val}</button>
                ))}
                <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-glow)' }} onClick={() => handleExtra('wide')}>WIDE</button>
                <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-glow)' }} onClick={() => handleExtra('noBall')}>NB</button>
                <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-glow)', borderColor: 'var(--danger)' }} onClick={() => { setWicketDetails({ step: 'type' }); setShowWicketModal(true); }}>OUT</button>
            </div>
          </div>
      )}

      {/* OVERLAYS */}
      {activeMatch.inningEnded && (
          <div className="glass flex items-center justify-center p-8" style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
              <div className="card w-full text-center py-10 flex-col gap-6" style={{ background: 'var(--surface)' }}>
                <div className="flex justify-center">
                    <Trophy size={48} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{activeMatch.matchEnded ? 'MATCH COMPLETE' : 'INNING END'}</h2>
                {activeMatch.matchEnded ? (
                    <div className="flex-col gap-4">
                        <h2 style={{ color: 'var(--secondary)', fontSize: '1.5rem', fontWeight: '900' }}>
                            {activeMatch.innings[1].runs <= activeMatch.innings[0].runs ? 'TIED MATCH!' : `${battingTeam.name.toUpperCase()} WIN!`}
                        </h2>
                        <button className="btn btn-primary w-full p-4" style={{ fontWeight: '800' }} onClick={() => { endActiveMatch(); navigate('/'); }}>FINISH & RECAP</button>
                    </div>
                ) : (
                    <div className="flex-col gap-4">
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>TARGET FOR {bowlingTeam.name.toUpperCase()}</p>
                        <h1 style={{ fontSize: '4rem', color: 'var(--primary)', fontWeight: '900', margin: 0 }}>{currentInning.runs + 1}</h1>
                        <button className="btn btn-primary w-full p-4" style={{ fontWeight: '800' }} onClick={startNextInning}>START CHASE</button>
                    </div>
                )}
              </div>
          </div>
      )}

      {showSelectModal && (
          <div className="glass flex items-end" style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.5)' }}>
              <div className="card w-full flex-col" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85dvh', paddingBottom: '32px' }}>
                  <div className="flex justify-between items-center mb-4" style={{ flexShrink: 0 }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: '800' }}>
                           {showSelectModal.includes('bowler') ? 'SELECT NEW BOWLER' : 'SELECT BATSMAN'}
                      </h3>
                      <button className="btn btn-surface btn-sm" onClick={() => setShowSelectModal(null)}>CLOSE</button>
                  </div>
                  <div className="flex-col gap-2" style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
                    {(showSelectModal.includes('bowler') ? bowlingTeam : battingTeam).playerIds.filter(pid => {
                        if (showSelectModal.includes('bowler')) {
                            return activeMatch.bowler1Id !== pid && activeMatch.bowler2Id !== pid && !currentInning.bowlingState[pid]?.isCompleted;
                        } else {
                            return (currentInning.battingState?.[pid]?.status === 'yet_to_bat' || currentInning.battingState?.[pid]?.status === 'retired') && activeMatch.strikerId !== pid && activeMatch.nonStrikerId !== pid;
                        }
                    }).map(pid => {
                        const p = players.find(x => x.id === pid);
                        return (
                        <button key={pid} className="btn btn-surface w-full p-3" style={{ borderRadius: '12px', fontSize: '1rem', fontWeight: '800', justifyContent: 'flex-start' }} onClick={() => handleSelect(pid)}>
                            <div className="flex items-center gap-3 w-full">
                                {p?.image ? (
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={14} /></div>}
                                
                                <span style={{ flex: 1, textAlign: 'left' }}>{p?.name}</span>
                                
                                {showSelectModal.includes('bowler') ? (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentInning.bowlingState?.[pid]?.wickets || 0}W-{currentInning.bowlingState?.[pid]?.runsGiven || 0}R</span>
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: currentInning.battingState?.[pid]?.status === 'retired' ? 'var(--primary)' : 'var(--text-muted)' }}>
                                        {currentInning.battingState?.[pid]?.status === 'retired' ? 'RETIRED' : `${currentInning.battingState?.[pid]?.runs || 0}(${currentInning.battingState?.[pid]?.balls || 0})`}
                                    </span>
                                )}
                            </div>
                        </button>
                        )
                    })}
                  </div>
              </div>
          </div>
      )}

      {showWicketModal && (
          <div className="glass flex items-end" style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.5)' }}>
              <div className="card w-full flex-col" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85dvh', paddingBottom: '32px' }}>
                  <div className="flex justify-between items-center mb-4" style={{ flexShrink: 0 }}>
                      <h3 style={{ fontWeight: '800', textTransform: 'uppercase' }}>
                           {wicketDetails.step === 'type' ? 'SELECT WICKET TYPE' : `${wicketDetails.type} BY?`}
                      </h3>
                      <button className="btn btn-surface btn-sm" onClick={() => setShowWicketModal(false)}>CANCEL</button>
                  </div>
                  <div className="flex-col gap-2" style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
                    {wicketDetails.step === 'type' ? (
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {['bowled', 'caught', 'runout', 'stumped'].map(t => (
                                <button key={t} className="btn btn-surface w-full p-4" style={{ fontSize: '1rem', fontWeight: '800' }} onClick={() => t === 'bowled' ? processWicket(t) : setWicketDetails({ step: 'fielder', type: t })}>{t.toUpperCase()}</button>
                            ))}
                            <button className="btn w-full p-4" style={{ background: 'var(--surface-muted)', fontWeight: '800', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }} onClick={() => { retireBatsman(activeMatch.strikerId, false); setShowWicketModal(false); }}>RETIRE (HURT)</button>
                            <button className="btn w-full p-4" style={{ background: 'var(--danger-glow)', fontWeight: '800', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.85rem' }} onClick={() => { retireBatsman(activeMatch.strikerId, true); setShowWicketModal(false); }}>RETIRE (OUT)</button>
                        </div>
                    ) : (
                        bowlingTeam.playerIds.map(pid => {
                            const p = players.find(x => x.id === pid);
                            return (
                                <button key={pid} className="btn btn-surface w-full p-4 gap-3" style={{ fontSize: '1rem', fontWeight: '800', justifyContent: 'flex-start' }} onClick={() => processWicket(wicketDetails.type, pid)}>
                                    {p?.image ? (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={20} /></div>}
                                    <span style={{ textAlign: 'left' }}>{p?.name.toUpperCase()}</span>
                                </button>
                            )
                        })
                    )}
                  </div>
              </div>
          </div>
      )}

       {/* GLOBAL CONFIRMATION MODAL */}
       {confirmAction && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
               <div className="card w-full text-center flex-col gap-5 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                   <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.4 }}>{confirmAction.msg}</h3>
                   <div className="flex gap-3 mt-4">
                       <button className="btn btn-surface flex-1 p-4" style={{ fontWeight: '800' }} onClick={() => setConfirmAction(null)}>CANCEL</button>
                       <button className="btn flex-1 p-4" style={{ fontWeight: '800', background: 'var(--danger)', color: '#fff', boxShadow: '0 4px 15px var(--danger-glow)' }} onClick={() => { confirmAction.act(); setConfirmAction(null); }}>PROCEED</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
