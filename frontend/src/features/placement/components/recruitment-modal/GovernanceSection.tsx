import React from "react";
import { Activity } from "lucide-react";
import { PlacementDrive } from "../../types";

interface GovernanceSectionProps {
    formData: Partial<PlacementDrive>;
    setFormData: (data: Partial<PlacementDrive>) => void;
}

const GovernanceSection: React.FC<GovernanceSectionProps> = ({ formData, setFormData }) => {
    const branches = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'BBA'];

    const toggleBranch = (branch: string) => {
        const current = formData.eligible_branches || [];
        const updated = current.includes(branch) 
            ? current.filter(b => b !== branch) 
            : [...current, branch];
        setFormData({ ...formData, eligible_branches: updated });
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-black/40 border border-white/5 rounded-3xl space-y-6">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Governance Intelligence & Synthesis
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Min CGPA</label>
                        <input type="number" step="0.1" value={Number.isNaN(formData.min_cgpa) ? '' : (formData.min_cgpa ?? '')} onChange={e => setFormData({ ...formData, min_cgpa: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">UG %</label>
                        <input type="number" step="0.1" value={Number.isNaN(formData.min_ug_percentage) ? '' : (formData.min_ug_percentage ?? '')} onChange={e => setFormData({ ...formData, min_ug_percentage: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Conversion Key</label>
                        <input type="number" step="0.1" value={Number.isNaN(formData.cgpa_to_percentage_multiplier) ? 9.5 : (formData.cgpa_to_percentage_multiplier ?? 9.5)} onChange={e => setFormData({ ...formData, cgpa_to_percentage_multiplier: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-transparent border-b border-emerald-500/30 text-emerald-400 px-1 py-2 text-sm focus:border-emerald-500 outline-none transition-all" />
                        <p className="text-[7px] text-gray-600 uppercase mt-1">CGPA * Key = %</p>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">10th %</label>
                        <input type="number" step="0.1" value={Number.isNaN(formData.min_10th_percent) ? '' : (formData.min_10th_percent ?? '')} onChange={e => setFormData({ ...formData, min_10th_percent: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">12th %</label>
                        <input type="number" step="0.1" value={Number.isNaN(formData.min_12th_percent) ? '' : (formData.min_12th_percent ?? '')} onChange={e => setFormData({ ...formData, min_12th_percent: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Backlogs</label>
                        <input type="number" value={Number.isNaN(formData.allowed_active_backlogs) ? '' : (formData.allowed_active_backlogs ?? '')} onChange={e => setFormData({ ...formData, allowed_active_backlogs: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0" />
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
        </div>
    );
};

export default GovernanceSection;
