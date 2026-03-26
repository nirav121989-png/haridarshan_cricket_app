import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Play, ArrowLeft, Settings, Info } from 'lucide-react';

export default function MatchSetup() {
  const navigate = useNavigate();
  const { weeklyTeams, startMatch } = useAppStore();
  
  const [totalBalls, setTotalBalls] = useState(90);
  const [widesEnabled, setWidesEnabled] = useState(true);
  const [noBallsEnabled, setNoBallsEnabled] = useState(true);
  
  const [tossWinner, setTossWinner] = useState('teamA');
  const [tossDecision, setTossDecision] = useState('bat'); // bat or bowl
  const [confirmAction, setConfirmAction] = useState(null);

  const handleStartMatch = () => {
    if (weeklyTeams.teamA.playerIds.length === 0 || weeklyTeams.teamB.playerIds.length === 0) {
      setConfirmAction({ msg: 'One or both teams have no players. Proceed anyway?', act: () => proceedToStart() });
      return;
    }
    proceedToStart();
  };

  const proceedToStart = () => {
    startMatch({
      config: {
         totalBalls,
         extras: { wide: widesEnabled, noBall: noBallsEnabled },
         teamSize: 11
      },
      tossWinner,
      tossDecision: tossDecision,
      tossWinnerBatting: tossDecision === 'bat'
    });
    
    navigate('/score');
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '120px', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex items-center gap-3">
            <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1rem' }}>MATCH SETUP</h2>
         </div>
      </header>

      <div className="container flex-col gap-4">
        <div className="card flex-col gap-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <Info size={16} color="var(--primary)" />
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>TOSS & DECISION</h3>
            </div>
            
            <div className="flex-col gap-2">
                <label className="label">WHO WON THE TOSS?</label>
                <div className="flex gap-2">
                    <button 
                      className={`btn flex-1 ${tossWinner === 'teamA' ? 'btn-primary' : 'btn-surface'}`}
                      style={{ borderRadius: '12px', fontWeight: '800' }}
                      onClick={() => setTossWinner('teamA')}
                    >
                      {weeklyTeams.teamA.name.toUpperCase()}
                    </button>
                    <button 
                      className={`btn flex-1 ${tossWinner === 'teamB' ? 'btn-secondary' : 'btn-surface'}`}
                      style={{ borderRadius: '12px', fontWeight: '800' }}
                      onClick={() => setTossWinner('teamB')}
                    >
                      {weeklyTeams.teamB.name.toUpperCase()}
                    </button>
                </div>
            </div>

            <div className="flex-col gap-2">
                <label className="label">THE WINNER WILL:</label>
                <div className="flex gap-2">
                    <button 
                      className={`btn flex-1 ${tossDecision === 'bat' ? 'btn-primary' : 'btn-surface'}`}
                      style={{ borderRadius: '12px', fontWeight: '800' }}
                      onClick={() => setTossDecision('bat')}
                    >
                      BAT FIRST
                    </button>
                    <button 
                      className={`btn flex-1 ${tossDecision === 'bowl' ? 'btn-secondary' : 'btn-surface'}`}
                      style={{ borderRadius: '12px', fontWeight: '800' }}
                      onClick={() => setTossDecision('bowl')}
                    >
                      BOWL FIRST
                    </button>
                </div>
            </div>
        </div>

        <div className="card flex-col gap-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <Settings size={16} color="var(--secondary)" />
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>RULES & LIMITS</h3>
            </div>
            
            <div className="flex-col gap-2">
                <label className="label">INNING BALL LIMIT</label>
                <input 
                    className="input" 
                    type="number" 
                    value={totalBalls || ''} 
                    onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                            setTotalBalls('');
                        } else {
                            setTotalBalls(parseInt(val) || 0);
                        }
                    }} 
                    placeholder="90"
                    style={{ fontWeight: '800' }}
                />
            </div>

            <div className="flex items-center justify-between p-3" style={{ background: 'var(--surface-muted)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <label htmlFor="wides" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800' }}>WIDE - EXTRA RUN</label>
                <input type="checkbox" checked={widesEnabled} onChange={e => setWidesEnabled(e.target.checked)} id="wides" style={{ width: '1.2rem', height: '1.2rem' }} />
            </div>

            <div className="flex items-center justify-between p-3" style={{ background: 'var(--surface-muted)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <label htmlFor="noballs" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800' }}>NO BALL - EXTRA RUN</label>
                <input type="checkbox" checked={noBallsEnabled} onChange={e => setNoBallsEnabled(e.target.checked)} id="noballs" style={{ width: '1.2rem', height: '1.2rem' }} />
            </div>
        </div>

        <button className="btn btn-primary w-full p-4" onClick={handleStartMatch} style={{ fontSize: '1.1rem', fontWeight: '900', boxShadow: 'var(--shadow-glow)' }}>
            <Play size={18} fill="white" /> START MATCH
        </button>
      </div>

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
    </div>
  );
}
