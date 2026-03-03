/**
 * DispatchProgressModal — Live animated progress overlay for bulk activation dispatch.
 * Shows: animated progress ring, per-student live log, percentage, ETA, and final summary.
 */
import React, { useEffect, useRef } from "react";
import {
    X, CheckCircle2, XCircle, Shield, Clock, Zap,
    ArrowRight, AlertTriangle, Loader2
} from "lucide-react";
import type { DispatchEvent, DispatchSummary } from "../hooks/useDispatchSocket";

interface Props {
    state: "idle" | "connecting" | "running" | "done" | "error";
    events: DispatchEvent[];
    summary: DispatchSummary | null;
    errorMsg: string | null;
    pct: number;
    current: number;
    total: number;
    onClose: () => void;
    onCancel: () => void;
}

const STATUS_CONFIG = {
    sent: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400", bg: "bg-green-400/10", label: "SENT" },
    already_active: { icon: <Shield className="w-3.5 h-3.5" />, color: "text-blue-400", bg: "bg-blue-400/10", label: "ACTIVE" },
    not_found: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-400", bg: "bg-amber-400/10", label: "NOT FOUND" },
    failed: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400", bg: "bg-red-400/10", label: "FAILED" },
} as const;

// Animated SVG progress ring
const ProgressRing = ({ pct, size = 120 }: { pct: number; size?: number }) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <circle
                cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke="url(#dispatchGrad)" strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <defs>
                <linearGradient id="dispatchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>
        </svg>
    );
};

import { createPortal } from "react-dom";

export const DispatchProgressModal: React.FC<Props> = ({
    state, events, summary, errorMsg, pct, current, total, onClose, onCancel
}) => {
    const logRef = useRef<HTMLDivElement>(null);

    // 🎹 Keyboard Support: ESC to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (state === "running" || state === "connecting") onCancel();
                else onClose();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose, onCancel, state]);

    // Auto-scroll log to top (newest events at top)
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = 0;
    }, [events.length]);

    const isRunning = state === "connecting" || state === "running";
    const isDone = state === "done";
    const isError = state === "error";

    const content = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={isRunning ? undefined : onClose} />

            <div className="relative w-full max-w-lg bg-[#0a0a0f]/80 backdrop-blur-md border border-white/10 rounded-[2.5rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Ambient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

                {/* Header */}
                <div className="relative p-8 pb-6 flex items-start justify-between border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${isDone ? "bg-green-500/10 border-green-500/20" : isError ? "bg-red-500/10 border-red-500/20" : "bg-primary/10 border-primary/20"}`}>
                            {isRunning ? (
                                <Zap className="w-6 h-6 text-primary animate-pulse" />
                            ) : isDone ? (
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                                <XCircle className="w-6 h-6 text-red-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                                {state === "connecting" ? "Connecting..." : state === "running" ? "Dispatching Invites" : isDone ? "Dispatch Complete" : "Connection Error"}
                            </h3>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                {isRunning ? `${current} of ${total} processed` : isDone ? `${summary?.invited || 0} invites sent` : ""}
                            </p>
                        </div>
                    </div>
                    {!isRunning && (
                        <button onClick={onClose} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Progress Ring + Stats */}
                {(isRunning || isDone) && (
                    <div className="p-8 flex items-center gap-8 shrink-0 border-b border-white/5">
                        {/* Ring */}
                        <div className="relative shrink-0">
                            <ProgressRing pct={pct} size={100} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white">{pct}<span className="text-sm text-primary">%</span></span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-2">
                            {isDone && summary ? (
                                <>
                                    <StatChip icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Sent" value={summary.invited} color="text-green-400" />
                                    <StatChip icon={<Shield className="w-3.5 h-3.5" />} label="Already Active" value={summary.already_active} color="text-blue-400" />
                                    {summary.not_found > 0 && <StatChip icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Not Found" value={summary.not_found} color="text-amber-400" />}
                                    {summary.failed > 0 && <StatChip icon={<XCircle className="w-3.5 h-3.5" />} label="Failed" value={summary.failed} color="text-red-400" />}
                                </>
                            ) : (
                                <>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground">
                                        <span className="text-white font-black">{current}</span> / {total} students
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        <span className="font-bold uppercase tracking-widest">Sending in parallel...</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Error state */}
                {isError && (
                    <div className="p-8 text-center space-y-4">
                        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                        <p className="text-sm font-bold text-red-300">{errorMsg}</p>
                        <p className="text-[10px] text-muted-foreground">Check your connection and try again.</p>
                    </div>
                )}

                {/* Live Event Log */}
                {events.length > 0 && (
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="px-6 pt-4 pb-2 flex items-center justify-between shrink-0">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Live Log</p>
                            <p className="text-[9px] font-bold text-muted-foreground">{events.length} events</p>
                        </div>
                        <div ref={logRef} className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                            {events.map((e, i) => {
                                const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.failed;
                                return (
                                    <div key={`${e.roll}-${i}`} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${cfg.bg} animate-in slide-in-from-top-1 duration-200`}>
                                        <span className={cfg.color}>{cfg.icon}</span>
                                        <span className="text-[10px] font-bold text-white/80 flex-1 truncate">
                                            {e.name || e.roll}
                                        </span>
                                        <span className="text-[8px] font-black text-white/30 shrink-0 font-mono">{e.roll}</span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.color} shrink-0`}>{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-white/5 shrink-0 flex gap-3">
                    {isRunning ? (
                        <button
                            onClick={onCancel}
                            className="flex-1 h-12 bg-white/5 border border-white/10 text-white/50 hover:text-white font-black uppercase text-[9px] tracking-widest rounded-2xl transition-all hover:bg-white/10"
                        >
                            Cancel
                        </button>
                    ) : isDone ? (
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 bg-gradient-to-r from-primary to-violet-600 text-white font-black uppercase text-[9px] tracking-widest rounded-2xl shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                        >
                            Done <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={onClose} className="flex-1 h-12 glass text-white font-black uppercase text-[9px] tracking-widest rounded-2xl hover:bg-white/10 transition-all">
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

const StatChip = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-bold text-muted-foreground flex-1">{label}</span>
        <span className={`text-sm font-black ${color}`}>{value}</span>
    </div>
);
