import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Image as ImageIcon, Smile, MoreVertical, Phone, Video, Check, CheckCheck, MessageCircle, ShieldCheck, Trash2, Users, X, UserPlus, Mic } from 'lucide-react';
import { socialApi } from '../api';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import { useChatSocket } from '../hooks/useChatSocket';
import { toast } from 'react-hot-toast';

export const ChatHub = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [msgInput, setMsgInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [connections, setConnections] = useState<any[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedPeers, setSelectedPeers] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, setMessages, sendMessage, sendTyping, markRead, typingUser, connected } = useChatSocket(activeSession?.session_id || null, user?.id);

    const loadData = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const peerId = params.get('peer');
            const peerRole = params.get('role');

            const [data, connData] = await Promise.all([
                socialApi.getChatSessions(),
                socialApi.getDetailedConnections()
            ]);

            setSessions(data);
            setConnections(connData.connections || []); // The mutual friends

            if (peerId && peerRole) {
                const session = await socialApi.startChat(parseInt(peerId), peerRole);
                if (session?.session_id) {
                    const fresh = await socialApi.getChatSessions();
                    setSessions(fresh);
                    const found = fresh.find((s: any) => s.session_id === session.session_id);
                    if (found) setActiveSession(found);
                }
            } else if (data.length > 0 && !activeSession) {
                setActiveSession(data[0]);
            }
        } catch (err: any) {
            if (err.response?.status === 403) {
                toast.error("Handshake Required: Connect as FRIENDS first.");
            }
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteSession = async (sid: string) => {
        if (!window.confirm("Bury this conversation? (Removed for you)")) return;
        try {
            await socialApi.deleteChatSession(sid);
            toast.success("Identity purged from thread.");
            setActiveSession(null);
            loadData();
        } catch (err) {
            toast.error("Redaction failed.");
        }
    };

    const handleCall = () => toast.success("Secure Voice Uplink: Under Construction");
    const handleVideo = () => toast.success("Holistic Video Matrix: Under Construction");

    useEffect(() => {
        if (activeSession) {
            socialApi.getChatMessages(activeSession.session_id).then(setMessages);
            // Mark all current visible as read
            const unread = messages.filter(m => !m.is_me && !m.is_read).map(m => m.id);
            if (unread.length > 0) markRead(unread);
        }
    }, [activeSession, setMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingUser]);

    const handleSend = () => {
        if (!msgInput.trim()) return;
        sendMessage(msgInput);
        setMsgInput("");
        sendTyping(false);
    };

    const onTyping = (val: string) => {
        setMsgInput(val);
        sendTyping(val.length > 0);
    };

    const startChatWithConn = async (c: any) => {
        setSearchQuery("");
        try {
            const session = await socialApi.startChat(c.id, c.role);
            if (session?.session_id) {
                const fresh = await socialApi.getChatSessions();
                setSessions(fresh);
                const found = fresh.find((s: any) => s.session_id === session.session_id);
                if (found) setActiveSession(found);
            }
        } catch (e) {
            toast.error("Handshake Required.");
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedPeers.length === 0) return;
        try {
            const peersToInvite = selectedPeers.map(p => ({ id: p.id, role: p.role }));
            const session = await socialApi.startGroupChat(peersToInvite, groupName);
            if (session?.session_id) {
                const fresh = await socialApi.getChatSessions();
                setSessions(fresh);
                const found = fresh.find((s: any) => s.session_id === session.session_id);
                if (found) setActiveSession(found);
                setIsGroupModalOpen(false);
                setGroupName("");
                setSelectedPeers([]);
                toast.success("Group instantiated.");
            }
        } catch (e) {
            toast.error("Handshake failed. Ensure you are connected to all peers.");
        }
    };

    const togglePeer = (c: any) => {
        const identifier = `${c.role}-${c.id}`;
        if (selectedPeers.find(p => `${p.role}-${p.id}` === identifier)) {
            setSelectedPeers(selectedPeers.filter(p => `${p.role}-${p.id}` !== identifier));
        } else {
            setSelectedPeers([...selectedPeers, c]);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-700">
            {/* Left Sidebar */}
            <div className="w-full md:w-80 glass rounded-[2.5rem] border-white/5 flex flex-col overflow-hidden h-full shrink-0">
                <div className="p-6 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter">Secure <span className="text-primary NOT-italic">Sync</span></h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsGroupModalOpen(true)} className="w-8 h-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20 transition-all" title="Create Secure Workgroup">
                                <UserPlus className="w-4 h-4" />
                            </button>
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20" title="E2EE Vault Active">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                    <div className="relative mt-4">
                        <input
                            type="text"
                            placeholder="Identify Peer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                        />
                        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {searchQuery ? (
                        connections
                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(c => (
                                <div
                                    key={`conn-${c.id}`}
                                    onClick={() => startChatWithConn(c)}
                                    className="flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all hover:bg-white/5 border border-transparent"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg">
                                            {c.avatar}
                                        </div>
                                        {c.is_online && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white truncate text-sm">{c.name}</h3>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{c.role}</p>
                                    </div>
                                </div>
                            ))
                    ) : (
                        sessions.map(s => (
                            <div
                                key={s.session_id}
                                onClick={() => setActiveSession(s)}
                                className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${activeSession?.session_id === s.session_id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg">
                                        {s.other_name[0]}
                                    </div>
                                    {s.unread_count > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#121212] px-1">
                                            {s.unread_count}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="font-bold text-white truncate text-sm">{s.other_name}</h3>
                                        <span className="text-[9px] text-gray-500 font-bold shrink-0">
                                            {new Date(s.last_msg_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate italic opacity-60">
                                        {s.last_msg_preview || `Start conversation...`}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}

                    {!searchQuery && sessions.length === 0 && (
                        <div className="p-10 text-center text-gray-500 text-xs italic">
                            No active channels. Identify a peer above to start.
                        </div>
                    )}
                    {searchQuery && connections.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="p-10 text-center text-gray-500 text-xs italic">
                            No connections found.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side */}
            {activeSession ? (
                <div className="flex-1 glass rounded-[2.5rem] border-white/5 flex flex-col overflow-hidden h-full relative">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black shadow-lg">
                                {activeSession.other_name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{activeSession.other_name}</h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                                    <p className={`text-[9px] uppercase font-black tracking-widest ${connected ? 'text-green-500' : 'text-red-500'}`}>
                                        {connected ? 'Identity Synchronized' : 'Offline Mode'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleCall} className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"><Phone className="w-5 h-5" /></button>
                            <button onClick={handleVideo} className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"><Video className="w-5 h-5" /></button>
                            <div className="w-px h-8 bg-white/10 mx-1 self-center" />
                            <button onClick={() => handleDeleteSession(activeSession.session_id)} className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar" ref={scrollRef}>
                        <div className="flex flex-col items-center gap-2 py-4">
                            <ShieldCheck className="w-4 h-4 text-green-500/30" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">End-to-End Encrypted Channel</span>
                        </div>

                        {messages.map((msg, i) => {
                            const isMe = msg.is_me;
                            return (
                                <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                    <div className={`flex flex-col gap-1.5 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 px-6 rounded-[2rem] text-sm leading-relaxed shadow-2xl relative group
                                            ${isMe ? 'premium-gradient text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-white rounded-tl-sm'}
                                        `}>
                                            <p className="break-words">{msg.content}</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-2">
                                            <span className="text-[9px] text-gray-600 font-bold">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                <div className="flex items-center">
                                                    <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? 'text-blue-400' : 'text-gray-600'}`} />
                                                    {msg.is_read && <span className="text-[8px] font-black text-blue-400 uppercase ml-1 opacity-60">Seen</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {typingUser === activeSession.other_id && (
                            <div className="flex justify-start animate-in fade-in slide-in-from-left-2">
                                <div className="bg-white/5 p-4 rounded-3xl rounded-tl-sm border border-white/10 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                                    </div>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Typing...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 m-3 rounded-[2.5rem]">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => toast.success("Emoji Package: Under Construction")} className="p-3 text-gray-500 hover:text-primary transition-all hover:bg-white/5 rounded-full"><Smile className="w-5 h-5" /></button>
                                <button onClick={() => toast.success("Media Matrix: Under Construction")} className="p-3 text-gray-500 hover:text-primary transition-all hover:bg-white/5 rounded-full"><ImageIcon className="w-5 h-5" /></button>
                                <button onClick={() => toast.success("Voice Module: Under Construction")} className="p-3 text-gray-500 hover:text-primary transition-all hover:bg-white/5 rounded-full"><Mic className="w-5 h-5" /></button>
                            </div>
                            <input
                                type="text"
                                placeholder={`Secure message to ${activeSession.other_name}...`}
                                className="flex-1 bg-white/5 border-none rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-1 focus:ring-primary h-full placeholder:text-gray-600 text-sm font-medium"
                                value={msgInput}
                                onChange={e => onTyping(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!msgInput.trim()}
                                className="w-14 h-14 shrink-0 rounded-[1.5rem] premium-gradient flex items-center justify-center text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                <Send className="w-6 h-6 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 glass rounded-[3.5rem] border-white/5 flex flex-col items-center justify-center text-center p-12 space-y-8 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                        <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/20 relative backdrop-blur-3xl shadow-2xl">
                            <MessageCircle className="w-12 h-12" />
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl rotate-12">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-3">
                        <h2 className="text-4xl font-black text-white italic tracking-tighter">E2EE <span className="text-primary NOT-italic">Secure Vault</span></h2>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">
                            Bilateral professional connections are encrypted point-to-point.
                            Identify a peer from your network to start collaborating.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/discovery'}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105"
                    >
                        Explore Network
                    </button>
                </div>
            )}

            {/* Create Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsGroupModalOpen(false)} />
                    <div className="relative w-full max-w-lg glass p-8 rounded-[3rem] border-white/10 shadow-3xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                    Establish <span className="text-indigo-400">Workgroup</span>
                                </h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Encrypted Multi-Peer Channel</p>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="w-10 h-10 glass bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                            <div>
                                <label className="text-[10px] font-black text-white uppercase tracking-widest mb-2 block">Workgroup Designation</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 text-sm font-medium"
                                    placeholder="e.g. Thesis Research Team"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-white uppercase tracking-widest mb-2 block flex justify-between">
                                    <span>Select Peers (Connections)</span>
                                    <span className="text-secondary">{selectedPeers.length} Selected</span>
                                </label>
                                <div className="space-y-2">
                                    {connections.length > 0 ? connections.map(c => {
                                        const isSelected = selectedPeers.find(p => p.id === c.id && p.role === c.role);
                                        return (
                                            <div
                                                key={`peer-${c.role}-${c.id}`}
                                                onClick={() => togglePeer(c)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white shrink-0">
                                                    {c.avatar}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">{c.role}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-black' : 'border-white/20'}`}>
                                                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No active connections found.</p>
                                            <p className="text-[10px] text-white/40 mt-2">Connect with peers before forming a group.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 pt-4 border-t border-white/10">
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || selectedPeers.length === 0}
                                className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl disabled:opacity-50 tracking-[0.2em] text-xs flex justify-center items-center gap-2"
                            >
                                <Users className="w-4 h-4" /> Instantiate Workgroup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
