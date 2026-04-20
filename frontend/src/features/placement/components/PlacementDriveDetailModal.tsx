import React from 'react';
import { X, MapPin, Briefcase, Calendar, DollarSign, Target, ShieldCheck, MessageCircle, FileText } from 'lucide-react';
import { PlacementDrive } from '../types';

interface Props {
    drive: PlacementDrive;
    isOpen: boolean;
    onClose: () => void;
    onApply: (driveId: number) => void;
    isApplying: boolean;
    appStatus?: string;
    mode?: 'admin' | 'student';
}

const PlacementDriveDetailModal: React.FC<Props> = ({ drive, isOpen, onClose, onApply, isApplying, appStatus, mode = 'student' }) => {
    if (!isOpen) return null;

    const metadata = drive.neural_metadata || {};
    const primarySkills = metadata.primary_skills || [];
    const socialBlurbs = metadata.social_blurbs || [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" onClick={onClose} />
            
            <div className="relative bg-[#0d0e12] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                {/* Header Section */}
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/20">
                            {drive.company_name[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-black text-white tracking-tight">{drive.company_name}</h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${appStatus ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'}`}>
                                    {appStatus ? `Status: ${appStatus}` : 'EVALUATED: QUALIFIED'}
                                </span>
                            </div>
                            <p className="text-indigo-400 font-bold text-lg uppercase tracking-wider">{drive.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-10 scrollbar-hide">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> CTC Package
                            </div>
                            <p className="text-lg font-black text-white">{drive.package_details || 'As per norms'}</p>
                        </div>
                        <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Location
                            </div>
                            <p className="text-lg font-black text-white">{drive.location || 'Pan India'}</p>
                        </div>
                        <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <Target className="w-3.5 h-3.5 text-purple-400" /> Benchmark
                            </div>
                            <p className="text-lg font-black text-white">
                                {(drive.min_cgpa ?? 0) > 0 ? `${drive.min_cgpa} CGPA` : `${drive.min_ug_percentage ?? 0}% UG`}
                            </p>
                        </div>
                        <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                <Calendar className="w-3.5 h-3.5 text-red-500" /> Deadline
                            </div>
                            <p className="text-lg font-black text-white">{new Date(drive.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Summary */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                                    <FileText className="w-4 h-4" /> Intelligence Summary
                                </h3>
                                <div className="text-gray-400 font-medium leading-relaxed bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                                    {drive.job_description || metadata.narrative_summary || "Our Neural Core is still analyzing the job description for this venture. Stay tuned for more insights."}
                                </div>
                            </div>

                            {/* Eligibility Manifest */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                                    <ShieldCheck className="w-4 h-4" /> Governance Manifest
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Eligible Branches</p>
                                        <p className="text-xs font-bold text-white">{drive.eligible_branches?.join(', ') || 'All Technical Streams'}</p>
                                    </div>
                                    <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10">
                                        <p className="text-[9px] font-black text-purple-400 uppercase mb-1">Eligible Batches</p>
                                        <p className="text-xs font-bold text-white">{drive.eligible_batches?.join(', ') || 'N/A'}</p>
                                    </div>
                                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                        <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">10th / 12th Cutoff</p>
                                        <p className="text-xs font-bold text-white">{drive.min_10th_percent}% / {drive.min_12th_percent}%</p>
                                    </div>
                                    <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                                        <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Max Active Backlogs</p>
                                        <p className="text-xs font-bold text-white tracking-widest">{drive.allowed_active_backlogs}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Criteria / Additional Details */}
                            {drive.custom_criteria && Object.keys(drive.custom_criteria).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                                        <Target className="w-4 h-4" /> Neural Directives
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(drive.custom_criteria).map(([key, value]) => (
                                            <div key={key} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-1">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                                    {key.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-xs font-bold text-white leading-relaxed">
                                                    {String(value)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-1 space-y-8">
                            {/* AI Insights Sidebar */}
                            <div className="space-y-6">
                                <div className="glass p-6 rounded-[2rem] border-indigo-500/10 bg-indigo-500/[0.02]">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Targeted Skillsets</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {primarySkills.length > 0 ? primarySkills.map((s: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-300 text-[10px] font-black uppercase rounded-lg border border-indigo-500/5">
                                                {s}
                                            </span>
                                        )) : <span className="text-xs text-gray-500 italic">General Software Engineering</span>}
                                    </div>
                                </div>

                                {socialBlurbs.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Neural Highlights</h4>
                                        {socialBlurbs.slice(0, 3).map((b: string, i: number) => (
                                            <div key={i} className="p-4 bg-white/5 rounded-2xl text-[11px] font-bold text-gray-300 leading-snug italic border-l-2 border-indigo-500">
                                                "{b}"
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {drive.jd_document && (
                                    <div className="glass p-6 rounded-[2rem] border-indigo-500/10 bg-indigo-500/[0.02] mt-6">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Original Artifact</h4>
                                        <button 
                                            onClick={() => window.open(typeof drive.jd_document === 'string' ? drive.jd_document : URL.createObjectURL(drive.jd_document as any), '_blank')}
                                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                            View JD Document
                                        </button>
                                        <p className="text-[9px] text-gray-500 font-bold mt-3 text-center uppercase tracking-widest leading-relaxed">Verified by Nexora Neural Core</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-white/10 bg-black/40 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Action Status</p>
                        <p className="text-xs font-bold text-white">
                            {mode === 'admin' 
                                ? 'Admin Management View' 
                                : (appStatus ? `Session active in funnel: ${appStatus}` : 'Eligible for immediate application')}
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        {drive.is_broadcasted && (
                             <button
                                onClick={() => window.location.href = `/chat-hub?group=${drive.chat_session_id}`}
                                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4 text-indigo-400" />
                                Comms Hub
                            </button>
                        )}
                        
                        {mode === 'student' && (
                            !appStatus ? (
                                <button 
                                    onClick={() => onApply(drive.id!)}
                                    disabled={isApplying}
                                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isApplying ? 'Processing Application...' : 'Initiate Application'}
                                    <Briefcase className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="px-10 py-4 bg-emerald-500/10 text-emerald-400 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    Synchronized
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementDriveDetailModal;

