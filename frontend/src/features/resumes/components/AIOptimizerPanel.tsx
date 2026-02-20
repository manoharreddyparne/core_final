// src/features/resumes/components/AIOptimizerPanel.tsx
import React, { useState } from 'react';
import { resumeApi } from '../api';

interface AIOptimizerPanelProps {
    resumeId: number;
    onOptimize: (summary: string) => void;
}

export const AIOptimizerPanel: React.FC<AIOptimizerPanelProps> = ({ resumeId, onOptimize }) => {
    const [jd, setJd] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState('');

    const handleOptimize = async () => {
        if (!jd.trim()) return;
        setLoading(true);
        try {
            const res = await resumeApi.aiOptimize(resumeId, jd);
            setSummary(res.optimization_summary);
            onOptimize(res.optimization_summary);
        } catch (err) {
            console.error("AI Optimization failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-6">
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z" /></svg>
                    Gemini Optimizer
                </h3>
                <p className="text-muted-foreground text-xs mt-1">Paste a Job Description (JD) to customize your resume via RAG.</p>
            </div>

            <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="e.g. Seeking a Fullstack Engineer with 2+ years of experience in React and Django..."
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-blue-100 h-40 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
            />

            <button
                onClick={handleOptimize}
                disabled={loading || !jd.trim()}
                className="premium-gradient text-white font-bold py-3 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
                {loading ? "RAG Engine Active..." : "Optimize with AI"}
            </button>

            {summary && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">AI Feedback</p>
                    <div className="text-sm text-blue-100/80 leading-relaxed italic">
                        "{summary.substring(0, 200)}..."
                    </div>
                    <p className="text-[10px] text-primary underline cursor-pointer">View full report</p>
                </div>
            )}
        </div>
    );
};
