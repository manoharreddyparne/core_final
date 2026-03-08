import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "../../auth/utils/tokenStorage";

export interface ChatMessage {
    id: number | string;
    content: string;
    sender_id: number | string;
    attachment_type: string;
    timestamp: string;
    is_me: boolean;
    is_read: boolean;
    read_at?: string | null;
    /** true while we haven't got the DB echo back yet */
    is_pending?: boolean;
}

export const useChatSocket = (activeSession: any | null, currentUserId?: number, onMetadataUpdate?: (data: any) => void) => {
    const sessionId: string | null = activeSession?.session_id || null;
    const otherId: string | null = activeSession?.other_id != null
        ? String(activeSession.other_id)
        : null;

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectDelay = useRef<number>(1000);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // This ref tracks the "current" session so we can abort stale reconnects
    const sessionIdRef = useRef<string | null>(null);
    // Generation counter — incremented on every session switch to invalidate old callbacks
    const generationRef = useRef<number>(0);
    
    /** cached MY profile_id, learned once from history or first echo  */
    const myProfileIdRef = useRef<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Record<string, { name: string, timer: any }>>({});

    /* ── is_me resolution ── */
    const resolveIsMe = useCallback((senderId: string | number): boolean => {
        const sid = String(senderId);
        
        // 1. Prioritize my_id from activeSession (Server-side source of truth for THIS session)
        if (activeSession?.my_id && String(activeSession.my_id) === sid) return true;

        // 2. Fallback to currentUserId if available (from Auth)
        if (currentUserId && Number(sid) === currentUserId) return true;
        
        // 3. Fallback to cached profile ID
        if (myProfileIdRef.current) return sid === myProfileIdRef.current;
        
        // 4. Group context: we can't infer as easily without knowing our own ID
        if (activeSession?.is_group) return false;

        // 5. 1-on-1 fallback: differentiate by the 'other' person
        if (otherId !== null && otherId !== '0') return sid !== otherId;
        
        return false;
    }, [otherId, currentUserId, activeSession?.my_id, activeSession?.is_group]);

    function buildMsg(data: any, isMe: boolean): ChatMessage {
        return {
            id: data.msg_id ?? `tmp-${Date.now()}`,
            content: data.message ?? '',
            sender_id: data.sender_id,
            attachment_type: data.attachment_type ?? 'TEXT',
            timestamp: data.timestamp ?? new Date().toISOString(),
            is_me: isMe,
            is_read: Boolean(data.is_read),
            is_pending: false,
            // @ts-ignore
            status: data.is_read ? 'SEEN' : 'SENT',
            sender_name: data.sender_name,
            sender_role: data.sender_role
        };
    }

    /* ── Incoming WS message handler ── */
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === "chat_broadcast") {
                const isMe = resolveIsMe(data.sender_id);
                if (isMe && myProfileIdRef.current === null) {
                    myProfileIdRef.current = String(data.sender_id);
                }

                setMessages(prev => {
                    if (isMe) {
                        const tmpIdx = prev.findIndex(
                            m => String(m.id).startsWith('tmp-') &&
                                m.content === (data.message ?? '') &&
                                m.is_me
                        );
                        if (tmpIdx >= 0) {
                            const updated = [...prev];
                            updated[tmpIdx] = {
                                ...updated[tmpIdx],
                                id: data.msg_id ?? updated[tmpIdx].id,
                                timestamp: data.timestamp ?? updated[tmpIdx].timestamp,
                                is_pending: false,
                                // @ts-ignore
                                status: 'SENT'
                            };
                            return updated;
                        }
                        if (data.msg_id && prev.find(m => String(m.id) === String(data.msg_id))) return prev;
                        return [...prev, buildMsg(data, true)];
                    } else {
                        if (data.msg_id && prev.find(m => String(m.id) === String(data.msg_id))) return prev;
                        return [...prev, buildMsg(data, false)];
                    }
                });
                // Ensure room list updates unread counts
                window.dispatchEvent(new CustomEvent('chat_update'));

            } else if (data.type === "typing_broadcast") {
                const sidStr = String(data.sender_id);
                const name = data.sender_name || "Someone";
                
                if (data.is_typing) {
                    setTypingUsers(prev => {
                        if (prev[sidStr]?.timer) clearTimeout(prev[sidStr].timer);
                        const timer = setTimeout(() => {
                            setTypingUsers(current => {
                                const next = { ...current };
                                delete next[sidStr];
                                return next;
                            });
                        }, 4000);
                        return { ...prev, [sidStr]: { name, timer } };
                    });
                } else {
                    setTypingUsers(prev => {
                        if (prev[sidStr]?.timer) clearTimeout(prev[sidStr].timer);
                        const next = { ...prev };
                        delete next[sidStr];
                        return next;
                    });
                }

            } else if (data.type === "metadata_broadcast") {
                if (onMetadataUpdate) onMetadataUpdate(data);
                window.dispatchEvent(new CustomEvent('chat_update'));

            } else if (data.type === "status_broadcast" && data.status === "SEEN") {
                setMessages(prev => prev.map(m => m.is_me ? { ...m, is_read: true, status: 'SEEN' } : m));
                window.dispatchEvent(new CustomEvent('chat_update'));
            }
        } catch (e) {
            console.error("[ChatSocket] Parse error:", e);
        }
    }, [resolveIsMe, onMetadataUpdate]);

    /* ── Destroy existing socket safely ── */
    const destroySocket = useCallback(() => {
        // Cancel any pending reconnect timers
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }
        if (socketRef.current) {
            // Remove all callbacks FIRST to prevent onclose from firing reconnect logic
            socketRef.current.onopen = null;
            socketRef.current.onmessage = null;
            socketRef.current.onerror = null;
            socketRef.current.onclose = null;
            // Only close if not already closed
            if (socketRef.current.readyState !== WebSocket.CLOSED &&
                socketRef.current.readyState !== WebSocket.CLOSING) {
                socketRef.current.close(1000, "session-switch");
            }
            socketRef.current = null;
        }
    }, []);

    /* ── WebSocket connect ── */
    const connect = useCallback((targetSessionId: string, generation: number) => {
        const token = getAccessToken();
        if (!token || !targetSessionId) return;

        let wsBase: string;
        const rawWsBase = (import.meta.env.VITE_BACKEND_WS_URL || import.meta.env.VITE_WS_URL) as string;
        if (rawWsBase) {
            wsBase = rawWsBase.replace(/\/ws\/.*$/, '/ws').replace(/\/+$/, '');
        } else {
            const httpBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') as string;
            wsBase = httpBase.replace(/^http/, 'ws') + '/ws';
        }

        const wsUrl = `${wsBase}/chat/${targetSessionId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            // Validate this is still the current generation
            if (generationRef.current !== generation) {
                ws.close(1000, "stale");
                return;
            }
            setConnected(true);
            reconnectDelay.current = 1000;
        };

        ws.onmessage = handleMessage;

        ws.onerror = () => {
            // Let onclose handle it
        };

        ws.onclose = (e) => {
            // If generation changed, ignore this close event
            if (generationRef.current !== generation) return;

            setConnected(false);
            socketRef.current = null;

            // Only reconnect on abnormal closures (not user-initiated switch)
            if (sessionIdRef.current === targetSessionId && e.code !== 1000 && e.code !== 4000) {
                const delay = reconnectDelay.current;
                reconnectTimer.current = setTimeout(() => {
                    // Double check generation hasn't changed during the delay
                    if (generationRef.current === generation && sessionIdRef.current === targetSessionId) {
                        connect(targetSessionId, generation);
                    }
                }, delay);
                reconnectDelay.current = Math.min(delay * 2, 15000);
            }
        };
    }, [handleMessage]);

    /* ── Lifecycle ── */
    useEffect(() => {
        // Increment generation to invalidate any previous socket's callbacks
        const generation = ++generationRef.current;
        sessionIdRef.current = sessionId;
        myProfileIdRef.current = activeSession?.my_id ? String(activeSession.my_id) : null;
        reconnectDelay.current = 1000;

        // Always destroy the previous socket first
        destroySocket();

        if (sessionId) {
            setMessages([]);
            setTypingUsers({});
            // Small delay to let the old socket fully close before opening new one
            const connectTimer = setTimeout(() => {
                if (generationRef.current === generation && sessionIdRef.current === sessionId) {
                    connect(sessionId, generation);
                }
            }, 50);
            return () => {
                clearTimeout(connectTimer);
                sessionIdRef.current = null;
                destroySocket();
            };
        } else {
            setConnected(false);
        }

        return () => {
            sessionIdRef.current = null;
            destroySocket();
        };
    }, [sessionId, activeSession?.my_id]);



    /* ── History Ingestion ── */
    const ingestHistory = useCallback((msgs: any[]) => {
        const mine = msgs.find(m => m.is_me === true);
        if (mine) myProfileIdRef.current = String(mine.sender_id);

        setMessages(msgs.map(m => ({
            id: m.id,
            content: m.content ?? '',
            sender_id: m.sender_id,
            attachment_type: m.attachment_type ?? 'TEXT',
            timestamp: m.timestamp ? (typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp).toISOString()) : new Date().toISOString(),
            is_me: Boolean(m.is_me),
            is_read: Boolean(m.is_read),
            read_at: m.read_at ?? null,
            is_pending: false,
            // @ts-ignore
            status: m.status ?? (m.is_read ? 'SEEN' : 'SENT'),
            sender_name: m.sender_name,
            sender_role: m.sender_role,
        })));
    }, []);

    const rawSend = (payload: object) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        }
    };

    const sendMessage = (message: string, attType = 'TEXT') => {
        const tmpId = `tmp-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: tmpId,
            content: message,
            sender_id: myProfileIdRef.current ?? 'me',
            attachment_type: attType,
            timestamp: new Date().toISOString(),
            is_me: true,
            is_read: false,
            is_pending: true,
        }]);
        rawSend({ type: 'chat_message', message, attachment_type: attType });
    };

    const sendTyping = (isTyping: boolean, myName?: string) => rawSend({ type: 'typing_status', is_typing: isTyping, sender_name: myName });
    const markRead = (msgIds: number[]) => { if (msgIds.length > 0) rawSend({ type: 'read_receipt', message_ids: msgIds }); };

    return {
        messages, setMessages: ingestHistory, connected,
        sendMessage, sendTyping, markRead,
        typingUsers, otherId
    };
};
