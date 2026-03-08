import React from 'react';
import { Search, UserPlus, ShieldCheck, MessageCircle, ChevronRight } from 'lucide-react';
import { safeTime } from '../utils/chat-utils';

interface ChatSidebarProps {
    sessions: any[];
    connections: any[];
    searchQuery: string;
    onSearch: (val: string) => void;
    activeSessionId: string | null;
    onSessionClick: (s: any) => void;
    onStartGroup: () => void;
    onStartConn: (c: any) => void;
    mobileView: 'list' | 'chat';
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    sessions, connections, searchQuery, onSearch, activeSessionId, onSessionClick, onStartGroup, onStartConn, mobileView
}) => {
    const filteredConns = connections.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`
            flex flex-col glass rounded-2xl border border-white/5 overflow-hidden shrink-0 transition-all duration-300
            ${mobileView === 'chat' ? 'hidden sm:flex sm:w-64 lg:w-72' : 'flex w-full sm:w-64 lg:w-72'}
        `}>
            {/* Premium Header */}
            <div className="px-6 py-5 border-b border-white/10 shrink-0 space-y-4 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                            <MessageCircle className="w-4 h-4 text-white" />
                         </div>
                         <h2 className="text-lg font-black text-white tracking-tight uppercase">
                            <span className="text-indigo-400">Sync</span> Hub
                         </h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onStartGroup}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white border border-white/5 transition-all active:scale-90"
                            title="Construct Room"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20" title="Security Active">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                </div>
                <div className="relative group/search">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-600 group-focus-within/search:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="SCAN NETWORK…"
                        value={searchQuery}
                        onChange={e => onSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-[11px] font-black uppercase tracking-widest text-white placeholder-gray-700 focus:outline-none focus:border-indigo-400/50 focus:bg-white/[0.08] transition-all shadow-inner"
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
                                onClick={() => onStartConn(c)}
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
                        isActive={activeSessionId === s.session_id}
                        onClick={() => onSessionClick(s)}
                    />
                ))}
            </div>
        </div>
    );
};

const SessionItem = ({ s, isActive, onClick }: { s: any; isActive: boolean; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all border-l-[3px] relative group/item active:scale-[0.98] ${isActive
            ? 'bg-indigo-600/10 border-indigo-500 shadow-[inset_10px_0_20px_rgba(79,70,229,0.05)]'
            : 'border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
    >
        <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] flex items-center justify-center font-black text-lg border transition-all ${isActive ? 'text-white border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'text-indigo-200 border-white/5 shadow-inner'}`}>
                {s.other_name?.[0] ?? '?'}
            </div>
            {s.is_online && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] border-[#0b1120] shadow-lg shadow-green-500/20" />
            )}
            {s.unread_count > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[9px] font-black rounded-lg flex items-center justify-center px-1 border-[3px] border-[#0b1120] shadow-xl animate-bounce">
                    {s.unread_count}
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[13px] font-black truncate uppercase tracking-tight transition-colors ${isActive ? 'text-white' : 'text-gray-200 group-hover/item:text-white'}`}>{s.other_name}</span>
                {s.last_msg_at && (
                    <span className="text-[9px] font-black text-gray-600 shrink-0 uppercase tracking-tighter">{safeTime(s.last_msg_at)}</span>
                )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
                <p className={`text-[11px] truncate flex-1 font-bold ${isActive ? 'text-indigo-300' : 'text-gray-500 group-hover/item:text-gray-400'}`}>
                    {s.last_msg_preview || 'INITIALIZE SEQUENCE...'}
                </p>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-indigo-400 translate-x-1' : 'text-gray-700'}`} />
            </div>
        </div>
    </button>
);
