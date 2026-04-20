import React, { useState, useEffect } from 'react';
import { X, Send, Users, Shield, Copy, Check, MessageSquare, Book, Share2, AlertCircle, Zap, ShieldCheck, Clock, Settings, UserPlus, Info, Terminal, ChevronRight, Activity, Globe, Lock, Trash2, Edit2, Link as LinkIcon, RefreshCw, ShieldAlert, LogOut } from 'lucide-react';
import { socialApi } from '../api';
import { toast } from 'react-hot-toast';

interface ChatSettingsProps {
    activeSessionDetail: any;
    user: any;
    onClose: () => void;
    onUpdate: (detail: any) => void;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({ activeSessionDetail: detail, user, onClose, onUpdate }) => {
    const [confirmingPurge, setConfirmingPurge] = useState<any>(null);
    const [confirmingLeave, setConfirmingLeave] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [connections, setConnections] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // ── isAdmin must be derived before hooks (used as hook dependency) ──
    const isAdmin = ['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || '');
    const sessionId = detail?.session_id ?? '';
    const sessionName = detail?.name ?? '';

    useEffect(() => {
        if (!detail) return;
        if (isAdmin && searchQuery.length >= 2) {
             const timeoutId = setTimeout(() => {
                socialApi.searchConnections(searchQuery).then(res => {
                    setConnections(res || []);
                });
             }, 300);
             return () => clearTimeout(timeoutId);
        } else if (isAdmin && searchQuery.length === 0) {
            socialApi.getDetailedConnections().then(res => {
                setConnections(Array.isArray(res) ? res : (res?.connections || []));
            });
        }
    }, [isAdmin, searchQuery, detail]);

    useEffect(() => {
        if (!detail || !isAdmin) return;
        socialApi.getInviteRequests().then(reqs => {
            if (reqs && Array.isArray(reqs)) {
                setPendingRequests(reqs.filter((r: any) => r.session_id === sessionId || r.session_name === sessionName));
            }
        });
    }, [isAdmin, sessionId, sessionName]);

    // ── Early return AFTER all hooks ──────────────────────────────────────
    if (!detail) return null;

    const handleCopyLink = () => {
        if (!detail.invite_link) return;
        navigator.clipboard.writeText(detail.invite_link);
        toast.success("Manifest link captured to clipboard.");
    };

    const handleAddUser = async (conn: any) => {
        try {
            await socialApi.addParticipant(detail.session_id, conn.id, conn.role, conn.name);
            onUpdate({
                ...detail,
                participants: [...(detail.participants || []), { ...conn, name: conn.name || 'User', is_online: false, last_seen: null, connection_id: null }]
            });
            setSearchQuery('');
            toast.success(`${conn.name} integrated.`);
        } catch {
            toast.error("Integration failed.");
        }
    };

    const handleCopyAnnouncement = () => {
        if (!detail.invite_link) return;
        const msg = `[Nexora NOTIFICATION]: Join the ${detail.name} for official recruitment updates.\n\nAccess Protocol: ${detail.invite_link}\n\nSecurity: E2EE Active`;
        navigator.clipboard.writeText(msg);
        toast.success("Broadcast template captured.");
    };

    const handlePurge = async () => {
        if (!confirmingPurge) return;
        setIsUpdating(true);
        try {
            await socialApi.removeParticipant(detail.session_id, confirmingPurge.id, confirmingPurge.role);
            onUpdate({
                ...detail,
                participants: (detail.participants || []).filter((x: any) => !(String(x.id) === String(confirmingPurge.id) && x.role === confirmingPurge.role))
            });
            toast.success(`${confirmingPurge.name} expelled.`);
            setConfirmingPurge(null);
        } catch {
            toast.error("Moderation Failure.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLeave = async () => {
        setIsUpdating(true);
        try {
            await socialApi.leaveGroup(detail.session_id);
            toast.success("Membership Terminated.");
            onClose();
            window.location.reload(); 
        } catch {
            toast.error("Operation Denied.");
        } finally {
            setIsUpdating(false);
            setConfirmingLeave(false);
        }
    };

    const filteredConnections = connections.filter(c => 
        !(detail.participants || []).some((p: any) => p.id === c.id && p.role === c.role)
    );

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 md:w-96 glass z-[150] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Room Intelligence</h3>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-8 custom-scrollbar pb-10">
                {/* Premium Header Branding */}
                <div className="space-y-6 pt-4">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-700" />
                        <div className="relative w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] flex items-center justify-center mx-auto text-white text-4xl font-black border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">
                            {detail.avatar && detail.avatar.length > 5 ? (
                                <img src={detail.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                            ) : (
                                <span className="drop-shadow-lg">{detail.name?.[0] || 'G'}</span>
                            )}
                            <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-transparent transition-colors" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h4 className="text-2xl font-black text-white leading-none tracking-tight capitalize">{detail.name || 'Secure Group'}</h4>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] opacity-60">
                                Established {new Date(detail.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full shadow-inner">
                                <Zap className="w-3 h-3 text-indigo-400" />
                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">
                                    {detail.participants_metadata?.drive_id ? `Drive NODE #${detail.participants_metadata.drive_id}` : 'General Protocol'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invite Protocol Hub */}
                {(user?.role === 'INST_ADMIN' || user?.role === 'INSTITUTION_ADMIN' || user?.role === 'ADMIN') && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Link Governance</p>
                        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-5 shadow-inner">
                            {detail.invite_link ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-1">Secure Join Token</p>
                                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-inner group-hover/governance:border-indigo-500/30 transition-colors">
                                            <span className="text-[10px] text-gray-500 font-bold truncate max-w-[140px] tracking-tight">{detail.invite_link}</span>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={async () => {
                                                        const tid = toast.loading("Rotating Protocol Token...");
                                                        try {
                                                            const res = await socialApi.generateInviteLink(detail.session_id);
                                                            onUpdate({ ...detail, invite_link: res.invite_link });
                                                            toast.success("Token Rotated.", { id: tid });
                                                        } catch {
                                                            toast.error("Handshake Failure.", { id: tid });
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-xl text-indigo-400/50 hover:text-indigo-400 transition-all hover:scale-110"
                                                    title="Rotate Link"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                </button>
                                                <button onClick={handleCopyLink} className="p-2 hover:bg-white/10 rounded-xl text-indigo-400 transition-all hover:scale-110"><Copy className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button 
                                            onClick={handleCopyAnnouncement}
                                            className="w-full py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                                        >
                                            <Copy className="w-4 h-4" /> Copy Broadcast Template
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                const tid = toast.loading("Establishing Automated Broadcast...");
                                                try {
                                                    await socialApi.establishAndBroadcast(detail.session_id);
                                                    toast.success("Broadcast Orchestration Started!", { id: tid });
                                                } catch {
                                                    toast.error("Handshake Failure.", { id: tid });
                                                }
                                            }}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(79,70,229,0.3)] transition-all active:scale-95"
                                        >
                                            <Share2 className="w-4 h-4" /> Automated Broadcast
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={async () => {
                                        try {
                                            const link = await socialApi.generateInviteLink(detail.session_id);
                                            onUpdate({ ...detail, invite_link: link });
                                            toast.success("Protocol link established.");
                                        } catch {
                                            toast.error("Handshake Failure.");
                                        }
                                    }}
                                    className="w-full py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Initialize Join Protocol
                                </button>
                            )}

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between group/toggle">
                                    <div className="space-y-0.5">
                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Entry</span>
                                        <span className="block text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Bypass approvals</span>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newVal = !detail.open_invite;
                                            onUpdate({ ...detail, open_invite: newVal });
                                            try {
                                                await socialApi.updateGroupSettings(detail.session_id, detail.participants_metadata?.read_only_for_students, newVal);
                                                toast.success(newVal ? "Protocol Perimeter Disabled" : "Perimeter Active");
                                            } catch {
                                                onUpdate({ ...detail, open_invite: !newVal });
                                                toast.error("Governance override failed.");
                                            }
                                        }}
                                        className={`w-11 h-6 rounded-full relative transition-all shadow-inner p-1 ${detail.open_invite ? 'bg-green-600 shadow-green-900/50' : 'bg-gray-800'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-all transform ${detail.open_invite ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Expiry</span>
                                        <span className="block text-[8px] text-gray-600 font-bold uppercase tracking-tighter">TTL Duration</span>
                                    </div>
                                    <select 
                                        value={detail.invite_expiry_at ? "ACTIVE" : "NEVER"}
                                        onChange={async (e) => {
                                            const expiry = e.target.value === "ACTIVE" ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null;
                                            await socialApi.updateGroupSettings(detail.session_id, detail.participants_metadata?.read_only_for_students, detail.open_invite, expiry);
                                            onUpdate({ ...detail, invite_expiry_at: expiry });
                                            toast.success(expiry ? "24-Hour Pulse Active" : "Persistence Restricted");
                                        }}
                                        className="bg-transparent text-[10px] text-indigo-400 font-black focus:outline-none cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors tracking-widest"
                                    >
                                        <option value="NEVER">INFINITE</option>
                                        <option value="ACTIVE">24 HRS</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Governance */}
                {isAdmin && (
                    <div className="space-y-6">
                        <div className="space-y-3 font-semibold">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Room Governance</p>
                            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-inner group/governance">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-white group-hover/governance:text-indigo-400 transition-colors">Broadcast Mode</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter italic">Only admins can post Intel.</p>
                                </div>
                                <button 
                                    onClick={async () => {
                                        const newVal = !detail.participants_metadata?.read_only_for_students;
                                        // Optimistic Update
                                        onUpdate({
                                            ...detail,
                                            participants_metadata: { ...detail.participants_metadata, read_only_for_students: newVal }
                                        });
                                        try {
                                            await socialApi.updateGroupSettings(detail.session_id, newVal, detail.open_invite, detail.invite_expiry_at);
                                            toast.success(newVal ? "Broadcast Mode Restricted" : "Interactive Mode Active");
                                        } catch {
                                            onUpdate({
                                                ...detail,
                                                participants_metadata: { ...detail.participants_metadata, read_only_for_students: !newVal }
                                            }); // Rollback
                                            toast.error("Moderation Failure.");
                                        }
                                    }}
                                    className={`w-11 h-6 rounded-full relative transition-all p-1 shadow-inner ${detail.participants_metadata?.read_only_for_students ? 'bg-indigo-600 shadow-indigo-900/50' : 'bg-gray-800'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-all transform ${detail.participants_metadata?.read_only_for_students ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Add Logic */}
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Integrate Personnel</p>
                            <div className="relative group/search">
                                <div className="absolute inset-x-0 -bottom-2 h-1 bg-indigo-500/50 scale-x-0 group-focus-within/search:scale-x-100 transition-transform duration-500 rounded-full" />
                                <input 
                                    type="text"
                                    placeholder="SCAN NETWORK..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-[11px] text-white placeholder:text-gray-600 focus:outline-none transition-all font-black uppercase tracking-widest"
                                />
                                <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </div>
                            
                            {searchQuery && (
                                <div className="bg-[#0b1120] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    {filteredConnections.length > 0 ? filteredConnections.map(conn => (
                                        <button 
                                            key={`${conn.role}-${conn.id}`}
                                            onClick={() => handleAddUser(conn)}
                                            className="w-full p-4 hover:bg-indigo-600/10 flex items-center gap-3 transition-colors text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-sm font-black text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {conn.avatar || conn.name?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black text-white truncate uppercase tracking-tight">{conn.name}</p>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{conn.role}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                                                </div>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="p-8 text-center space-y-2">
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">No Node Detected</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Point 3 & 5: Join Requests Governance */}
                        {pendingRequests.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3 animate-pulse" /> Pending Manifest Entrants
                                    </p>
                                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-between group/req relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent translate-x-[-100%] group-hover/req:translate-x-0 transition-transform duration-700" />
                                            <div className="relative flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-[10px] font-black border border-amber-500/20">
                                                    {req.user_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{req.user_name}</p>
                                                    <p className="text-[8px] text-amber-400/60 font-black uppercase tracking-widest">{req.user_role}</p>
                                                </div>
                                            </div>
                                            <div className="relative flex items-center gap-1.5">
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            await socialApi.resolveInviteRequest(req.id, 'APPROVE');
                                                            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                                            toast.success(`${req.user_name} integrated.`);
                                                            window.location.reload(); 
                                                        } catch { toast.error("Handshake Failed."); }
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            await socialApi.resolveInviteRequest(req.id, 'REJECT');
                                                            setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                                                            toast.success("Entry Refused.");
                                                        } catch { toast.error("Rejection Failed."); }
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Participant Registry */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Manifest</p>
                        <span className="text-[10px] font-black text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">{detail.participants?.length || 0}</span>
                    </div>
                    <div className="space-y-2.5">
                        {detail.participants?.map((p: any) => {
                            const isMe = (p.id === user?.registry_id || p.id === user?.id) && p.role === user?.role;
                            return (
                                <div key={`${p.role}-${p.id}`} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/[0.08] rounded-[2rem] border border-white/5 transition-all group/p relative active:scale-[0.98] shadow-sm">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] flex items-center justify-center font-black text-base text-white border border-white/10 shadow-inner group-hover/p:border-indigo-500/50 transition-colors">
                                            {p.avatar || p.name?.[0]}
                                        </div>
                                        {p.is_online && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] border-[#0d1117] shadow-lg shadow-green-500/20" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-black text-white truncate uppercase tracking-tight">{p.name}</p>
                                            {isMe && (
                                                <div className="bg-indigo-600/20 px-2 py-0.5 rounded-lg border border-indigo-500/20 flex items-center gap-1">
                                                    <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                                                    <span className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">ROOT</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-0.5 opacity-60 flex items-center gap-2">
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" /> {p.role}
                                        </p>
                                    </div>
                                    {isAdmin && !isMe && (
                                        <button 
                                            onClick={() => setConfirmingPurge(p)}
                                            className="opacity-0 group-hover/p:opacity-100 p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all hover:scale-110 active:scale-90"
                                            title="Remove from group"
                                        >
                                            <ShieldAlert className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Lifecycle Footer */}
            {detail.is_group && (
                <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                    <button 
                        onClick={() => setConfirmingLeave(true)}
                        className="w-full py-4 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:text-white text-red-500 rounded-2xl font-black text-[10px] transition-all uppercase tracking-[0.2em] shadow-lg shadow-red-500/5 group"
                    >
                        Withdraw from Protocol
                    </button>
                </div>
            )}

            {/* Premium Confirmation Modals */}
            {confirmingPurge && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmingPurge(null)} />
                    <div className="relative glass w-full max-w-xs p-8 rounded-[2.5rem] border border-white/10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto text-red-500">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Remove Participant?</h3>
                            <p className="text-xs text-gray-400 leading-relaxed font-bold">
                                You are about to purge <span className="text-white">{confirmingPurge.name}</span> from this session. Access will be revoked immediately.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfirmingPurge(null)} className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest">Abort</button>
                            <button onClick={handlePurge} disabled={isUpdating} className="py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl shadow-red-600/20 tracking-widest">
                                {isUpdating ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmingLeave && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmingLeave(false)} />
                    <div className="relative glass w-full max-w-xs p-8 rounded-[2.5rem] border border-white/10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto text-amber-500">
                            <LogOut className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-black text-white uppercase tracking-tight">Withdraw Protocol?</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-bold">
                                You are about to terminate your membership in <span className="text-white">{detail.name}</span>. Group content will be archived.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfirmingLeave(false)} className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest">Stay</button>
                            <button onClick={handleLeave} disabled={isUpdating} className="py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl shadow-amber-600/20 tracking-widest">
                                {isUpdating ? 'EXITING...' : 'CONFIRM EXIT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

