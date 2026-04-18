import React, { useState, useEffect } from 'react';
import { FileText, LogOut, Clock, Activity, FileKey, CheckSquare, Search, Trash2, UserPlus, Cpu, Zap, Database } from 'lucide-react';
import { 
    login, 
    registerUser,
    fetchDocuments, 
    fetchDocument, 
    createDocument,
    updateDocument, 
    deleteDocument,
    rollbackDocument,
    compareVersions,
    shareDocument,
    unshareDocument,
    fetchDocumentAccess,
    fetchUsers
} from './api';

const App = () => {
    const [view, setView] = useState('LOGIN'); // LOGIN, DASHBOARD, DOC, CREATE_DOC, REGISTER
    const [docs, setDocs] = useState([]);
    const [activeDoc, setActiveDoc] = useState(null);
    const [authError, setAuthError] = useState('');

    // Share panel state
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [accessList, setAccessList] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [shareUsername, setShareUsername] = useState('');
    const [shareRole, setShareRole] = useState('VIEWER');
    const [shareError, setShareError] = useState('');
    const [shareSuccess, setShareSuccess] = useState('');
    
    // Auth inputs
    const [username, setUsername] = useState('renderAdmin');
    const [password, setPassword] = useState('123');
    const [role, setRole] = useState('VIEWER'); // for register

    // Editor inputs
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editNotes, setEditNotes] = useState('');

    useEffect(() => {
        if(localStorage.getItem('access_token')) {
            loadDashboard();
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            loadDashboard();
        } catch (err) {
            setAuthError('Login Failed: Invalid Username or Password.');
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await registerUser(username, password, role);
            alert("Account created successfully! Please sign in with your new credentials.");
            setView('LOGIN');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Registration failed.');
        }
    }

    const loadDashboard = async () => {
        try {
            const data = await fetchDocuments();
            setDocs(data.results || data);
            setView('DASHBOARD');
        } catch (err) {
            setView('LOGIN');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        setView('LOGIN');
    };

    const openDocument = async (id) => {
        const doc = await fetchDocument(id);
        setActiveDoc(doc);
        setEditContent(doc.versions && doc.versions.length > 0 ? doc.versions[0].content : '');
        setView('DOC');
    };

    const saveDocument = async () => {
        try {
            if (view === 'CREATE_DOC') {
                const doc = await createDocument(editTitle, editContent, editNotes || 'Initial creation');
                setEditNotes('');
                openDocument(doc.id);
            } else {
                await updateDocument(activeDoc.id, activeDoc.title, editContent, editNotes);
                setEditNotes('');
                openDocument(activeDoc.id);
            }
        } catch(err) {
            alert("Save Failed. You might only have Viewer access. You need Editor or Admin permissions to modify documents.");
        }
    }

    const requestRollback = async (versionId) => {
        if(window.confirm("Are you sure you want to restore the document to this version?")) {
            try {
                await rollbackDocument(activeDoc.id, versionId);
                openDocument(activeDoc.id);
            } catch(err) {
                alert("Rollback Failed. You do not have permission for this operation.");
            }
        }
    }

    const requestDelete = async () => {
        if(window.confirm("Are you sure you want to permanently delete this document?")) {
            try {
                await deleteDocument(activeDoc.id);
                loadDashboard();
            } catch(err) {
                alert("Delete Failed. You do not have permission to delete this document.");
            }
        }
    }

    const testDiff = async (v1, v2) => {
        const diffText = await compareVersions(activeDoc.id, v1, v2);
        alert(diffText || "These versions are identical.");
    }

    const openSharePanel = async () => {
        setShareError('');
        setShareSuccess('');
        setShareUsername('');
        setUserSearch('');
        try {
            const [list, users] = await Promise.all([
                fetchDocumentAccess(activeDoc.id),
                fetchUsers()
            ]);
            setAccessList(list);
            setAllUsers(users);
        } catch {
            setAccessList([]);
            setAllUsers([]);
        }
        setShowSharePanel(true);
    };

    const handleShare = async (e) => {
        e.preventDefault();
        setShareError('');
        setShareSuccess('');
        if (!shareUsername) {
            setShareError('Please select a user first.');
            return;
        }
        try {
            const res = await shareDocument(activeDoc.id, shareUsername, shareRole);
            setShareSuccess(res.status);
            setShareUsername('');
            setUserSearch('');
            const list = await fetchDocumentAccess(activeDoc.id);
            setAccessList(list);
        } catch (err) {
            setShareError(err.response?.data?.error || 'Failed to share document.');
        }
    };

    const handleUnshare = async (username) => {
        if (!window.confirm(`Revoke access for ${username}?`)) return;
        try {
            await unshareDocument(activeDoc.id, username);
            const list = await fetchDocumentAccess(activeDoc.id);
            setAccessList(list);
            setShareError('');
        } catch (err) {
            setShareError(err.response?.data?.error || 'Failed to revoke access.');
        }
    };

    if (view === 'LOGIN') {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {/* Decorative Background */}
                <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(0,240,255,0.05)', filter: 'blur(50px)' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(138,43,226,0.05)', filter: 'blur(70px)' }}></div>
                
                <form onSubmit={handleLogin} className="glass-panel fade-in" style={{ padding: '4rem', width: '450px', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
                            <div className="ai-core-icon" style={{ padding: '20px', background: 'rgba(0, 240, 255, 0.1)', boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)' }}>
                                <Cpu size={50} color="var(--accent-cyan)" />
                            </div>
                        </div>
                        <h2>WELCOME BACK</h2>
                        <p style={{color: 'var(--accent-cyan)', marginTop: '0.5rem', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase'}}>Dynamic Documentation System</p>
                    </div>

                    {authError && <div style={{background: 'rgba(255, 23, 68, 0.15)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid rgba(255, 23, 68, 0.3)'}}>{authError}</div>}

                    <div className="form-group">
                        <label><LogOut size={14} style={{display: 'inline', marginRight: '5px'}}/> Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter your username..." />
                    </div>
                    <div className="form-group">
                        <label><FileKey size={14} style={{display: 'inline', marginRight: '5px'}}/> Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '55px'}}>
                       <Zap size={18}/> SIGN IN
                    </button>
                    <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
                        <button type="button" onClick={() => { setView('REGISTER'); setAuthError(''); }} style={{color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'none', transition: 'color 0.3s'}} onMouseOver={(e)=>e.target.style.color='var(--accent-cyan)'} onMouseOut={(e)=>e.target.style.color='var(--text-secondary)'}>Create a new account →</button>
                    </div>
                </form>
            </div>
        );
    }

     if (view === 'REGISTER') {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <form onSubmit={handleRegister} className="glass-panel fade-in" style={{ padding: '4rem', width: '450px', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
                            <div className="ai-core-icon" style={{ padding: '20px', background: 'rgba(138, 43, 226, 0.1)', boxShadow: '0 0 20px rgba(138, 43, 226, 0.4)' }}>
                                <UserPlus size={50} color="var(--accent-purple)" />
                            </div>
                        </div>
                        <h2>CREATE ACCOUNT</h2>
                        <p style={{color: 'var(--accent-purple)', marginTop: '0.5rem', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase'}}>Join the Workspace</p>
                    </div>

                    {authError && <div style={{background: 'rgba(255, 23, 68, 0.15)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid rgba(255, 23, 68, 0.3)'}}>{authError}</div>}

                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Account Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)}>
                            <option value="VIEWER">Viewer (Read-Only Access)</option>
                            <option value="EDITOR">Editor (Can Create & Edit)</option>
                            <option value="ADMIN">Admin (Full Control)</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '55px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))'}}>
                       <UserPlus size={18}/> SIGN UP
                    </button>
                    <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
                        <button type="button" onClick={() => { setView('LOGIN'); setAuthError(''); }} style={{color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'none'}} onMouseOver={(e)=>e.target.style.color='var(--accent-purple)'} onMouseOut={(e)=>e.target.style.color='var(--text-secondary)'}>← Return to Login</button>
                    </div>
                </form>
            </div>
        );
    }

    if (view === 'DASHBOARD') {
        return (
            <div className="fade-in" style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
                <header className="glass-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div style={{ padding: '8px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                            <Database size={24} color="var(--accent-cyan)" />
                        </div>
                        <div>
                            <h2 style={{fontSize: '1.4rem'}}>Documents</h2>
                            <span style={{fontSize: '0.7rem', color: 'var(--accent-cyan)', letterSpacing: '1px'}}>DASHBOARD</span>
                        </div>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <button className="btn-primary" onClick={() => {
                            setEditTitle('');
                            setEditContent('');
                            setEditNotes('');
                            setView('CREATE_DOC');
                        }} style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FileText size={16}/> New Document</button>
                        <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '8px'}} onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </header>

                <div style={{ padding: '3rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
                        {docs.map((doc, idx) => (
                            <div key={doc.id} className="glass-panel" style={{ padding: '2rem', cursor: 'pointer', animationDelay: `${idx * 0.1}s` }} 
                                onClick={() => openDocument(doc.id)}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                                    <div style={{ padding: '10px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '10px', border: '1px solid rgba(138, 43, 226, 0.2)' }}>
                                        <Activity size={24} color="var(--accent-purple)"/>
                                    </div>
                                    <span style={{fontSize: '0.7rem', color: 'var(--accent-cyan)', padding: '4px 10px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '20px', letterSpacing: '1px'}}>DOC-{doc.id.substring(0,4)}</span>
                                </div>
                                <h3 style={{fontSize: '1.4rem', marginBottom: '0.5rem', color: '#fff'}}>{doc.title}</h3>
                                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
                                    Owner: <span style={{color: 'var(--accent-cyan)'}}>{doc.owner_name}</span>
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                    <span style={{display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-purple)'}}><Clock size={14}/> Versions: {doc.versions ? doc.versions.length : 0}</span>
                                    <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        
                        {docs.length === 0 && (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>
                                <Search size={48} style={{opacity: 0.2, marginBottom: '1rem'}}/>
                                <h3>No Documents Found</h3>
                                <p>Click on New Document to create one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'DOC' && activeDoc) {
        return (
             <div className="fade-in" style={{ display: 'flex', height: '100vh', flexDirection: 'column', overflow: 'hidden' }}>
                 <header className="glass-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                        <button className="btn-secondary" onClick={() => loadDashboard()} style={{padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '6px'}}>← Back to Dashboard</button>
                        <div>
                            <h2 style={{fontSize: '1.3rem'}}>{activeDoc.title}</h2>
                            <span style={{fontSize: '0.7rem', color: 'var(--accent-purple)', letterSpacing: '1px'}}>ID: {activeDoc.id}</span>
                        </div>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', borderColor: 'rgba(0,240,255,0.3)', background: 'rgba(0,240,255,0.05)'}} onClick={openSharePanel}>
                            <UserPlus size={16} /> Share
                        </button>
                        <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', borderColor: 'rgba(255, 23, 68, 0.3)', background: 'rgba(255, 23, 68, 0.05)'}} onClick={requestDelete}>
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </header>

                {/* Share Panel Modal */}
                {showSharePanel && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="glass-panel" style={{ width: '500px', padding: '2.5rem', borderRadius: '20px', border: '1px solid rgba(0,240,255,0.2)' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <UserPlus size={20} /> Share Document
                                </h3>
                                <button onClick={() => { setShowSharePanel(false); setShareUsername(''); setUserSearch(''); }} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>✕</button>
                            </div>

                            {/* User search + role + share button */}
                            <form onSubmit={handleShare}>
                                <div style={{ position: 'relative', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Search users by username..."
                                        value={userSearch}
                                        onChange={e => { setUserSearch(e.target.value); setShareUsername(''); setShareSuccess(''); }}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,240,255,0.2)', boxSizing: 'border-box' }}
                                    />
                                    {/* Dropdown list */}
                                    {userSearch.trim() !== '' && (() => {
                                        const alreadyShared = accessList.map(a => a.username);
                                        const filtered = allUsers.filter(u =>
                                            u.username.toLowerCase().includes(userSearch.toLowerCase()) &&
                                            !alreadyShared.includes(u.username)
                                        );
                                        return filtered.length > 0 ? (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1526', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', zIndex: 200, maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                                                {filtered.map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => { setShareUsername(u.username); setUserSearch(u.username); }}
                                                        style={{ padding: '10px 14px', cursor: 'pointer', color: shareUsername === u.username ? 'var(--accent-cyan)' : '#fff', background: shareUsername === u.username ? 'rgba(0,240,255,0.08)' : 'transparent', fontSize: '0.9rem' }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,240,255,0.08)'}
                                                        onMouseOut={e => e.currentTarget.style.background = shareUsername === u.username ? 'rgba(0,240,255,0.08)' : 'transparent'}
                                                    >
                                                        {u.username}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1526', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '8px', zIndex: 200, padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                                No users found.
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Selected user badge */}
                                {shareUsername && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 12px', background: 'rgba(0,240,255,0.07)', borderRadius: '8px', border: '1px solid rgba(0,240,255,0.2)' }}>
                                        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>Selected: <strong>{shareUsername}</strong></span>
                                        <button type="button" onClick={() => { setShareUsername(''); setUserSearch(''); }} style={{ background: 'none', color: 'var(--text-secondary)', marginLeft: 'auto', fontSize: '0.85rem' }}>✕</button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                                    <select value={shareRole} onChange={e => setShareRole(e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '8px', padding: '10px' }}>
                                        <option value="VIEWER">Viewer — can read only</option>
                                        <option value="EDITOR">Editor — can edit & save versions</option>
                                    </select>
                                    <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem', height: 'auto', opacity: shareUsername ? 1 : 0.4 }}>
                                        Grant Access
                                    </button>
                                </div>
                            </form>

                            {shareError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.8rem', padding: '8px', background: 'rgba(255,23,68,0.1)', borderRadius: '6px' }}>{shareError}</div>}
                            {shareSuccess && <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', marginBottom: '0.8rem', padding: '8px', background: 'rgba(0,240,255,0.1)', borderRadius: '6px' }}>{shareSuccess}</div>}

                            {/* People with access */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                                    People with access {accessList.length > 0 && <span style={{ color: 'var(--accent-cyan)' }}>({accessList.length})</span>}
                                </p>
                                {accessList.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>Not shared with anyone yet.</p>
                                ) : (
                                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {accessList.map(entry => (
                                            <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(138,43,226,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        {entry.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>{entry.username}</span>
                                                        <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: entry.role === 'EDITOR' ? 'var(--accent-purple)' : 'var(--text-secondary)', background: entry.role === 'EDITOR' ? 'rgba(138,43,226,0.15)' : 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{entry.role}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleUnshare(entry.username)} style={{ background: 'none', color: 'var(--danger)', fontSize: '0.78rem', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Revoke</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1.5rem', gap: '1.5rem' }}>
                    {/* Editor Panel */}
                    <div className="glass-panel" style={{ flex: 2, padding: '2rem', display: 'flex', flexDirection: 'column', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'flex-end' }}>
                            <h3 style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)'}}>
                                <Zap size={20}/> Document Editor
                            </h3>
                            <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px'}}>EDIT MODE</span>
                        </div>
                        <textarea 
                            className="editor-textarea"
                            value={editContent} 
                            onChange={e => setEditContent(e.target.value)}
                            style={{ flex: 1, resize: 'none', background: 'rgba(0,0,0, 0.3)', border: '1px solid rgba(0, 240, 255, 0.2)', fontSize: '1.1rem', padding: '1.5rem', borderRadius: '12px' }}
                            placeholder="Type your document content here..."
                        />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <input 
                                type="text" 
                                placeholder="Change notes (e.g., fixed grammar, added intro...)" 
                                value={editNotes} 
                                onChange={e => setEditNotes(e.target.value)}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(138, 43, 226, 0.3)' }}
                            />
                            <button className="btn-primary" style={{display: 'flex', alignItems: 'center', gap: '8px', height: 'auto'}} onClick={saveDocument}>
                                <CheckSquare size={18}/> Save New Version
                            </button>
                        </div>
                    </div>

                    {/* Immutable History Panel */}
                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '20px', background: 'rgba(11, 17, 38, 0.8)' }}>
                       <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)' }}>
                           <h3 style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', color: 'var(--accent-purple)'}}>
                               <Clock size={18} /> Version History
                           </h3>
                       </div>
                       
                       <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                           <div style={{position: 'absolute', left: '35px', top: '70px', bottom: '20px', width: '2px', background: 'rgba(138, 43, 226, 0.2)', zIndex: 0}}></div>
                           
                           {activeDoc.versions && activeDoc.versions.map((v, i) => (
                               <div key={v.id} style={{ 
                                   padding: '1.5rem', 
                                   background: i === 0 ? 'rgba(0, 240, 255, 0.05)' : 'rgba(0,0,0,0.2)',
                                   border: '1px solid',
                                   borderColor: i === 0 ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.05)',
                                   borderRadius: '16px', 
                                   marginBottom: '1.5rem',
                                   position: 'relative',
                                   zIndex: 1,
                                   marginLeft: '30px',
                                   boxShadow: i === 0 ? '0 0 20px rgba(0,240,255,0.1)' : 'none'
                               }}>
                                   {/* Timeline Dot */}
                                   <div style={{ position: 'absolute', left: '-36px', top: '24px', width: '14px', height: '14px', borderRadius: '50%', background: i === 0 ? 'var(--accent-cyan)' : 'var(--accent-purple)', border: '3px solid var(--bg-primary)', boxShadow: i === 0 ? '0 0 10px var(--accent-cyan)' : 'none' }}></div>
                                   
                                   {i === 0 && <span style={{ position: 'absolute', top: '-12px', right: '20px', background: 'var(--accent-cyan)', color: '#000', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', letterSpacing: '1px' }}>LATEST</span>}
                                   
                                   <div style={{fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                       <CalendarIcon size={12}/> {new Date(v.created_at).toLocaleString()}
                                   </div>
                                   <div style={{marginBottom: '1rem'}}>
                                       <strong style={{color: '#fff', fontSize: '1.05rem'}}>{v.author_name}</strong>
                                       <div style={{fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-primary)', borderLeft: '2px solid var(--accent-purple)', paddingLeft: '10px', fontStyle: 'italic'}}>{v.change_notes || 'No notes provided.'}</div>
                                   </div>

                                   {/* API Functionalities */}
                                   <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                       {i !== 0 && (
                                            <>
                                                <button className="btn-secondary" onClick={() => requestRollback(v.id)} style={{ color: 'var(--warning)', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.3)', padding: '6px 10px', background: 'rgba(245, 158, 11, 0.05)' }}>Restore This Version</button>
                                                <button className="btn-secondary" onClick={() => testDiff(activeDoc.versions[i-1].id, v.id)} style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', borderColor: 'rgba(0, 240, 255, 0.3)', padding: '6px 10px', background: 'rgba(0, 240, 255, 0.05)' }} title="Compare backward with next iteration">Show Diff</button>
                                            </>
                                       )}
                                   </div>
                               </div>
                           ))}
                       </div>
                    </div>
                </div>

             </div>
        )
    }

    if (view === 'CREATE_DOC') {
        return (
             <div className="fade-in" style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
                 <header className="glass-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <button className="btn-secondary" onClick={() => loadDashboard()} style={{padding: '0.6rem 1.2rem'}}>← Cancel</button>
                        <h2>Create New Document</h2>
                    </div>
                </header>
                
                <div style={{ display: 'flex', flex: 1, justifyContent: 'center', padding: '3rem' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '3rem', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                        <div className="form-group" style={{marginBottom: '2rem'}}>
                            <label style={{color: 'var(--accent-cyan)'}}>Document Title</label>
                            <input 
                                type="text" 
                                placeholder="Enter title..." 
                                value={editTitle} 
                                onChange={e => setEditTitle(e.target.value)}
                                style={{ fontSize: '1.4rem', padding: '1.2rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{color: 'var(--accent-purple)'}}>Initial Content</label>
                            <textarea 
                                className="editor-textarea"
                                placeholder="Type your initial content here..."
                                value={editContent} 
                                onChange={e => setEditContent(e.target.value)}
                                style={{ flex: 1, resize: 'none', fontSize: '1.1rem', padding: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(138, 43, 226, 0.2)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <input 
                                type="text" 
                                placeholder="Notes (Optional)" 
                                value={editNotes} 
                                onChange={e => setEditNotes(e.target.value)}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }}
                            />
                            <button className="btn-primary" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2rem'}} onClick={saveDocument} disabled={!editTitle || !editContent}>
                                <Zap size={18}/> Create Document
                            </button>
                        </div>
                    </div>
                </div>
             </div>
        )
    }

    return null;
}

// Quick helper to prevent import crash if Calendar isn't in lucide yet
function CalendarIcon({size}) {
    return <Clock size={size} />
}

export default App;
