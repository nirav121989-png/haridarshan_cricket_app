import React, { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Home, Play, UserPlus, Users, BarChart3, Star, ScrollText, Sun, Moon, Trophy, Settings, HelpCircle, Info } from 'lucide-react';
import { useAppStore } from './store';
import './index.css';

// Import Pages
import PlayerManager from './pages/PlayerManager';
import TeamManager from './pages/TeamManager';
import MatchSetup from './pages/MatchSetup';
import ScorePage from './pages/ScorePage';
import ScorecardPage from './pages/ScorecardPage';
import StatsPage from './pages/StatsPage';
import SystemPage from './pages/SystemPage';

function HomePage() {
  const navigate = useNavigate();
  const { activeSeriesId, matches, activeMatch, endSeries, darkMode, toggleDarkMode, weeklyTeams } = useAppStore();
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [showPointsInfo, setShowPointsInfo] = React.useState(false);

  const seriesScores = useMemo(() => {
    if (!activeSeriesId) return null;
    const seriesMatches = matches.filter(m => m.seriesId === activeSeriesId && m.matchEnded);
    let aWins = 0;
    let bWins = 0;
    seriesMatches.forEach(m => {
        const i1 = m.innings[0];
        const i2 = m.innings[1];
        let winnerKey = "";
        if (i1.runs > i2.runs) winnerKey = i1.team;
        else if (i2.runs > i1.runs) winnerKey = i2.team;
        if (winnerKey === 'teamA') aWins++;
        else if (winnerKey === 'teamB') bWins++;
    });
    return { aWins, bWins, count: seriesMatches.length };
  }, [activeSeriesId, matches]);

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <header className="header-sticky glass">
        <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="branding-title" style={{ margin: 0, fontSize: '1.25rem' }}>HARIDARSHAN</h2>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.2em' }}>CRICKET SCORER</p>
            </div>
            <div className="flex gap-2">
                <button className="btn btn-surface" style={{ padding: '8px' }} onClick={() => setShowPointsInfo(true)}>
                    <HelpCircle size={16} color="var(--primary)" />
                </button>
                <button className="btn btn-surface" style={{ padding: '8px' }} onClick={() => navigate('/system')}>
                    <Settings size={16} color="var(--text-muted)" />
                </button>
                <button className="btn btn-surface" style={{ padding: '8px' }} onClick={toggleDarkMode}>
                    {darkMode ? <Sun size={16} color="#fbbf24" fill="#fbbf24" /> : <Moon size={16} color="var(--text-muted)" />}
                </button>
            </div>
        </div>
      </header>

      <div className="container flex-col gap-4">
        
        {activeSeriesId ? (
            <div className="card flex-col gap-3" style={{ background: 'var(--surface-muted)', borderColor: 'var(--border-color)' }}>
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800' }}>ACTIVE SERIES</h3>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>{activeSeriesId.toUpperCase()}</p>
                    </div>
                    <div className="badge flex items-center gap-1" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: '800' }}>
                       <Trophy size={10} /> LIVE
                    </div>
                </div>
                
                {seriesScores && (
                    <div className="flex gap-2 items-center py-2" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="flex-1 text-center">
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', margin: 0 }}>{weeklyTeams.teamA.name.toUpperCase()}</p>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{seriesScores.aWins}</h2>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)' }}>VS</div>
                        <div className="flex-1 text-center">
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', margin: 0 }}>{weeklyTeams.teamB.name.toUpperCase()}</p>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--secondary)' }}>{seriesScores.bWins}</h2>
                        </div>
                    </div>
                )}

                {activeMatch && !activeMatch.matchEnded && (
                    <button className="btn w-full mb-2" style={{ padding: '12px', background: 'var(--secondary)', color: '#000', fontWeight: '900', borderRadius: '12px', boxShadow: '0 4px 10px var(--secondary-glow)' }} onClick={() => navigate('/score')}>
                       RESUME ONGOING MATCH
                    </button>
                )}

                <button className="btn btn-primary w-full" style={{ padding: '10px' }} onClick={() => navigate('/setup')}>
                   {activeMatch && !activeMatch.matchEnded ? 'START NEW MATCH' : 'START NEXT MATCH'}
                </button>
            </div>
        ) : (
            <div className="card flex-col gap-3" style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--surface-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--secondary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} color="var(--secondary)" />
                    </div>
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>New Series</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Form teams and start tracking weekly wins.</p>
                </div>
                <button className="btn btn-secondary w-full" style={{ padding: '12px' }} onClick={() => navigate('/teams')}>
                   START SERIES
                </button>
            </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="card flex-col items-center gap-2" onClick={() => navigate('/players')} style={{ cursor: 'pointer', padding: '12px' }}>
                <div style={{ padding: '6px', backgroundColor: 'var(--surface-muted)', borderRadius: '8px' }}>
                    <UserPlus size={16} color="var(--text-muted)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main' }}>PLAYERS</h3>
            </div>

            {activeSeriesId && (
                <div className="card flex-col items-center gap-2" onClick={() => navigate('/teams')} style={{ cursor: 'pointer', padding: '12px' }}>
                    <div style={{ padding: '6px', backgroundColor: 'var(--surface-muted)', borderRadius: '8px' }}>
                        <Users size={16} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)' }}>TEAMS</h3>
                </div>
            )}
            
            {matches.length > 0 && (
                <>
                <div className="card flex-col items-center gap-2" onClick={() => navigate('/stats')} style={{ cursor: 'pointer', padding: '12px' }}>
                    <div style={{ padding: '6px', backgroundColor: 'var(--surface-muted)', borderRadius: '8px' }}>
                        <BarChart3 size={16} color="#fbbf24" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)' }}>RECORDS</h3>
                </div>

                <div className="card flex-col items-center gap-2" onClick={() => navigate('/stats')} style={{ cursor: 'pointer', padding: '12px' }}>
                    <div style={{ padding: '6px', backgroundColor: 'var(--surface-muted)', borderRadius: '8px' }}>
                        <ScrollText size={16} color="var(--primary)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)' }}>HISTORY</h3>
                </div>
                </>
            )}
        </div>

        <div className="flex-col items-center gap-1 py-6">
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>CREATED BY <span style={{ color: 'var(--primary)' }}>NIRAV JOSHI</span></p>
            <p style={{ margin: 0, fontSize: '0.5rem', color: 'var(--text-muted)', opacity: 0.5 }}>© 2026 HARIDARSHAN CRICKET v2.0</p>
        </div>

        {activeSeriesId && (
            <button className="btn btn-surface w-full" style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '8px', opacity: 0.7 }} 
                onClick={() => setConfirmAction({ msg: 'End Series? This will reset the win-loss count and clear current squads.', act: () => endSeries() })}>
                END SERIES
            </button>
        )}

        {/* CUSTOM CONFIRM MODAL */}
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

        {/* MVP POINT SYSTEM INFO MODAL */}
        {showPointsInfo && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)' }}>
               <div className="card w-full flex-col gap-4 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', maxHeight: '80vh', overflowY: 'auto' }}>
                   <div className="flex justify-between items-center mb-2">
                       <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>MVP POINT SYSTEM</h3>
                       <button className="btn btn-surface btn-sm" onClick={() => setShowPointsInfo(false)}>✕</button>
                   </div>
                   
                   <div className="flex-col gap-4">
                       <section className="flex-col gap-2 p-4" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
                           <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '900' }}>🏏 BATTING</h4>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Every 1 Run</span>
                               <span style={{ color: 'var(--primary)' }}>+1 Pt</span>
                           </div>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Boundary (4)</span>
                               <span style={{ color: 'var(--primary)' }}>+1 Pt Bonus</span>
                           </div>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Maximum (6)</span>
                               <span style={{ color: 'var(--primary)' }}>+3 Pt Bonus</span>
                           </div>
                       </section>

                       <section className="flex-col gap-2 p-4" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
                           <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: '900' }}>🥎 BOWLING</h4>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Every Wicket</span>
                               <span style={{ color: 'var(--secondary)' }}>+15 Pts</span>
                           </div>
                       </section>

                       <section className="flex-col gap-2 p-4" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
                           <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fbbf24', fontWeight: '900' }}>🧤 FIELDING</h4>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Catch / Stumping</span>
                               <span style={{ color: '#fbbf24' }}>+5 Pts</span>
                           </div>
                           <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                               <span>Run Out</span>
                               <span style={{ color: '#fbbf24' }}>+10 Pts</span>
                           </div>
                       </section>
                   </div>

                   <button className="btn btn-primary w-full p-4 mt-2" style={{ fontWeight: '800' }} onClick={() => setShowPointsInfo(false)}>GOT IT!</button>
               </div>
           </div>
        )}
      </div>
    </div>
  );
}

