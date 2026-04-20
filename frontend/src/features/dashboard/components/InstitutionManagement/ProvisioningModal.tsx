import { Dialog, DialogContent } from "../../../../components/ui/dialog";
import { CheckCircle2, Loader2, Zap, Sparkles, ShieldCheck, Globe, Lock, Cpu, XCircle } from "lucide-react";

interface ProvisioningModalProps {
    isOpen: boolean;
    isAborting: boolean;
    approveComplete: boolean;
    approveProgress: number;
    activeStatusMsg: string;
    remTime: number | null;
    migMetrics: { current: number; total: number };
    currentMsgIdx: number;
    statusMessages: string[];
    onClose: () => void;
    onAbort: () => void;
    isActionLoading: boolean;
    activeAction: string | null;
    approvePhases: any[];
    approvePhaseIdx: number;
    approvePhasePct?: number;
    provisionElapsed?: number | null;
}

export const ProvisioningModal = ({
    isOpen,
    isAborting,
    approveComplete,
    approveProgress,
    activeStatusMsg,
    remTime,
    migMetrics,
    currentMsgIdx,
    statusMessages,
    onClose,
    onAbort,
    isActionLoading,
    activeAction,
    approvePhases,
    approvePhaseIdx,
    approvePhasePct = 0,
    provisionElapsed = null
}: ProvisioningModalProps) => {
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] bg-transparent border-none shadow-none p-0 z-[200] outline-none overflow-hidden flex flex-col">
                <div className="w-full bg-[#0d1117]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative flex flex-col flex-1 overflow-hidden shadow-[0_0_120px_rgba(var(--primary-rgb),0.1)]">

                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-2 mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-700 ${approveComplete ? "bg-emerald-500/20 border-emerald-500/30" : "bg-primary/20 border-primary/30"}`}>
                                {approveComplete ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">
                                    {isAborting ? "Stopping Setup" : approveComplete ? "Setup Complete" : "Setting up Institution"}
                                </h3>
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                    {isAborting ? "Cleaning up data • Safety lock active" 
                                        : approveComplete ? `Finished in ${formatTime(provisionElapsed || 0)} • All systems operational`
                                        : "Preparing Environment • Real-time setup"}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-4 mb-1">
                                {remTime !== null && !approveComplete && !isAborting && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Estimated Time</span>
                                        <span className="text-sm font-mono font-black text-primary">{formatTime(remTime)}</span>
                                    </div>
                                )}
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Progress</span>
                                    <span className={`text-xl font-black ${isAborting ? "text-red-400" : "text-white"}`}>{approveProgress}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                        {/* LEFT: Progress & Steps */}
                        <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
                            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1 mb-8">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isAborting ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"}`}
                                    style={{ width: `${approveProgress}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {approvePhases.map((phase, idx) => {
                                    const isCurrent = idx === approvePhaseIdx && !approveComplete;
                                    const isDone = idx < approvePhaseIdx || approveComplete;

                                    let phasePct = 0;
                                    if (isDone) phasePct = 100;
                                    else if (isCurrent) {
                                        // PURE REALITY FEEDBACK: Use the sub-progress from backend if active
                                        phasePct = approvePhasePct;
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden ${isCurrent ? "bg-white/10 border-primary/30 scale-[1.02] shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]" :
                                                isDone ? "opacity-40 border-transparent bg-emerald-500/5" : "opacity-20 border-transparent"
                                                }`}
                                        >
                                            {isCurrent && (
                                                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse" />
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDone ? "bg-emerald-500/20 text-emerald-400" :
                                                    isCurrent ? "bg-primary/20 text-primary animate-pulse" : "bg-white/5 text-gray-500"
                                                    }`}>
                                                    {isDone ? "✓" : phase.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDone ? "text-emerald-400/80" : isCurrent ? "text-primary" : "text-gray-400"}`}>Phase {idx + 1}</span>
                                                        {isCurrent && <span className="text-[8px] font-black text-primary/60 animate-pulse uppercase">Active</span>}
                                                    </div>
                                                    <p className={`font-bold text-sm ${isDone ? "text-emerald-500" : isCurrent ? "text-white" : "text-gray-500"}`}>{isAborting ? "Rollback Active" : phase.label}</p>
                                                </div>
                                            </div>
                                            <div className="text-right pl-2">
                                                <span className={`text-lg font-black tracking-tight ${isDone ? "text-emerald-400" : isCurrent ? "text-white" : "text-gray-600"}`}>
                                                    {isAborting ? "0%" : `${phasePct}%`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="glass p-5 rounded-2xl border-white/5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                        {approveComplete ? "Completed" : "Current Task"}
                                    </p>
                                    <p className="text-[11px] font-bold text-white font-mono break-all line-clamp-2">
                                        {approveComplete ? "All systems operational — environment is live." : activeStatusMsg}
                                    </p>
                                </div>
                                {approveComplete && provisionElapsed != null && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Total Time</span>
                                        <span className="text-lg font-mono font-black text-emerald-400">{formatTime(provisionElapsed)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Info Panels */}
                        <div className="lg:w-[45%] flex flex-col gap-6">
                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                                <div className="bg-primary/10 border border-primary/15 rounded-3xl p-8 relative overflow-hidden group">
                                    <Zap className="absolute -top-4 -right-4 w-24 h-24 text-primary/10 group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-primary mb-3">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Provisioning Status</span>
                                        </div>
                                        <p key={currentMsgIdx} className="text-white font-bold text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700 min-h-[3.5rem]">
                                            {statusMessages[currentMsgIdx]}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 items-center justify-center text-center">
                                        <ShieldCheck className="w-5 h-5 text-green-500/40 mb-1" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Security</span>
                                        <span className="text-[10px] text-white font-bold">Encrypted Isolation</span>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 items-center justify-center text-center">
                                        <Globe className="w-5 h-5 text-blue-500/40 mb-1" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Network</span>
                                        <span className="text-[10px] text-white font-bold">Secure Gateway</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                        <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest pl-2">
                            Secure Connection • <span className="text-primary/40">System Active</span>
                        </p>
                        
                        <div className="flex items-center gap-4">
                            {!approveComplete && !isAborting && (
                                <button 
                                    onClick={onAbort}
                                    disabled={isActionLoading || approveProgress < 5}
                                    className="px-6 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center gap-2"
                                >
                                    {activeAction === 'abort' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                    Stop Setup
                                </button>
                            )}
                            
                            {approveComplete && (
                                <button
                                    onClick={onClose}
                                    className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Finish Setup
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
