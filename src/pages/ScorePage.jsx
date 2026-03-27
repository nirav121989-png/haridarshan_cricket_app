import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, RefreshCw, BarChart2, Users, Clock, Undo2, Trophy, User, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';

export default function ScorePage() {
  const navigate = useNavigate();
  const { 
    activeMatch, players, weeklyTeams, undoStack,
    endActiveMatch, restartMatch, startMatch, swapStrike, swapBowler, setActivePlayers, startNextInning, addScore, undoLastBall, retireBatsman, endCurrentInning, declareMatchOutcome, dismissTargetPopup 
  } = useAppStore();
  
  const [showSelectModal, setShowSelectModal] = useState(null); 
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketDetails, setWicketDetails] = useState({ type: null, step: 'type' });
  const [showPastSpells, setShowPastSpells] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSpellHistory, setShowSpellHistory] = useState(false);

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

  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectorView, setSelectorView] = useState('list'); // list, squads, search
  
  const [filterText, setFilterText] = useState('');
  
  const handleSelect = (playerId) => {
      setFilterText(''); // reset search
      const updates = {};
      const targetP = players.find(p => p.id === playerId);
      const isOut = currentInning.battingState?.[playerId]?.status === 'out';

      if (isOut) {
          setConfirmAction({
            msg: `Player ${targetP?.name} was already OUT. Revive and give batting again? (History will be updated)`,
            act: () => {
                useAppStore.getState().revivePlayer(playerId);
                setTimeout(() => handleSelect(playerId), 50); 
            }
          });
          return;
      }

      if (showSelectModal === 'striker') updates.strikerId = playerId;
      if (showSelectModal === 'nonStriker') updates.nonStrikerId = playerId;
      if (showSelectModal === 'bowler1') updates.bowler1Id = playerId;
      if (showSelectModal === 'bowler2') updates.bowler2Id = playerId;
      setActivePlayers(updates);
      setShowSelectModal(null);
      setSelectorView('list');
  };

  const handleCreateAndAdd = () => {
      if (!newPlayerName.trim()) return;
      const newId = crypto.randomUUID();
      addPlayer({ name: newPlayerName.trim(), id: newId });
      addPlayerToTeamMidMatch(showSelectModal.includes('bowler') ? bowlingTeamKey : battingTeamKey, newId);
      setNewPlayerName('');
      setSelectorView('list');
  };

  const striker = players.find(p => p.id === activeMatch.strikerId);
  const nonStriker = players.find(p => p.id === activeMatch.nonStrikerId);
  const bowler1 = players.find(p => p.id === activeMatch.bowler1Id);
  const bowler2 = players.find(p => p.id === activeMatch.bowler2Id);
  
  const strikerStats = striker ? currentInning.battingState?.[striker.id] : null;
  const nonStrikerStats = nonStriker ? currentInning.battingState?.[nonStriker.id] : null;
  const bowler1Stats = bowler1 ? currentInning.bowlingState?.[bowler1.id] : null;
  const bowler2Stats = bowler2 ? currentInning.bowlingState?.[bowler2.id] : null;

  const hasPlayersAssigned = striker && nonStriker && bowler1 && bowler2;

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [tempBalls, setTempBalls] = useState(config.totalBalls);
  const [showExtraModal, setShowExtraModal] = useState(null); // 'wide' or 'noBall' or null
  
  const handleRun = (runs) => {
      addScore({ runs, isWide: false, isNoBall: false, isWicket: false });
  };
  
  const processWicket = (type, fielderId = null, outPlayerId = null) => {
      // If it's a runout and we don't have an outPlayerId yet, we need to ask who is out
      if (type === 'runout' && !outPlayerId) {
          setWicketDetails({ step: 'batsman', type, fielderId });
          return;
      }

      addScore({ runs: 0, isWide: false, isNoBall: false, isWicket: true, wicketType: type, fielderId, outPlayerId });
      setShowWicketModal(false);
      
      // Fix: Only open selector for the slot that was actually emptied
      const isNonStrikerOut = outPlayerId && outPlayerId === activeMatch.nonStrikerId;
      setShowSelectModal(isNonStrikerOut ? 'nonStriker' : 'striker'); 
  };
  
  const handleExtraSubmission = (runs) => {
      addScore({ runs, isWide: showExtraModal === 'wide', isNoBall: showExtraModal === 'noBall', isWicket: false });
      setShowExtraModal(null);
  };

  const updateBalls = () => {
      useAppStore.getState().updateMatchConfig({ totalBalls: parseInt(tempBalls) });
      setIsEditingConfig(false);
  };

  const currentSpell = (currentInning.spells && currentInning.spells.length > 0) ? currentInning.spells[currentInning.spells.length - 1] : null;
  const csRuns = currentSpell ? (currentSpell.runsAtEnd - currentSpell.runsAtStart) : 0;
  const csWkts = currentSpell ? (currentSpell.wicketsAtEnd - currentSpell.wicketsAtStart) : 0;
  const csBalls = currentSpell ? (currentSpell.ballsAtEnd - currentSpell.ballsAtStart) : 0;

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '-';

  return (
    <div className="flex-col" style={{ height: '100vh', background: 'var(--background)' }}>
      <header className="header-sticky glass" style={{ padding: '8px 12px' }}>
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
                <button className="btn btn-surface btn-sm" style={{ padding: '8px' }} onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
                <button className="btn btn-surface btn-sm" style={{ padding: '8px', color: 'var(--primary)' }} onClick={() => setShowPastSpells(!showPastSpells)}>
                    <Clock size={18} />
                </button>
            </div>

            <div className="flex flex-col items-center">
              <h2 style={{ fontSize: '0.825rem', fontWeight: '900', margin: 0, letterSpacing: '0.02em' }}>{battingTeam.name.toUpperCase()}</h2>
              <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: '800', margin: 0 }}>{currentInningIdx === 0 ? '1ST INNING' : '2ND INNING'}</p>
            </div>

            <div className="flex items-center gap-2">
                {undoStack.length > 0 && (
                    <button className="btn btn-surface btn-sm" style={{ padding: '8px', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }} onClick={undoLastBall}>
                        <Undo2 size={18} />
                    </button>
                )}
                <button className="btn btn-surface btn-sm" style={{ padding: '8px' }} onClick={() => setShowSettingsModal(true)}>
                    <SettingsIcon size={18} color="var(--text-muted)" />
                </button>
            </div>
        </div>
      </header>

      <div className="container flex-col" style={{ flex: 1, paddingBottom: '320px', overflowY: 'auto' }}>
         
         {showSettingsModal && (
            <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)' }}>
                <div className="card w-full flex-col gap-4 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center">
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: 'var(--primary)' }}>MATCH SETTINGS</h3>
                        <button className="btn btn-surface btn-sm" onClick={() => setShowSettingsModal(false)}>✕</button>
                    </div>

                    <div className="flex-col gap-3">
                        <button className="btn btn-primary w-full p-4 flex items-center justify-center gap-3" style={{ fontWeight: '900', background: 'var(--secondary)', color: '#000', borderRadius: '12px', boxShadow: '0 4px 15px var(--secondary-glow)' }} 
                            onClick={() => { setShowSelectModal('striker'); setShowSettingsModal(false); }}>
                            <Users size={20} /> MANAGE SQUADS
                        </button>

                        <div className="hr" style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                        <div className="flex-col gap-2 p-3" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
                             <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>INNING LIMIT (BALLS)</label>
                             <div className="flex gap-2">
                                <input className="input flex-1" type="number" value={tempBalls} onChange={e => setTempBalls(e.target.value)} />
                                <button className="btn btn-primary" onClick={() => { updateBalls(); setShowSettingsModal(false); }}>SET</button>
                             </div>
                        </div>

                        <div className="hr" style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />

                        {currentInningIdx === 0 && (
                            <button className="btn w-full p-4" style={{ fontWeight: '800', border: '1px solid var(--primary)', color: 'var(--primary)' }} 
                                onClick={() => { setConfirmAction({ msg: 'End current inning early?', act: () => endCurrentInning() }); setShowSettingsModal(false); }}>
                                END INNING EARLY
                            </button>
                        )}

                        <button className="btn w-full p-4" style={{ fontWeight: '800', background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid var(--danger)' }} 
                            onClick={() => { setConfirmAction({ msg: 'Declare Match Over?', act: () => { endActiveMatch(); navigate('/'); } }); setShowSettingsModal(false); }}>
                            DECLARE MATCH OVER
                        </button>

                        <button className="btn w-full p-4" style={{ fontWeight: '600', color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.7rem' }} 
                            onClick={() => { setConfirmAction({ msg: 'RESTART MATCH? This wipes everything.', act: () => restartMatch() }); setShowSettingsModal(false); }}>
                            RESTART MATCH (FULL WIPE)
                        </button>
                    </div>
                </div>
            </div>
         )}

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
              <div className="card flex-col items-center gap-1 border-primary" style={{ padding: '16px', marginTop: '16px', marginBottom: '16px', background: 'var(--primary-glow)', transition: 'all 0.3s ease' }}>
                  <div className="flex justify-between w-full items-center">
                    <div className="flex items-center gap-2">
                        <Clock size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '900', margin: 0 }}>CURRENT SPELL</span>
                    </div>
                    <button className="btn btn-surface btn-sm" style={{ padding: '4px', border: '0.5px solid var(--primary-glow)' }} onClick={() => setShowSpellHistory(!showSpellHistory)}>
                        {showSpellHistory ? <EyeOff size={16} color="var(--primary)" /> : <Eye size={16} color="var(--primary)" />}
                    </button>
                  </div>
                  <h2 style={{ margin: '14px 0 0 0', fontSize: '2.4rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
                    {csRuns}-{csWkts} 
                    <span style={{ fontSize: '0.9rem', opacity: 0.7, marginLeft: '12px', verticalAlign: 'middle', fontWeight: '800' }}>[{csBalls}]</span>
                  </h2>
                  
                  {showSpellHistory && (
                      <div className="mt-4 w-full" style={{ padding: '0 4px', maxWidth: '100%', overflow: 'hidden' }}>
                          <div className="hide-scroll" style={{ 
                              display: 'flex', 
                              gap: '12px', 
                              padding: '12px 16px', 
                              background: 'var(--background)', 
                              borderRadius: '32px', 
                              border: '1px solid var(--border-color)', 
                              overflowX: 'auto',
                              WebkitOverflowScrolling: 'touch',
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none'
                          }}>
                              <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                              {(() => {
                                  let legalCount = 0;
                                  const spellBalls = currentInning.ballLog.slice(currentSpell.logIdxAtStart || 0);
                                  
                                  if (spellBalls.length > 0) {
                                      return spellBalls.map((ball, idx) => {
                                          const ballNum = legalCount + 1;
                                          if (!ball.isWide && !ball.isNoBall) legalCount++;

                                          let label = ball.runs;
                                          let color = 'var(--text-main)';
                                          let bgColor = 'var(--surface-muted)';
                                          
                                          if (ball.isWide) { 
                                              label = ball.runs > 0 ? `Wd+${ball.runs}` : 'WD'; 
                                              color = '#000'; bgColor = 'var(--primary)'; 
                                          }
                                          if (ball.isNoBall) { 
                                              label = ball.runs > 0 ? `Nb+${ball.runs}` : 'NB'; 
                                              color = '#000'; bgColor = 'var(--primary)'; 
                                          }
                                          if (ball.isWicket) { label = 'W'; color = '#fff'; bgColor = 'var(--danger)'; }
                                          if (ball.runs === 4 && !ball.isNoBall && !ball.isWide) { color = '#000'; bgColor = '#ffa726'; }
                                          if (ball.runs === 6 && !ball.isNoBall && !ball.isWide) { color = '#000'; bgColor = '#ffa726'; }

                                          return (
                                              <div key={idx} className="flex-col items-center gap-1">
                                                  <div className="flex-shrink-0 flex items-center justify-center shadow-md" style={{ width: '42px', height: '42px', borderRadius: '50%', background: bgColor, color, fontSize: '0.65rem', fontWeight: '900', border: '1.5px solid rgba(255,255,255,0.05)', boxSizing: 'border-box' }}>
                                                      {label}
                                                  </div>
                                                  <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--primary)', opacity: 0.8 }}>B{ballNum}</span>
                                              </div>
                                          );
                                      });
                                  }
                                  return <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>Waiting for first balls...</p>;
                              })()}
                          </div>
                      </div>
                  )}
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
                                <span style={{ fontSize: '0.55rem', color: isStriker ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '900' }}>{slot.label}</span>
                                <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                    {slot.player ? slot.player.name.toUpperCase() : 'SET BAT'}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: isStriker ? 'var(--primary)' : 'var(--text-main)' }}>
                                    {slot.stats ? `${slot.stats.runs}(${slot.stats.balls})` : '0(0)'}
                                </p>
                            </div>
                            <div className="flex-col items-center gap-1">
                                {slot.player?.image ? (
                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                        <img src={slot.player.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--surface-muted)', border: '1px dashed var(--border-color)' }}></div>}
                                {isStriker && <span style={{ fontSize: '1.2rem', marginTop: '-2px' }}>🏏</span>}
                            </div>
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
                                        {isActive ? 'BOWLING' : slot.label}
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                        {slot.player ? slot.player.name.toUpperCase() : 'SET BOWL'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '900', color: isActive ? 'var(--secondary)' : 'var(--text-main)' }}>
                                        {slot.stats ? `${slot.stats.wickets}W-${slot.stats.runsGiven}R` : '0W-0R'}
                                    </p>
                                </div>
                                <div className="flex-col items-center gap-1">
                                    {slot.player?.image ? (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                            <img src={slot.player.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--surface-muted)', border: '1px dashed var(--border-color)' }}></div>}
                                    {isActive && <span style={{ fontSize: '1.2rem', marginTop: '-2px' }}>⚽</span>}
                                </div>
                            </div>
                        </div>
                     )
                 })}
                 <button className="btn btn-surface" style={{ padding: '8px' }} onClick={swapBowler}><RefreshCw size={14} /></button>
             </div>
         </div>
      </div>

      <div className="glass" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px 16px', borderTop: '1px solid var(--border-color)', zIndex: 150 }}>
          <div className="flex justify-between items-center mb-6 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>SCORING PAD</p>
              <div className="flex items-center gap-3">
                  <button className="btn btn-sm" style={{ padding: '8px 16px', fontWeight: '900', fontSize: '0.8rem', background: '#ffa726', color: '#000', borderRadius: '8px', boxShadow: '0 4px 10px rgba(255, 167, 38, 0.3)' }} 
                    onClick={() => navigate('/scorecard')}>
                    FULL CARD
                  </button>
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
              <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-glow)' }} onClick={() => setShowExtraModal('wide')}>WIDE</button>
              <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-glow)' }} onClick={() => setShowExtraModal('noBall')}>NB</button>
              <button className="score-num-btn" style={{ fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-glow)', borderColor: 'var(--danger)' }} onClick={() => { setWicketDetails({ step: 'type' }); setShowWicketModal(true); }}>OUT</button>
          </div>
      </div>

      {/* EXTRA RUNS MODAL */}
      {showExtraModal && (
          <div className="glass flex items-end" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
              <div className="card w-full flex-col gap-6" style={{ background: 'var(--surface)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: '40px' }}>
                  <div className="flex justify-between items-center">
                      <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary)' }}>{showExtraModal === 'wide' ? 'WIDE' : 'NO BALL'} + EXTRA RUNS?</h3>
                      <button className="btn btn-surface btn-sm" onClick={() => setShowExtraModal(null)}>CANCEL</button>
                  </div>
                  
                  <div className="scoring-grid">
                      {[0, 1, 2, 3, 4, 6].map(runs => (
                          <button key={runs} className="score-num-btn" style={{ padding: '20px' }} onClick={() => handleExtraSubmission(runs)}>{runs}</button>
                      ))}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap 0 for basic {showExtraModal === 'wide' ? 'Wide' : 'No Ball'}.</p>
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
                           {selectorView === 'list' ? (showSelectModal.includes('bowler') ? 'SELECT NEW BOWLER' : 'SELECT BATSMAN') : 'MANAGE SQUADS'}
                      </h3>
                      <button className="btn btn-surface btn-sm" onClick={() => { setShowSelectModal(null); setSelectorView('list'); }}>CLOSE</button>
                  </div>

                  {selectorView === 'list' ? (
                    <div className="flex-col gap-2" style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
                        <div className="flex gap-2 mb-3">
                             <input className="input" style={{ flex: '0 0 70%', background: 'var(--surface-muted)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} 
                                placeholder="🔍 Filter players..." value={filterText} onChange={e => setFilterText(e.target.value)} />
                             <button className="btn btn-primary flex-1 p-3" style={{ fontSize: '0.65rem', fontWeight: '900' }} onClick={() => setSelectorView('squads')}>+ SQUADS</button>
                        </div>

                        {(showSelectModal.includes('bowler') ? bowlingTeam : battingTeam).playerIds.filter(pid => {
                            const p = players.find(x => x.id === pid);
                            const matchesFilter = !filterText || (p?.name || '').toLowerCase().includes(filterText.toLowerCase());
                            if (!matchesFilter) return false;

                            if (showSelectModal.includes('bowler')) {
                                return activeMatch.bowler1Id !== pid && activeMatch.bowler2Id !== pid && !currentInning.bowlingState[pid]?.isCompleted;
                            } else {
                                return activeMatch.strikerId !== pid && activeMatch.nonStrikerId !== pid;
                            }
                        })
                        .sort((a, b) => {
                            if (showSelectModal.includes('bowler')) return 0;
                            const isOutA = currentInning.battingState?.[a]?.status === 'out';
                            const isOutB = currentInning.battingState?.[b]?.status === 'out';
                            if (isOutA && !isOutB) return 1;
                            if (!isOutA && isOutB) return -1;
                            return 0;
                        })
                        .map(pid => {
                            const p = players.find(x => x.id === pid);
                            const isRevivable = currentInning.battingState?.[pid]?.status === 'out';
                            return (
                            <button key={pid} className="btn btn-surface w-full p-3" 
                            style={{ 
                                borderRadius: '12px', fontSize: '1rem', fontWeight: '800', justifyContent: 'flex-start',
                                border: isRevivable ? '1px dashed var(--danger)' : '1px solid var(--border-color)',
                                opacity: isRevivable ? 0.7 : 1
                            }} 
                            onClick={() => handleSelect(pid)}>
                                <div className="flex items-center gap-3 w-full">
                                    {p?.image ? (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={14} /></div>}
                                    <div className="flex-col" style={{ flex: 1, textAlign: 'left' }}>
                                        <span>{p?.name}</span>
                                        {isRevivable && <span style={{ fontSize: '0.55rem', color: 'var(--danger)' }}>ALREADY OUT (TAP TO REVIVE)</span>}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {showSelectModal.includes('bowler') ? `${currentInning.bowlingState?.[pid]?.wickets || 0}W` : (currentInning.battingState?.[pid]?.status === 'out' ? 'OUT' : `${currentInning.battingState?.[pid]?.runs || 0}R`)}
                                    </span>
                                </div>
                            </button>
                            )
                        })}
                    </div>
                  ) : (
                    <div className="flex-col gap-4" style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
                         <div className="flex-col gap-2 p-3 bg-surface-muted" style={{ borderRadius: '12px' }}>
                             <label className="label" style={{ fontSize: '0.65rem' }}>QUICK ADD NEW PLAYER</label>
                             <div className="flex gap-2">
                                <input className="input" placeholder="New Player Name" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
                                <button className="btn btn-primary" onClick={handleCreateAndAdd}>ADD</button>
                             </div>
                         </div>

                         <div className="flex-col gap-2">
                             <h4 style={{ fontSize: '0.75rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>PICK FROM PLAYER BANK</h4>
                             <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                 {players.filter(p => !battingTeam.playerIds.includes(p.id) && !bowlingTeam.playerIds.includes(p.id)).map(p => (
                                     <button key={p.id} className="btn btn-surface p-3" style={{ fontSize: '0.75rem', fontWeight: '700' }} onClick={() => {
                                         addPlayerToTeamMidMatch(showSelectModal.includes('bowler') ? bowlingTeamKey : battingTeamKey, p.id);
                                         setSelectorView('list');
                                     }}>+ {p.name}</button>
                                 ))}
                             </div>
                         </div>
                         
                         <div className="flex-col gap-2 mt-4">
                             <h4 style={{ fontSize: '0.75rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--danger)' }}>REMOVE FROM SQUAD</h4>
                             <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                 {(showSelectModal.includes('bowler') ? bowlingTeam : battingTeam).playerIds.map(pid => {
                                     const p = players.find(x => x.id === pid);
                                     return (
                                     <button key={pid} className="btn btn-surface p-3" style={{ fontSize: '0.7rem', color: 'var(--danger)' }} onClick={() => {
                                         removePlayerFromTeamMidMatch(showSelectModal.includes('bowler') ? bowlingTeamKey : battingTeamKey, pid);
                                     }}>- {p?.name}</button>
                                 )})}
                             </div>
                         </div>

                         <button className="btn btn-surface w-full p-4 mt-6" onClick={() => setSelectorView('list')}>BACK TO SELECTOR</button>
                    </div>
                  )}
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
                    ) : wicketDetails.step === 'fielder' ? (
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
                    ) : (
                        <div className="flex-col gap-3">
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>WHICH BATSMAN IS OUT?</p>
                            {[
                                { id: activeMatch.strikerId, label: 'STRIKER' },
                                { id: activeMatch.nonStrikerId, label: 'NON-STRIKER' }
                            ].map(b => {
                                const p = players.find(x => x.id === b.id);
                                return (
                                    <button key={b.id} className="btn btn-surface w-full p-5" style={{ fontSize: '1.2rem', fontWeight: '900' }} onClick={() => processWicket(wicketDetails.type, wicketDetails.fielderId, b.id)}>
                                        {p?.name.toUpperCase()} ({b.label})
                                    </button>
                                )
                            })}
                        </div>
                    )}
                  </div>
              </div>
          </div>
      )}

       {/* TARGET ACHIEVED POPUP */}
       {activeMatch.targetAchieved && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.85)' }}>
               <div className="card w-full text-center flex-col gap-6 py-10" style={{ background: 'var(--surface)', borderRadius: '32px' }}>
                   <div className="flex justify-center">
                       <Trophy size={64} color="var(--primary)" />
                   </div>
                   <div className="flex-col gap-2">
                       <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>TARGET ACHIEVED!</h2>
                       <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                           {weeklyTeams[activeMatch.innings[1]?.team]?.name.toUpperCase() || 'CHASING TEAM'} WON!
                       </h1>
                   </div>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 20px' }}>
                       The target has been met. Would you like to end the match now or continue playing?
                   </p>
                   <div className="flex-col gap-3 px-6 w-full">
                       <button className="btn btn-primary w-full p-5" style={{ fontWeight: '900', fontSize: '1.1rem' }} 
                         onClick={() => { declareMatchOutcome({ outcome: 'win', winnerId: activeMatch.innings[1].team }); navigate('/'); }}>
                         END MATCH
                       </button>
                       <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800', opacity: 0.8 }} 
                         onClick={dismissTargetPopup}>
                         CONTINUE SCORING
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* MATCH SETTINGS MODAL */}
       {showSettingsModal && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
               <div className="card w-full flex-col gap-4 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                   <div className="flex justify-between items-center border-bottom pb-2">
                       <h3 style={{ fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase' }}>MATCH SETTINGS</h3>
                       <button className="btn btn-surface btn-sm" onClick={() => setShowSettingsModal(false)}>CLOSE</button>
                   </div>
                   
                   <div className="flex-col gap-3 mt-4">
                       <button className="btn btn-surface w-full p-4" style={{ color: 'var(--danger)', fontWeight: '800' }} 
                        onClick={() => { setShowSettingsModal(false); setConfirmAction({ msg: 'Restart match? All data will be lost.', act: restartMatch }); }}>RESTART MATCH</button>
                       
                       {currentInningIdx === 0 && !activeMatch.inningEnded && (
                           <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800' }} 
                            onClick={() => { setShowSettingsModal(false); setConfirmAction({ msg: 'End this inning now?', act: endCurrentInning }); }}>END INNING</button>
                       )}

                       <button className="btn btn-primary w-full p-4" style={{ fontWeight: '900' }} 
                        onClick={() => { setShowSettingsModal(false); setShowDeclareModal(true); }}>DECLARE / END MATCH</button>
                   </div>
               </div>
           </div>
       )}

       {/* DECLARE MATCH MODAL */}
       {showDeclareModal && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.9)' }}>
               <div className="card w-full flex-col gap-5 p-6" style={{ background: 'var(--surface)', borderRadius: '24px' }}>
                   <div className="text-center">
                       <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>DECLARE MATCH RESULT</h3>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>How would you like to end the match?</p>
                   </div>

                   <div className="flex-col gap-3">
                       <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800', justifyContent: 'center' }} 
                         onClick={() => { declareMatchOutcome({ outcome: 'win', winnerId: activeMatch.innings[0].team }); navigate('/'); }}>
                         {weeklyTeams[activeMatch.innings[0].team]?.name.toUpperCase()} WIN
                       </button>
                       
                       {activeMatch.innings[1] && (
                           <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800', justifyContent: 'center' }} 
                             onClick={() => { declareMatchOutcome({ outcome: 'win', winnerId: activeMatch.innings[1].team }); navigate('/'); }}>
                             {weeklyTeams[activeMatch.innings[1].team]?.name.toUpperCase()} WIN
                           </button>
                       )}

                       <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800', justifyContent: 'center' }} 
                         onClick={() => { declareMatchOutcome({ outcome: 'abandoned' }); navigate('/'); }}>ABANDONED (NO STATS)</button>
                       
                       <button className="btn btn-surface w-full p-4" style={{ fontWeight: '800', justifyContent: 'center' }} 
                         onClick={() => { declareMatchOutcome({ outcome: 'tie' }); navigate('/'); }}>MATCH TIE</button>
                       
                       <button className="btn w-full p-4" style={{ fontWeight: '900', background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid var(--danger)', justifyContent: 'center' }} 
                         onClick={() => { declareMatchOutcome({ outcome: 'cancelled' }); navigate('/'); }}>CANCEL MATCH (NO STATS)</button>
                   </div>
                   
                   <button className="btn btn-surface w-full p-4 mt-2" onClick={() => setShowDeclareModal(false)}>GO BACK</button>
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
