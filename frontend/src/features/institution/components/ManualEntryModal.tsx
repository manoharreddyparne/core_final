import React, { useEffect } from "react";
import { Users, X, Plus, ChevronLeft, ChevronRight, CheckCircle2, User, Mail, GraduationCap, Activity, ShieldCheck, MapPin, Phone, UserPlus } from "lucide-react";
import { createPortal } from "react-dom";
import { Student, useStudentRegistry } from "../hooks/useStudentRegistry";

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEditMode: boolean;
    currentFormIndex: number;
    formStudents: Partial<Student>[];
    onUpdateForm: (field: keyof Student, value: any) => void;
    onAddSequential: () => void;
    onSetIndex: (index: number) => void;
    onSubmit: () => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
    isOpen,
    onClose,
    isEditMode,
    currentFormIndex,
    formStudents,
    onUpdateForm,
    onAddSequential,
    onSetIndex,
    onSubmit,
}) => {
    const { registrySections, registryProgs, registryDepts } = useStudentRegistry(null, 'CARDS');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const currentForm = formStudents[currentFormIndex];

    const content = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500" onClick={onClose} />

            <div className="relative w-full max-w-4xl glass flex flex-col max-h-[95vh] rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="px-10 py-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center text-primary">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                                {isEditMode ? "Modify" : "Enshrine"} <span className="text-primary not-italic">Identity</span>
                            </h2>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Manual Entry Protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 glass rounded-xl border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                    {/* Progress & Navigation if multiple */}
                    <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <div className="flex gap-2">
                            {formStudents.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSetIndex(idx)}
                                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentFormIndex === idx ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            {!isEditMode && (
                                <button onClick={onAddSequential} className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-primary transition-all flex items-center justify-center">
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={currentFormIndex === 0}
                                onClick={() => onSetIndex(currentFormIndex - 1)}
                                className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-20"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={currentFormIndex === formStudents.length - 1}
                                onClick={() => onSetIndex(currentFormIndex + 1)}
                                className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-20"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Form Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        {/* Primary Identity */}
                        <div className="space-y-8">
                            <SectionHeader icon={<User className="w-4 h-4" />} title="Primary Identity" />
                            <div className="space-y-6">
                                <InputField label="Roll Number / ID" value={currentForm?.roll_number} onChange={(v: string) => onUpdateForm("roll_number", v)} placeholder="2024CS001" required />
                                <InputField label="Full Legal Name" value={currentForm?.full_name} onChange={(v: string) => onUpdateForm("full_name", v)} placeholder="John Doe" required />
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label="Gender" value={currentForm?.gender} onChange={(v: string) => onUpdateForm("gender", v)} options={["MALE", "FEMALE", "OTHER"]} />
                                    <SelectField label="Category" value={currentForm?.category} onChange={(v: string) => onUpdateForm("category", v)} options={["GEN", "OBC", "SC", "ST", "EWS"]} />
                                </div>
                            </div>
                        </div>

                        {/* Professional Context */}
                        <div className="space-y-8">
                            <SectionHeader icon={<GraduationCap className="w-4 h-4" />} title="Academic Context" />
                            <div className="space-y-6">
                                <SelectField label="Academic Program" value={currentForm?.program} onChange={(v: string) => onUpdateForm("program", v)} options={registryProgs} />
                                <SelectField label="Department / Branch" value={currentForm?.branch} onChange={(v: string) => onUpdateForm("branch", v)} options={registryDepts} />
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label="Section" value={currentForm?.section} onChange={(v: string) => onUpdateForm("section", v)} options={registrySections} />
                                    <InputField label="Current Sem" type="number" value={currentForm?.current_semester} onChange={(v: string) => onUpdateForm("current_semester", v)} />
                                </div>
                            </div>
                        </div>

                        {/* Communication */}
                        <div className="space-y-8">
                            <SectionHeader icon={<Mail className="w-4 h-4" />} title="Communication" />
                            <div className="space-y-6">
                                <InputField label="Official Institutional Email" value={currentForm?.official_email} onChange={(v: string) => onUpdateForm("official_email", v)} placeholder="john@univ.edu" required />
                                <InputField label="Personal Email" value={currentForm?.personal_email} onChange={(v: string) => onUpdateForm("personal_email", v)} placeholder="john.doe@gmail.com" />
                                <InputField label="Phone Number" value={currentForm?.phone_number} onChange={(v: string) => onUpdateForm("phone_number", v)} placeholder="+91 00000 00000" />
                            </div>
                        </div>

                        {/* Critical Metrics */}
                        <div className="space-y-8">
                            <SectionHeader icon={<Activity className="w-4 h-4" />} title="Critical Metrics" />
                            <div className="grid grid-cols-2 gap-6">
                                <InputField label="Current CGPA" type="number" step="0.01" value={currentForm?.cgpa} onChange={(v: string) => onUpdateForm("cgpa", v)} />
                                <InputField label="Active Backlogs" type="number" value={currentForm?.active_backlogs} onChange={(v: string) => onUpdateForm("active_backlogs", v)} />
                                <InputField label="Batch Year" type="number" value={currentForm?.batch_year} onChange={(v: string) => onUpdateForm("batch_year", v)} />
                                <InputField label="Passout Year" type="number" value={currentForm?.passout_year} onChange={(v: string) => onUpdateForm("passout_year", v)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-10 py-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Ready to sync 1 record to registry
                    </p>
                    <div className="flex gap-6 items-center">
                        <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-all">Cancel</button>
                        <button
                            onClick={onSubmit}
                            className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[.2em] shadow-2xl shadow-primary/30 transition-all flex items-center gap-3"
                        >
                            {isEditMode ? "Save Changes" : "Commit Record"}
                            <CheckCircle2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="text-primary">{icon}</div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 italic">{title}</h3>
    </div>
);

const InputField = ({ label, value, onChange, placeholder, type = "text", step, required }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1 block">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            step={step}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-primary/50 transition-all placeholder:text-gray-800"
        />
    </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1 block">{label}</label>
        <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
        >
            <option value="" className="bg-slate-900">Select Option</option>
            {options.map((opt: string) => (
                <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
            ))}
        </select>
    </div>
);
