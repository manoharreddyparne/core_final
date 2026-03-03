import React from "react";
import { Activity, Send, List } from "lucide-react";
import type { SectionStat } from "../hooks/useStudentRegistry";

interface SectionGridProps {
    sectionStats: SectionStat[];
    subFeature: "RECORDS" | "PORTAL";
    onSelectSection: (name: string) => void;
    onInviteSection: (name: string) => void;
}

export const SectionGrid: React.FC<SectionGridProps> = ({
    sectionStats, subFeature, onSelectSection, onInviteSection
}) => {
    const stats = Array.isArray(sectionStats) ? sectionStats : [];

    if (stats.length === 0) {
        return (
            <div className="col-span-full py-20 bg-white/[0.01] rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                <Activity className="w-12 h-12 text-white/10" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registry Vault is Empty.</p>
            </div>
        );
    }

    return (
        <>
            {stats.map((s, i) => (
                <div key={i} className="glass p-6 md:p-8 rounded-[2rem] border-white/5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group relative flex flex-col justify-between">
                    <div onClick={() => onSelectSection(s.name)} className="cursor-pointer">
                        <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Cohort</h4>
                        <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter mb-4">{s.name || "UNASSIGNED"}</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                <span>Activation Rate</span>
                                <span className="text-primary">{s.total ? Math.round((s.activated / s.total) * 100) : 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary shadow-sm shadow-primary/50 transition-all duration-1000"
                                    style={{ width: `${s.total ? (s.activated / s.total) * 100 : 0}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                <span className="font-bold">{s.activated} active</span>
                                <span>{s.total} total</span>
                            </div>
                        </div>
                    </div>
                    {subFeature === "PORTAL" && s.activated < s.total && (
                        <button
                            onClick={e => { e.stopPropagation(); onInviteSection(s.name); }}
                            className="mt-6 w-full py-3 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <Send className="w-3.5 h-3.5" /> Send Invites to Section
                        </button>
                    )}
                    <button
                        onClick={() => onSelectSection(s.name)}
                        className="mt-3 w-full py-2.5 glass rounded-xl text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <List className="w-3.5 h-3.5" /> View Students
                    </button>
                </div>
            ))}
        </>
    );
};
