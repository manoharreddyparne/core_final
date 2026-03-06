import React from "react";
import { Briefcase } from "lucide-react";

interface PlacementEmptyStateProps {
    onInitiate: () => void;
}

const PlacementEmptyState: React.FC<PlacementEmptyStateProps> = ({ onInitiate }) => {
    return (
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Briefcase className="w-10 h-10 text-gray-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">System Manifest Empty</h3>
            <p className="text-gray-500 max-w-md mb-10 text-sm font-medium leading-relaxed uppercase tracking-wider text-[11px]">
                Start by initiating a placement architecture. Upload an HR's JD PDF and let the system-level AI automate candidate matching and communication.
            </p>
            <button
                onClick={onInitiate}
                className="px-8 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition-all font-black text-xs border border-white/10 shadow-xl uppercase tracking-widest"
            >
                Establish First Initiative
            </button>
        </div>
    );
};

export default PlacementEmptyState;
