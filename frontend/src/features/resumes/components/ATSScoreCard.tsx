// src/features/resumes/components/ATSScoreCard.tsx
import React from 'react';

interface ATSScoreCardProps {
    score: number;
    missingKeywords: string[];
}

export const ATSScoreCard: React.FC<ATSScoreCardProps> = ({ score, missingKeywords }) => {
    return (
        <div className="glass p-6 rounded-[2rem] border-l-4 border-green-400">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">ATS Fit Score</p>
                    <p className="text-4xl font-black text-white mt-1">{score}%</p>
                </div>
                <div className="w-12 h-12 bg-green-400/20 rounded-2xl flex items-center justify-center text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Missing Key Attributes</p>
                <div className="flex flex-wrap gap-2">
                    {missingKeywords.length > 0 ? (
                        missingKeywords.map(kw => (
                            <span key={kw} className="bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-1 rounded-lg text-[10px] font-bold">
                                {kw}
                            </span>
                        ))
                    ) : (
                        <span className="text-green-400/60 text-[10px] italic">Highly synchronized with JD</span>
                    )}
                </div>
            </div>
        </div>
    );
};
