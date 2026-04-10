import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, UserPlus, Trash2, Shield, User, Search, Save, Hammer, Check, X } from 'lucide-react';

export default function TeamManager() {
  const navigate = useNavigate();
  const { players, weeklyTeams, activeSeriesId, updateWeeklyTeams, startSeries, addPlayer } = useAppStore();
  
  const [editingTeams, setEditingTeams] = useState(weeklyTeams || { 
    teamA: { name: 'Team A', playerIds: [], captainId: null }, 
    teamB: { name: 'Team B', playerIds: [], captainId: null } 
  });
  
  const [search, setSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm }

  const availablePlayers = players.filter(p => 
    !editingTeams.teamA.playerIds.includes(p.id) && 
    !editingTeams.teamB.playerIds.includes(p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const triggerAdd = (teamKey, player) => {
    setConfirmState({
        message: `Add ${player.name.toUpperCase()} to ${editingTeams[teamKey].name.toUpperCase()}?`,
        onConfirm: () => {
            const updated = { ...editingTeams };
            updated[teamKey].playerIds = [...updated[teamKey].playerIds, player.id];
            setEditingTeams(updated);
            setConfirmState(null);
        }
    });
  };

  const triggerRemove = (teamKey, playerId) => {
    const player = players.find(p => p.id === playerId);
    setConfirmState({
        message: `Remove ${player?.name.toUpperCase()} from ${editingTeams[teamKey].name.toUpperCase()}?`,
        onConfirm: () => {
            const updated = { ...editingTeams };
            updated[teamKey].playerIds = updated[teamKey].playerIds.filter(id => id !== playerId);
            if (updated[teamKey].captainId === playerId) updated[teamKey].captainId = null;
            setEditingTeams(updated);
            setConfirmState(null);
        }
    });
  };

  const updateTeamName = (teamKey, name) => {
    const updated = { ...editingTeams };
    updated[teamKey].name = name;
    setEditingTeams(updated);
  };

  const setCaptain = (teamKey, playerId) => {
    const updated = { ...editingTeams };
    updated[teamKey].captainId = playerId;
    setEditingTeams(updated);
  };

  const createQuickPlayer = async () => {
    if (!newPlayerName.trim()) return;
    addPlayer({ name: newPlayerName.trim() });
    setNewPlayerName('');
  };

  const finalize = () => {
    if (editingTeams.teamA.playerIds.length === 0 || editingTeams.teamB.playerIds.length === 0) {
        alert("Each team needs players!"); return;
    }
    if (activeSeriesId) {
        updateWeeklyTeams(editingTeams);
        navigate('/');
    } else {
        startSeries(editingTeams);
        navigate('/');
    }
  };

  const getPlayerPic = (id) => players.find(p => p.id === id)?.image;

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '100px', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
               <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>SQUAD BUILDER</h2>
            </div>
            <button className="btn btn-primary btn-sm" onClick={finalize} style={{ fontWeight: '800' }}>
               <Save size={14} /> {activeSeriesId ? 'SAVE' : 'START'}
            </button>
         </div>
      </header>

      <div className="container flex-col gap-4">
          {/* Quick Add Form */}
          <div className="card" style={{ padding: '12px', borderStyle: 'dashed', background: 'var(--background)' }}>
              <label className="label">QUICK ADD PLAYER</label>
              <div className="flex gap-2">
                  <input className="input" style={{ padding: '8px', fontSize: '12px' }} value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Player Name" />
                  <button className="btn btn-primary" onClick={createQuickPlayer} style={{ padding: '8px 12px' }}><UserPlus size={16} /></button>
              </div>
          </div>

          {/* Teams Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
             {['teamA', 'teamB'].map(t => (
                 <div key={t} className="card flex-col gap-2" style={{ padding: '10px', minHeight: '300px', background: 'var(--surface)' }}>
                    <div className="flex items-center gap-1 mb-1" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                         <Shield size={12} color={t === 'teamA' ? 'var(--primary)' : 'var(--secondary)'} />
                         <input 
                            value={editingTeams[t].name} 
                            onChange={(e) => updateTeamName(t, e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontWeight: '900', fontSize: '0.7rem', width: '100%', textTransform: 'uppercase', outline: 'none', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="flex-col gap-1" style={{ flex: 1, overflowY: 'auto', maxHeight: '250px' }}>
                        {editingTeams[t].playerIds.map(pid => {
                            const pObj = players.find(p => p.id === pid);
                            const pic = pObj?.image;
                            return (
                            <div key={pid} className="flex justify-between items-center" style={{ padding: '6px 8px', backgroundColor: 'var(--surface-muted)', borderRadius: '6px' }}>
                                <div className="flex items-center gap-2" style={{ overflow: 'hidden', flex: 1 }}>
                                    {pic ? <img src={pic} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} /> : <User size={12} color="var(--text-muted)" />}
                                    <span style={{ fontWeight: '700', fontSize: '0.65rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-main)', maxWidth: '60px' }}>
                                        {pObj?.name.toUpperCase() || 'PLAYER'}
                                    </span>
                                </div>
                                <div className="flex gap-1" style={{ flexShrink: 0 }}>
                                    <button className="btn btn-surface" style={{ padding: '2px', minHeight: '18px', background: editingTeams[t].captainId === pid ? 'var(--primary-glow)' : 'transparent' }} onClick={() => setCaptain(t, pid)}>
                                        <Hammer size={10} color={editingTeams[t].captainId === pid ? 'var(--primary)' : 'var(--text-muted)'} />
                                    </button>
                                    <button className="btn btn-surface" style={{ padding: '2px', minHeight: '18px' }} onClick={() => triggerRemove(t, pid)}>
                                        <Trash2 size={10} color="var(--danger)" />
                                    </button>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                 </div>
             ))}
          </div>

          {/* Player Bank */}
          <div className="flex-col gap-2">
             <div className="flex items-center gap-2 px-3 py-1" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-muted)' }}>
                <Search size={14} color="var(--text-muted)" />
                <input className="input" style={{ border: 'none', background: 'transparent', padding: '6px', fontSize: '13px' }} placeholder="Search roster..." value={search} onChange={(e) => setSearch(e.target.value)} />
             </div>

             <div className="flex-col gap-2">
                {availablePlayers.length > 0 ? availablePlayers.map(p => (
                    <div key={p.id} className="card flex justify-between items-center" style={{ padding: '8px 12px' }}>
                        <div className="flex items-center gap-2">
                            {p.image ? (
                                <img src={p.image} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14} color="var(--text-muted)" /></div>}
                            <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--text-main)' }}>{p.name.toUpperCase()}</span>
                        </div>
                        <div className="flex gap-1">
                            <button className="btn btn-xs btn-surface" style={{ fontSize: '8px', fontWeight: '900', padding: '4px 8px' }} onClick={() => triggerAdd('teamA', p)}>
                                + {editingTeams.teamA.name.toUpperCase()}
                            </button>
                            <button className="btn btn-xs btn-surface" style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)', fontSize: '8px', fontWeight: '900', padding: '4px 8px' }} onClick={() => triggerAdd('teamB', p)}>
                                + {editingTeams.teamB.name.toUpperCase()}
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center p-6 opacity-50">
                        <p style={{ fontSize: '0.7rem', fontWeight: '700' }}>NO AVAILABLE PLAYERS</p>
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
          <div className="glass flex items-center justify-center p-4" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
              <div className="card w-full flex-col gap-6 p-6 animate-scale-in" style={{ maxWidth: '320px' }}>
                  <p style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.9rem' }}>{confirmState.message}</p>
                  <div className="flex gap-3">
                      <button className="btn btn-surface flex-1 p-3" onClick={() => setConfirmState(null)}>
                          <X size={18} /> NO
                      </button>
                      <button className="btn btn-primary flex-1 p-3" onClick={confirmState.onConfirm}>
                          <Check size={18} /> YES
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
