import React from "react";
import { User, X, GraduationCap, LayoutGrid, BarChart2, Lock } from "lucide-react";
import { Student } from "../hooks/useStudentRegistry";

interface StudentProfileDrawerProps {
    student: Student | null;
    onClose: () => void;
    onEdit: (student: Student) => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({ student, onClose, onEdit }) => {
    if (!student) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/97 backdrop-blur-3xl animate-in zoom-in-95 duration-300">
            <div className="glass w-full max-w-2xl overflow-hidden flex flex-col rounded-[3.5rem] border border-white/10 shadow-3xl">
                <div className="p-12 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/20 to-transparent opacity-50" />
                    <button onClick={onClose} className="absolute top-10 right-10 w-12 h-12 glass rounded-2xl border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="relative z-10 space-y-6 flex flex-col items-center mt-4">
                        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                            <User className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 px-4 py-1 glass rounded-full inline-block border-primary/20">{student.roll_number}</p>
                            <h2 className="text-3xl font-black text-white italic tracking-tighter">{student.full_name}</h2>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-50">{student.official_email}</p>
                            {student.personal_email && <p className="text-white/30 text-xs mt-1">{student.personal_email}</p>}
                            {student.phone_number && <p className="text-white/30 text-xs mt-0.5">📞 {student.phone_number}</p>}
                        </div>
                    </div>
                </div>

                <div className="px-12 pb-8 bg-white/[0.01] grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Program / Branch</p>
                            <div className="flex items-center gap-3">
                                <GraduationCap className="w-4 h-4 text-primary" />
                                <p className="text-sm font-bold text-white uppercase">{student.program || "B.Tech"} — {student.branch}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Section · Semester</p>
                            <div className="flex items-center gap-3">
                                <LayoutGrid className="w-4 h-4 text-primary" />
                                <p className="text-sm font-bold text-white uppercase">Section {student.section} · Sem {student.current_semester}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Batch / Passout</p>
                            <p className="text-sm font-bold text-white">{student.batch_year} → {student.passout_year || "—"}</p>
                        </div>
                    </div>
                    <div className="space-y-5 border-l border-white/5 pl-8">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Account Status</p>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${student.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                <p className="text-sm font-black text-white">{student.status}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">CGPA</p>
                            <div className="flex items-center gap-3">
                                <BarChart2 className="w-4 h-4 text-amber-400" />
                                <p className="text-sm font-black text-white tracking-widest">{student.cgpa || "0.00"}</p>
                            </div>
                        </div>
                        {student.date_of_birth && (
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Date of Birth</p>
                                <p className="text-sm font-bold text-white">{student.date_of_birth}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium italic opacity-50">
                        <Lock className="w-3 h-3" /> Secure Institutional Identity
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { onClose(); onEdit(student); }} className="px-6 py-3 bg-primary/10 text-primary font-black uppercase text-[9px] tracking-widest rounded-xl border border-primary/20 hover:bg-primary transition-all hover:text-white">Edit Profile</button>
                        <button onClick={onClose} className="px-6 py-3 glass text-white font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border-white/10">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
