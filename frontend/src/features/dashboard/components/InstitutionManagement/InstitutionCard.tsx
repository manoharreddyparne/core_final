import { Building2, Globe, Users, ArrowRight } from "lucide-react";

interface InstitutionCardProps {
    inst: any;
    onSelect: (inst: any) => void;
}

export const InstitutionCard = ({ inst, onSelect }: InstitutionCardProps) => {
    return (
        <div
            onClick={() => onSelect(inst)}
            className="bg-[var(--bg-card)] border border-white/10 p-8 rounded-[2rem] space-y-6 hover:translate-y-[-4px] hover:border-primary/50 hover:bg-[var(--bg-card)] transition-all group relative cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-[var(--text-primary)] transition-all shadow-inner">
                    <Building2 className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${inst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                    inst.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                        inst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                            inst.status === "PROVISIONING" ? "bg-primary/10 border-primary/20 text-primary" :
                                inst.status === "ABORTED" ? "bg-orange-400/10 border-orange-400/20 text-orange-400" :
                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1 ${["PROVISIONING", "PENDING"].includes(inst.status) ? "animate-pulse" : ""}`} />
                    {inst.status.replace('_', ' ')}
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-xl font-black text-[var(--text-primary)] leading-tight">{inst.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
                    <Globe className="w-3 h-3 text-primary/40" />
                    {inst.domain}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border)]">
                <div className="space-y-1">
                    <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-tighter">Students</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary/60" />
                        {inst.student_count_estimate?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-tighter">Registration</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <div className="w-3.5 h-1 px-1 bg-primary/20 rounded-full" />
                        {inst.is_manual ? 'Manual' : 'System'}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest pt-2">
                <span className="group-hover:text-primary transition-colors italic">View Details</span>
                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-[var(--text-primary)] transform group-hover:translate-x-1 transition-all" />
            </div>
        </div>
    );
};
