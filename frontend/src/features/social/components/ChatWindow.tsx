import React, { useRef, useEffect } from 'react';
import { 
    Phone, Video, Trash2, ArrowLeft, Wifi, WifiOff, Clock, ShieldCheck, 
    Smile, Image as ImageIcon, Mic, Send, Check, CheckCheck 
} from 'lucide-react';
import { safeTime, formatLastSeen, groupByDate, EMOJIS } from '../utils/chat-utils';
import { toast } from 'react-hot-toast';

interface ChatWindowProps {
    activeSession: any;
    activeSessionDetail: any;
    messages: any[];
    connected: boolean;
    typingUsers: Record<string, { name: string, timer: any }>;
    otherId: any;
    user: any;
    msgInput: string;
    showEmojis: boolean;
    isRecording: boolean;
    onBack: () => void;
    onSettings: () => void;
    onDelete: (sid: string) => void;
    onSend: () => void;
    onTyping: (val: string) => void;
    onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVoice: () => void;
    onEmojiToggle: () => void;
    onEmojiClick: (e: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = (props) => {
    const {
        activeSession, activeSessionDetail, messages, connected, typingUsers, otherId, 
        user, msgInput, showEmojis, isRecording, onBack, onSettings, onDelete, onSend, onTyping, onFile, onVoice, onEmojiToggle, onEmojiClick
    } = props;

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);

    // Unified Auto-Scroll Logic
    useEffect(() => {
        if (!scrollRef.current) return;
        
        const scroll = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        };

        // Scroll immediately
        scroll();
        
        // And scroll again after a tiny delay for images/rendering
        const timer = setTimeout(scroll, 50);
        return () => clearTimeout(timer);
    }, [messages.length, Object.keys(typingUsers).length, activeSession?.session_id]);

    const groups = groupByDate(messages);
    
    // Unified Typing Logic
    const typingList = Object.values(typingUsers).map(u => u.name);

    const isReadOnly = activeSessionDetail?.participants_metadata?.read_only_for_students && !['INST_ADMIN', 'INSTITUTION_ADMIN', 'ADMIN', 'FACULTY'].includes(user?.role || '');

