import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, Send, Image as ImageIcon, Smile, Phone, Video,
    CheckCheck, Check, MessageCircle, ShieldCheck, Trash2, Users, X,
    UserPlus, Mic, Wifi, WifiOff, ArrowLeft, ChevronRight, Clock
} from 'lucide-react';
import { socialApi } from '../api';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import { useChatSocket } from '../hooks/useChatSocket';
import { toast } from 'react-hot-toast';

/* ─────────── Emoji panel ─────────── */
const EMOJIS = [
    '😀', '😂', '😍', '😎', '😭', '😡', '🥳', '🤔', '😊', '😇',
    '👍', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '🚀', '💡', '👀',
    '🙌', '😴', '🤣', '🥰', '😏', '😢', '😤', '😱', '🫡', '🫂',
];

/* ─────────── Time helpers ─────────── */
function safeTime(ts: any): string {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function safeDate(ts: any): Date | null {
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

function getDateLabel(ts: any): string {
    const d = safeDate(ts);
    if (!d) return '';
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(messages: any[]) {
    const groups: { label: string; msgs: any[] }[] = [];
    let lastLabel = '';
    for (const msg of messages) {
        const label = getDateLabel(msg.timestamp) || 'Unknown';
        if (label !== lastLabel) { groups.push({ label, msgs: [] }); lastLabel = label; }
        groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
}

function formatLastSeen(ts: any): string {
    const d = safeDate(ts);
    if (!d) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─────────── Sub-components ─────────── */
const DateSep = ({ label }: { label: string }) => (
    <div className="flex justify-center my-4 select-none">
        <span className="text-[10px] font-black text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            {label}
        </span>
    </div>
);

const MsgBubble = ({ msg }: { msg: any }) => {
    const isMe = msg.is_me;
    const time = safeTime(msg.timestamp);
    const hasContent = msg.content && msg.content.trim().length > 0;

    return (
        <div className={`flex w-full mb-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
                style={{ maxWidth: 'min(76%, 500px)' }}
            >
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words transition-opacity ${isMe
                    ? `bg-indigo-600 text-white rounded-tr-none${msg.is_pending ? ' opacity-60' : ''}`
                    : 'bg-white/8 border border-white/10 text-gray-100 rounded-tl-none'
                    }`}>
                    {/* Render based on attachment type */}
                    {(msg.attachment_type === 'IMAGE' || msg.content?.startsWith('data:image/')) ? (
                        <img src={msg.content} alt="attachment" className="max-w-full rounded-xl object-cover cursor-zoom-in" style={{ maxWidth: 240 }} />
                    ) : (msg.attachment_type === 'VIDEO' || msg.content?.startsWith('data:video/')) ? (
                        <video src={msg.content} controls className="rounded-xl" style={{ maxWidth: 240 }} />
                    ) : (msg.attachment_type === 'VOICE' || msg.content?.startsWith('data:audio/')) ? (
                        <audio src={msg.content} controls className="h-9" style={{ width: 220 }} />
                    ) : msg.attachment_type === 'STICKER' ? (
                        <img src={msg.content} alt="sticker" className="object-contain rounded-xl" style={{ width: 100, height: 100 }} />
                    ) : hasContent ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.attachment_type && msg.attachment_type !== 'TEXT' ? (
                        /* Attachment message with no displayable content (URL not loaded) */
                        <span className="italic opacity-60 text-xs">[{msg.attachment_type.toLowerCase()}]</span>
                    ) : (
                        /* Truly empty message — show a placeholder dot to prevent zero-height bubbles */
                        <span className="opacity-20 select-none">·</span>
                    )}
                </div>
                <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {time && <span className="text-[10px] text-gray-500">{time}</span>}
                    {isMe && (
                        msg.is_pending
                            ? <Clock className="w-3 h-3 text-gray-500/70 animate-pulse" aria-label="Sending…" />
                            : msg.is_read
                                ? <CheckCheck className="w-3.5 h-3.5 text-indigo-400" aria-label="Seen" />
                                : <Check className="w-3.5 h-3.5 text-gray-500" aria-label="Sent" />
                    )}
                </div>
            </div>
        </div>
    );
};

const TypingBubble = ({ name }: { name: string }) => (
    <div className="flex justify-start mb-2 animate-in fade-in slide-in-from-left-2 duration-200">
        <div className="bg-white/8 border border-white/10 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
            {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
            <span className="text-[10px] font-bold text-indigo-300 tracking-wide ml-1">
                {name.split(' ')[0]} is typing…
            </span>
        </div>
    </div>
);

const SessionItem = ({ s, isActive, onClick }: { s: any; isActive: boolean; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${isActive
            ? 'bg-indigo-500/10 border-indigo-500'
            : 'border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
    >
        <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 flex items-center justify-center text-indigo-200 font-black text-base">
                {s.other_name?.[0] ?? '?'}
            </div>
            {s.is_online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1120]" />
            )}
            {s.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-[#0b1120]">
                    {s.unread_count}
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-bold text-white truncate">{s.other_name}</span>
                {s.last_msg_at && (
                    <span className="text-[9px] text-gray-500 shrink-0">{safeTime(s.last_msg_at)}</span>
                )}
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {s.last_msg_preview || 'Start a conversation…'}
            </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 shrink-0 sm:hidden" />
    </button>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export const ChatHub = () => {
    const { user } = useAuth();

    const [sessions, setSessions] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any | null>(null);
    const [activeSessionDetail, setActiveSessionDetail] = useState<any | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const [msgInput, setMsgInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isGroupModal, setIsGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selPeers, setSelPeers] = useState<any[]>([]);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const mediaRecRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const {
        messages, setMessages: ingestHistory,
        connected, sendMessage, sendTyping, markRead,
        typingUser, otherId
    } = useChatSocket(activeSession, user?.id);

    /* ── Load sessions & connections ── */
    const loadData = useCallback(async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const peerId = params.get('peer');
            const peerRole = params.get('role');
            const groupId = params.get('group');

            const [sessData, connData] = await Promise.all([
                socialApi.getChatSessions(),
                socialApi.getDetailedConnections(),
            ]);
            setSessions(sessData ?? []);
            setConnections(connData?.connections ?? []);

            if (groupId) {
                try {
                    const detail = await socialApi.getSessionDetail(groupId);
                    if (detail) {
                        const found = sessData?.find((s: any) => s.session_id === groupId);
                        setActiveSession(found || detail);
                        setActiveSessionDetail(detail);
                        setMobileView('chat');
                    }
                } catch {
                   toast.error("Group not found or Access Denied.");
                }
            } else if (peerId && peerRole) {
                const session = await socialApi.startChat(parseInt(peerId), peerRole);
                if (session?.session_id) {
                    const fresh = await socialApi.getChatSessions();
                    setSessions(fresh ?? []);
                    const found = fresh?.find((s: any) => s.session_id === session.session_id);
                    if (found) { setActiveSession(found); setMobileView('chat'); }
                }
            } else if (sessData?.length > 0) {
                setActiveSession(sessData[0]);
            }
        } catch (err: any) {
            if (err?.response?.status === 403) toast.error('Connect as FRIENDS first.');
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    /* ── Load message history when session changes ── */
    useEffect(() => {
        if (!activeSession?.session_id) return;
        
        // Refresh session detail for groups
        if (activeSession.is_group) {
            socialApi.getSessionDetail(activeSession.session_id)
                .then(detail => setActiveSessionDetail(detail))
                .catch(() => setActiveSessionDetail(null));
        } else {
            setActiveSessionDetail(null);
        }

        socialApi.getChatMessages(activeSession.session_id)
            .then((msgs: any[]) => ingestHistory(msgs ?? []))
            .catch(() => ingestHistory([]));
    }, [activeSession?.session_id]);

    /* ── Auto-scroll ── */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
        if (nearBottom || messages[messages.length - 1]?.is_me) {
            requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
        }
    }, [messages.length, typingUser]);

    /* ── Mark incoming messages as read ── */
    useEffect(() => {
        // Only mark messages with real DB IDs (not optimistic tmp- entries)
        const unread = messages
            .filter(m => !m.is_me && !m.is_read && !String(m.id).startsWith('tmp-'))
            .map(m => Number(m.id));
        if (unread.length > 0) markRead(unread);
    }, [messages.length]);

    /* ── Close emoji on outside click ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmojis(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Send ── */
    const handleSend = () => {
        const txt = msgInput.trim();
        if (!txt || !connected) return;
        sendMessage(txt);
        setMsgInput('');
        sendTyping(false);
        isTypingRef.current = false;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        inputRef.current?.focus();
    };

    /* ── Typing indicator (throttled, stops after 2s idle) ── */
    const onTyping = (val: string) => {
        setMsgInput(val);
        if (val.length > 0) {
            if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(true); }
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => {
                isTypingRef.current = false;
                sendTyping(false);
            }, 2000);
        } else {
            if (isTypingRef.current) { isTypingRef.current = false; sendTyping(false); }
            if (typingTimer.current) clearTimeout(typingTimer.current);
        }
    };

    /* ── File attach ── */
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { toast.error('File too large (10MB max)'); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () =>
            sendMessage(reader.result as string, file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
        e.target.value = '';
    };

    /* ── Voice ── */
    const handleVoice = async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mr = new MediaRecorder(stream);
                mediaRecRef.current = mr;
                chunksRef.current = [];
                mr.ondataavailable = ev => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
                mr.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const r = new FileReader();
                    r.readAsDataURL(blob);
                    r.onloadend = () => sendMessage(r.result as string, 'VOICE');
                    stream.getTracks().forEach(t => t.stop());
                };
                mr.start();
                setIsRecording(true);
            } catch { toast.error('Microphone access denied'); }
        } else {
            mediaRecRef.current?.stop();
            setIsRecording(false);
        }
    };

    const openChat = (s: any) => { setActiveSession(s); setMobileView('chat'); };

    const startWithConn = async (c: any) => {
        setSearchQuery('');
        try {
            const session = await socialApi.startChat(c.id, c.role);
            if (session?.session_id) {
                const fresh = await socialApi.getChatSessions();
                setSessions(fresh ?? []);
                const found = fresh?.find((s: any) => s.session_id === session.session_id);
                if (found) openChat(found);
            }
        } catch { toast.error('Handshake Required — must be FRIENDS first.'); }
    };

    const deleteSession = async (sid: string) => {
        if (!window.confirm('Remove this conversation?')) return;
        try {
            await socialApi.deleteChatSession(sid);
            setActiveSession(null);
            setMobileView('list');
            loadData();
        } catch { toast.error('Could not remove conversation.'); }
    };

    const createGroup = async () => {
        if (!groupName.trim() || selPeers.length === 0) return;
        try {
            const session = await socialApi.startGroupChat(
                selPeers.map(p => ({ id: p.id, role: p.role })), groupName
            );
            if (session?.session_id) {
                const fresh = await socialApi.getChatSessions();
                setSessions(fresh ?? []);
                const found = fresh?.find((s: any) => s.session_id === session.session_id);
                if (found) openChat(found);
                setIsGroupModal(false);
                setGroupName('');
                setSelPeers([]);
                toast.success('Group created!');
            }
        } catch { toast.error('Could not create group. Ensure you are FRIENDS with all peers.'); }
    };

    const togglePeer = (c: any) => {
        const key = `${c.role}-${c.id}`;
        setSelPeers(prev =>
            prev.find(p => `${p.role}-${p.id}` === key)
                ? prev.filter(p => `${p.role}-${p.id}` !== key)
                : [...prev, c]
        );
    };

    const filteredConns = connections.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const groups = groupByDate(messages);

    // Show typing indicator only when the OTHER person is typing
    const showTyping = typingUser !== null && otherId !== null && String(typingUser) === String(otherId);

    /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */
    return (
        <div className="flex h-full w-full overflow-hidden gap-3">

            {/* ═══════════════ SIDEBAR ═══════════════ */}
            <div className={`
                flex flex-col glass rounded-2xl border border-white/5 overflow-hidden shrink-0 transition-all duration-300
                ${mobileView === 'chat' ? 'hidden sm:flex sm:w-64 lg:w-72' : 'flex w-full sm:w-64 lg:w-72'}
            `}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 shrink-0 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-white tracking-tight">
                            <span className="text-indigo-400 italic">Sync</span> Chat
                        </h2>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setIsGroupModal(true)}
                                className="w-7 h-7 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20 transition-all"
                                title="New group"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20" title="E2EE Active">
                                <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Find people…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-400 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 py-1">
                    {searchQuery ? (
                        filteredConns.length === 0
                            ? <p className="text-center text-gray-600 text-xs py-10 px-4">No results for "{searchQuery}"</p>
                            : filteredConns.map(c => (
                                <button
                                    key={`c-${c.role}-${c.id}`}
                                    onClick={() => startWithConn(c)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 flex items-center justify-center text-indigo-200 font-black">
                                            {c.avatar || c.name?.[0]}
                                        </div>
                                        {c.is_online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1120]" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                        <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">{c.role}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                                </button>
                            ))
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center gap-3">
                            <MessageCircle className="w-8 h-8 text-white/10" />
                            <p className="text-xs text-gray-600 leading-relaxed">No conversations yet.<br />Search a person above to start.</p>
                        </div>
                    ) : sessions.map(s => (
                        <SessionItem
                            key={s.session_id}
                            s={s}
                            isActive={activeSession?.session_id === s.session_id}
                            onClick={() => openChat(s)}
                        />
                    ))}
                </div>
            </div>

            {/* ═══════════════ SETTINGS DRAWER ═══════════════ */}
            {showSettings && activeSessionDetail && (
                <div className="fixed inset-y-0 right-0 w-80 glass z-[150] border-l border-white/10 shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Room Intelligence</h3>
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-indigo-600/20 flex items-center justify-center mx-auto text-indigo-400 text-3xl font-black">
                            {activeSessionDetail.name?.[0] || 'G'}
                        </div>
                        <div className="text-center">
                            <h4 className="text-lg font-bold text-white">{activeSessionDetail.name || 'Secure Group'}</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">Ref: {activeSessionDetail.participants_metadata?.drive_id ? `Placement Drive #${activeSessionDetail.participants_metadata.drive_id}` : 'General Session'}</p>
                        </div>
                    </div>

                    {/* Admin Controls */}
                    {['INST_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || '') && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Orchestration Controls</p>
                            <div className="glass p-4 rounded-2xl border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-300">Announcement Only</span>
                                    <button 
                                        onClick={async () => {
                                            const newVal = !activeSessionDetail.participants_metadata?.read_only_for_students;
                                            await socialApi.updateGroupSettings(activeSessionDetail.session_id, newVal);
                                            setActiveSessionDetail({
                                                ...activeSessionDetail,
                                                participants_metadata: { ...activeSessionDetail.participants_metadata, read_only_for_students: newVal }
                                            });
                                            toast.success(newVal ? "Switched to Announcement Mode" : "Comments Enabled");
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-all ${activeSessionDetail.participants_metadata?.read_only_for_students ? 'bg-indigo-600' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${activeSessionDetail.participants_metadata?.read_only_for_students ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-500 italic">Students will only be able to view messages, not send.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Participants ({activeSessionDetail.participants?.length || 0})</p>
                        {activeSessionDetail.participants?.map((p: any) => {
                            const isMe = Number(p.id) === Number(user?.id) && p.role === user?.role;
                            return (
                                <div key={`${p.role}-${p.id}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group/p">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-black text-[10px] text-indigo-400">
                                        {p.name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                        <p className="text-[9px] text-indigo-500/60 font-black uppercase tracking-widest">{p.role}</p>
                                    </div>
                                    {['INST_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || '') && !isMe && (
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm(`Expel ${p.name} from this session?`)) {
                                                    try {
                                                        await socialApi.removeParticipant(activeSessionDetail.session_id, p.id, p.role);
                                                        setActiveSessionDetail({
                                                            ...activeSessionDetail,
                                                            participants: activeSessionDetail.participants.filter((x: any) => !(x.id === p.id && x.role === p.role))
                                                        });
                                                        toast.success("Participant Purged.");
                                                    } catch {
                                                        toast.error("Moderation Failure.");
                                                    }
                                                }
                                            }}
                                            className="opacity-0 group-hover/p:opacity-100 p-2 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                                            title="Expel Participant"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════════════ CHAT PANEL ═══════════════ */}
            <div className={`
                flex-1 flex flex-col glass rounded-2xl border border-white/5 overflow-hidden min-w-0 min-h-0
                ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}
            `}>
                {activeSession ? (
                    <>
                        {/* ── Chat header ── */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-white/[0.02] shrink-0">
                            {/* Back (mobile) */}
                            <button
                                onClick={() => setMobileView('list')}
                                className="sm:hidden w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            {/* Avatar with online dot */}
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 flex items-center justify-center text-indigo-200 font-black">
                                    {activeSession.other_name?.[0] ?? '?'}
                                </div>
                                {activeSession.is_online && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1120]" />
                                )}
                            </div>

                            {/* Name + status */}
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => activeSession.is_group && setShowSettings(true)}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-sm truncate">{activeSession.other_name}</span>
                                    {activeSession.is_group && (
                                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-500/10">
                                            {activeSessionDetail?.participants?.length || '?'} Participants
                                        </span>
                                    )}
                                </div>
                                {/* Second line: typing |last seen | live indicator */}
                                <div className="flex items-center gap-1.5 mt-0.5 h-4">
                                    {showTyping ? (
                                        /* Show typing in header for desktop users too */
                                        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                            <span className="flex gap-0.5">
                                                {[0, 100, 200].map(d => (
                                                    <span key={d} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                                ))}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-300">typing…</span>
                                        </div>
                                    ) : activeSession.is_online ? (
                                        <div className="flex items-center gap-1">
                                            {connected
                                                ? <Wifi className="w-2.5 h-2.5 text-green-400" />
                                                : <WifiOff className="w-2.5 h-2.5 text-red-400" />
                                            }
                                            <span className={`text-[10px] font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                                                {connected ? 'Active now' : 'Reconnecting…'}
                                            </span>
                                        </div>
                                    ) : activeSession.last_seen ? (
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Clock className="w-2.5 h-2.5" />
                                            <span className="text-[10px]">Seen {formatLastSeen(activeSession.last_seen)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            {connected
                                                ? <Wifi className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                                                : <WifiOff className="w-2.5 h-2.5 text-red-400" />
                                            }
                                            <span className={`text-[10px] font-bold ${connected ? 'text-indigo-400' : 'text-red-400'}`}>
                                                {connected ? 'E2EE Live' : 'Reconnecting…'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => toast('Voice call — coming soon')} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all" title="Voice call"><Phone className="w-3.5 h-3.5" /></button>
                                <button onClick={() => toast('Video call — coming soon')} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all" title="Video call"><Video className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSession(activeSession.session_id)} className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all" title="Remove chat"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>

                        {/* ── Messages ── */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar min-h-0">
                            {/* E2EE badge */}
                            <div className="flex flex-col items-center gap-1 py-3 mb-2 select-none">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-500/25" />
                                <span className="text-[9px] font-black text-white/15 uppercase tracking-[0.2em]">End-to-End Encrypted</span>
                            </div>

                            {groups.map(g => (
                                <div key={g.label}>
                                    <DateSep label={g.label} />
                                    {g.msgs.map((msg, i) => <MsgBubble key={msg.id ?? i} msg={msg} />)}
                                </div>
                            ))}

                            {/* Typing indicator in chat (bubble) */}
                            {showTyping && (
                                <TypingBubble name={activeSession.other_name ?? 'Someone'} />
                            )}
                        </div>

                        {/* ── Input bar ── */}
                        <div className="shrink-0 px-3 py-2.5 border-t border-white/5 bg-white/[0.02] relative">
                            {/* Emoji panel */}
                            {showEmojis && (
                                <div
                                    ref={emojiRef}
                                    className="absolute bottom-full left-3 mb-2 z-50 bg-[#111218] border border-white/10 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-150"
                                >
                                    <div className="grid grid-cols-6 gap-1" style={{ width: 216 }}>
                                        {EMOJIS.map(e => (
                                            <button
                                                key={e}
                                                onClick={() => {
                                                    setMsgInput(p => p + e);
                                                    setShowEmojis(false);
                                                    inputRef.current?.focus();
                                                }}
                                                className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10"
                                            >{e}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {/* Emoji */}
                                <button
                                    onClick={() => setShowEmojis(v => !v)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${showEmojis ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                >
                                    <Smile className="w-4 h-4" />
                                </button>

                                {/* Attach */}
                                <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,video/*" className="hidden" />
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0"
                                    title="Attach file"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>

                                {/* Voice */}
                                <button
                                    onClick={handleVoice}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                    title={isRecording ? 'Stop recording' : 'Voice message'}
                                >
                                    <Mic className="w-4 h-4" />
                                </button>

                                {/* Text input */}
                                <input
                                    ref={inputRef}
                                    type="text"
                                     placeholder={
                                        isRecording ? '🔴 Recording…'
                                            : !connected ? 'Reconnecting…'
                                            : activeSessionDetail?.participants_metadata?.read_only_for_students && !['INST_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || '')
                                            ? '🚨 Only admins can message here'
                                            : `Message ${activeSession.other_name}…`
                                    }
                                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all font-medium disabled:opacity-20 disabled:cursor-not-allowed"
                                    value={msgInput}
                                    onChange={e => onTyping(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    disabled={isRecording || (activeSessionDetail?.participants_metadata?.read_only_for_students && !['INST_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || ''))}
                                    autoComplete="off"
                                />

                                {/* Send */}
                                <button
                                    onClick={isRecording ? handleVoice : handleSend}
                                    disabled={!isRecording && (!msgInput.trim() || !connected)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow transition-all shrink-0 ${isRecording
                                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                        : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25 hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {isRecording
                                        ? <div className="w-3 h-3 bg-white rounded-sm" />
                                        : <Send className="w-4 h-4 ml-0.5" />
                                    }
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative">
                                <MessageCircle className="w-8 h-8 text-white/20" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg rotate-12">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-xs">
                            <h2 className="text-xl font-black text-white">Secure <span className="text-indigo-400 italic">Chat</span></h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Select a conversation or search for a friend to start a real-time encrypted chat.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/discovery'}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105"
                        >
                            Explore Network
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════════════ GROUP MODAL ═══════════════ */}
            {isGroupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setIsGroupModal(false)} />
                    <div className="relative w-full max-w-sm glass p-5 rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-base font-black text-white">Create <span className="text-indigo-400">Group</span></h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Encrypted multi-peer channel</p>
                            </div>
                            <button onClick={() => setIsGroupModal(false)} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors shrink-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Group name…"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 mb-3 transition-all"
                        />
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Select members ({selPeers.length})
                        </p>
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-1.5 mb-4">
                            {connections.length === 0
                                ? <p className="text-xs text-gray-600 text-center py-6">No connections to add.</p>
                                : connections.map(c => {
                                    const sel = !!selPeers.find(p => p.id === c.id && p.role === c.role);
                                    return (
                                        <button
                                            key={`g-${c.role}-${c.id}`}
                                            onClick={() => togglePeer(c)}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all ${sel ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:border-white/15'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0">{c.avatar || c.name?.[0]}</div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                                <p className="text-[9px] text-gray-500 uppercase">{c.role}</p>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                {sel && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                        </button>
                                    );
                                })
                            }
                        </div>
                        <button
                            onClick={createGroup}
                            disabled={!groupName.trim() || selPeers.length === 0}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            <Users className="w-3.5 h-3.5" /> Create Group
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
