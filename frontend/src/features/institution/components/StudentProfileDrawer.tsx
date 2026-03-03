import React, { useEffect } from "react";
import {
    User, X, GraduationCap, LayoutGrid, BarChart2, Lock,
    Mail, Phone, Calendar, Hash, ShieldCheck, Send, Edit2
} from "lucide-react";
import { Student } from "../hooks/useStudentRegistry";

interface StudentProfileDrawerProps {
    student: Student | null;
    onClose: () => void;
    onEdit: (student: Student) => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({ student, onClose, onEdit }) => {
    // ESC key support
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    if (!student) return null;

    const statusActive = student.status === "ACTIVE";

    return (
        // Backdrop — z-[999] beats all layout headers/sidebars
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200"
            onClick={onClose}  // click outside = close
        >
            {/* Card — stop propagation so clicking inside doesn't close */}
            <div
                className="relative w-full max-w-xl bg-[#0a0a0f] border border-white/8 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient glows */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 blur-[120px] rounded-full -mr-36 -mt-36 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -ml-24 -mb-24 pointer-events-none" />

                {/* Header gradient strip */}
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/5 to-transparent pt-10 pb-8 px-8 flex flex-col items-center text-center border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Avatar */}
                    <div className="relative mb-5">
                        <div className="w-20 h-20 bg-primary/10 border-2 border-primary/30 rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-primary/20">
                            <span className="text-3xl font-black text-primary italic">{student.full_name.charAt(0)}</span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0f] ${statusActive ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-amber-400/80"}`} />
                    </div>

                    {/* Roll chip */}
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
                        <Hash className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary tracking-widest uppercase">{student.roll_number}</span>
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-1">{student.full_name}</h2>

                    <div className="flex flex-col items-center gap-1 mt-1">
                        {student.official_email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-medium">{student.official_email}</span>
                            </div>
                        )}
                        {student.personal_email && (
                            <div className="flex items-center gap-1.5 text-white/30">
                                <Mail className="w-3 h-3" />
                                <span className="text-[10px]">{student.personal_email}</span>
                            </div>
                        )}
                        {student.phone_number && (
                            <div className="flex items-center gap-1.5 text-white/30">
                                <Phone className="w-3 h-3" />
                                <span className="text-[10px]">{student.phone_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-white/5">
                    {/* Left column */}
                    <div className="p-6 space-y-5">
                        <InfoItem icon={<GraduationCap className="w-4 h-4 text-primary" />} label="Program / Branch" value={`${student.program || "B.Tech"} — ${student.branch}`} />
                        <InfoItem icon={<LayoutGrid className="w-4 h-4 text-primary" />} label="Section · Semester" value={`Section ${student.section} · Sem ${student.current_semester}`} />
                        <InfoItem icon={<Calendar className="w-4 h-4 text-primary" />} label="Batch / Passout" value={`${student.batch_year} → ${student.passout_year || "—"}`} />
                    </div>
                    {/* Right column */}
                    <div className="p-6 space-y-5">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Account Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${statusActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-amber-400/70 animate-pulse"}`} />
                                <span className={`text-sm font-black uppercase ${statusActive ? "text-green-400" : "text-amber-400"}`}>{student.status}</span>
                            </div>
                        </div>
                        {student.cgpa && (
                            <InfoItem icon={<BarChart2 className="w-4 h-4 text-amber-400" />} label="CGPA" value={String(student.cgpa)} />
                        )}
                        {student.date_of_birth && (
                            <InfoItem icon={<Calendar className="w-4 h-4 text-white/30" />} label="Date of Birth" value={student.date_of_birth} />
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 pb-6 pt-0 flex items-center justify-between border-t border-white/5 mt-0 pt-5">
                    <div className="flex items-center gap-2 text-[9px] text-white/20 font-medium">
                        <Lock className="w-3 h-3" />
                        <span>Secure Institutional Record</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { onClose(); onEdit(student); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary font-black uppercase text-[9px] tracking-widest rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white/5 text-white/50 font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Small helper component
const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="space-y-1">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{label}</p>
        <div className="flex items-center gap-2">
            {icon}
            <p className="text-sm font-bold text-white uppercase">{value}</p>
        </div>
    </div>
);
