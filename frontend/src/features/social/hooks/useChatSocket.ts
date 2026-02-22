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

export const useChatSocket = (activeSession: any | null, currentUserId?: number) => {
    const sessionId: string | null = activeSession?.session_id || null;
    const otherId: string | null = activeSession?.other_id != null
        ? String(activeSession.other_id)
        : null;

    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    /** cached MY profile_id, learned once from history or first echo  */
    const myProfileIdRef = useRef<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);

    /* ── is_me resolution ─────────────────────────────────────────────────
       Priority order:
         1. Cached myProfileIdRef (learned from history "is_me":true or echo)
         2. sender_id !== other_id  (reliable for 2-person chats)
         3. Fallback: compare with auth user id (less reliable)
    ─────────────────────────────────────────────────────────────────────── */
    const resolveIsMe = useCallback((senderId: string | number): boolean => {
        const sid = String(senderId);
        if (myProfileIdRef.current) return sid === myProfileIdRef.current;
        if (otherId !== null) return sid !== otherId;
        return Number(sid) === currentUserId;
    }, [otherId, currentUserId]);

    /* ── Incoming WS message handler ───────────────────────────────────── */
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === "chat_broadcast") {
                const isMe = resolveIsMe(data.sender_id);

                // Cache our own profile_id the first time we see our own echo
                if (isMe && myProfileIdRef.current === null) {
                    myProfileIdRef.current = String(data.sender_id);
                }

                setMessages(prev => {
                    if (isMe) {
                        /* ─── SENDER path ───
                           The backend echoes the saved message back to us.
                           Replace the optimistic tmp entry (matched by content)
                           with the confirmed message that has a real DB id.
                        */
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
                            };
                            return updated;
                        }

                        // No tmp found → deduplicate by msg_id
                        if (data.msg_id && prev.find(m => String(m.id) === String(data.msg_id))) {
                            return prev;
                        }
                        // Edge case: add as confirmed (e.g. another device/tab)
                        return [...prev, buildMsg(data, true)];
                    } else {
                        /* ─── RECEIVER path ───
                           New message from the other person. Deduplicate by msg_id.
                        */
                        if (data.msg_id && prev.find(m => String(m.id) === String(data.msg_id))) {
                            return prev;
                        }
                        return [...prev, buildMsg(data, false)];
                    }
                });

            } else if (data.type === "typing_broadcast") {
                const sidStr = String(data.sender_id);
                if (data.is_typing) {
                    setTypingUser(sidStr);
                    if (typingTimer.current) clearTimeout(typingTimer.current);
                    typingTimer.current = setTimeout(() => setTypingUser(null), 4000);
                } else {
                    setTypingUser(null);
                    if (typingTimer.current) clearTimeout(typingTimer.current);
                }

            } else if (data.type === "status_broadcast" && data.status === "SEEN") {
                /*
                 * The other person opened the chat and read messages.
                 * Mark ALL our outgoing messages as read (double blue tick).
                 * We mark all is_me=true messages because:
                 *   a) msg_ids are real DB ids that may not match our tmp ids
                 *   b) If they saw the latest, they saw everything before it
                 */
                setMessages(prev =>
                    prev.map(m => m.is_me ? { ...m, is_read: true } : m)
                );
            }
        } catch (e) {
            console.error("[ChatSocket] Parse error:", e);
        }
    }, [resolveIsMe]);

    function buildMsg(data: any, isMe: boolean): ChatMessage {
        return {
            id: data.msg_id ?? `tmp-${Date.now()}`,
            content: data.message ?? '',
            sender_id: data.sender_id,
            attachment_type: data.attachment_type ?? 'TEXT',
            timestamp: data.timestamp ?? new Date().toISOString(),
            is_me: isMe,
            is_read: false,
            is_pending: false,
        };
    }

    /* ── WebSocket connect ─────────────────────────────────────────────── */
    const connect = useCallback(() => {
        if (!sessionId) return;
        const token = getAccessToken();
        if (!token) return;

        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            socketRef.current.onclose = null;
            socketRef.current.close();
        }

        const rawWsBase =
            (import.meta.env.VITE_BACKEND_WS_URL as string | undefined)
            ?? (import.meta.env.VITE_WS_URL as string | undefined)
            ?? null;

        let wsBase: string;
        if (rawWsBase) {
            wsBase = rawWsBase.replace(/\/ws\/.*$/, '/ws').replace(/\/+$/, '');
        } else {
            const httpBase =
                (import.meta.env.VITE_API_URL as string | undefined)
                ?? (import.meta.env.VITE_BACKEND_URL as string | undefined)
                ?? 'http://localhost:8000';
            wsBase = httpBase.replace(/^http/, 'ws') + '/ws';
        }

        const wsUrl = `${wsBase}/chat/${sessionId}/?token=${token}`;
        console.info(`[ChatSocket] → ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.info('[ChatSocket] ✅ Connected');
            setConnected(true);
            if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
        };
        ws.onmessage = handleMessage;
        ws.onerror = () => console.warn('[ChatSocket] ⚠️ Socket error');
        ws.onclose = (e) => {
            console.warn(`[ChatSocket] ❌ Closed (code=${e.code})`);
            setConnected(false);
            socketRef.current = null;
            if (sessionIdRef.current && e.code !== 1000) {
                reconnectTimer.current = setTimeout(() => {
                    if (sessionIdRef.current) connect();
                }, 2500);
            }
        };
    }, [sessionId, handleMessage]);

    /* ── Session lifecycle ─────────────────────────────────────────────── */
    useEffect(() => {
        sessionIdRef.current = sessionId;
        myProfileIdRef.current = null;

        if (sessionId) {
            setMessages([]);
            setTypingUser(null);
            connect();
        } else {
            socketRef.current?.close(1000);
            socketRef.current = null;
            setConnected(false);
        }

        return () => {
            sessionIdRef.current = null;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            if (socketRef.current) {
                socketRef.current.onclose = null;
                socketRef.current.close(1000);
                socketRef.current = null;
            }
        };
    }, [sessionId]);

    /* ── History ingestion ─────────────────────────────────────────────── */
    const ingestHistory = useCallback((msgs: any[]) => {
        // Prime myProfileIdRef from history
        const mine = msgs.find(m => m.is_me === true);
        if (mine) myProfileIdRef.current = String(mine.sender_id);

        setMessages(msgs.map(m => ({
            id: m.id,
            content: m.content ?? '',
            sender_id: m.sender_id,
            attachment_type: m.attachment_type ?? 'TEXT',
            timestamp: m.timestamp
                ? (typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp).toISOString())
                : new Date().toISOString(),
            is_me: Boolean(m.is_me),
            is_read: Boolean(m.is_read),
            read_at: m.read_at ?? null,
            is_pending: false,
        })));
    }, []);

    /* ── Public send helpers ───────────────────────────────────────────── */
    const rawSend = (payload: object) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        } else {
            console.warn('[ChatSocket] Cannot send — not connected');
        }
    };

    /**
     * sendMessage: optimistically renders the message on the sender's side
     * immediately (single grey tick = pending), then the WS echo from the
     * backend replaces it with the real DB id (still single tick until read).
     * When receiver reads → status_broadcast SEEN → double blue tick.
     */
    const sendMessage = (message: string, attType = 'TEXT') => {
        const tmpId = `tmp-${Date.now()}`;
        // Optimistic render — appears instantly on sender's screen
        setMessages(prev => [...prev, {
            id: tmpId,
            content: message,
            sender_id: myProfileIdRef.current ?? 'me',
            attachment_type: attType,
            timestamp: new Date().toISOString(),
            is_me: true,
            is_read: false,
            is_pending: true,   // shows clock / single faint tick
        }]);
        // Fire over WS
        rawSend({ type: 'chat_message', message, attachment_type: attType });
    };

    const sendTyping = (isTyping: boolean) =>
        rawSend({ type: 'typing_status', is_typing: isTyping });

    const markRead = (msgIds: number[]) => {
        if (msgIds.length > 0) rawSend({ type: 'read_receipt', message_ids: msgIds });
    };

    return {
        messages,
        setMessages: ingestHistory,
        connected,
        sendMessage,
        sendTyping,
        markRead,
        typingUser,
        otherId,
    };
};
