import React from "react";
import { BrainCircuit } from "lucide-react";

const ProcessingOverlay: React.FC = () => {
    return (
        <div className="absolute inset-0 z-[110] bg-[#1a1c23]/90 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.5)_0%,transparent_70%)] animate-pulse" />
            </div>

            <div className="relative mb-12">
                <div className="w-32 h-32 border-2 border-indigo-500/20 rounded-full animate-reverse-spin" />
                <div className="absolute inset-0 w-32 h-32 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                    <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
                </div>
            </div>

            <div className="text-center space-y-4 relative z-10 px-6">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Analyzing Unstructured Intelligence</h2>
                <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.5em] animate-pulse">Neural Core: Executing Semantic Mapping...</p>

                <div className="max-w-xs mx-auto pt-8">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-indigo-500 animate-pulse rounded-full shadow-[0_0_15px_rgba(99,102,241,1)] w-2/3" />
                    </div>
                    <div className="flex justify-between mt-3 text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 outline-none">
                        <span>OCR Layer</span>
                        <span>Entity Discretization</span>
                        <span>Logic Bridge</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcessingOverlay;
