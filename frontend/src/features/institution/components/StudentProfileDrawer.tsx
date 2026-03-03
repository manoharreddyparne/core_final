import React, { useEffect } from "react";
import {
    X, GraduationCap, LayoutGrid, BarChart2, Lock,
    Mail, Phone, Calendar, Hash, Edit2
} from "lucide-react";
import { Student } from "../hooks/useStudentRegistry";
import { createPortal } from "react-dom";

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
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKey);
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    if (!student) return null;

    const statusActive = student.status === "ACTIVE";

    const content = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[32px]" onClick={onClose} />

            {/* Subtle background aura */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 pointer-events-none" />

            {/* Glass Card */}
            <div
                className="relative w-full max-w-xl bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Ambient glows */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[130px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[90px] rounded-full -ml-32 -mb-32 pointer-events-none" />

                    {/* Header Section */}
                    <div className="relative bg-white/[0.02] pt-12 pb-10 px-10 flex flex-col items-center text-center border-b border-white/5">
                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 w-11 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white/30 hover:text-white transition-all group"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        {/* Avatar with Ring */}
                        <div className="relative mb-6">
                            <div className="w-24 h-24 bg-primary/10 border-2 border-primary/20 rounded-[2.2rem] flex items-center justify-center shadow-2xl shadow-primary/10">
                                <span className="text-4xl font-black text-primary italic uppercase tracking-tighter">
                                    {student.full_name?.charAt(0) || "U"}
                                </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-[#0a0a0f] shadow-lg ${statusActive ? "bg-green-500 shadow-green-500/20" : "bg-amber-400 shadow-amber-400/20"}`} />
                        </div>

                        <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-1.5 rounded-full mb-4">
                            <Hash className="w-3 h-3 text-primary/60" />
                            <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase">{student.roll_number}</span>
                        </div>

                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-2 leading-none">
                            {student.full_name}
                        </h2>

                        <div className="flex flex-col items-center gap-1.5 mt-2">
                            {student.official_email && (
                                <div className="flex items-center gap-2 text-white/60">
                                    <Mail className="w-3.5 h-3.5 text-primary/50" />
                                    <span className="text-[11px] font-bold lowercase tracking-tight">{student.official_email}</span>
                                </div>
                            )}
                            <div className="flex gap-4 mt-1 opacity-40">
                                {student.phone_number && (
                                    <div className="flex items-center gap-1.5 text-white">
                                        <Phone className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{student.phone_number}</span>
                                    </div>
                                )}
                                {student.batch_year && (
                                    <div className="flex items-center gap-1.5 text-white">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">Class of {student.batch_year}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Analytics / Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/5 bg-white/[0.01]">
                        <div className="p-8 space-y-6">
                            <InfoSection label="Academic Path" items={[
                                { icon: <GraduationCap className="w-4 h-4" />, text: student.program || "B.Tech" },
                                { icon: <LayoutGrid className="w-4 h-4" />, text: student.branch || "CSE" },
                            ]} />
                            <InfoSection label="Enrollment" items={[
                                { icon: <Calendar className="w-4 h-4" />, text: `Section ${student.section || 'A'}` },
                                { icon: <Hash className="w-4 h-4" />, text: `Semester ${student.current_semester || '1'}` },
                            ]} />
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Academic Status</p>
                                <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                                    <div className={`w-2 h-2 rounded-full ${statusActive ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${statusActive ? "text-green-400" : "text-amber-400"}`}>
                                        {statusActive ? "Authorized Access" : "Pending Provision"}
                                    </span>
                                </div>
                            </div>

                            {student.cgpa !== undefined && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Current Merit</p>
                                    <div className="flex items-end gap-2 px-1">
                                        <span className="text-3xl font-black text-white italic tracking-tighter">{student.cgpa}</span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5">CGPA Score</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 pt-2">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Contact Details</p>
                                <div className="text-[11px] font-bold text-white/60 space-y-1">
                                    <p>Personal: {student.personal_email || 'N/A'}</p>
                                    <p>Phone: {student.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="p-8 flex items-center justify-between border-t border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-2.5 text-[9px] text-white/10 font-black uppercase tracking-widest">
                        <Lock className="w-3.5 h-3.5" />
                        <span>System Protected Identity</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { onClose(); onEdit(student); }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest rounded-2xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Modify
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/10 active:scale-95"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

const InfoSection = ({ label, items }: { label: string, items: { icon: React.ReactNode, text: string }[] }) => (
    <div className="space-y-3">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</p>
        {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-primary/60 border border-white/5">
                    {item.icon}
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-tight">{item.text}</span>
            </div>
        ))}
    </div>
);
