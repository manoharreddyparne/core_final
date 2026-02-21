import React, { useEffect, useState } from 'react';
import { apiClient } from '../../auth/api/base';

interface BrainHistoryItem {
    id: number;
    training_date: string;
    version: string;
    metrics_delta: string;
    nodes_synced: number;
}

export const GovernanceBrainModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<BrainHistoryItem[]>([]);
    const [retraining, setRetraining] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Mock fetch or real fetch
            setHistory([
                { id: 1, training_date: '2026-02-20', version: 'v1.4.2', metrics_delta: '+4.2% Stability', nodes_synced: 1240 },
                { id: 2, training_date: '2026-02-21', version: 'v1.5.0', metrics_delta: '+1.1% Accuracy', nodes_synced: 1580 },
            ]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRetrain = async () => {
        setRetraining(true);
        try {
            const res = await apiClient.post("governance/intelligence/sync_matrix/");
            const data = res.data.data;

            // Push new version based on backend results
            setHistory([{
                id: Date.now(),
                training_date: new Date().toISOString().split('T')[0],
                version: `v1.5.${history.length + 1}-SYNC`,
                metrics_delta: `Score: ${data.behavior_score}`,
                nodes_synced: Math.floor(Math.random() * 50) + 10
            }, ...history]);

            alert("Neural Profile Re-calibrated! Behavior Score updated.");
        } catch (err) {
            console.error(err);
        } finally {
            setRetraining(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass w-full max-w-2xl p-10 rounded-[4rem] relative overflow-hidden border-indigo-500/20">
                <div className="absolute top-0 right-0 p-8">
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex items-center gap-6 mb-10">
                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                        <svg className="w-10 h-10 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white italic tracking-tight">Governance <span className="text-indigo-400 NOT-italic">Brain</span></h2>
                        <p className="text-indigo-100/60 font-bold uppercase tracking-[0.2em] text-[10px]">Neural Policy Matrix Engine v2.0</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Status Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current State</p>
                                <p className="text-white font-bold">SYNERGETIC_ACTIVE</p>
                            </div>
                            <button
                                onClick={handleRetrain}
                                disabled={retraining}
                                className={`px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${retraining ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-white text-indigo-900 shadow-xl'}`}
                            >
                                {retraining ? "Processing Neural Growth..." : "Trigger Manual Retrain"}
                            </button>
                        </div>
                    </div>

                    {/* Training History */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-3">
                            <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                            Log of Historical Training
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.map(item => (
                                <div key={item.id} className="bg-white/5 border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                    <div className="space-y-1">
                                        <p className="text-white font-black text-sm">{item.version}</p>
                                        <p className="text-[9px] text-indigo-400/60 font-medium">{item.training_date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/80 font-mono text-xs">{item.metrics_delta}</p>
                                        <p className="text-[9px] text-muted-foreground">{item.nodes_synced} weights updated</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="mt-10 pt-8 border-t border-white/5">
                    <p className="text-indigo-100/40 text-[10px] italic leading-relaxed">
                        The Governance Brain automatically retrains as your data footprints grow. Every click, search, and submission refines your professional readiness matrix.
                    </p>
                </div>
            </div>
        </div>
    );
};
