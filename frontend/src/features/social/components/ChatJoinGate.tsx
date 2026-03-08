import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogIn, Lock, Users, ArrowRight, UserCheck, Send, Info, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';
import { socialApi } from '../api';
import { toast } from 'react-hot-toast';

interface JoinGateProps {
    sessionId: string;
    onJoined: () => void;
    user: any;
}

export const ChatJoinGate: React.FC<JoinGateProps> = ({ sessionId, onJoined, user }) => {
    const [detail, setDetail] = useState<any>(null);
    const [status, setStatus] = useState<'LOADING' | 'NOT_MEMBER' | 'ELIGIBLE' | 'ELIGIBLE_PENDING_APPLY' | 'NEEDS_APPROVAL' | 'JOINED' | 'ERROR' | 'APPLY_FIRST' | 'NOT_ELIGIBLE' | 'STRANGER' | 'MEMBER' | 'KICKED'>('LOADING');
    const [message, setMessage] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const checkAccess = async () => {
        try {
            const res = await socialApi.getSessionDetail(sessionId);
            setDetail(res);
            setStatus(res.status_code);
            setMessage(res.message);
            if (res.is_member || res.status_code === 'MEMBER') {
                onJoined();
            }
        } catch (err: any) {
            setStatus('ERROR');
            setMessage(err.response?.data?.message || 'Access Denied');
        }
    };

    const handleJoinRequest = async () => {
        setIsJoining(true);
        try {
            if (detail?.can_join) {
                // Direct synchronization for eligible/applied or open rooms
                const res = await socialApi.joinChatGate(sessionId);
                if (res.success) {
                    toast.success(res.message || "Manifest entry established.");
                    checkAccess();
                    onJoined();
                }
            } else {
                // Governance request for strangers or restricted threads
                const res = await socialApi.requestAccess(sessionId);
                if (res.success) {
                    toast.success(res.message || "Access request dispatched to institutional authorities.");
                    checkAccess();
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to establish synchronization');
        } finally {
            setIsJoining(false);
        }
    };

    useEffect(() => {
        checkAccess();
    }, [sessionId]);

    useEffect(() => {
        // Auto-join for normal eligible users who have already applied and weren't kicked
        if (status === 'ELIGIBLE' && detail?.can_join && !isJoining) {
            handleJoinRequest();
        }
    }, [status, detail?.can_join]);

    if (status === 'LOADING') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-[#0b1120]/50 backdrop-blur-xl">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-400/50" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Establishing Secure Handoff</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Querying Institutional Governance...</p>
                </div>
            </div>
        );
    }

    const participants = detail?.participants || [];
    const previewParticipants = participants.slice(0, 5);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#020617]">
            {/* Ultra-Premium Ambient Glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 blur-[160px] rounded-full animate-pulse duration-[10s]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/20 blur-[160px] rounded-full animate-pulse duration-[8s]" />
            
            <div className="relative glass w-full max-w-lg rounded-[3.5rem] border border-white/10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in-95 fade-in duration-700">
                {/* Visual Header with Pattern */}
                <div className="relative h-64 flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-purple-600/20" />
                    {/* WhatsApp-Style Subtle Pattern Over-layer */}
                    <div className="absolute inset-0 opacity-[0.03] invert pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
                    
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/20 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-500 group">
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-[2.5rem] animate-pulse" />
                            {detail?.name?.[0] ? (
                                <span className="text-5xl font-black text-white relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{detail.name[0]}</span>
                            ) : (
                                <Lock className="w-12 h-12 text-white relative z-10" />
                            )}
                        </div>
                        <div className="px-5 py-2 bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/20 flex items-center gap-2 shadow-inner">
                             <Users className="w-3.5 h-3.5 text-indigo-400" />
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{participants.length} Active Participants</span>
                        </div>
                    </div>
                </div>

                <div className="p-10 -mt-8 relative z-20 bg-[#0b1120]/80 backdrop-blur-2xl rounded-t-[3rem] border-t border-white/10 space-y-10">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-white tracking-tight leading-tight px-4 capitalize">
                            {detail?.name || 'Secure Network Protocol'}
                        </h2>
                        
                        <div className="flex flex-col items-center gap-3">
                             <div className="flex -space-x-4">
                                {previewParticipants.map((p: any, i: number) => (
                                    <div key={i} className="w-10 h-10 rounded-2xl border-[3px] border-[#0b1120] bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-xl transform hover:-translate-y-1 transition-transform" style={{ zIndex: 10 - i }}>
                                        {p.name?.[0]}
                                    </div>
                                ))}
                                {participants.length > 5 && (
                                    <div className="w-10 h-10 rounded-2xl border-[3px] border-[#0b1120] bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400" style={{ zIndex: 0 }}>
                                        +{participants.length - 5}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members already in this sequence</p>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-inner">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/5 flex items-center justify-center shrink-0 border border-indigo-500/10">
                                <Info className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Network Briefing</p>
                                <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                    {message || "This secure manifestation is restricted to verified recruitment participants. Manifestation link verified."}
                                </p>
                            </div>
                        </div>
                        {detail?.open_invite && (
                            <div className="flex items-center gap-3 bg-green-500/5 px-5 py-4 rounded-[2rem] border border-green-500/10 shadow-sm animate-in slide-in-from-left duration-300">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] font-black text-green-500 uppercase tracking-widest">Public Enrollment</span>
                                    <span className="block text-[10px] text-green-500/60 font-bold">Protocol restrictions bypassed.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {(status === 'ELIGIBLE_PENDING_APPLY' || status === 'APPLY_FIRST') ? (
                            <div className="space-y-4">
                                <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-center gap-4">
                                    <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
                                    <p className="text-amber-400 text-xs font-bold leading-tight">
                                        Intelligence suggests you have not yet applied for this drive. Please apply to unlock the vault.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => window.location.href = '/placement-hub'}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-base flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_rgba(79,70,229,0.35)] active:scale-95 group"
                                >
                                    Establish Application <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        ) : status === 'NOT_ELIGIBLE' ? (
                            <div className="space-y-4">
                                <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] flex items-center gap-4">
                                    <ShieldAlert className="w-8 h-8 text-rose-500 shrink-0" />
                                    <p className="text-rose-400 text-xs font-bold leading-tight">
                                        Eligibility Mismatch: Your profile parameters do not match the institutional threshold for this thread.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleJoinRequest} disabled={isJoining}
                                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2rem] font-black text-sm transition-all shadow-xl active:scale-95"
                                >
                                    {isJoining ? 'Requesting Exception...' : 'Request Admin Exception'}
                                </button>
                            </div>
                        ) : status === 'KICKED' ? (
                            <div className="space-y-4">
                                <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-[2rem] flex items-center gap-4">
                                    <ShieldAlert className="w-8 h-8 text-orange-500 shrink-0" />
                                    <p className="text-orange-400 text-xs font-bold leading-tight">
                                        You were previously removed from this room by the administration. You may request an exception to rejoin.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleJoinRequest} disabled={isJoining}
                                    className="w-full py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2rem] font-black text-sm transition-all shadow-xl active:scale-95"
                                >
                                    {isJoining ? 'Dispatching...' : 'Request Re-entry'}
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={handleJoinRequest}
                                disabled={isJoining || status === 'STRANGER'}
                                className={`w-full py-6 rounded-[2rem] font-black text-base flex items-center justify-center gap-4 transition-all relative overflow-hidden group shadow-[0_20px_50px_rgba(79,70,229,0.4)] active:scale-95 ${status === 'STRANGER' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white'}`}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 shadow-2xl transition-transform duration-500" />
                                {isJoining ? (
                                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {detail?.can_join ? 'Sync & Join Protocol' : 'Request Access'} 
                                        {detail?.can_join ? <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />}
                                    </>
                                )}
                            </button>
                        )}

                        <button 
                            onClick={() => window.location.href = '/student-intelligence'}
                            className="w-full py-4 text-gray-500 hover:text-white text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:letter-spacing-[0.4em] duration-300"
                        >
                            Return to Intelligence Hub
                        </button>
                    </div>
                </div>

                <div className="py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-green-500/50" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Vault Encrypted</span>
                    </div>
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                    <div className="flex items-center gap-2">
                        <LogOut className="w-3 h-3 text-red-500/50" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">End Session</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
