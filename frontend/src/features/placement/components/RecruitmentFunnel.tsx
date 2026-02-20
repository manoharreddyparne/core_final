// src/features/placement/components/RecruitmentFunnel.tsx
import React from 'react';
import { PlacementProcessStage } from '../types';

interface RecruitmentFunnelProps {
    stages: PlacementProcessStage[];
}

export const RecruitmentFunnel: React.FC<RecruitmentFunnelProps> = ({ stages }) => {
    if (stages.length === 0) {
        return <p className="text-white/30 text-xs italic">Application is in screening...</p>;
    }

    return (
        <div className="relative pt-4 pb-8">
            {/* Line connecting stages */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/5 border-l border-dashed border-white/20"></div>

            <div className="space-y-6">
                {stages.map((stage, idx) => (
                    <div key={stage.id} className="relative flex items-start gap-4">
                        <div className={`
              z-10 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all
              ${stage.status === 'CLEARED' ? "bg-green-400 border-green-400 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)]" : ""}
              ${stage.status === 'FAILED' ? "bg-red-400 border-red-400 text-white" : ""}
              ${stage.status === 'PENDING' ? "bg-[#0b1120] border-white/20 text-white/40" : ""}
            `}>
                            {stage.status === 'CLEARED' ? "✓" : idx + 1}
                        </div>

                        <div className="flex-1 glass p-4 rounded-2xl border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between">
                                <h4 className={`font-bold text-sm ${stage.status === 'PENDING' ? 'text-white/40' : 'text-white'}`}>
                                    {stage.stage_name}
                                </h4>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${stage.status === 'CLEARED' ? 'text-green-400' :
                                        stage.status === 'FAILED' ? 'text-red-400' : 'text-white/20'
                                    }`}>
                                    {stage.status}
                                </span>
                            </div>
                            {stage.feedback && <p className="mt-1 text-xs text-blue-100/40 italic">"{stage.feedback}"</p>}
                            {stage.scheduled_at && (
                                <p className="mt-2 text-[10px] text-primary font-bold">
                                    Scheduled: {new Date(stage.scheduled_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
