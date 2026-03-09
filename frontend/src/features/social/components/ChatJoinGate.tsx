import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, LogIn, Lock, Users, ArrowRight, Send, Info, ShieldCheck, LogOut, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { socialApi } from '../api';
import { toast } from 'react-hot-toast';

interface JoinGateProps {
    sessionId: string;
    onJoined: () => void;
    user: any;
}

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours in ms

function getLastRequestTime(sessionId: string): number | null {
    const val = localStorage.getItem(`access_req_${sessionId}`);
    return val ? parseInt(val, 10) : null;
}
function setLastRequestTime(sessionId: string) {
    localStorage.setItem(`access_req_${sessionId}`, String(Date.now()));
}
function clearLastRequestTime(sessionId: string) {
    localStorage.removeItem(`access_req_${sessionId}`);
}

export const ChatJoinGate: React.FC<JoinGateProps> = ({ sessionId, onJoined, user }) => {
    const [detail, setDetail] = useState<any>(null);
    const [status, setStatus] = useState<string>('LOADING');
    const [message, setMessage] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [cooldownLeft, setCooldownLeft] = useState(0); // seconds remaining
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevStatusRef = useRef<string>('LOADING');

    // ── Recompute cooldown countdown every second ──────────────────────────
    const refreshCooldown = () => {
        const last = getLastRequestTime(sessionId);
        if (!last) { setCooldownLeft(0); return; }
        const remaining = Math.ceil((last + COOLDOWN_MS - Date.now()) / 1000);
        setCooldownLeft(remaining > 0 ? remaining : 0);
        if (remaining <= 0) clearLastRequestTime(sessionId);
    };

    const checkAccess = async () => {
        try {
            const res = await socialApi.getSessionDetail(sessionId);
            setDetail(res);
            const code = res.status_code;
            const wasWaiting = prevStatusRef.current === 'NEEDS_APPROVAL';

            setStatus(code);
            setMessage(res.message);
            prevStatusRef.current = code;

            // Student got approved — celebrate and enter
            if ((res.is_member || code === 'MEMBER') && wasWaiting) {
                toast.success('🎉 Your access request was approved! Welcome to the room.');
                clearLastRequestTime(sessionId);
                if (pollRef.current) clearInterval(pollRef.current);
                onJoined();
                return;
            }
            if (res.is_member || code === 'MEMBER') {
                onJoined();
                return;
            }

            // Rejected status — clear cooldown so they can try again later if needed
            if (code === 'REJECTED') {
                clearLastRequestTime(sessionId);
            }
        } catch (err: any) {
            setStatus('ERROR');
            setMessage(err.response?.data?.message || 'Access Denied');
        }
    };

    const handleJoinRequest = async () => {
        // Eligible but not applied — send them to apply
        if (detail?.status_code === 'APPLY_FIRST' || detail?.status_code === 'ELIGIBLE_PENDING_APPLY') {
            window.location.href = '/placements';
            return;
        }

        // Cooldown check
        const last = getLastRequestTime(sessionId);
        if (last && Date.now() - last < COOLDOWN_MS) {
            toast.error('You already sent a request. Wait for the admin to respond.');
            return;
        }

        setIsJoining(true);
        try {
            if (detail?.can_join) {
                const res = await socialApi.joinChatGate(sessionId);
                if (res.success) {
                    toast.success(res.message || 'Joined successfully.');
                    clearLastRequestTime(sessionId);
                    onJoined();
                }
            } else {
                const res = await socialApi.requestAccess(sessionId);
                if (res.success) {
                    setLastRequestTime(sessionId);
                    refreshCooldown();
                    toast.success(res.message || 'Access request sent to admin.');
                    await checkAccess();
                    // Start polling so student sees approval live
                    startPolling();
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to establish synchronization');
        } finally {
            setIsJoining(false);
        }
    };

    const startPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            checkAccess();
        }, 5000);
    };

    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    useEffect(() => {
        checkAccess();
        refreshCooldown();
        cooldownRef.current = setInterval(refreshCooldown, 1000);

        return () => {
            stopPolling();
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, [sessionId]);

    // Auto-join only if arrived via ?token= (explicit invite link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const arrivedViaToken = !!params.get('token');
        if (arrivedViaToken && status === 'ELIGIBLE' && detail?.can_join && !isJoining) {
            handleJoinRequest();
        }
        // Start polling when status is pending approval
        if (status === 'NEEDS_APPROVAL') {
            startPolling();
        } else {
            stopPolling();
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
    const hasCooldown = cooldownLeft > 0;
    const cooldownDisplay = hasCooldown ? `${Math.floor(cooldownLeft / 60)}m ${cooldownLeft % 60}s` : '';

    const renderAction = () => {
        // ── Not applied yet ──────────────────────────────────────────────────
        if (status === 'ELIGIBLE_PENDING_APPLY' || status === 'APPLY_FIRST') {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-center gap-4">
                        <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
                        <p className="text-amber-400 text-xs font-bold leading-tight">
                            You must apply for this placement drive before accessing the communications hub.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/placements'}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-base flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_rgba(79,70,229,0.35)] active:scale-95 group"
                    >
                        Apply for Drive <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            );
        }

        // ── Eligible but can't join without applying ─────────────────────────
        if (status === 'ELIGIBLE' && !detail?.can_join) {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-center gap-4">
                        <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
                        <p className="text-amber-400 text-xs font-bold leading-tight">
                            You meet the eligibility criteria, but you haven't applied for this drive yet. Apply first to join this room.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/placements'}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-base flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_rgba(79,70,229,0.35)] active:scale-95 group"
                    >
                        Go to Placements <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            );
        }

        // ── Not eligible ─────────────────────────────────────────────────────
        if (status === 'NOT_ELIGIBLE') {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] flex items-center gap-4">
                        <XCircle className="w-8 h-8 text-rose-500 shrink-0" />
                        <p className="text-rose-400 text-xs font-bold leading-tight">
                            Your profile does not meet the eligibility threshold for this drive. You cannot join this room.
                        </p>
                    </div>
                </div>
            );
        }

        // ── Rejected ─────────────────────────────────────────────────────────
        if (status === 'REJECTED') {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] flex items-center gap-4">
                        <XCircle className="w-8 h-8 text-rose-500 shrink-0" />
                        <p className="text-rose-400 text-xs font-bold leading-tight">
                            Your access request was rejected by the administrator. Contact your institution if you believe this is an error.
                        </p>
                    </div>
                </div>
            );
        }

        // ── Kicked ───────────────────────────────────────────────────────────
        if (status === 'KICKED') {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-[2rem] flex items-center gap-4">
                        <ShieldAlert className="w-8 h-8 text-orange-500 shrink-0" />
                        <p className="text-orange-400 text-xs font-bold leading-tight">
                            You were removed from this room by an administrator. Request re-entry if you believe this is an error.
                        </p>
                    </div>
                    <button
                        onClick={handleJoinRequest}
                        disabled={isJoining || hasCooldown}
                        className="w-full py-5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white border border-white/10 rounded-[2rem] font-black text-sm transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isJoining ? 'Sending...' : hasCooldown ? `Request sent — wait ${cooldownDisplay}` : 'Request Re-entry'}
                        {hasCooldown && <Clock className="w-4 h-4" />}
                    </button>
                </div>
            );
        }

        // ── Pending approval ─────────────────────────────────────────────────
        if (status === 'NEEDS_APPROVAL') {
            return (
                <div className="space-y-4">
                    <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex items-center gap-4">
                        <div className="w-8 h-8 border-2 border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin shrink-0" />
                        <div className="space-y-1">
                            <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Awaiting Admin Approval</p>
                            <p className="text-gray-500 text-[10px] font-bold">You'll be admitted automatically once approved — no need to reload.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // ── Default: can join (eligible + applied) ───────────────────────────
        return (
            <button
                onClick={handleJoinRequest}
                disabled={isJoining || hasCooldown}
                className={`w-full py-6 rounded-[2rem] font-black text-base flex items-center justify-center gap-4 transition-all relative overflow-hidden group shadow-[0_20px_50px_rgba(79,70,229,0.4)] active:scale-95 ${
                    !detail?.can_join && !hasCooldown
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white'
                        : hasCooldown
                        ? 'bg-gray-800 text-gray-400 cursor-default'
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white'
                }`}
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 shadow-2xl transition-transform duration-500" />
                {isJoining ? (
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : hasCooldown ? (
                    <><Clock className="w-5 h-5" /> Request sent — wait {cooldownDisplay}</>
                ) : detail?.can_join ? (
                    <>Join Room <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                ) : (
                    <>Request Access <Send className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /></>
                )}
            </button>
        );
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-y-auto bg-[#020617]">
            {/* Ambient glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 blur-[160px] rounded-full animate-pulse duration-[10s] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/20 blur-[160px] rounded-full animate-pulse duration-[8s] pointer-events-none" />

            <div className="relative w-full max-w-md rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in-95 fade-in duration-700 bg-[#0b1120]/90 backdrop-blur-xl my-4">
                {/* Header */}
                <div className="relative h-48 flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-purple-600/20" />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/20 flex items-center justify-center shadow-2xl">
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-[2rem] animate-pulse" />
                            {detail?.name?.[0] ? (
                                <span className="text-4xl font-black text-white relative z-10">{detail.name[0]}</span>
                            ) : (
                                <Lock className="w-10 h-10 text-white relative z-10" />
                            )}
                        </div>
                        <div className="px-4 py-1.5 bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/20 flex items-center gap-2">
                            <Users className="w-3 h-3 text-indigo-400" />
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{participants.length} Participants</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-7 -mt-6 relative z-20 space-y-6">
                    {/* Title + avatars */}
                    <div className="text-center space-y-3">
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight capitalize">
                            {detail?.name || 'Secure Network Protocol'}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                            <div className="flex -space-x-3">
                                {previewParticipants.map((p: any, i: number) => (
                                    <div key={i} className="w-8 h-8 rounded-xl border-2 border-[#0b1120] bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white" style={{ zIndex: 10 - i }}>
                                        {p.name?.[0]}
                                    </div>
                                ))}
                                {participants.length > 5 && (
                                    <div className="w-8 h-8 rounded-xl border-2 border-[#0b1120] bg-gray-800 flex items-center justify-center text-[9px] font-black text-gray-400">
                                        +{participants.length - 5}
                                    </div>
                                )}
                            </div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Members in this room</p>
                        </div>
                    </div>

                    {/* Status message */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/5 flex items-center justify-center shrink-0 border border-indigo-500/10">
                                <Info className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Room Status</p>
                                <p className="text-xs font-medium text-gray-400 leading-relaxed">
                                    {message || 'This room is restricted to verified participants.'}
                                </p>
                            </div>
                        </div>
                        {detail?.open_invite && (
                            <div className="flex items-center gap-3 bg-green-500/5 px-4 py-3 rounded-[1.5rem] border border-green-500/10">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <div>
                                    <span className="block text-[9px] font-black text-green-500 uppercase tracking-widest">Open Enrollment Active</span>
                                    <span className="block text-[9px] text-green-500/60 font-bold">Invite link is active for eligible members.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action area */}
                    <div className="space-y-3">
                        {renderAction()}
                        <button
                            onClick={() => window.location.href = '/student-intelligence'}
                            className="w-full py-3 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                        >
                            Return to Hub
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-green-500/50" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Encrypted</span>
                    </div>
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                    <div className="flex items-center gap-1.5">
                        <LogOut className="w-3 h-3 text-red-500/50" />
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Secure Session</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
