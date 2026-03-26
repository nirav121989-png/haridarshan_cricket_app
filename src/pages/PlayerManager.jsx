import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, UserPlus, Trash2, Camera, User, Edit2, Check, X } from 'lucide-react';

export default function PlayerManager() {
  const navigate = useNavigate();
  const { players, addPlayer, updatePlayer } = useAppStore();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPic, setNewPlayerPic] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPic, setEditPic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const resizeImage = (base64Str, maxWidth = 100, maxHeight = 100) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compressed JPEG
      };
    });
  };

  const handlePicUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result, 80, 80); // Very small as requested
        if (isEdit) setEditPic(resized);
        else setNewPlayerPic(resized);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePlayer = () => {
    if (!newPlayerName.trim()) return;
    addPlayer({ name: newPlayerName.trim(), image: newPlayerPic });
    setNewPlayerName('');
    setNewPlayerPic(null);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPic(p.image);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEdit = () => {
    updatePlayer(editingId, { name: editName, image: editPic });
    setEditingId(null);
  };

  return (
    <div className="flex-col" style={{ height: '100dvh', overflow: 'hidden', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex items-center gap-3">
            <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1rem' }}>PLAYERS ({players.length})</h2>
         </div>
      </header>

        {/* Fixed Add/Edit & Search Section */}
      <div className="container flex-col gap-4" style={{ flexShrink: 0, paddingTop: '16px', paddingBottom: '8px' }}>
        {/* Add Player Card */}
        {!editingId && (
            <div className="card flex-col gap-4" style={{ background: 'var(--surface-muted)', borderStyle: 'dashed' }}>
                <label className="label">CREATE NEW PLAYER PROFILE</label>
                <div className="flex items-center gap-4">
                    <div onClick={() => fileInputRef.current.click()} style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface)', cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        {newPlayerPic ? <img src={newPlayerPic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={24} color="var(--text-muted)" />}
                        <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={(e) => handlePicUpload(e, false)} style={{ display: 'none' }} />
                    </div>
                    <div className="flex-1 flex-col gap-2">
                        <input className="input" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="ENTER PLAYER NAME" style={{ background: 'var(--surface)', fontWeight: '800' }} />
                        <button className="btn btn-primary w-full" onClick={handleCreatePlayer} style={{ fontWeight: '800' }}>
                            <UserPlus size={16} /> ADD PLAYER
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal / Section */}
        {editingId && (
            <div className="card flex-col gap-4" style={{ background: 'var(--primary-glow)', border: '2px solid var(--primary)' }}>
                <div className="flex justify-between items-center">
                    <label className="label" style={{ color: 'var(--primary)' }}>EDITING PROFILE</label>
                    <button className="btn btn-surface btn-sm" onClick={() => setEditingId(null)}><X size={14} /></button>
                </div>
                <div className="flex items-center gap-4">
                    <div onClick={() => editFileInputRef.current.click()} style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface)', cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        {editPic ? <img src={editPic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={24} color="var(--primary)" />}
                        <input ref={editFileInputRef} type="file" accept="image/*" capture="user" onChange={(e) => handlePicUpload(e, true)} style={{ display: 'none' }} />
                    </div>
                    <div className="flex-1 flex-col gap-2">
                        <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ background: 'var(--surface)', fontWeight: '800', border: '1px solid var(--primary)' }} />
                        <button className="btn btn-primary w-full" onClick={saveEdit} style={{ fontWeight: '800' }}>
                            <Check size={16} /> SAVE CHANGES
                        </button>
                    </div>
                </div>
            </div>
        )}

        <input 
            className="input w-full" 
            placeholder="Search by player name..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'var(--surface-muted)', borderRadius: '12px', fontSize: '0.9rem', padding: '12px 16px', border: '1px solid var(--border-color)', marginTop: '8px' }} 
        />
      </div>

      {/* Scrollable Player List Section */}
      <div className="container flex-col gap-3" style={{ flex: 1, overflowY: 'auto', paddingBottom: '120px' }}>
          {players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                <div key={p.id} className="card flex justify-between items-center" style={{ padding: '10px 12px', opacity: editingId === p.id ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3">
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-muted)" />}
                        </div>
                        <div className="flex-col">
                            <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-main)' }}>{p.name.toUpperCase()}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>{p.career?.runs || 0} RUNS • {p.career?.wickets || 0} W</span>
                        </div>
                    </div>
                    <button className="btn btn-surface btn-sm" style={{ padding: '8px' }} onClick={() => startEdit(p)}>
                        <Edit2 size={14} color="var(--primary)" />
                    </button>
                </div>
            ))}

            {players.length === 0 && (
                <div className="text-center py-20 opacity-40">
                    <User size={48} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: '800', fontSize: '0.8rem' }}>YOUR ROSTER IS EMPTY</p>
                </div>
            )}
      </div>
    </div>
  );
}
