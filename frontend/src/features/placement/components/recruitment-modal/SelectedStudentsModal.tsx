import React from "react";
import { X, Users, CheckCircle2, ShieldCheck, Mail } from "lucide-react";

interface Student {
    id: number;
    full_name: string;
    roll_number: string;
    branch: string;
    cgpa: string;
    is_activated: boolean;
    is_manual?: boolean;
}

interface SelectedStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedStudents: Student[];
    driveName: string;
}

const SelectedStudentsModal: React.FC<SelectedStudentsModalProps> = ({ 
    isOpen, 
    onClose, 
    selectedStudents,
    driveName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-[#0f1115] border border-white/10 rounded-[2.5rem] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <Users className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-none">Target Audience Manifest</h3>
                            <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest mt-1 font-black">
                                {selectedStudents.length} Students Selected for {driveName}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {selectedStudents.length > 0 ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                <div className="col-span-6">Student Identity</div>
                                <div className="col-span-3 text-center">Branch</div>
                                <div className="col-span-3 text-right">Status</div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {selectedStudents.map((s) => (
                                    <div key={s.id} className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors rounded-xl items-center">
                                        <div className="col-span-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-white uppercase">{s.full_name}</span>
                                                    {s.is_manual && <span className="text-[7px] px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded-md font-black">MANUAL</span>}
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-500">{s.roll_number}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 text-center">
                                            <span className="text-[10px] font-bold text-indigo-400/80 px-2 py-0.5 bg-indigo-500/10 rounded-lg">{s.branch}</span>
                                        </div>
                                        <div className="col-span-3 text-right">
                                            {s.is_activated ? (
                                                <div className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                                                    <ShieldCheck className="w-3 h-3" /> Activated
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1 text-[8px] font-black text-amber-400 uppercase tracking-tighter opacity-70">
                                                    <Mail className="w-3 h-3" /> Invited
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <Users className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-sm font-bold text-gray-500">No students selected yet.</p>
                            <p className="text-[10px] uppercase tracking-widest mt-1">Adjust criteria or add manually to see manifest</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-center">
                    <button 
                        onClick={onClose}
                        className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10"
                    >
                        Return to Orchestration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectedStudentsModal;
