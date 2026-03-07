import React from "react";
import { Target, Briefcase } from "lucide-react";

interface PlacementHeaderProps {
    onInitiate: () => void;
}

const PlacementHeader: React.FC<PlacementHeaderProps> = ({ onInitiate }) => {
    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/30">
                        <Target className="w-8 h-8 text-white" />
                    </div>
                    Placement Hub
                </h1>
                <p className="text-gray-500 text-sm mt-2 font-medium max-w-lg leading-relaxed uppercase tracking-widest text-[10px]">
                    AI-Powered JD Extraction • Eligible Student Matching • One-Click Broadcast
                </p>
            </div>
            <button
                onClick={onInitiate}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 group uppercase tracking-widest"
            >
                <Briefcase className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Create New Drive
            </button>
        </header>
    );
};

export default PlacementHeader;
