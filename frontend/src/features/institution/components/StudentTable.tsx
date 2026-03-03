import React from "react";
import {
    Search, CheckSquare, Square, BarChart2, RefreshCw, Send,
    ChevronLeft, ChevronRight, Mail
} from "lucide-react";
import type { Student } from "../hooks/useStudentRegistry";

interface StudentTableProps {
    students: Student[];
    activeSection: string | null;
    subFeature: "RECORDS" | "PORTAL";
    selectedStudents: string[];
    allSelected: boolean;
    page: number;
    totalPages: number;
    totalCount: number;
    seededCount: number;
    onToggleSelectAll: () => void;
    onToggleSelect: (roll: string, checked: boolean) => void;
    onViewProfile: (s: Student) => void;
    onEdit: (s: Student) => void;
    onSingleInvite: (roll: string) => void;
    onBack: () => void;
    onGoToPage: (p: number) => void;
    onClearSelection: () => void;
    onDispatch: () => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
    students, activeSection, subFeature, selectedStudents, allSelected,
    page, totalPages, totalCount, seededCount,
    onToggleSelectAll, onToggleSelect, onViewProfile, onEdit,
    onSingleInvite, onBack, onGoToPage, onClearSelection, onDispatch
}) => (
    <div className="glass rounded-[2rem] md:rounded-[2.5rem] border-white/5 overflow-hidden shadow-3xl bg-white/[0.01] w-full">

        {/* Section back-header */}
        {activeSection && (
            <div className="p-6 md:p-8 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 glass border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-primary">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Section <span className="text-primary not-italic">{activeSection}</span></h3>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            {totalCount} students · {seededCount} pending activation
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 w-full">
            <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead>
                    <tr className="bg-white/[0.02]">
                        {subFeature === "PORTAL" && (
                            <th className="px-4 py-4 border-b border-white/5 w-10">
                                <button onClick={onToggleSelectAll} className="text-muted-foreground hover:text-white transition-colors">
                                    {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                </button>
                            </th>
                        )}
                        <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Identity</th>
                        <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Cohort</th>
                        <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Status</th>
                        <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {students.length === 0 ? (
                        <tr>
                            <td colSpan={subFeature === "PORTAL" ? 5 : 4} className="py-20 text-center">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <Search className="w-12 h-12 text-white/10" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No matching records.</p>
                                </div>
                            </td>
                        </tr>
                    ) : students.map(s => (
                        <tr key={s.id} className="group hover:bg-primary/[0.03] transition-all cursor-pointer" onClick={() => onViewProfile(s)}>
                            {subFeature === "PORTAL" && (
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    {s.status !== "ACTIVE" && (
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary cursor-pointer"
                                            checked={selectedStudents.includes(s.roll_number)}
                                            onChange={e => onToggleSelect(s.roll_number, e.target.checked)}
                                        />
                                    )}
                                </td>
                            )}
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all font-black text-sm italic">
                                        {s.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-xs italic tracking-tight uppercase group-hover:text-primary transition-colors">{s.full_name}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{s.roll_number}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <p className="text-[10px] font-black text-white italic tracking-widest uppercase">{s.branch} · {s.section}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">{s.program || "B.Tech"} · Sem {s.current_semester}</p>
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${s.status === "ACTIVE" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-amber-400/50 animate-pulse"}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === "ACTIVE" ? "text-green-400" : "text-amber-400/80"}`}>{s.status}</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                {subFeature === "RECORDS" ? (
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => onViewProfile(s)} className="p-2 glass rounded-xl text-muted-foreground hover:text-white transition-all"><BarChart2 className="w-4 h-4" /></button>
                                        <button onClick={() => onEdit(s)} className="p-2 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all"><RefreshCw className="w-4 h-4" /></button>
                                    </div>
                                ) : s.status !== "ACTIVE" ? (
                                    <button onClick={() => onSingleInvite(s.roll_number)} className="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg" title="Send activation link">
                                        <Send className="w-4 h-4" />
                                    </button>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-white/5 p-4 flex items-center justify-between bg-[#111]">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {totalCount === 0 ? "No records" : `Page ${page} of ${totalPages} · ${totalCount} total`}
            </span>
            <div className="flex items-center gap-2">
                <button onClick={() => onGoToPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest px-4">Page {page} / {totalPages}</span>
                <button onClick={() => onGoToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Bulk dispatch bar */}
        {subFeature === "PORTAL" && selectedStudents.length > 0 && (
            <div className="p-6 bg-primary/5 border-t border-primary/20 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">
                        {selectedStudents.length} student{selectedStudents.length > 1 ? "s" : ""} selected
                    </p>
                    <p className="text-[9px] text-muted-foreground font-bold mt-0.5">Activation invites → official + personal emails</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClearSelection} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Clear</button>
                    <button onClick={onDispatch} className="bg-primary px-8 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Send Activation Invites
                    </button>
                </div>
            </div>
        )}
    </div>
);
