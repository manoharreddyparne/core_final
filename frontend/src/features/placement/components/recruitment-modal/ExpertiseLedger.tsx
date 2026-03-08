import React from "react";
import { BrainCircuit, Activity, Target, DollarSign, Clock, Phone, ListChecks, X } from "lucide-react";
import { PlacementDrive } from "../../types";
import ConfirmModal from "./ConfirmModal";

interface ExpertiseLedgerProps {
    expertise: any;
    formData: Partial<PlacementDrive>;
    setFormData: (data: Partial<PlacementDrive>) => void;
    showAddField: boolean;
    setShowAddField: (show: boolean) => void;
}

const ExpertiseLedger: React.FC<ExpertiseLedgerProps> = ({
    expertise,
    formData,
    setFormData,
    showAddField,
    setShowAddField
}) => {
    const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

    if (!expertise) {
        return (
            <div className="bg-[#12141a] border border-white/10 rounded-[3rem] p-7 h-full flex flex-col shadow-2xl items-center justify-center text-center opacity-20 py-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-gray-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Waiting for Input</p>
            </div>
        );
    }

    return (
        <div className="bg-[#12141a] border border-white/10 rounded-[3rem] p-7 h-full flex flex-col shadow-2xl overflow-y-auto scrollbar-hide">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2.5">
                <BrainCircuit className="w-4 h-4 text-indigo-400" /> Intelligence Ledger
            </h4>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between p-5 bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-3xl shadow-lg">
                    <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">AI Tier Ranking</p>
                        <p className="text-base font-black text-white mt-1 uppercase italic tracking-tight">{expertise.drive_type} DRIVE</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${expertise.drive_type === 'PREMIUM'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        }`}>
                        {expertise.drive_type === 'PREMIUM' ? 'T1' : 'GL'}
                    </div>
                </div>

                {expertise.narrative_summary && (
                    <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem]">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <BrainCircuit className="w-3.5 h-3.5" /> Neural Archetype
                        </p>
                        <p className="text-[11px] text-gray-300 font-medium leading-relaxed italic">
                            {expertise.narrative_summary}
                        </p>
                        {expertise.key_highlights && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {expertise.key_highlights.map((h: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-gray-400">
                                        {h}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Target className="w-3 h-3 text-indigo-400" /> Location
                        </label>
                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-indigo-500/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <DollarSign className="w-3 h-3 text-emerald-400" /> Salary / Range
                        </label>
                        <input type="text" value={formData.salary_range} onChange={e => setFormData({ ...formData, salary_range: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-emerald-500/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-400" /> Experience
                        </label>
                        <input type="text" value={formData.experience_years} onChange={e => setFormData({ ...formData, experience_years: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-amber-500/50" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-pink-400" /> Contact Details / Apply Link
                        </label>
                        <input 
                            type="text" 
                            value={formData.contact_details?.join(', ') || ''} 
                            onChange={e => setFormData({ ...formData, contact_details: e.target.value ? [e.target.value] : [] })} 
                            placeholder="Enter apply link or contact email"
                            className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-pink-500/50" 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Stack Decomposition</p>
                    <div className="flex flex-wrap gap-2">
                        {expertise.primary_skills?.map((skill: string) => (
                            <span key={skill} className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-tight shadow-xl shadow-indigo-600/20 ring-1 ring-white/20">
                                {skill}
                            </span>
                        ))}
                        {expertise.secondary_skills?.map((skill: string) => (
                            <span key={skill} className="px-3 py-1.5 bg-white/5 text-gray-400 text-[10px] font-bold rounded-xl uppercase tracking-tight border border-white/10">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>

                {formData.custom_criteria && (
                    <div className="pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <ListChecks className="w-3.5 h-3.5" /> Ad-hoc Intelligence
                            </p>
                            <button
                                onClick={() => setShowAddField(true)}
                                className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-tighter transition-colors"
                            >
                                + Add Field
                            </button>
                        </div>

                        {showAddField && (
                            <div className="mb-4 flex gap-2 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="text"
                                    placeholder="Criterion Name"
                                    className="flex-1 bg-white/5 border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val) {
                                                setFormData({
                                                    ...formData,
                                                    custom_criteria: { ...formData.custom_criteria, [val]: "Not Specified" }
                                                });
                                                setShowAddField(false);
                                            }
                                        }
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => setShowAddField(false)}
                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-gray-500 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        <div className="space-y-3">
                            {Object.entries(formData.custom_criteria).map(([k, v]) => {
                                const displayValue = Array.isArray(v) ? v.join(", ") : String(v);
                                return (
                                <div key={k} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center flex-wrap gap-2 group/criterion">
                                    <span className="text-[9px] font-black text-gray-500 uppercase min-w-[100px]">{k.replace(/_/g, ' ')}</span>
                                    <input
                                        type="text"
                                        value={displayValue}
                                        onChange={e => {
                                            setFormData({
                                                ...formData,
                                                custom_criteria: { ...formData.custom_criteria, [k]: e.target.value }
                                            });
                                        }}
                                        className="flex-1 bg-transparent border-none text-[10px] font-bold text-gray-300 outline-none focus:text-white transition-colors"
                                    />
                                    <button 
                                        onClick={() => setConfirmDelete(k)}
                                        className="opacity-0 group-hover/criterion:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )})}
                        </div>
                    </div>
                )}

                <ConfirmModal 
                    isOpen={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    onConfirm={() => {
                        if (confirmDelete) {
                            const updated = { ...formData.custom_criteria };
                            delete updated[confirmDelete];
                            setFormData({ ...formData, custom_criteria: updated });
                        }
                    }}
                    title="Purge Criterion"
                    message={`Are you sure you want to remove the "${confirmDelete?.replace(/_/g, ' ')}" criterion from this intelligence ledger?`}
                    confirmText="Purge"
                />

                <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/40 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        AI Generation Output
                    </p>
                    <div className="space-y-3 relative z-10">
                        {expertise.social_blurbs?.map((blurb: string, i: number) => (
                            <p key={i} className="text-xs text-gray-200 font-bold leading-relaxed italic border-l-2 border-indigo-500 pl-3 py-1 bg-white/5 rounded-r-xl">
                                "{blurb}"
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpertiseLedger;
