import React, { useState, useEffect } from "react";
import { Activity, BellRing, Check } from "lucide-react";
import { PlacementDrive } from "../../types";

interface GovernanceSectionProps {
    formData: Partial<PlacementDrive>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<PlacementDrive>>>;
}

const GovernanceSection: React.FC<GovernanceSectionProps> = ({ formData, setFormData }) => {
    const branches = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'BBA'];

    // Local display state — keeps the raw string user is typing (so "7." doesn't jump to "7")
    const [localNums, setLocalNums] = useState({
        min_cgpa: String(formData.min_cgpa ?? ''),
        min_ug_percentage: String(formData.min_ug_percentage ?? ''),
        cgpa_to_percentage_multiplier: String(formData.cgpa_to_percentage_multiplier ?? 9.5),
        min_10th_percent: String(formData.min_10th_percent ?? ''),
        min_12th_percent: String(formData.min_12th_percent ?? ''),
        allowed_active_backlogs: String(formData.allowed_active_backlogs ?? ''),
    });

    // Sync FROM parent when parent updates these (e.g. PDF extraction)
    useEffect(() => {
        setLocalNums({
            min_cgpa: String(formData.min_cgpa ?? ''),
            min_ug_percentage: String(formData.min_ug_percentage ?? ''),
            cgpa_to_percentage_multiplier: String(formData.cgpa_to_percentage_multiplier ?? 9.5),
            min_10th_percent: String(formData.min_10th_percent ?? ''),
            min_12th_percent: String(formData.min_12th_percent ?? ''),
            allowed_active_backlogs: String(formData.allowed_active_backlogs ?? ''),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formData.min_cgpa, formData.min_ug_percentage, formData.cgpa_to_percentage_multiplier,
        formData.min_10th_percent, formData.min_12th_percent, formData.allowed_active_backlogs
    ]);

    // onChange: update both local display AND parent state on every keystroke.
    // We use the functional updater so we always get fresh `prev` state.
    // parseFloat("7.") = 7, parseFloat("7.8") = 7.8 — good enough for live filtering.
    const handleNumChange = (field: string, val: string) => {
        setLocalNums(p => ({ ...p, [field]: val }));
        const parsed = parseFloat(val);
        setFormData(prev => ({ ...prev, [field]: isNaN(parsed) ? 0 : parsed }));
    };

    const toggleBranch = (branch: string) => {
        const current = formData.eligible_branches || [];
        const updated = current.includes(branch)
            ? current.filter(b => b !== branch)
            : [...current, branch];
        setFormData(prev => ({ ...prev, eligible_branches: updated }));
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-black/40 border border-white/5 rounded-3xl space-y-6">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Governance Intelligence &amp; Synthesis
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Min CGPA</label>
                        <input type="number" step="0.1"
                            value={localNums.min_cgpa}
                            onChange={e => handleNumChange('min_cgpa', e.target.value)}
                            className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">UG %</label>
                        <input type="number" step="0.1"
                            value={localNums.min_ug_percentage}
                            onChange={e => handleNumChange('min_ug_percentage', e.target.value)}
                            className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Conversion Key</label>
                        <input type="number" step="0.1"
                            value={localNums.cgpa_to_percentage_multiplier}
                            onChange={e => handleNumChange('cgpa_to_percentage_multiplier', e.target.value)}
                            className="w-full bg-transparent border-b border-emerald-500/30 text-emerald-400 px-1 py-2 text-sm focus:border-emerald-500 outline-none transition-all" />
                        <p className="text-[7px] text-gray-600 uppercase mt-1">CGPA * Key = %</p>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">10th %</label>
                        <input type="number" step="0.1"
                            value={localNums.min_10th_percent}
                            onChange={e => handleNumChange('min_10th_percent', e.target.value)}
                            className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">12th %</label>
                        <input type="number" step="0.1"
                            value={localNums.min_12th_percent}
                            onChange={e => handleNumChange('min_12th_percent', e.target.value)}
                            className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Backlogs</label>
                        <input type="number"
                            value={localNums.allowed_active_backlogs}
                            onChange={e => handleNumChange('allowed_active_backlogs', e.target.value)}
                            className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0" />
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1">Eligibility Clusters</label>
                <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 rounded-[2rem]">
                    {branches.map(branch => (
                        <button
                            key={branch}
                            type="button"
                            onClick={() => toggleBranch(branch)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${formData.eligible_branches?.includes(branch)
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                }`}
                        >
                            {branch}
                        </button>
                    ))}
                </div>
            </div>

            {/* Automated Reminders Configuration */}
            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <BellRing className="w-3.5 h-3.5" /> Automated Recruitment Lifecycle
                    </h4>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, auto_reminders_enabled: !prev.auto_reminders_enabled }))}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${formData.auto_reminders_enabled ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-500'}`}
                    >
                        {formData.auto_reminders_enabled ? 'Active' : 'Disabled'}
                    </button>
                </div>

                {formData.auto_reminders_enabled && (
                    <div className="flex flex-wrap gap-4 animate-in slide-in-from-top-2 duration-300">
                        {['3_days', '1_day', 'deadline_imminent'].map(node => (
                            <label key={node} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={!!formData.reminder_config?.[node]}
                                    onChange={() => {
                                        const current = formData.reminder_config || {};
                                        setFormData(prev => ({
                                            ...prev,
                                            reminder_config: { ...current, [node]: !current[node] }
                                        }));
                                    }}
                                    className="hidden"
                                />
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${formData.reminder_config?.[node] ? 'bg-amber-500 border-amber-400' : 'border-white/20'}`}>
                                    {formData.reminder_config?.[node] && <Check className="w-2.5 h-2.5 text-black" />}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase group-hover:text-white transition-colors">
                                    {node.replace(/_/g, ' ')}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GovernanceSection;
