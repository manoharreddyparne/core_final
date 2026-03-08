import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, UserPlus, X, Trash2, AlertTriangle } from 'lucide-react';
import { socialApi } from '../api';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import { useChatSocket } from '../hooks/useChatSocket';
import { toast } from 'react-hot-toast';

// Sub-components
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatSettings } from '../components/ChatSettings';
import { ChatJoinGate } from '../components/ChatJoinGate';

export const ChatHub: React.FC = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [activeSessionDetail, setActiveSessionDetail] = useState<any | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    
    // Group selection state
    const [isGroupModal, setIsGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selPeers, setSelPeers] = useState<any[]>([]);

    // Delete confirmation modal
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Chat Logic
    const [msgInput, setMsgInput] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // Refs for stable access in async callbacks
    const searchQueryRef = useRef(searchQuery);
    useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

    const {
        messages, setMessages: ingestHistory,
        connected, sendMessage, sendTyping, markRead,
        typingUsers, otherId
    } = useChatSocket(activeSession, user?.id, (metadata) => {
        if (metadata.session_id === activeSession?.session_id) {
            setActiveSessionDetail((prev: any) => ({
                ...prev,
                open_invite: metadata.open_invite,
                participants_metadata: metadata.metadata
            }));
            loadSessions(searchQueryRef.current);
        }
    });

    // ── Sessions load (separated from connections for perf)
    const loadSessions = useCallback(async (q = '') => {
        try {
            const sessData = await socialApi.getChatSessions(q);
            setSessions(sessData ?? []);
        } catch (err) {
            console.error("Sessions Load Error", err);
        }
    }, []);

    // ── Connections load (30s poll, much less frequent)
    const loadConnections = useCallback(async () => {
        try {
            const connData = await socialApi.getDetailedConnections();
            setConnections(connData?.connections ?? []);
        } catch (err) {
            console.error("Connections Load Error", err);
        }
    }, []);

    // ── Initial boot: load both + handle URL params
    useEffect(() => {
        const boot = async () => {
            try {
                const [sessData, connData] = await Promise.all([
                    socialApi.getChatSessions(''),
                    socialApi.getDetailedConnections(),
                ]);
                setSessions(sessData ?? []);
                setConnections(connData?.connections ?? []);

                const params = new URLSearchParams(window.location.search);
                const groupId = params.get('group');
                const token = params.get('token');

                if (token) {
                    try {
                        const res = await socialApi.joinViaLink(token);
                        if (res.success && res.data?.session_id) {
                            const detail = await socialApi.getSessionDetail(res.data.session_id);
                            if (detail) {
                                setActiveSession(detail);
                                setMobileView('chat');
                                toast.success("Protocol Link Decrypted: Synchronization Established.");
                                const newUrl = window.location.pathname + (groupId ? `?group=${groupId}` : '');
                                window.history.replaceState({}, '', newUrl);
                            }
                        }
                    } catch (e: any) {
                        toast.error(e.response?.data?.message || "Protocol link invalid or has been decommissioned.");
                    }
                } else if (groupId) {
                    const found = sessData?.find((s: any) => s.session_id === groupId);
                    if (found) {
                        setActiveSession(found);
                        setMobileView('chat');
                    } else {
                        try {
                            const detail = await socialApi.getSessionDetail(groupId);
                            if (detail) {
                                setActiveSession(detail);
                                setMobileView('chat');
                            }
                        } catch (e) {
                            toast.error("Room Restricted or Non-existent.");
                        }
                    }
                } else if (sessData?.length > 0) {
                    setActiveSession(sessData[0]);
                }
            } catch (err) {
                console.error("Boot Error", err);
            }
        };
        boot();

        // Session poll: 8s
        const sessionInterval = setInterval(() => loadSessions(searchQueryRef.current), 8000);
        // Connections poll: 30s (much less frequent)
        const connInterval = setInterval(() => loadConnections(), 30000);

        const onChatUpdate = () => loadSessions(searchQueryRef.current);
        window.addEventListener('chat_update', onChatUpdate);

        return () => {
            clearInterval(sessionInterval);
            clearInterval(connInterval);
            window.removeEventListener('chat_update', onChatUpdate);
        };
    }, []);

    // ── Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadSessions(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── 1. Consolidated session detail + message load (fixes infinite loading)
    useEffect(() => {
        if (!activeSession?.session_id) {
            setActiveSessionDetail(null);
            setIsJoined(false);
            ingestHistory([]);
            return;
        }

        // Reset state before fetch
        setIsJoined(false);
        setActiveSessionDetail(null);

        let cancelled = false;
        const sid = activeSession.session_id;

        const run = async () => {
            try {
                const detail = await socialApi.getSessionDetail(sid);
                if (cancelled) return;

                setActiveSessionDetail(detail);
                const joined = detail.is_member;
                setIsJoined(joined);

                // Load messages immediately after we know membership status
                if (joined || detail.open_invite) {
                    try {
                        const msgs = await socialApi.getChatMessages(sid);
                        if (cancelled) return;
                        ingestHistory(msgs ?? []);
                    } catch {
                        if (!cancelled) ingestHistory([]);
                    }
                } else {
                    ingestHistory([]);
                }
            } catch {
                if (!cancelled) {
                    setActiveSessionDetail(null);
                    setIsJoined(false);
                    ingestHistory([]);
                }
            }
        };

        run();
        return () => { cancelled = true; };
    }, [activeSession?.session_id]);

    // ── 2. Read Synchronization: Mark messages as READ when viewed
    useEffect(() => {
        if (!activeSession?.session_id || !isJoined || messages.length === 0) return;

        const unreadIds = messages
            .filter(m => !m.is_me && !m.is_read)
            .map(m => Number(m.id))
            .filter(id => !isNaN(id));

        if (unreadIds.length > 0) {
            markRead(unreadIds);
            
            // Local state update for immediate UI feedback
            setSessions(prev => prev.map(s => 
                s.session_id === activeSession.session_id 
                    ? { ...s, unread_count: 0 } 
                    : s
            ));
        }
    }, [activeSession?.session_id, isJoined, messages.length]);

    const handleSend = () => {
        const txt = msgInput.trim();
        if (!txt || !connected) return;
        sendMessage(txt);
        setMsgInput('');
        sendTyping(false, user?.username);
        isTypingRef.current = false;
    };

    const onTyping = (val: string) => {
        setMsgInput(val);
        if (val.length > 0) {
            if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(true, user?.username); }
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => {
                isTypingRef.current = false;
                sendTyping(false, user?.username);
            }, 2000);
        }
    };


    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleVoiceToggle = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                setIsRecording(false);
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                recorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        sendMessage(reader.result as string, 'VOICE');
                    };
                };

                recorder.start();
                setIsRecording(true);
                toast.success("Voice sequence initiated.");
            } catch {
                toast.error("Telemetry failed: Microphone access refused.");
            }
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => sendMessage(reader.result as string, 'IMAGE');
    };

    const handleEmojiClick = (e: string) => {
        setMsgInput(p => p + e);
        setShowEmojis(false);
    };

    const startWithConn = async (c: any) => {
        try {
            const res = await socialApi.startChat(c.id, c.role);
            if (res?.session_id) {
                loadSessions();
                setActiveSession({ ...res, other_name: c.name });
                setMobileView('chat');
            }
        } catch { toast.error("Handshake Required."); }
    };

    const deleteSession = async (sid: string) => {
        setDeleteTarget(sid);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await socialApi.deleteChatSession(deleteTarget);
            setDeleteTarget(null);
            if (activeSession?.session_id === deleteTarget) {
                setActiveSession(null);
                setMobileView('list');
            }
            loadSessions(searchQuery);
        } catch {
            toast.error("Failed to delete conversation.");
        } finally {
            setIsDeleting(false);
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || selPeers.length === 0) return;
        try {
            const res = await socialApi.startGroupChat(selPeers, groupName);
            if (res?.session_id) {
                loadSessions();
                setActiveSession(res);
                setIsGroupModal(false);
                setGroupName('');
                setSelPeers([]);
            }
        } catch { toast.error("Could not create group."); }
    };

    return (
        <div className="flex h-full w-full max-w-[1440px] mx-auto relative overflow-hidden gap-3 px-2 sm:px-4">
            <ChatSidebar 
                sessions={sessions}
                connections={connections}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                activeSessionId={activeSession?.session_id}
                onSessionClick={(s) => {
                    if (activeSession?.session_id === s.session_id) {
                        setMobileView('chat');
                        return;
                    }
                    setActiveSession(s);
                    setMobileView('chat');
                }}
                onStartGroup={() => setIsGroupModal(true)}
                onStartConn={startWithConn}
                mobileView={mobileView}
            />

            <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
                {activeSession ? (
                    !isJoined ? (
                        <ChatJoinGate 
                            sessionId={activeSession.session_id}
                            onJoined={() => {
                                setIsJoined(true);
                                loadSessions();
                                if (activeSession?.session_id) {
                                    socialApi.getSessionDetail(activeSession.session_id)
                                        .then(setActiveSessionDetail);
                                }
                            }}
                            user={user}
                        />
                    ) : (
                        <ChatWindow 
                            activeSession={activeSession}
                            activeSessionDetail={activeSessionDetail}
                            messages={messages}
                            connected={connected}
                            typingUsers={typingUsers}
                            otherId={otherId}
                            user={user}
                            msgInput={msgInput}
                            showEmojis={showEmojis}
                            isRecording={isRecording}
                            onBack={() => setMobileView('list')}
                            onSettings={() => setShowSettings(true)}
                            onDelete={deleteSession}
                            onSend={handleSend}
                            onTyping={onTyping}
                            onFile={handleFile}
                            onVoice={handleVoiceToggle}
                            onEmojiToggle={() => setShowEmojis(!showEmojis)}
                            onEmojiClick={handleEmojiClick}
                        />
                    )
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
                        <MessageCircle className="w-16 h-16 text-white/5" />
                        <p className="text-gray-500 text-sm font-bold">Select a conversation to begin encryption sequence.</p>
                    </div>
                )}
            </div>

            {showSettings && (
                <ChatSettings 
                    activeSessionDetail={activeSessionDetail}
                    user={user}
                    onClose={() => setShowSettings(false)}
                    onUpdate={setActiveSessionDetail}
                />
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0b1120]/95 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass w-full max-w-sm rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Purge History</h3>
                            </div>
                            <button onClick={() => setDeleteTarget(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    This will remove the conversation from your view. This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setDeleteTarget(null)} 
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all text-[11px] uppercase tracking-widest disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all text-[11px] uppercase tracking-widest shadow-xl shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isDeleting ? 'Purging...' : 'Confirm Purge'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {isGroupModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0b1120]/90 backdrop-blur-md">
                     <div className="glass w-full max-w-md rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Construct New Room</h3>
                            <button onClick={() => setIsGroupModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <input 
                                type="text" placeholder="Room Identifier (e.g. Placement Prep)" 
                                value={groupName} onChange={e => setGroupName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Select Peers ({selPeers.length})</p>
                                {connections.map(c => {
                                    const isSel = selPeers.find(p => p.id === c.id && p.role === c.role);
                                    return (
                                        <button 
                                            key={`${c.role}-${c.id}`}
                                            onClick={() => setSelPeers(prev => isSel ? prev.filter(p => p.id !== c.id) : [...prev, c])}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSel ? 'bg-indigo-500/10 border-indigo-500' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-black text-[10px] text-indigo-400">{c.name?.[0]}</div>
                                            <span className="text-xs font-bold text-white flex-1 text-left">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button 
                                onClick={createGroup}
                                disabled={!groupName.trim() || selPeers.length === 0}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black text-sm transition-all"
                            >
                                Initialize Room
                            </button>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};
