import React, { useState } from 'react';
import { 
    Calendar, MapPin, DollarSign, Activity, Users, 
    MessageCircle, ShieldCheck, Target, Trash2, 
    ChevronRight, Briefcase, Edit3
} from 'lucide-react';
import { PlacementDrive } from '../types';
import PlacementDriveDetailModal from './PlacementDriveDetailModal';

interface Props {
    drive: PlacementDrive;
    onOpenAnalytics?: (drive: PlacementDrive) => void;
    onOpenReview?: (drive: PlacementDrive) => void;
    onOpenEdit?: (drive: PlacementDrive) => void;
    onDelete?: (driveId: number) => void;
    onApply?: (driveId: number) => void;
    mode?: 'admin' | 'student';
    isApplying?: boolean;
    appStatus?: string;
}

const PlacementDriveCard: React.FC<Props> = ({ 
    drive, onOpenAnalytics, onOpenReview, onOpenEdit, onDelete, onApply, mode = 'admin', isApplying, appStatus 
}) => {
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    return (
        <>
        <div 
            onClick={() => setIsDetailOpen(true)}
            className="group relative glass p-6 sm:p-8 rounded-[2.5rem] border-white/5 hover:border-indigo-500/30 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-indigo-500/10"
        >
            {/* Neural Background Flow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-700"></div>
            
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
                        {drive.company_name?.[0].toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1 group-hover:text-indigo-400 transition-colors">{drive.company_name}</h3>
                        <p className="text-[10px] text-indigo-400/60 font-black uppercase tracking-widest">{drive.role}</p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${
                    drive.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    drive.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                    {drive.status}
                </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-1 group-hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-3 h-3 text-emerald-400" /> CTC
                    </div>
                    <p className="text-sm font-black text-white">{drive.package_details || 'N/A'}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-1 group-hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <MapPin className="w-3 h-3 text-blue-400" /> Location
                    </div>
                    <p className="text-sm font-black text-white truncate">{drive.location || 'Remote'}</p>
                </div>
            </div>

            {/* AI Insights Snippet */}
            {drive.neural_metadata && (
                <div className="space-y-4 mb-6 relative z-10 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Neural Directives</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {drive.neural_metadata.primary_skills?.slice(0, 3).map((skill: string) => (
                            <span key={skill} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-tight">
                                {skill}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed italic line-clamp-2">
                        {drive.neural_metadata.narrative_summary || "Automated analysis pending..."}
                    </p>
                </div>
            )}

            {/* Orchestrator Actions */}
            <div className="pt-6 border-t border-white/5 space-y-3 relative z-10">
                {mode === 'admin' ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenAnalytics?.(drive); }}
                                className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-indigo-500/10 flex items-center justify-center gap-2"
                            >
                                <Activity className="w-3.5 h-3.5" />
                                Analytics
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenReview?.(drive); }}
                                className="flex-1 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-purple-500/10 flex items-center justify-center gap-2"
                            >
                                <Target className="w-3.5 h-3.5" />
                                Review
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenEdit?.(drive); }}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(drive.id!); }}
                                className="w-10 h-10 bg-red-500/5 hover:bg-red-500/20 text-red-500/60 hover:text-red-400 rounded-xl transition-all border border-red-500/10 flex items-center justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {drive.is_broadcasted && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); window.location.href = `/chat-hub?group=${drive.chat_session_id}`; }}
                                    className="w-10 h-10 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all border border-indigo-500/10 flex items-center justify-center"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsDetailOpen(true); }}
                            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Briefcase className="w-4 h-4" />
                            {appStatus ? 'Application Active' : 'View Opportunity'}
                        </button>
                        {appStatus && drive.is_broadcasted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); window.location.href = `/chat-hub?group=${drive.chat_session_id}`; }}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-2xl border border-white/10 flex items-center justify-center transform active:scale-95 transition-all shadow-xl shadow-indigo-500/10"
                                title="Recruitment Comms Hub"
                            >
                                <div className="relative">
                                    <MessageCircle className="w-5 h-5" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                                </div>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        <PlacementDriveDetailModal 
            drive={drive}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            onApply={(id) => onApply?.(id)}
            isApplying={isApplying || false}
            appStatus={appStatus}
            mode={mode}
        />
        </>
    );
};

export default PlacementDriveCard;
