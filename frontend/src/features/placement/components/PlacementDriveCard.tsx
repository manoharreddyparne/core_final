import React from "react";
import { Globe, BarChart3, Clock, Activity, MessageCircle, Users, Trash2, Edit3 } from "lucide-react";
import { PlacementDrive } from "../types";
import PlacementDriveDetailModal from "./PlacementDriveDetailModal";

interface PlacementDriveCardProps {
    drive: PlacementDrive;
    mode?: 'admin' | 'student';
    onOpenAnalytics?: (drive: PlacementDrive) => void;
    onOpenReview?: (drive: PlacementDrive) => void;
    onOpenEdit?: (drive: PlacementDrive) => void;
    onDelete?: (id: number) => void;
    onApply?: (id: number) => void;
    onViewDetail?: (drive: PlacementDrive) => void;
    isApplying?: boolean;
    appStatus?: string;
}

const PlacementDriveCard: React.FC<PlacementDriveCardProps> = ({
    drive,
    mode = 'admin',
    onOpenAnalytics,
    onOpenReview,
    onOpenEdit,
    onDelete,
    onApply,
    onViewDetail,
    isApplying,
    appStatus
}) => {
    const [isDetailOpen, setIsDetailOpen] = React.useState(false);

    const handleCardClick = () => {
        if (mode === 'admin') return; // Admin uses specific buttons
        if (onViewDetail) onViewDetail(drive);
        else setIsDetailOpen(true);
    };

    const stopProb = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <>
        <div 
            onClick={handleCardClick}
            className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.06] cursor-pointer transition-all relative overflow-hidden group shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-2 duration-500"
        >
            {/* Status Badge */}
            <div className={`absolute top-0 right-0 px-5 py-2 text-[9px] font-black tracking-[0.15em] uppercase rounded-bl-2xl border-l border-b border-white/10 ${drive.status === 'ACTIVE'
                    ? drive.is_broadcasted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                {mode === 'admin' ? (
                    drive.status === 'ACTIVE' ? (drive.is_broadcasted ? 'Live & Broadcasted' : 'Active System') : 'Draft Initialized'
                ) : (
                    appStatus ? `PROCESSED: ${appStatus}` : 'EVALUATED: QUALIFIED'
                )}
            </div>

            {/* Entity Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-white flex items-center justify-center rounded-2xl shadow-xl shadow-black/10 overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-2xl font-black text-black uppercase">{drive.company_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-white mb-1 truncate pr-16 uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                        {drive.company_name}
                    </h3>
                    <div className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                        {drive.role}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-4 mb-8">
                {(drive.package_details && drive.package_details !== 'Not Specified') || (drive.location && drive.location !== 'Not Specified') ? (
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                        <Globe className="w-4 h-4 text-gray-600 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-gray-400">
                            {[
                                drive.package_details && drive.package_details !== 'Not Specified' ? drive.package_details : null,
                                drive.location && drive.location !== 'Not Specified' ? drive.location : null
                            ].filter(Boolean).join(' • ') || 'Details available in drive page'}
                        </span>
                    </div>
                ) : null}
                <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                    <BarChart3 className="w-4 h-4 text-gray-600 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-gray-400">
                        {(drive.min_cgpa ?? 0) > 0 ? `Min ${drive.min_cgpa} CGPA` : (drive.min_ug_percentage ?? 0) > 0 ? `Min ${drive.min_ug_percentage}% UG` : 'Open to all'}
                        {drive.experience_years && drive.experience_years !== 'Not Specified' ? ` • ${drive.experience_years} yrs` : ''}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                    <Clock className="w-4 h-4 text-gray-600 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-gray-400">
                        Deadline: {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>
            
            {/* Neural Highlights (AI Driven) */}
            {(drive.neural_metadata?.social_blurbs?.length || drive.neural_metadata?.primary_skills?.length) && (
                <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {drive.neural_metadata.social_blurbs?.[0] && (
                        <p className="text-[10px] text-gray-300 font-bold italic mb-3 leading-relaxed border-l-2 border-indigo-500/40 pl-3">
                            "{drive.neural_metadata.social_blurbs[0]}"
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {drive.neural_metadata.primary_skills?.slice(0, 4).map((skill: string) => (
                            <span key={skill} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-tight">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Orchestrator Actions */}
            <div className="grid grid-cols-1 gap-4 pt-6 mt-auto border-t border-white/5">
                {mode === 'admin' ? (
                   <>
                    <div className="flex gap-2.5">
                        <button
                            onClick={() => onOpenAnalytics?.(drive)}
                            className="flex-1 py-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-indigo-500/10 hover:border-indigo-500/30"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Eligibility
                        </button>
                        {drive.is_broadcasted ? (
                            <div className="flex-1 flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); window.location.href = `/chat-hub?group=${drive.chat_session_id}`; }}
                                    className="flex-1 py-3.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-green-500/10 hover:border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Comms Hub
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenReview?.(drive); }}
                                    className="flex-1 py-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-purple-500/10 hover:border-purple-500/30"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    Review Apps
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenReview?.(drive); }}
                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Student List
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenEdit?.(drive); }}
                            className="flex-[4] py-3 bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-white/20 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group/edit"
                        >
                            <Edit3 className="w-3.5 h-3.5 text-gray-600 group-hover/edit:text-indigo-400" />
                            Edit & Configure
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(drive.id!); }}
                            className="flex-1 py-3 bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 text-red-500/60 hover:text-red-400 rounded-xl transition-all flex items-center justify-center group/del"
                            title="Purge Initiative"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                   </>
                ) : (
                    <div className="flex gap-2.5">
                        {appStatus ? (
                            <button
                                disabled
                                className="flex-1 py-4 bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-green-500/20"
                            >
                                Application Synchronized
                            </button>
                        ) : (
                            <button
                                onClick={() => onApply?.(drive.id!)}
                                disabled={isApplying}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isApplying ? "EXECUTING_ENROLLMENT..." : "Initiate Application"}
                            </button>
                        )}
                        
                        {drive.is_broadcasted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); window.location.href = `/chat-hub?group=${drive.chat_session_id}`; }}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4 text-indigo-400" />
                                Comms Hub
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
        />
        </>
    );
};


export default PlacementDriveCard;
