import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Bot, Sparkles, Loader2, Maximize2, Minimize2, Plus, MessageSquare, History, ShieldCheck } from 'lucide-react';
import { intelligenceApi } from '../api';

export const FloatingAIAssistant: React.FC = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Draggable Position State
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const botRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | 'new' | null>(null);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 🛡️ Safety: Reset expanded state if closed
    useEffect(() => {
        if (!isOpen) {
            if (isExpanded) setPosition({ x: 0, y: 0 });
            setIsExpanded(false);
            setShowHistory(false);
        }
    }, [isOpen]);

    // Optimized Dragging Logic (using transform for performance)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            dragStart.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            // Snap to bounds if needed
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove, { passive: true });
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const onMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Block dragging on actual inputs/textareas/links
        if (target.closest('input, textarea, a')) return;

        // If open, only allow dragging on header/footer
        if (isOpen) {
            const isHandle = target.closest('.drag-handle');
            const isButton = target.closest('button');
            if (!isHandle || (isButton && !target.closest('.drag-handle'))) return;
        }

        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
    };

    // Load conversations when opened
    useEffect(() => {
        if (isOpen) {
            const loadConvs = async () => {
                try {
                    const convs = await intelligenceApi.getConversations();
                    setConversations(convs);
                    if (convs.length > 0 && !activeConversationId) {
                        setActiveConversationId(convs[0].id);
                    } else if (!activeConversationId) {
                        setActiveConversationId('new');
                    }
                } catch (err) {
                    console.error("Failed to load conversations", err);
                    setActiveConversationId('new');
                }
            };
            loadConvs();
        }
    }, [isOpen]);

    // Load messages when conversation changes
    useEffect(() => {
        if (isOpen && activeConversationId && activeConversationId !== 'new') {
            const fetchMessages = async () => {
                try {
                    setLoading(true);
                    const msgs = await intelligenceApi.getMessages(activeConversationId);
                    setMessages(msgs.map(m => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content
                    })));
                } catch (err) {
                    console.error("Failed to load messages:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchMessages();
        } else if (activeConversationId === 'new') {
            setMessages([]);
        }
    }, [isOpen, activeConversationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, isOpen, isExpanded]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const msg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const data = await intelligenceApi.askAI(msg, activeConversationId === 'new' ? undefined : (activeConversationId || undefined));
            const aiText = typeof data === 'string' ? data : data.response;
            const newId = typeof data === 'object' ? data.conversation_id : null;

            setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);

            if (activeConversationId === 'new' && newId) {
                setActiveConversationId(newId);
                intelligenceApi.getConversations().then(setConversations);
            }
        } catch (err: any) {
            console.error("AI Error:", err);
            const errorMsg = "I'm currently undergoing system maintenance. Please check back shortly.";
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    const startNewChat = () => {
        setActiveConversationId('new');
        setMessages([]);
        setShowHistory(false);
    };

    return (
        <div
            ref={botRef}
            className={`fixed z-50 ${!isDragging ? 'transition-all duration-700 cubic-bezier(0.19, 1, 0.22, 1)' : ''} ${isExpanded
                ? 'w-[75%] h-[80vh] min-h-[500px] top-1/2 left-1/2'
                : ''
                }`}
            style={{
                bottom: isExpanded ? 'auto' : '1.5rem',
                right: isExpanded ? 'auto' : '1.5rem',
                transform: isExpanded
                    ? `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
                    : `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : 'auto',
                touchAction: 'none'
            }}
        >
            {/* Chatbot Window */}
            {isOpen && (
                <div className={`absolute right-1/2 translate-x-1/2 md:right-0 md:translate-x-0 bg-[#070b14]/98 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-700 ring-1 ring-white/10
                    ${isExpanded
                        ? 'inset-0 w-full h-full mb-0 translate-x-0'
                        : 'bottom-full mb-6 w-[92vw] md:w-[480px] h-[60vh] max-h-[600px] min-h-[400px] translate-y-0 slide-in-from-bottom-5'
                    }
                `}>
                    {/* Premium Header - Draggable */}
                    <div
                        onMouseDown={onMouseDown}
                        className="p-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing select-none drag-handle"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative group/bot">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-white/10 shadow-2xl transition-transform group-hover/bot:scale-110">
                                <img
                                    src="/auip_ai_core.png"
                                    alt="AI Bot"
                                    className="w-full h-full object-cover rounded-full animate-float-slow mix-blend-screen"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png';
                                    }}
                                />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#070b14] animate-pulse"></div>
                            </div>
                            <div>
                                <h3 className="text-white font-black tracking-tighter text-lg leading-tight flex items-center gap-2">
                                    Nexora Brain
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">v4.0 Alpha</span>
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Neural Network Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showHistory ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}
                                title="Chat History"
                            >
                                <History className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                                className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative bg-[#070b14]">
                        {/* Sub-layers for aesthetics */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none"></div>

                        {/* History Overlay */}
                        {showHistory && (
                            <div className={`absolute inset-0 z-20 bg-[#070b14]/98 backdrop-blur-3xl animate-in slide-in-from-left duration-500 p-8 overflow-y-auto custom-scrollbar border-r border-white/5 ${isExpanded ? 'w-96 shadow-2xl' : 'w-full'}`}>
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-white font-black tracking-[0.3em] uppercase text-[10px] opacity-40">Conversation Logs</h4>
                                    <button onClick={startNewChat} className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-600/30 transition-all shadow-lg shadow-blue-500/10">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <button
                                        onClick={startNewChat}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all ${activeConversationId === 'new' ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-xl shadow-blue-500/5' : 'bg-white/[0.03] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-black tracking-wide">Initialize New Session</span>
                                        </div>
                                    </button>
                                    <div className="h-px bg-white/5 mx-2 my-6"></div>
                                    {conversations.map(conv => (
                                        <button
                                            key={conv.id}
                                            onClick={() => { setActiveConversationId(conv.id); setShowHistory(false); }}
                                            className={`w-full text-left p-5 rounded-2xl border transition-all group ${activeConversationId === conv.id ? 'bg-white/10 border-white/20 text-white shadow-2xl' : 'bg-white/[0.02] border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeConversationId === conv.id ? 'bg-blue-500 text-white' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                                    <MessageSquare className="w-4 h-4 opacity-50" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate tracking-tight">{conv.title}</p>
                                                    <p className="text-[9px] opacity-40 mt-1 uppercase font-black tracking-widest">{new Date(conv.updated_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-8 custom-scrollbar relative z-10">
                            {messages.length === 0 && !loading && (
                                <div className="text-center text-gray-400 mt-20 space-y-8 animate-in fade-in zoom-in-95 duration-700">
                                    <div className="relative w-24 h-24 mx-auto group/launch">
                                        <div className="absolute inset-0 bg-blue-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover/launch:opacity-40 transition-opacity"></div>
                                        <div className="relative w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-3xl hover:rotate-2 transition-transform">
                                            <Bot className="w-12 h-12 text-blue-500 animate-pulse" />
                                            <Sparkles className="absolute top-4 right-4 w-4 h-4 text-blue-400 animate-bounce" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-lg font-black text-white italic tracking-tight leading-none">Neural Core Online</p>
                                        <p className="text-[11px] text-gray-500 uppercase tracking-[0.25em] max-w-[280px] mx-auto leading-relaxed font-bold">
                                            Synchronized with institutional governance protocols
                                        </p>
                                    </div>
                                    <div className="pt-6 flex flex-wrap gap-2.5 justify-center max-w-sm mx-auto">
                                        {[
                                            { label: "My Eligibility", icon: <ShieldCheck className="w-3 h-3" /> },
                                            { label: "System Audit", icon: <History className="w-3 h-3" /> },
                                            { label: "Help Center", icon: <Sparkles className="w-3 h-3" /> }
                                        ].map(hint => (
                                            <button
                                                key={hint.label}
                                                onClick={() => setInput(hint.label)}
                                                className="group px-4 py-2 bg-white/[0.03] hover:bg-blue-600/10 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/30 flex items-center gap-2"
                                            >
                                                {hint.icon}
                                                {hint.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                                    <div className={`px-6 py-5 max-w-[90%] md:max-w-[600px] text-sm shadow-2xl leading-relaxed relative ${m.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] rounded-tr-md font-medium'
                                        : 'bg-white/[0.05] border border-white/10 text-gray-200 rounded-[2rem] rounded-tl-md backdrop-blur-2xl'
                                        }`}>
                                        {m.role === 'assistant' ? (
                                            <div className="space-y-4">
                                                {m.content.split('\n').map((line, linIdx) => {
                                                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                                                    const parts = line.split(linkRegex);
                                                    if (parts.length > 1) {
                                                        const content = [];
                                                        for (let j = 0; j < parts.length; j++) {
                                                            if (j % 3 === 0) content.push(parts[j]);
                                                            else if (j % 3 === 1) {
                                                                const label = parts[j];
                                                                const url = parts[j + 1];
                                                                content.push(
                                                                    <button
                                                                        key={j}
                                                                        onClick={() => {
                                                                            if (url.startsWith('http')) {
                                                                                const cleanUrl = url.includes('?') ? `${url}&source=Nexora` : `${url}?source=Nexora`;
                                                                                window.open(cleanUrl, '_blank', 'noopener,noreferrer');
                                                                            } else {
                                                                                navigate(url);
                                                                                setIsOpen(false);
                                                                                setIsExpanded(false);
                                                                            }
                                                                        }}
                                                                        className="block w-full mt-4 mb-2 px-6 py-4 bg-blue-600/20 hover:bg-blue-600 text-white border border-blue-500/30 rounded-2xl text-[11px] font-black tracking-[0.2em] transition-all text-center uppercase shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2 group/link"
                                                                    >
                                                                        <span>{label}</span>
                                                                        <Maximize2 className="w-3 h-3 opacity-50 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all" />
                                                                    </button>
                                                                );
                                                                j++;
                                                            }
                                                        }
                                                        return <p key={linIdx} className="leading-relaxed">{content}</p>;
                                                    }
                                                    return <p key={linIdx} className="leading-relaxed">{line}</p>;
                                                })}
                                            </div>
                                        ) : (
                                            m.content
                                        )}
                                        {/* Subtle timestamp/indicator */}
                                        <div className={`absolute -bottom-5 ${m.role === 'user' ? 'right-2' : 'left-2'} text-[8px] font-black uppercase tracking-widest text-gray-600 opacity-50`}>
                                            {m.role === 'user' ? 'Transmitted' : 'Generated'}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex justify-start animate-in fade-in duration-300">
                                    <div className="px-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-sm flex items-center gap-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-duration:1s]"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Synthesizing Response</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Area - Draggable Footer */}
                    <div
                        onMouseDown={onMouseDown}
                        className="p-6 bg-[#070b14]/80 border-t border-white/5 backdrop-blur-xl cursor-grab active:cursor-grabbing select-none drag-handle"
                    >
                        <div className="relative flex items-center group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Quantum query here..."
                                className="w-full bg-white/[0.02] border border-white/10 rounded-3xl pl-7 pr-20 py-5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.04] transition-all placeholder:text-gray-700 shadow-2xl"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="absolute right-2.5 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-blue-500/20 active:scale-95 hover:shadow-blue-500/40"
                            >
                                <Send className="w-6 h-6 rotate-45 -mt-0.5 -ml-1" />
                            </button>
                        </div>
                        <p className="text-center text-[8px] text-gray-600 uppercase font-black tracking-[0.3em] mt-4 opacity-50">Powered by Nexora Contextual Engine v4</p>
                    </div>
                </div>
            )}

            {/* Draggable Toggle Button */}
            {!isExpanded && (
                <div
                    onMouseDown={onMouseDown}
                    className="relative group cursor-grab active:cursor-grabbing select-none"
                >
                    {/* Shadow/Glow effect */}
                    <div className="absolute -inset-8 rounded-full bg-blue-600/20 blur-3xl group-hover:bg-blue-600/40 transition-all duration-1000 animate-pulse"></div>

                    {/* Move Handle (Subtle indicator) */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pointer-events-none">
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                    </div>

                    <button
                        onClick={() => !isDragging && setIsOpen(!isOpen)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-700 relative z-10 active:scale-95 border-2 drag-handle group/btn
                            ${isOpen
                                ? 'bg-red-500 border-red-400 rotate-90 shadow-[0_0_60px_rgba(239,68,68,0.6)] ring-8 ring-red-500/10'
                                : 'bg-[#0a0f1d] border-white/10 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.7)] hover:scale-105 hover:shadow-blue-500/50'
                            }
                        `}
                    >
                        {/* Rotating holographic ring */}
                        {!isOpen && (
                            <div className="absolute inset-[-4px] border-t-2 border-l-2 border-blue-500/50 rounded-full animate-spin-slow pointer-events-none group-hover/btn:border-blue-400"></div>
                        )}
                        {!isOpen && (
                            <div className="absolute inset-[-4px] border-b-2 border-r-2 border-primary/30 rounded-full animate-spin-reverse pointer-events-none group-hover/btn:border-primary/50"></div>
                        )}

                        {isOpen ? (
                            <X className="w-8 h-8" />
                        ) : (
                            <div className="relative w-full h-full p-1 overflow-hidden rounded-full">
                                {/* Scanner Line */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent z-20 animate-scan"></div>
                                
                                <img
                                    src="/auip_ai_core.png"
                                    alt="AI Bot"
                                    className="w-full h-full object-cover rounded-full animate-float-slow mix-blend-screen"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png';
                                    }}
                                />
                                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-md group-hover:bg-blue-500/30 transition-all animate-pulse"></div>
                            </div>
                        )}

                        {!isOpen && (
                            <div className="absolute top-1 right-1 z-20">
                                <span className="flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-[#0a0f1d]"></span>
                                </span>
                            </div>
                        )}
                    </button>

                    {/* Tooltip */}
                    {!isOpen && (
                        <div className="absolute right-20 top-1/2 -translate-y-1/2 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all shadow-2xl pointer-events-none translate-x-4 group-hover:translate-x-0">
                            Neural Support Core
                            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-black/80"></div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-5px) scale(1.03); }
                }
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(200%); opacity: 0; }
                }
                .animate-float-slow {
                    animation: float 4s ease-in-out infinite;
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
                .animate-spin-slow {
                    animation: spin 6s linear infinite;
                }
                .animate-spin-reverse {
                    animation: spin 8s linear infinite reverse;
                }
            `}</style>
        </div>
    );
};

