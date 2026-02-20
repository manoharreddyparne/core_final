// src/features/intelligence/components/AIChat.tsx
import React, { useState } from 'react';
import { intelligenceApi } from '../api';

export const AIChat: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            const response = await intelligenceApi.askAI(userMsg);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to the Governance Brain. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass rounded-[2rem] flex flex-col h-[500px] overflow-hidden">
            <div className="p-6 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                <h3 className="font-bold text-white tracking-tight">AI Governance Assistant</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.length === 0 && (
                    <div className="text-center py-10 space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">I'm your AI career mentor.</p>
                        <p className="text-xs text-white/40">Ask me about placement eligibility or resume tips.</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.role === 'user'
                                ? 'bg-primary text-white font-medium'
                                : 'bg-white/10 text-blue-100 border border-white/5'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 px-4 py-2 rounded-2xl text-sm text-blue-100/50 animate-pulse">
                            Brain is thinking...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-black/20 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask the Brain..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/80 text-white p-2 rounded-xl transition-all disabled:opacity-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
            </div>
        </div>
    );
};
