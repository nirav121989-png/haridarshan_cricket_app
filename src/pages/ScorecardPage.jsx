import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, ScrollText, TableProperties, Trophy, Clock } from 'lucide-react';

export default function ScorecardPage() {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { activeMatch, matches, players } = useAppStore();
  
  // Find match either from active state or history
  const match = matchId ? matches.find(m => m.id === matchId) : activeMatch;
  const [selectedInning, setSelectedInning] = useState(0);

  if (!match) {
    return (
      <div className="container flex-col items-center justify-center pt-20" style={{ height: '100vh', background: 'var(--background)' }}>
        <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>No match record found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

  const { innings } = match;
  const inning = innings[selectedInning];
  const battingTeamKey = inning.team;
  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '-';

  const getWinnerNode = () => {
    if (!match.matchEnded && !matchId) return null;
    const teamA = match.teamNames?.teamA || 'Team A';
    const teamB = match.teamNames?.teamB || 'Team B';
    const r1 = innings[0].runs;
    const r2 = innings[1].runs;
    
    let resultText = "";
    if (r1 > r2) {
        const winner = innings[0].team === 'teamA' ? teamA : teamB;
        resultText = `${winner} won by ${r1 - r2} runs`;
    } else if (r2 > r1) {
        const winner = innings[1].team === 'teamA' ? teamA : teamB;
        resultText = `${winner} won by ${10 - innings[1].wickets} wickets`;
    } else {
        resultText = "Match Tied!";
    }

    return (
        <div className="card text-center py-4 mb-4" style={{ background: 'var(--secondary-glow)', borderColor: 'var(--secondary)' }}>
            <Trophy size={20} color="var(--secondary)" style={{ margin: '0 auto 8px' }} />
            <h2 style={{ margin: 0, color: 'var(--secondary)', fontSize: '1rem', fontWeight: '900' }}>{resultText.toUpperCase()}</h2>
        </div>
    );
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '110px', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
               <h2 style={{ fontSize: '0.9rem', fontWeight: '800' }}>{innings[selectedInning].team === 'teamA' ? (match.teamNames?.teamA || 'TEAM A') : (match.teamNames?.teamB || 'TEAM B')}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
               <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '900' }}>{inning.runs}/{inning.wickets}</h2>
               <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)' }}>({inning.balls} BALLS)</p>
            </div>
         </div>
      </header>

      <div className="container flex-col gap-4">
         
         {getWinnerNode()}

         <div className="flex gap-2 p-1" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
            <button className="flex-1 btn" 
                style={{ background: selectedInning === 0 ? 'var(--surface)' : 'transparent', color: selectedInning === 0 ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}
                onClick={() => setSelectedInning(0)}>1ST INN</button>
            <button className="flex-1 btn" 
                style={{ background: selectedInning === 1 ? 'var(--surface)' : 'transparent', color: selectedInning === 1 ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}
                onClick={() => setSelectedInning(1)}>2ND INN</button>
         </div>

         {/* Batting */}
         <div className="card" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span className="flex items-center gap-1" style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--primary)' }}><ScrollText size={14} /> BATTING</span>
            </div>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                   <th style={{ padding: '8px 0', textTransform: 'uppercase' }}>BATSMAN</th>
                   <th style={{ textAlign: 'center', width: '30px' }}>R</th>
                   <th style={{ textAlign: 'center', width: '30px' }}>B</th>
                   <th style={{ textAlign: 'center', width: '25px' }}>4s</th>
                   <th style={{ textAlign: 'center', width: '25px' }}>6s</th>
                   <th style={{ textAlign: 'right', width: '35px' }}>SR</th>
                 </tr>
               </thead>
               <tbody>
                 {Object.entries(inning.battingState || {}).map(([pid, stats]) => {
                    if (stats.status === 'yet_to_bat') return null;
                    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : 0;
                    return (
                       <tr key={pid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                         <td style={{ padding: '10px 0', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {getPlayerName(pid).toUpperCase()}
                                {stats.status === 'batting' && <span style={{ color: 'var(--primary)', fontWeight: '900' }}>*</span>}
                                {stats.status === 'retired' && <span style={{ color: 'var(--primary)', fontSize: '0.6rem' }}>(RTD)</span>}
                            </div>
                            {stats.status === 'out' && stats.howOut && (
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px', textTransform: 'lowercase' }}>
                                    {stats.howOut === 'bowled' && `b ${getPlayerName(stats.outBowlerId)}`}
                                    {stats.howOut === 'caught' && `c ${getPlayerName(stats.outFielderId)} b ${getPlayerName(stats.outBowlerId)}`}
                                    {stats.howOut === 'runout' && `run out (${getPlayerName(stats.outFielderId)})`}
                                    {stats.howOut === 'stumped' && `st ${getPlayerName(stats.outFielderId)} b ${getPlayerName(stats.outBowlerId)}`}
                                    {stats.howOut === 'retired_out' && `retired out`}
                                </div>
                            )}
                         </td>
                         <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)' }}>{stats.runs}</td>
                         <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{stats.balls}</td>
                         <td style={{ textAlign: 'center', color: 'var(--text-main)', fontSize: '0.7rem' }}>{stats.fours || 0}</td>
                         <td style={{ textAlign: 'center', color: 'var(--text-main)', fontSize: '0.7rem' }}>{stats.sixes || 0}</td>
                         <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{sr}</td>
                       </tr>
                    )
                 })}
               </tbody>
            </table>
         </div>

         {/* Bowling */}
         <div className="card" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span className="flex items-center gap-1" style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--secondary)' }}><TableProperties size={14} /> BOWLING</span>
            </div>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                   <th style={{ padding: '8px 0', textTransform: 'uppercase' }}>BOWLER</th>
                   <th style={{ textAlign: 'center', width: '30px' }}>B</th>
                   <th style={{ textAlign: 'center', width: '30px' }}>R</th>
                   <th style={{ textAlign: 'right', width: '30px' }}>W</th>
                 </tr>
               </thead>
               <tbody>
                 {Object.entries(inning.bowlingState || {}).map(([pid, stats]) => {
                    if (stats.balls === 0 && stats.runsGiven === 0) return null;
                    return (
                       <tr key={pid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                         <td style={{ padding: '10px 0', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{getPlayerName(pid).toUpperCase()}</td>
                         <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{stats.balls}</td>
                         <td style={{ textAlign: 'center', color: 'var(--text-main)' }}>{stats.runsGiven}</td>
                         <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--secondary)' }}>{stats.wickets}</td>
                       </tr>
                    )
                 })}
               </tbody>
            </table>
         </div>

         {/* Spells History */}
         <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <Clock size={14} color="var(--text-muted)" />
                <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SPELL LOG</h3>
            </div>
            <div className="flex-col gap-2">
               {inning.spells && inning.spells.length > 0 ? inning.spells.map((spell, idx) => {
                   const sRuns = spell.runsAtEnd - spell.runsAtStart;
                   const sWkts = spell.wicketsAtEnd - spell.wicketsAtStart;
                   const sBalls = spell.ballsAtEnd - spell.ballsAtStart;
                   return (
                       <div key={spell.id || idx} className="flex justify-between items-center" style={{ padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                           <div style={{ flex: 1 }}>
                               <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-main)' }}>SPELL {idx + 1}</strong>
                               <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                                   {getPlayerName(spell.bowler1Id)} & {getPlayerName(spell.bowler2Id)}
                               </span>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                               <strong style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: '900' }}>{sRuns}/{sWkts}</strong>
                               <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800' }}>{sBalls} BALLS</p>
                           </div>
                       </div>
                   );
               }) : (
                 <div className="text-center py-6 opacity-40">
                    <p style={{ fontSize: '0.7rem', fontWeight: '700' }}>NO SPELLS RECORDED</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
