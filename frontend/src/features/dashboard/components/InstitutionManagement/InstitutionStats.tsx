import { Globe, Plus } from "lucide-react";

interface InstitutionStatsProps {
    pendingCount: number;
    setIsCreateModalOpen: (open: boolean) => void;
}

export const InstitutionStats = ({ pendingCount, setIsCreateModalOpen }: InstitutionStatsProps) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
                <h1 className="text-5xl font-black text-[var(--text-primary)] px-1 tracking-tight">
                    Institution <span className="text-primary italic">Hub</span>
                </h1>
                <div className="flex items-center gap-2 px-1 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <span>Control center for all institutions</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-2xl border-[var(--border)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Live Sync</span>
                </div>
                <div className="glass px-4 py-2 rounded-2xl border-[var(--border)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{pendingCount} Waiting for Approval</span>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 premium-gradient text-[var(--text-primary)] font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Register Institution
                </button>
            </div>
        </div>
    );
};
