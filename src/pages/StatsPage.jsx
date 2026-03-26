import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { BarChart3, Star, TrendingDown, ArrowLeft, ChevronDown, ScrollText, Users } from 'lucide-react';

export default function StatsPage() {
  const navigate = useNavigate();
  const { matches, players, activeSeriesId } = useAppStore();
  const [viewType, setViewType] = useState('match'); // match, series, overall
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  useEffect(() => {
      if (!selectedMatchId && matches.length > 0) {
          setSelectedMatchId(matches[matches.length - 1].id);
      }
  }, [matches, selectedMatchId]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || (matches.length > 0 ? matches[matches.length - 1] : null);
  
  const matchStatsToRender = useMemo(() => {
      if (!selectedMatch) return null;
      if (selectedMatch.stats) return selectedMatch.stats;
      try {
          return useAppStore.getState().calculateMatchStats(selectedMatch);
      } catch (e) {
          return { mvp: [], worst: [] }; // safe fallback
      }
  }, [selectedMatch]);

  const formatMatchLabel = (m) => {
    const teamA = m.teamNames?.teamA || 'Team A';
    const teamB = m.teamNames?.teamB || 'Team B';
    const d = new Date(m.startTime);
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
    return `${teamA} vs ${teamB} - ${dateStr}`;
  };

  const aggregatedStats = useMemo(() => {
     const statsMap = {};
     players.forEach(p => {
         statsMap[p.id] = { id: p.id, name: p.name, runs: 0, wickets: 0, matches: 0, points: 0 };
     });

     const targetMatches = viewType === 'series' 
        ? matches.filter(m => m.seriesId === activeSeriesId) 
        : matches;

     targetMatches.forEach(m => {
         const matchPlayers = new Set();
         m.innings.forEach(inn => {
             Object.entries(inn.battingState || {}).forEach(([pid, s]) => {
                 if (s.balls > 0 || s.status !== 'yet_to_bat') {
                     if (!statsMap[pid]) statsMap[pid] = { id: pid, name: 'Unknown', runs: 0, wickets: 0, matches: 0, points: 0 };
                     statsMap[pid].runs += s.runs;
                     statsMap[pid].points += s.runs;
                     matchPlayers.add(pid);
                 }
             });
             Object.entries(inn.bowlingState || {}).forEach(([pid, s]) => {
                 if (s.balls > 0) {
                     if (!statsMap[pid]) statsMap[pid] = { id: pid, name: 'Unknown', runs: 0, wickets: 0, matches: 0, points: 0 };
                     statsMap[pid].wickets += s.wickets;
                     statsMap[pid].points += (s.wickets * 20) - s.runsGiven;
                     matchPlayers.add(pid);
                 }
             });
         });
         matchPlayers.forEach(pid => { if (statsMap[pid]) statsMap[pid].matches += 1; });
     });

     return Object.values(statsMap)
        .filter(s => s.matches > 0)
        .sort((a, b) => b.points - a.points);
  }, [viewType, matches, players, activeSeriesId]);

  const renderMVPList = (list, title, isPositive = true) => {
    if (!list || list.length === 0) return null;
    return (
    <div className="card flex-col gap-3">
        <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {isPositive ? <Star size={16} color="#fbbf24" fill="#fbbf24" /> : <TrendingDown size={16} color="var(--danger)" />}
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{title}</h3>
        </div>
        <div className="flex-col gap-2">
            {list.map((p, idx) => {
                const playerName = p.name || players.find(pl => pl.id === p.id)?.name || 'Unknown';
                return (
                    <div key={p.id} className="flex justify-between items-center p-3" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
                        <div className="flex items-center gap-3">
                            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', width: '15px' }}>{idx + 1}</span>
                            <div className="flex-col">
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>{playerName}</span>
                                {viewType !== 'match' && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>{p.matches} MATCHES • {p.runs} R • {p.wickets} W</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '0.9rem', fontWeight: '900', color: isPositive ? 'var(--secondary)' : 'var(--danger)' }}>{p.points || p.totalPoints}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-muted)' }}>PTS</span>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
    );
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '120px', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
                <h2 style={{ fontSize: '1rem', fontWeight: '800' }}>RECORDS & STATS</h2>
            </div>
         </div>
      </header>

      <div className="container flex-col gap-4">
        
        {/* View Type Toggle */}
        <div className="flex gap-2 p-1" style={{ background: 'var(--surface-muted)', borderRadius: '12px' }}>
            {['match', 'series', 'overall'].map(type => (
                <button key={type} className="flex-1 btn btn-sm" 
                    style={{ background: viewType === type ? 'var(--surface)' : 'transparent', color: viewType === type ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: '800', fontSize: '10.5px' }}
                    onClick={() => setViewType(type)}>{type.toUpperCase()}</button>
            ))}
        </div>

        {viewType === 'match' && matches.length > 0 && (
            <div className="flex-col gap-4">
                <div className="card flex-col gap-3">
                    <label className="label">CHOOSE MATCH RECORD</label>
                    <div style={{ position: 'relative' }}>
                        <select 
                            className="input" 
                            style={{ paddingRight: '40px', fontWeight: '800', appearance: 'none', background: 'var(--surface-muted)' }}
                            value={selectedMatchId || ''}
                            onChange={(e) => setSelectedMatchId(e.target.value)}
                        >
                            {matches.map(m => (
                                <option key={m.id} value={m.id} style={{ color: 'black' }}>{formatMatchLabel(m)}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                    </div>

                    <button className="btn btn-primary w-full p-4" onClick={() => navigate(`/scorecard/${selectedMatch?.id}`)} style={{ borderRadius: '12px', marginTop: '4px' }}>
                        <ScrollText size={18} /> VIEW FULL SCOREBOARD
                    </button>
                </div>

                 {matchStatsToRender && matchStatsToRender.mvp && (
                    <>
                        {renderMVPList(matchStatsToRender.mvp, 'MATCH TOP 5', true)}
                        {renderMVPList(matchStatsToRender.worst, 'MATCH BOTTOM 5', false)}
                    </>
                )}
            </div>
        )}

        {viewType === 'match' && matches.length === 0 && (
            <div className="card text-center py-20 opacity-50" style={{ borderStyle: 'dashed' }}>
                <ScrollText size={32} style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: '800', fontSize: '0.8rem' }}>NO MATCHES COMPLETED</p>
            </div>
        )}

        {(viewType === 'series' || viewType === 'overall') && (
            <div className="flex-col gap-4">
                <div className="flex items-center gap-2 px-2">
                    <Users size={16} color="var(--primary)" />
                    <h3 style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {viewType === 'series' ? 'CURRENT SERIES LEADERS' : 'ALL-TIME CAREER RANKING'}
                    </h3>
                </div>
                
                {aggregatedStats.length > 0 ? (
                    <>
                        {renderMVPList(aggregatedStats.slice(0, 5), `TOP 5 (${viewType.toUpperCase()})`, true)}
                        {aggregatedStats.length > 5 && renderMVPList(aggregatedStats.slice(-5).reverse(), `BOTTOM 5 (${viewType.toUpperCase()})`, false)}
                    </>
                ) : (
                    <div className="card text-center py-10 opacity-50">
                        <p style={{ fontWeight: '800', fontSize: '0.8rem' }}>NO {viewType.toUpperCase()} DATA FOUND</p>
                    </div>
                )}
            </div>
        )}

        {matches.length === 0 && (
            <div className="text-center py-20 opacity-50">
                <p style={{ fontWeight: '800', color: 'var(--text-muted)' }}>No completed match data available.</p>
            </div>
        )}
      </div>
    </div>
  );
}
