/**
 * useDispatchSocket — Real-time bulk activation dispatch via WebSocket.
 * Connects to /ws/dispatch/, sends roll_numbers, streams per-student progress.
 */
import { useState, useRef, useCallback } from "react";
import { getAccessToken } from "../../auth/utils/tokenStorage";
import { API_CONFIG } from "../../../config/api";

export interface DispatchEvent {
    roll: string;
    name: string;
    status: "sent" | "failed" | "already_active" | "not_found";
    pct: number;
    current: number;
    total: number;
}

export interface DispatchSummary {
    invited: number;
    already_active: number;
    not_found: number;
    failed: number;
}

type DispatchState = "idle" | "connecting" | "running" | "done" | "error";

export const useDispatchSocket = () => {
    const wsRef = useRef<WebSocket | null>(null);
    const [state, setState] = useState<DispatchState>("idle");
    const [events, setEvents] = useState<DispatchEvent[]>([]);
    const [summary, setSummary] = useState<DispatchSummary | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pct, setPct] = useState(0);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(0);

    const reset = useCallback(() => {
        setState("idle");
        setEvents([]);
        setSummary(null);
        setErrorMsg(null);
        setPct(0);
        setCurrent(0);
        setTotal(0);
    }, []);

    const dispatch = useCallback((rollNumbers: string[], section?: string, userType: "student" | "faculty" = "student") => {
        reset();
        setState("connecting");

        const token = getAccessToken();
        const wsBase = (import.meta.env.VITE_WS_URL || API_CONFIG.WS).replace(/\/$/, "");
        const url = `${wsBase}/ws/dispatch/${token ? `?token=${token}` : ""}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setState("running");
            ws.send(JSON.stringify({
                action: "start",
                roll_numbers: rollNumbers,
                user_type: userType,
                ...(section ? { section } : {}),
            }));
        };

        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data);

                if (msg.type === "progress") {
                    const event: DispatchEvent = {
                        roll: msg.roll,
                        name: msg.name || "",
                        status: msg.status,
                        pct: msg.pct,
                        current: msg.current,
                        total: msg.total,
                    };
                    setEvents(prev => [event, ...prev].slice(0, 200)); // keep last 200
                    setPct(msg.pct);
                    setCurrent(msg.current);
                    setTotal(msg.total);
                } else if (msg.type === "done") {
                    setSummary(msg.summary);
                    setState("done");
                    ws.close();
                } else if (msg.type === "error") {
                    setErrorMsg(msg.message);
                    setState("error");
                    ws.close();
                }
            } catch {
                // ignore malformed messages
            }
        };

        ws.onerror = () => {
            setErrorMsg("WebSocket connection failed. Retrying via REST...");
            setState("error");
        };

        ws.onclose = (evt) => {
            if (evt.code !== 1000 && state === "running") {
                setState("error");
                setErrorMsg("Connection lost unexpectedly.");
            }
        };
    }, [reset, state]);

    const cancel = useCallback(() => {
        wsRef.current?.close(1000, "User cancelled");
        reset();
    }, [reset]);

    return { state, events, summary, errorMsg, pct, current, total, dispatch, cancel, reset };
};
