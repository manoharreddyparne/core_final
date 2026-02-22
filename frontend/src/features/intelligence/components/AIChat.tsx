// src/features/intelligence/components/AIChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { intelligenceApi } from '../api';

export const AIChat: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | 'new' | null>(null);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial load: fetch conversations
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const convs = await intelligenceApi.getConversations();
                setConversations(convs);
                if (convs.length > 0) {
                    setActiveConversationId(convs[0].id);
                } else {
                    setActiveConversationId('new');
                }
            } catch (err) {
                console.error("Failed to load conversations", err);
                setActiveConversationId('new');
            }
        };
        loadInitialData();
    }, []);

    // Load messages when active conversation changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeConversationId || activeConversationId === 'new') {
                setMessages([]);
                return;
            }

            try {
                setLoading(true);
                const msgs = await intelligenceApi.getMessages(activeConversationId);
                setMessages(msgs.map(m => ({
                    role: m.role as 'user' | 'assistant',
                    text: m.content
                })));
            } catch (err) {
                console.error("Failed to load messages", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [activeConversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            const data = await intelligenceApi.askAI(userMsg, activeConversationId || undefined);
            const aiText = typeof data === 'string' ? data : data.response;
            const newConvId = typeof data === 'object' ? data.conversation_id : null;

            setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);

            // If it was a new conversation, update the list and set as active
            if (activeConversationId === 'new' && newConvId) {
                const refreshedConvs = await intelligenceApi.getConversations();
                setConversations(refreshedConvs);
                setActiveConversationId(newConvId);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to the Governance Brain. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    const startNewChat = () => {
        setActiveConversationId('new');
        setMessages([]);
    };

    const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm("Delete this conversation?")) return;

        try {
            await intelligenceApi.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversationId === id) {
                startNewChat();
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    return (
        <div className="glass rounded-[2rem] flex h-[600px] overflow-hidden border border-white/5 shadow-2xl relative">
            {/* Sidebar Toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all backdrop-blur-md"
            >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Sidebar: Conversations List */}
            <div className={`transition-all duration-300 border-r border-white/5 bg-black/40 flex flex-col ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden opacity-0'}`}>
                <div className="p-4 border-b border-white/5">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-blue-400 hover:bg-primary/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <Plus className="w-4 h-4" /> New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => setActiveConversationId(conv.id)}
                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeConversationId === conv.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                                <span className="text-sm font-medium truncate">{conv.title}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {conversations.length === 0 && activeConversationId !== 'new' && (
                        <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest mt-4">No History</p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-transparent">
                <div className="px-10 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                        <h3 className="font-black text-white italic tracking-tight text-lg">AI <span className="text-primary NOT-italic">Intelligence</span></h3>
                    </div>
                    {activeConversationId === 'new' && (
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full">New Session</span>
                    )}
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-10 py-6 space-y-6 custom-scrollbar"
                >
                    {messages.length === 0 && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 px-4">
                            <div className="w-16 h-16 rounded-[2rem] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-6 group-hover:rotate-0 transition-transform">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-white italic">Governance Brain Active</h4>
                                <p className="text-sm text-gray-400 max-w-sm">
                                    I am synced with your academic matrix. Ask me anything about your career path or platform features.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-full max-w-md pt-6">
                                {["Placement readiness?", "Resume tips?", "Portal features?", "Behavior matrix?"].map(hint => (
                                    <button
                                        key={hint}
                                        onClick={() => { setQuery(hint); }}
                                        className="text-[10px] font-bold text-gray-400 border border-white/5 bg-white/5 p-3 rounded-xl hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all text-left"
                                    >
                                        "{hint}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-black shadow-lg
                                    ${m.role === 'user' ? 'bg-blue-600/20 text-blue-400' : 'premium-gradient text-white'}
                                `}>
                                    {m.role === 'user' ? 'U' : 'AI'}
                                </div>
                                <div className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-xl
                                    ${m.role === 'user'
                                        ? 'bg-blue-600/10 text-blue-50 border border-blue-500/20 rounded-tr-md'
                                        : 'bg-[#1e293b]/60 text-gray-100 border border-white/5 backdrop-blur-xl rounded-tl-md'}
                                `}>
                                    <div className="space-y-3">
                                        {m.text.split('\n').map((line, linIdx) => {
                                            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                                            const parts = line.split(linkRegex);

                                            if (parts.length > 1) {
                                                const content = [];
                                                for (let j = 0; j < parts.length; j++) {
                                                    if (j % 3 === 0) {
                                                        content.push(parts[j]);
                                                    } else if (j % 3 === 1) {
                                                        const label = parts[j];
                                                        const url = parts[j + 1];
                                                        content.push(
                                                            <button
                                                                key={j}
                                                                onClick={() => navigate(url)}
                                                                className="inline-flex mt-2 mb-1 px-5 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black tracking-widest transition-all uppercase"
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                        j++;
                                                    }
                                                }
                                                return <p key={linIdx}>{content}</p>;
                                            }
                                            return <p key={linIdx}>{line}</p>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10"></div>
                                <div className="bg-white/5 px-6 py-3 rounded-3xl text-xs font-bold text-gray-400">
                                    Processing academic vector...
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-black/20 border-t border-white/5 m-4 rounded-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your academic inquiry..."
                            className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !query.trim()}
                            className="bg-primary hover:bg-primary/90 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
