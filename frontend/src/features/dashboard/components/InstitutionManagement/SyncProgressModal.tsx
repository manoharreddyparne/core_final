import React, { useMemo } from 'react';
import { Dialog, DialogContent } from "../../../../components/ui/dialog";
import { CheckCircle2, Loader2, Zap, Sparkles, ShieldCheck, Globe, Database, Cpu, XCircle, ArrowRight } from "lucide-react";

interface SyncProgressModalProps {
    isOpen: boolean;
    progress: number;
    message: string;
    phase: number;
    eta?: number;
    onClose: () => void;
    isGlobal?: boolean;
    institutionName?: string;
}

export const SyncProgressModal = ({
    isOpen,
    progress,
    message,
    phase,
    eta,
    onClose,
    isGlobal = false,
    institutionName
}: SyncProgressModalProps) => {

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isComplete = progress >= 100;

    const phases = useMemo(() => [
        { id: 0, label: "Infrastructure Verification", icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 1, label: "Database Migration", icon: <Database className="w-4 h-4" /> },
        { id: 2, label: "Seeding & Registry", icon: <Sparkles className="w-4 h-4" /> },
        { id: 3, label: "Identity Alignment", icon: <Cpu className="w-4 h-4" /> },
        { id: 4, label: "System Finalization", icon: <CheckCircle2 className="w-4 h-4" /> },
    ], []);

    const currentPhaseIdx = useMemo(() => {
        if (isComplete) return 4;
        return phase;
    }, [phase, isComplete]);

    const statusMessages = [
        "Aligning database schemas with core...",
        "Executing database migrations...",
        "Verifying institutional tables...",
        "Optimizing workspace connectivity...",
        "Synchronization complete."
    ];

    const currentMsg = useMemo(() => {
        if (isComplete) return "Ecosystem fully synchronized.";
        return message || statusMessages[Math.min(currentPhaseIdx, statusMessages.length - 1)];
    }, [message, currentPhaseIdx, isComplete]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { if (isComplete) onClose(); }}>
            <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] bg-transparent border-none shadow-none p-0 z-[200] outline-none overflow-hidden flex flex-col">
                <div className="w-full bg-[#0d1117]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative flex flex-col flex-1 overflow-hidden shadow-[0_0_120px_rgba(var(--primary-rgb),0.1)]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-700 ${isComplete ? "bg-emerald-500/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-primary/20 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"}`}>
                                {isComplete ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Loader2 className="w-6 h-6 text-primary animate-spin" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    {isGlobal ? "Global Platform Sync" : `Syncing ${institutionName || 'Institution'}`}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                                    {isComplete ? "Process Complete • All components healthy" : "Real-time Synchronization • Active"}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Total Progress</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black tracking-tighter ${isComplete ? "text-emerald-400" : "text-white"}`}>{progress}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 overflow-hidden">
                        {/* LEFT: Phases & Progress Bar */}
                        <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
                            {/* Main Progress Bar */}
                            <div className="relative h-5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1 mb-8">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isComplete ? "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]" : "bg-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)]"}`}
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-[length:40px_40px] bg-gradient-to-r from-white/10 to-transparent animate-[shimmer_2s_infinite_linear]" />
                                </div>
                            </div>

                            {/* Phase Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                {phases.map((p, idx) => {
                                    const active = idx === currentPhaseIdx && !isComplete;
                                    const done = idx < currentPhaseIdx || isComplete;
                                    
                                    return (
                                        <div
                                            key={p.id}
                                            className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-500 ${
                                                active ? "bg-primary/5 border-primary/30 scale-[1.02] shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]" :
                                                done ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" :
                                                "bg-white/[0.02] border-white/5 opacity-20"
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    done ? "bg-emerald-500/20 text-emerald-400" :
                                                    active ? "bg-primary/20 text-primary" :
                                                    "bg-white/5 text-white/20"
                                                }`}>
                                                    {done ? <CheckCircle2 className="w-5 h-5" /> : p.icon}
                                                </div>
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-primary" : "text-white/40"}`}>Phase {idx + 1}</p>
                                                    <p className={`text-sm font-bold ${active ? "text-white" : done ? "text-emerald-500/80" : "text-white/20"}`}>{p.label}</p>
                                                </div>
                                            </div>
                                            {active && (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT: Status Details */}
                        <div className="lg:w-[40%] flex flex-col gap-6 shrink-0">
                            <div className="bg-primary/10 border border-primary/20 rounded-[2rem] p-8 relative overflow-hidden flex-1 min-h-[250px] flex flex-col justify-center text-center">
                                <Database className="absolute -top-6 -right-6 w-32 h-32 text-primary/5 rotate-12" />
                                <div className="relative space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 rounded-full text-primary mx-auto">
                                        <Database className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Database Synchronization</span>
                                    </div>
                                    <p className="text-white font-black text-xl leading-snug animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        {currentMsg}
                                    </p>
                                </div>
                            </div>

                            {/* Security Badges */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border-white/5">
                                    <ShieldCheck className="w-6 h-6 text-emerald-500/30" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Integrity</span>
                                    <span className="text-[10px] text-white font-bold">SQL Sanitized</span>
                                </div>
                                <div className="glass p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border-white/5">
                                    <Cpu className="w-6 h-6 text-blue-500/30" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Processor</span>
                                    <span className="text-[10px] text-white font-bold">Schema Parallel</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase">Target: {isGlobal ? "Global" : institutionName}</span>
                        </div>
                        
                        {isComplete && (
                            <button
                                onClick={onClose}
                                className="group flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                            >
                                <span className="text-xs font-black uppercase tracking-widest">Close Panel</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
