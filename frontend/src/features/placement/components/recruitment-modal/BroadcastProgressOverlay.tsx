import React, { useState, useEffect, useRef } from "react";
import { Target, CheckCircle, AlertCircle } from "lucide-react";
import { getAccessToken } from "../../../auth/utils/tokenStorage";
import { placementApi } from "../../api";

interface Props {
    driveId: number;
    onComplete: () => void;
    onClose: () => void;
}

const MAX_RETRIES = 5;

const BroadcastProgressOverlay: React.FC<Props> = ({ driveId, onComplete, onClose }) => {
    const [status, setStatus] = useState<any>({
        status: "processing", percentage: 0, current: 0, total: 0, message: "Starting broadcast...", time_left: 0
    });
    const wsRef = useRef<WebSocket | null>(null);
    const mountedRef = useRef(true);
    const retriesRef = useRef(0);
    const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
    const pollRef = useRef<ReturnType<typeof setInterval>>();
    const wsConnectedRef = useRef(false);
    const [warmup, setWarmup] = useState(false);

    const formatTime = (seconds: number) => {
        if (!seconds || seconds <= 0) return "Calculating...";
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    useEffect(() => {
        mountedRef.current = true;

        // ── 1. Try WebSocket first ──
        const connectWS = () => {
            if (!mountedRef.current) return;
            const token = getAccessToken();
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
            const wsUrl = token
                ? `${protocol}//${host}/ws/placement/broadcast/${driveId}/?token=${token}`
                : `${protocol}//${host}/ws/placement/broadcast/${driveId}/`;

            console.log("[BROADCAST-WS] Connecting...");
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[BROADCAST-WS] ✅ Connected");
                wsConnectedRef.current = true;
                retriesRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.debug("[BROADCAST-WS] Message:", data.status, data.percentage + '%');
                    if (data.type === 'broadcast_status') {
                        setStatus(data);
                        if (data.status === 'done') {
                            setTimeout(() => onComplete(), 2000);
                        }
                    }
                } catch (e) {
                    console.error("[BROADCAST-WS] Parse error:", e);
                }
            };

            ws.onerror = () => {
                console.warn("[BROADCAST-WS] Error occurred");
            };

            ws.onclose = (event) => {
                wsConnectedRef.current = false;
                if (!mountedRef.current) return;
                console.warn(`[BROADCAST-WS] Closed: code=${event.code}`);
                wsRef.current = null;
                if (retriesRef.current < MAX_RETRIES) {
                    retriesRef.current += 1;
                    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 8000);
                    reconnectRef.current = setTimeout(connectWS, delay);
                }
            };
        };
        connectWS();

        // ── 2. HTTP Polling fallback (always runs, handles WS failures) ──
        const startPolling = () => {
            pollRef.current = setInterval(async () => {
                if (!mountedRef.current) return;
                try {
                    const res = await placementApi.broadcastProgress(driveId);
                    const data = res.data;
                    if (data && data.status !== 'idle') {
                        console.debug("[BROADCAST-POLL]", data.status, data.percentage + '%');
                        setStatus((prev: any) => {
                            // Only update if poll data is newer (higher percentage or different status)
                            if (data.percentage > prev.percentage || data.status !== prev.status) {
                                return data;
                            }
                            return prev;
                        });
                        if (data.status === 'done') {
                            clearInterval(pollRef.current!);
                            setTimeout(() => onComplete(), 2000);
                        }
                        if (data.status === 'error') {
                            clearInterval(pollRef.current!);
                        }
                    }
                } catch (e) {
                    // Silently ignore poll errors
                }
            }, 2000); // Poll every 2s
        };
        startPolling();

        const warmupTimer = setTimeout(() => {
            if (mountedRef.current && status.percentage === 0) {
                setWarmup(true);
            }
        }, 10000);

        return () => {
            mountedRef.current = false;
            if (wsRef.current) wsRef.current.close();
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [driveId]);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-[#0a0b10]/95 backdrop-blur-3xl animate-in zoom-in-95 duration-500 rounded-[2rem] sm:rounded-[3rem] overflow-hidden">
            <div className="w-full max-w-lg space-y-6 sm:space-y-8 text-center max-h-[90vh] overflow-y-auto px-4 sm:px-6 box-border">
                {/* Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] animate-pulse rounded-full" />
                    <div className="relative p-5 sm:p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl">
                        {status.status === 'done' ? (
                            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 animate-in zoom-in duration-300" />
                        ) : status.status === 'error' ? (
                            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500" />
                        ) : (
                            <Target className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400 animate-pulse" />
                        )}
                    </div>
                </div>

                <div className="space-y-3 min-w-0 overflow-hidden">
                    <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words">
                        {status.status === 'done' ? "Broadcast Complete" :
                         status.status === 'error' ? "Broadcast Failed" :
                         "Broadcasting to Students..."}
                    </h3>
                    <p className="text-indigo-400/80 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider font-bold break-words overflow-hidden text-ellipsis line-clamp-2 max-w-full">
                        {warmup && status.percentage === 0 ? "Waking up Governance Brain..." : (status.message || "Starting...")}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-4 sm:space-y-5 min-w-0">
                    <div className="relative h-3 sm:h-4 bg-white/5 border border-white/5 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                            style={{ width: `${status.percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_linear_infinite]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="p-2.5 sm:p-4 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl backdrop-blur-xl overflow-hidden min-w-0">
                            <p className="text-[7px] sm:text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1 truncate">Progress</p>
                            <p className="text-base sm:text-2xl font-black text-white leading-none">{status.percentage}%</p>
                        </div>
                        <div className="p-2.5 sm:p-4 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl backdrop-blur-xl overflow-hidden min-w-0">
                            <p className="text-[7px] sm:text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1 truncate">Sent</p>
                            <p className="text-base sm:text-2xl font-black text-white leading-none">{status.current || 0}<span className="text-gray-600 text-[10px] sm:text-sm">/{status.total || 0}</span></p>
                        </div>
                        <div className="p-2.5 sm:p-4 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl backdrop-blur-xl overflow-hidden min-w-0">
                            <p className="text-[7px] sm:text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1 truncate">ETA</p>
                            <p className="text-base sm:text-2xl font-black text-indigo-400 leading-none truncate">
                                {status.status === 'done' ? '0s' : formatTime(status.time_left || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {status.status === 'error' && (
                    <button
                        onClick={onClose}
                        className="px-6 sm:px-10 py-3 sm:py-4 bg-rose-500 text-white font-black uppercase tracking-wider text-[10px] sm:text-[11px] rounded-xl sm:rounded-[1.5rem] shadow-xl shadow-rose-500/20 hover:scale-105 transition-all"
                    >
                        Close
                    </button>
                )}

                {status.status === 'done' && (
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest animate-bounce">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        All emails dispatched
                    </div>
                )}
            </div>
        </div>
    );
};

export default BroadcastProgressOverlay;
