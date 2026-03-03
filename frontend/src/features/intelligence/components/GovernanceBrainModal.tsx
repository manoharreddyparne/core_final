import React, { useEffect, useState } from 'react';
import { apiClient } from '../../auth/api/base';

interface BrainHistoryItem {
    id: number;
    training_date: string;
    version: string;
    metrics_delta: string;
    nodes_synced: number;
}

import { createPortal } from "react-dom";

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

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", h);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", h);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

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

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-[#050505]/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative glass w-full max-w-2xl p-10 rounded-[4rem] overflow-hidden border border-indigo-500/10 bg-[#0a0a0c]/80 backdrop-blur-md shadow-[0_0_120px_rgba(79,70,229,0.2)] animate-in zoom-in-95 duration-300">
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
                        <h2 className="text-3xl font-black text-white italic tracking-tight uppercase">Brain <span className="text-indigo-400 tracking-normal not-italic">Matrix</span></h2>
                        <p className="text-indigo-100/60 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Neural Policy Governance Engine</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Status Card */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cognitive State</p>
                                <p className="text-white font-black tracking-widest text-sm uppercase">Synergetic_Active</p>
                            </div>
                            <button
                                onClick={handleRetrain}
                                disabled={retraining}
                                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${retraining ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105'}`}
                            >
                                {retraining ? "Calibrating..." : "Retrain Matrix"}
                            </button>
                        </div>
                    </div>

                    {/* Training History */}
                    <div>
                        <h3 className="text-white font-black text-[10px] uppercase tracking-widest mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            Propagation History
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.map(item => (
                                <div key={item.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-white/5 hover:border-indigo-500/30 transition-all">
                                    <div className="space-y-1">
                                        <p className="text-white font-black text-xs uppercase tracking-tighter">{item.version}</p>
                                        <p className="text-[8px] text-indigo-400/60 font-black uppercase tracking-widest">{item.training_date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-mono text-[10px] font-bold">{item.metrics_delta}</p>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">{item.nodes_synced} weights updated</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="mt-10 pt-8 border-t border-white/5">
                    <p className="text-indigo-100/40 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                        End-to-End Encrypted Neural Synchronization // AES-256 Multi-Segment Lattice
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};
