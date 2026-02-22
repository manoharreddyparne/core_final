import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "../../auth/utils/tokenStorage";

export const useChatSocket = (sessionId: string | null, currentUserId?: number) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [connected, setConnected] = useState(false);

    const [typingUser, setTypingUser] = useState<number | null>(null);

    const onMessage = (event: any) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_broadcast') {
            setMessages((prev) => [...prev, {
                id: data.msg_id || Date.now(),
                content: data.message,
                sender_id: data.sender_id,
                attachment_type: data.attachment_type || 'TEXT',
                timestamp: data.timestamp,
                is_me: data.sender_id === currentUserId,
                is_read: false
            }]);
        } else if (data.type === 'typing_broadcast') {
            setTypingUser(data.is_typing ? data.sender_id : null);
        } else if (data.type === 'status_broadcast') {
            if (data.status === 'SEEN') {
                setMessages(prev => prev.map(m =>
                    data.message_ids.includes(m.id) ? { ...m, is_read: true } : m
                ));
            }
        }
    };

    const connect = useCallback(() => {
        if (!sessionId) return;
        const token = getAccessToken();
        if (!token) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        const wsBase = import.meta.env.VITE_BACKEND_WS_URL
            ? import.meta.env.VITE_BACKEND_WS_URL.replace('/ws/sessions/', '/ws')
            : "ws://localhost:8000/ws";

        const wsUrl = `${wsBase}/chat/${sessionId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onmessage = onMessage;
        ws.onclose = () => {
            setConnected(false);
            socketRef.current = null;
        };
    }, [sessionId, currentUserId]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [connect]);

    const sendMessage = (message: string, attType = 'TEXT') => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(jsonStr({
                type: 'chat_message',
                message,
                attachment_type: attType
            }));
        }
    };

    const sendTyping = (isTyping: boolean) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(jsonStr({ type: 'typing_status', is_typing: isTyping }));
        }
    };

    const markRead = (msgIds: number[]) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(jsonStr({ type: 'read_receipt', message_ids: msgIds }));
        }
    };

    function jsonStr(o: any) { return JSON.stringify(o); }

    return { messages, setMessages, connected, sendMessage, sendTyping, markRead, typingUser };
};
