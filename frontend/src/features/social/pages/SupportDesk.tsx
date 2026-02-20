// src/features/social/pages/SupportDesk.tsx
import React, { useState } from 'react';
import { socialApi } from '../api';

const SupportDesk: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [diagnosis, setDiagnosis] = useState<any>(null);

    const handleSubmit = async () => {
        if (!subject || !description) return;
        setLoading(true);
        try {
            const res = await socialApi.supportDiagnosis(subject, description);
            setDiagnosis(res);
        } catch (err) {
            console.error("Support call failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black text-white italic">
                    AI <span className="text-primary NOT-italic">Self-Healing</span> Support
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                    Describe your issue and let the Governance Brain diagnose and fix it instantly.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass p-8 rounded-[3rem] space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-2">Problem Subject</label>
                            <input
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="e.g. Profile Sync Error"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-2">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe exactly what happened..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white h-40 focus:ring-2 focus:ring-primary/50 outline-none mt-1 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !subject || !description}
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                        {loading ? "AI DIAGNOSING..." : "SUBMIT FOR INSTANT HEALING"}
                    </button>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-green-400 rounded-full"></div>
                        Live Diagnosis
                    </h2>

                    {!diagnosis ? (
                        <div className="glass p-12 rounded-[3rem] text-center border-dashed border-white/10 flex flex-col items-center justify-center space-y-4">
                            <svg className="w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Waiting for input...</p>
                        </div>
                    ) : (
                        <div className="glass p-8 rounded-[3rem] border-l-4 border-green-400 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-2 text-green-400 mb-4">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Diagnosis Complete</span>
                            </div>
                            <p className="text-blue-100 font-medium leading-relaxed italic">
                                "{diagnosis.diagnosis || diagnosis.ai_diagnosis}"
                            </p>
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Automated Action</p>
                                <p className="text-xs text-white">System attempted: <span className="text-primary font-bold">{diagnosis.suggested_action || "Session Resynchronization"}</span></p>
                            </div>
                        </div>
                    )}

                    <div className="glass p-6 rounded-[2.5rem] bg-white/5">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 px-2">Common Fixes</h4>
                        <div className="space-y-1">
                            {['Session Clear', 'Matrix Re-sync', 'Cache Flush'].map(fix => (
                                <button key={fix} className="w-full text-left px-4 py-2 text-[10px] text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all font-bold uppercase">
                                    {fix}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportDesk;
