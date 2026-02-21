import React, { useState } from 'react';
import { X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { intelligenceApi } from '../api';

export const FloatingAIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'agent', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const msg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const responseTxt = await intelligenceApi.askAI(msg);
            setMessages(prev => [...prev, { role: 'agent', content: responseTxt }]);
        } catch (err: any) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, { role: 'agent', content: "I'm currently undergoing system maintenance. Please check back shortly." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chatbot Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-80 md:w-96 bg-[#0b1121]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 ring-1 ring-white/5">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b1121]"></div>
                            </div>
                            <div>
                                <h3 className="text-white font-black tracking-wide text-sm flex items-center gap-2">
                                    AUIP Core
                                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                </h3>
                                <p className="text-[9px] text-green-400 uppercase font-black tracking-widest leading-none mt-1">
                                    Systems Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 h-80 overflow-y-auto space-y-5 custom-scrollbar bg-black/20">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-8 space-y-4 animate-in fade-in">
                                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 rotate-3 hover:rotate-6 transition-transform">
                                    <Bot className="w-8 h-8 text-primary opacity-80" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Governance Engine Active</p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Ask about Placements, ATS, or Profile</p>
                                </div>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                <div className={`px-4 py-3 max-w-[85%] text-sm shadow-xl ${m.role === 'user'
                                    ? 'premium-gradient text-white rounded-[1.5rem] rounded-tr-sm shadow-primary/20'
                                    : 'bg-white/10 border border-white/5 text-gray-200 rounded-[1.5rem] rounded-tl-sm backdrop-blur-md'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="p-3 bg-white/10 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Processing</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white/[0.02] border-t border-white/5">
                        <div className="relative flex items-center group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Message AUIP Core..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-500"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="absolute right-2 w-10 h-10 rounded-xl premium-gradient flex items-center justify-center text-white disabled:opacity-50 disabled:grayscale transition-all shadow-md"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full premium-gradient shadow-2xl shadow-primary/40 flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 relative group animate-bounce"
                style={{ animationDuration: '3s' }}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0b1120] animate-pulse"></span>
                )}
            </button>
        </div>
    );
};