    return (
        <div className="flex-1 flex flex-col glass rounded-2xl border border-white/5 overflow-hidden min-w-0 min-h-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-white/[0.02] shrink-0">
                <button onClick={onBack} className="sm:hidden w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 flex items-center justify-center text-indigo-200 font-black">
                        {activeSession.other_name?.[0] ?? '?'}
                    </div>
                    {activeSession.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1120]" />
                    )}
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={onSettings}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{activeSession.other_name}</span>
                        {activeSession.is_group && (
                            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-500/10">
                                {activeSessionDetail?.participants?.length || '?'} Participants
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 h-4">
                        {typingList.length > 0 ? (
                            <div className="flex items-center gap-1 animate-pulse">
                                <div className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                    {typingList.length === 1 ? `${typingList[0]} is typing…` : `${typingList.length} people are typing…`}
                                </span>
                            </div>
                        ) : activeSession.is_online ? (
                            <div className="flex items-center gap-1">
                                {connected ? <Wifi className="w-2.5 h-2.5 text-green-400" /> : <WifiOff className="w-2.5 h-2.5 text-red-400" />}
                                <span className={`text-[10px] font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>{connected ? 'Active now' : 'Reconnecting…'}</span>
                            </div>
                        ) : activeSession.last_seen ? (
                            <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-[10px]">Seen {formatLastSeen(activeSession.last_seen)}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                {connected ? <Wifi className="w-2.5 h-2.5 text-indigo-400 animate-pulse" /> : <WifiOff className="w-2.5 h-2.5 text-red-400" />}
                                <span className={`text-[10px] font-bold ${connected ? 'text-indigo-400' : 'text-red-400'}`}>{connected ? 'E2EE Live' : 'Reconnecting…'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toast('Voice call — coming soon')} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"><Phone className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toast('Video call — coming soon')} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"><Video className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(activeSession.session_id)} className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar min-h-0 bg-[#0b1120]/40 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1 py-3 mb-2 select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500/25" />
                    <span className="text-[9px] font-black text-white/15 uppercase tracking-[0.2em]">End-to-End Encrypted</span>
                </div>

                {groups.map(g => (
                    <div key={g.label}>
                        <div className="flex justify-center my-4 select-none">
                            <span className="text-[10px] font-black text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-wider">{g.label}</span>
                        </div>
                        {g.msgs.map((msg, i) => <MsgBubble key={msg.id ?? i} msg={msg} />)}
                    </div>
                ))}

                {/* Body Typing Indicator (Premium WhatsApp Style) */}
                {typingList.map(name => (
                    <div key={name} className="flex justify-start mb-4 animate-in slide-in-from-left-2 duration-300">
                        <div className="flex flex-col gap-1 items-start">
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <span className="flex gap-1">
                                    {[0, 100, 200].map(d => <span key={d} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-300">{name} is typing…</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Bar */}
            <div className="shrink-0 px-3 py-2.5 border-t border-white/5 bg-white/[0.02] relative">
                {showEmojis && (
                    <div ref={emojiRef} className="absolute bottom-full left-3 mb-2 z-50 bg-[#111218] border border-white/10 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-150">
                        <div className="grid grid-cols-6 gap-1" style={{ width: 216 }}>
                            {EMOJIS.map(e => <button key={e} onClick={() => onEmojiClick(e)} className="text-xl hover:scale-125 p-1 rounded-lg hover:bg-white/10">{e}</button>)}
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={onEmojiToggle} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${showEmojis ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}><Smile className="w-4 h-4" /></button>
                    <input type="file" ref={fileRef} onChange={onFile} accept="image/*,video/*" className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 shrink-0"><ImageIcon className="w-4 h-4" /></button>
                    <button onClick={onVoice} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}><Mic className="w-4 h-4" /></button>
                    <input 
                        ref={inputRef} type="text" value={msgInput} onChange={e => onTyping(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        disabled={isRecording || isReadOnly}
                        placeholder={isRecording ? '🔴 Recording…' : !connected ? 'Reconnecting…' : isReadOnly ? '🚨 Only admins can message' : `Message ${activeSession.other_name}…`}
                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                    <button onClick={onSend} disabled={!isRecording && (!msgInput.trim() || !connected)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-25'}`}>
                        {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MsgBubble = ({ msg }: { msg: any }) => {
    const isMe = msg.is_me;
    return (
        <div className={`flex w-full mb-4 animate-in ${isMe ? 'justify-end slide-in-from-right-4' : 'justify-start slide-in-from-left-4'} duration-500`}>
            <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: '85%' }}>
                {/* Point 9: Sender Info for Groups */}
                {!isMe && msg.sender_name && (
                    <div className="flex items-center gap-2 px-1 mb-0.5">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{msg.sender_name}</span>
                        <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-1.5 rounded-sm border border-white/5">{msg.sender_role}</span>
                    </div>
                )}
                
                <div className={`
                    px-4 py-3 rounded-[1.25rem] text-sm shadow-2xl break-words relative group
                    ${isMe 
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-500/10' 
                        : 'bg-[#1a1c23] border border-white/10 text-gray-100 rounded-tl-none ring-1 ring-white/5'
                    }
                `}>
                    {msg.attachment_type === 'IMAGE' ? (
                        <div className="rounded-xl overflow-hidden bg-black/20 border border-white/5 -m-1">
                            <img src={msg.content} className="max-w-full block hover:scale-105 transition-transform cursor-zoom-in" alt="Chat attachment" />
                        </div>
                    ) : msg.attachment_type === 'VOICE' ? (
                        <VoicePlayer src={msg.content} isMe={isMe} duration={msg.metadata?.duration} />
                    ) : msg.attachment_type === 'VIDEO' ? (
                        <video controls className="max-w-full rounded-xl max-h-60 border border-white/10 shadow-lg -m-1">
                            <source src={msg.content} type="video/mp4" />
                        </video>
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                </div>

                <div className={`flex items-center gap-1.5 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter opacity-70 italic">{safeTime(msg.timestamp)}</span>
                    {isMe && (
                         msg.status === 'SEEN' ? <CheckCheck className="w-3.5 h-3.5 text-indigo-400" /> :
                         msg.status === 'DELIVERED' ? <CheckCheck className="w-3.5 h-3.5 text-gray-600" /> :
                         <Check className="w-3.5 h-3.5 text-gray-700" />
                    )}
                </div>
            </div>
        </div>
    );
};

const VoicePlayer = ({ src, isMe, duration }: { src: string, isMe: boolean, duration?: number }) => {
    const [playing, setPlaying] = React.useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [progress, setProgress] = React.useState(0);

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) audioRef.current.pause();
        else audioRef.current.play();
        setPlaying(!playing);
    };

    return (
        <div className={`flex items-center gap-3 py-1 min-w-[200px] ${isMe ? 'text-white' : 'text-indigo-200'}`}>
            <button onClick={toggle} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-indigo-500/20 hover:bg-indigo-500/30'}`}>
                {playing ? <div className="w-3 h-3 bg-current rounded-sm" /> : <Send className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
            <div className="flex-1 space-y-1.5">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-current transition-all duration-100`} style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-black opacity-60 uppercase tracking-tighter">
                    <span>{playing ? 'Playing' : 'Voice Note'}</span>
                    <span>{duration ? `${Math.floor(duration)}s` : '0:00'}</span>
                </div>
            </div>
            <audio 
                ref={audioRef} src={src} 
                onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0)}
                onEnded={() => { setPlaying(false); setProgress(0); }}
                className="hidden" 
            />
        </div>
    );
};
