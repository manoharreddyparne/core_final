import React from "react";
import { Briefcase, Target, DollarSign, Clock } from "lucide-react";
import { PlacementDrive } from "../../types";

interface DriveDetailsSectionProps {
    formData: Partial<PlacementDrive>;
    setFormData: (data: Partial<PlacementDrive>) => void;
}

const DriveDetailsSection: React.FC<DriveDetailsSectionProps> = ({ formData, setFormData }) => {
    return (
        <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-indigo-400" /> Organization
                </label>
                <input 
                    type="text" 
                    value={formData.company_name} 
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })} 
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" 
                    placeholder="e.g. NVIDIA Corporation" 
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-indigo-400" /> Functional Role
                </label>
                <input 
                    type="text" 
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value })} 
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" 
                    placeholder="e.g. Fullstack Developer" 
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-indigo-400" /> Package / CTC
                </label>
                <input 
                    type="text" 
                    value={formData.package_details} 
                    onChange={e => setFormData({ ...formData, package_details: e.target.value })} 
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" 
                    placeholder="e.g. 18.5 LPA" 
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-indigo-400" /> Deadline
                </label>
                <input 
                    type="datetime-local" 
                    value={formData.deadline} 
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })} 
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" 
                />
            </div>
        </div>
    );
};

export default DriveDetailsSection;
