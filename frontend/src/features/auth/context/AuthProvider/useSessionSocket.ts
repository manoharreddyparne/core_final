// ✅ FINAL — Enterprise WebSocket + Session Management
// src/features/auth/context/AuthProvider/useSessionSocket.ts

import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";

import {
  getAccessToken,
  clearAccessToken,
  setAccessToken,
} from "../../utils/tokenStorage";

import { bootstrapSession } from "../../api/bootstrapApi";
import type { User, Session } from "../../api/types";
import { API_BASE_URL } from "../../api/base";

export type SessionEvent =
  | "force_logout"
  | "new_session"
  | "rotate"
  | "token_rotated"
  | "ping"
  | string;

/**
 * ✅ useSessionSocket
 * --------------------------------------------------
 * Combined Architecture:
 *   1. Manages WebSocket (Single Source of Truth)
 *   2. Manages Session List (CRUD)
 *   3. Handles Auth Events (Rotation, Force Logout)
 */
export const useSessionSocket = (user: User | null, isReady: boolean = true) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ State for SessionManager UI
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  /**
   * 1️⃣ REST API Actions
   */
  const loadSessions = useCallback(async () => {
    // 🛑 Block until fully bootstrapped
    if (!user || !isReady) return;
    try {
      setLoading(true);
      const token = getAccessToken();
      const res = await axios.get(`${API_BASE_URL}sessions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data.data || []);
    } catch (err) {
      console.error("[Sessions] Failed to load", err);
    } finally {
      setLoading(false);
    }
  }, [user, isReady]);

  // ... (logoutOneSession and logoutAllSessions remain same) ...

  const logoutOneSession = useCallback(async (id: number) => {
    const token = getAccessToken();
    await axios.delete(`${API_BASE_URL}sessions/${id}/logout/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Optimistic update
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const logoutAllSessions = useCallback(async (excludeCurrent: boolean = false) => {
    const token = getAccessToken();
    const url = `${API_BASE_URL}sessions/logout-all/${excludeCurrent ? "?exclude_current=true" : ""}`;
    await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!excludeCurrent) {
      setSessions([]);
    } else {
      // Refresh list to show only current
      loadSessions();
    }
  }, [loadSessions]);


  /**
   * 2️⃣ WebSocket Management
   */
  const connect = useCallback(() => {
    // 🛑 Block until bootstrapped
    if (!user || !isReady) return;

    const token = getAccessToken();
    if (!token) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const wsBase =
      import.meta.env.VITE_BACKEND_WS_URL || "ws://localhost:8000/ws/sessions/";
    const wsUrl = `${wsBase}?token=${token}`;

    console.log("[WS] connecting →", wsUrl);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] ✅ connected");
      setConnected(true);
      // Refresh list on connect to be sure
      loadSessions();

      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      // Backend sends {action: "force_logout", session_id: 123}
      const action: SessionEvent = data?.action || data?.event;
      console.log("[WS] 📩 received:", action, data);

      switch (action) {
        case "token_rotated":
        case "rotate":
        case "new_session": {
          // 🔁 Re-bootstrap + Refresh List
          await bootstrapSession().then((res) => {
            if (res?.access) setAccessToken(res.access);
          });
          loadSessions();
          break;
        }

        case "force_logout": {
          const sessionId = data?.session_id;
          const jti = data?.jti;

          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("[WS] ⚠️  FORCE LOGOUT EVENT RECEIVED");
          console.log("  📋 Session ID:", sessionId);
          console.log("  🔑 JTI:", jti);
          console.log("  📦 Full data:", data);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

          // Dispatch event to trigger modal
          const customEvent = new CustomEvent('force_logout', {
            detail: { sessionId, jti }
          });
          window.dispatchEvent(customEvent);
          console.log("[WS] ✅ Dispatched 'force_logout' event to window");
          break;
        }

        case "ping":
          break;
      }
    };

    ws.onclose = () => {
      // console.warn("[WS] 🔌 closed");
      setConnected(false);
      socketRef.current = null;

      // Auto-reconnect if user still logged in
      if (!reconnectRef.current && user) {
        reconnectRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      // console.warn("[WS] error", err);
    };
  }, [user, isReady, loadSessions]);

  // ✅ Init
  useEffect(() => {
    if (user && isReady) {
      connect();
      loadSessions();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [user, isReady, connect, loadSessions]);

  return {
    sessions,
    loading,
    connected,
    loadSessions,
    logoutOneSession,
    logoutAllSessions,
    sendMessage: (payload: any) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
      }
    },
  };
};