function NavBar() {
  const navigate = useNavigate();
  const activeSeriesId = useAppStore((state) => state.activeSeriesId);

  return (
    <nav className="glass" style={{ 
      position: 'fixed', bottom: '0', left: '0', right: '0', 
      display: 'flex', justifyContent: 'space-around', 
      padding: '8px 0 24px 0',
      zIndex: 200, 
      borderTop: '1px solid var(--border-color)',
      background: 'var(--glass-bg)'
    }}>
      <button className="btn" style={{ padding: '10px', background: 'transparent' }} onClick={() => navigate('/')}>
        <Home size={22} color="var(--primary)" />
      </button>
      <button className="btn" style={{ padding: '10px', background: 'transparent' }} onClick={() => navigate('/teams')}>
        <Users size={22} color="var(--text-muted)" />
      </button>
      <button className="btn" style={{ padding: '10px', background: 'transparent' }} onClick={() => navigate('/setup')} disabled={!activeSeriesId}>
        <Play size={22} color={activeSeriesId ? 'var(--secondary)' : 'var(--border-color)'} fill={activeSeriesId ? 'var(--secondary)' : 'transparent'} />
      </button>
      <button className="btn" style={{ padding: '10px', background: 'transparent' }} onClick={() => navigate('/stats')}>
        <BarChart3 size={22} color="var(--text-muted)" />
      </button>
    </nav>
  );
}

function App() {
  const darkMode = useAppStore(state => state.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<><HomePage /><NavBar /></>} />
        <Route path="/setup" element={<><MatchSetup /><NavBar /></>} />
        <Route path="/teams" element={<><TeamManager /><NavBar /></>} />
        <Route path="/players" element={<><PlayerManager /><NavBar /></>} />
        <Route path="/score" element={<ScorePage />} />
        <Route path="/scorecard" element={<ScorecardPage />} />
        <Route path="/scorecard/:matchId" element={<ScorecardPage />} />
        <Route path="/stats" element={<><StatsPage /><NavBar /></>} />
        <Route path="/system" element={<><SystemPage /><NavBar /></>} />
        <Route path="*" element={<><HomePage /><NavBar /></>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
