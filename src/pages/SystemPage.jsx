import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ArrowLeft, Trash2, Download, Upload, ShieldAlert, FileJson, Database, Save, HardDrive, RefreshCw, TrendingDown } from 'lucide-react';

export default function SystemPage() {
  const navigate = useNavigate();
  const { resetAllData, importFullState, players, matches, weeklyTeams, activeSeriesId } = useAppStore();
  const [password, setPassword] = useState('');
  const [resumePassword, setResumePassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const fileInputRef = React.useRef(null);

  const lastMatchToday = useMemo(() => {
    const today = new Date().toDateString();
    return [...matches].reverse().find(m => m.finishedAt && new Date(m.finishedAt).toDateString() === today);
  }, [matches]);

  const dbSize = useMemo(() => {
    try {
        const state = useAppStore.getState();
        const str = JSON.stringify(state);
        const bytes = str.length;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch (e) {
        return "Unknown";
    }
  }, [players, matches, weeklyTeams, activeSeriesId]);

  const handleExport = () => {
    const dataStr = JSON.stringify(useAppStore.getState());
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `haridarshan_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportStatus('Reading file data...');

    const reader = new FileReader();
    reader.onerror = () => setImportStatus('❌ ERROR: Disk read failed.');
    reader.onload = (e) => {
      try {
        setImportStatus('Processing database...');
        const json = JSON.parse(e.target.result);
        
        // Some backup systems wrap the state in a "state" key
        const finalState = json.state ? json.state : json;
        
        const success = importFullState(finalState);
        if (success) {
            setImportStatus('✅ SUCCESS: Database Fully Restored! Redirecting...');
            setTimeout(() => navigate('/'), 1500);
        } else {
            setImportStatus('❌ FORMAT ERROR: Backup file is missing critical player data.');
        }
      } catch (err) {
        setImportStatus('❌ CORRUPT FILE: Failed to process backup. ' + err.message);
      } finally {
        // Reset the file input so they can upload the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (password === 'server') {
        setConfirmAction({ 
          msg: "PERMANENTLY DELETE ALL DATA? This cannot be undone.", 
          act: () => {
            resetAllData();
            setImportStatus('✅ System Database Reset Successfully.');
            setIsResetting(false);
            setTimeout(() => navigate('/'), 2000);
          } 
        });
    } else {
        setImportStatus('❌ Incorrect password entered.');
    }
  };

  return (
    <div className="flex-col" style={{ minHeight: '100vh', paddingBottom: '100px', background: 'var(--background)' }}>
      <header className="header-sticky glass">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button className="btn btn-surface btn-sm" style={{ padding: '6px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>DATA & STORAGE</h2>
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--primary)' }}>
                <Database size={10} /> {dbSize}
            </div>
         </div>
      </header>

      <div className="container flex-col gap-6">
        
        {/* Permanent File Export Section */}
        <div className="card flex-col gap-4" style={{ background: 'var(--primary-glow)', border: '2px solid var(--primary)' }}>
            <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--primary)' }}>
                <HardDrive size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: 'var(--primary)' }}>SAVE TO PERMANENT FILE</h3>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '700' }}>
               Download your entire match database to your device's folder. This file remains safe even if browser data is cleared.
            </p>

            <button className="btn btn-primary w-full p-4 flex gap-2 justify-center" onClick={handleExport} style={{ borderRadius: '12px', fontSize: '1rem', boxShadow: '0 4px 15px var(--primary-glow)' }}>
                <Save size={20} /> DOWNLOAD BACKUP FILE
            </button>
            
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Recommend saving this file to iCloud or Google Drive after each match.
            </p>
        </div>

        {/* Restore Section */}
        <div className="card flex-col gap-4">
            <div className="flex items-center gap-2 mb-1 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <FileJson size={18} color="var(--text-muted)" />
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800' }}>RESTORE FROM FILE</h3>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Select a previously saved .json backup file to reload all your data.</p>
            
            {importStatus && (
                <div style={{ background: 'var(--surface-muted)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--primary)', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', color: importStatus.includes('ERROR') || importStatus.includes('CORRUPT') ? 'var(--danger)' : 'var(--primary)' }}>
                    {importStatus}
                </div>
            )}

            <button className="btn btn-surface w-full p-3 flex gap-2 justify-center" onClick={() => fileInputRef.current.click()} style={{ borderRadius: '10px', height: 'auto', cursor: 'pointer', fontWeight: '800' }}>
               <Upload size={18} /> UPLOAD BACKUP
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>

        {/* Sync Stats Section */}
        <div className="card flex-col gap-4" style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
            <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--primary)' }}>
                <TrendingDown size={18} color="var(--primary)" style={{ transform: 'rotate(180deg)' }} />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)' }}>RE-CALCULATE ALL MATCHES</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '700' }}>
               Apply new point rules (Catches, Stumpings, Run Outs, 4s/6s Bonuses) to all previously played matches.
            </p>
            <button className="btn btn-primary w-full p-4" onClick={() => {
                useAppStore.getState().recalculateAllMatchStats();
                setImportStatus('✅ All match points recalculated successfully!');
            }}>
                REFRESH & SYNC ALL STATS
            </button>
        </div>

        <div style={{ height: '24px' }}></div>
        {lastMatchToday && (
            <div className="card flex-col gap-4" style={{ borderColor: 'var(--secondary)', background: 'var(--secondary-glow)' }}>
                <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--secondary)' }}>
                    <RefreshCw size={18} color="var(--secondary)" />
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--secondary)' }}>RESUME LAST MATCH</h3>
                </div>
                {!isResuming ? (
                    <button className="btn btn-secondary w-full p-4" onClick={() => setIsResuming(true)} style={{ borderRadius: '12px' }}>
                       RESUME LAST MATCH (TODAY)
                    </button>
                ) : (
                    <div className="flex-col gap-3">
                        <label className="label" style={{ color: 'var(--secondary)' }}>ENTER ADMIN PASSWORD</label>
                        <input 
                            className="input" 
                            type="password" 
                            placeholder="••••••" 
                            style={{ background: 'var(--surface)', borderColor: 'var(--secondary)' }}
                            value={resumePassword}
                            onChange={(e) => setResumePassword(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button className="btn btn-secondary flex-1" style={{ fontWeight: '800' }} onClick={() => {
                                if (resumePassword === 'server') {
                                    useAppStore.getState().resumePreviousMatch(lastMatchToday.id);
                                    setImportStatus('✅ Match Resumed. Redirecting...');
                                    setTimeout(() => navigate('/score'), 1000);
                                } else {
                                    setImportStatus('❌ Incorrect password.');
                                }
                            }}>RESUME</button>
                            <button className="btn btn-surface flex-1" onClick={() => setIsResuming(false)}>CANCEL</button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Danger Zone */}
        <div className="card flex-col gap-4" style={{ borderColor: 'var(--danger)', background: 'var(--danger-glow)' }}>
            <div className="flex items-center gap-2 mb-1 pb-1" style={{ borderBottom: '1px solid var(--danger)' }}>
                <ShieldAlert size={18} color="var(--danger)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--danger)' }}>SYSTEM RESET</h3>
            </div>

            {!isResetting ? (
                <button className="btn btn-danger w-full p-4" onClick={() => setIsResetting(true)} style={{ borderRadius: '12px' }}>
                   <Trash2 size={18} /> CLEAR ALL LOCAL DATA
                </button>
            ) : (
                <div className="flex-col gap-3">
                    <label className="label" style={{ color: 'var(--danger)' }}>ENTER ADMIN PASSWORD</label>
                    <input 
                        className="input" 
                        type="password" 
                        placeholder="••••••" 
                        style={{ background: 'var(--surface)', borderColor: 'var(--danger)' }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button className="btn btn-danger flex-1" onClick={handleReset} style={{ fontWeight: '800' }}>DELETE</button>
                        <button className="btn btn-surface flex-1" onClick={() => setIsResetting(false)}>CANCEL</button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* CUSTOM CONFIRM MODAL */}
       {confirmAction && (
           <div className="glass flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
               <div className="card w-full text-center flex-col gap-5 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                   <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.4 }}>{confirmAction.msg}</h3>
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
