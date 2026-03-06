// src/features/social/api.ts
import axios from "axios";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const socialClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

socialClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const socialApi = {
    getFeed: async () => {
        const response = await socialClient.get("social/feed/");
        return response.data;
    },

    getDiscovery: async (search: string = '') => {
        const response = await socialClient.get(`social/feed/discover/?search=${search}`);
        return response.data.data;
    },

    getBlogsForYou: async () => {
        const response = await socialClient.get("governance/blogs/for_you/");
        return response.data.data;
    },

    createPost: async (content: string, mediaData?: File | string, media_type: string = 'NONE') => {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('media_type', media_type);

        if (mediaData) {
            if (mediaData instanceof File) {
                formData.append('media_file', mediaData);
            } else {
                formData.append('media_url', mediaData); // Fallback or external
            }
        }

        const response = await socialClient.post("social/feed/", formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    likePost: async (id: number) => {
        const response = await socialClient.post(`social/feed/${id}/like/`);
        return response.data.data;
    },

    commentOnPost: async (id: number, content: string) => {
        const response = await socialClient.post(`social/feed/${id}/comment/`, { content });
        return response.data.data;
    },

    followUser: async (id: number, role: string = 'STUDENT') => {
        const response = await socialClient.post("social/feed/follow/", { target_id: id, target_role: role });
        return response.data;
    },

    likeBlog: async (id: number) => {
        const response = await socialClient.post(`governance/blogs/${id}/like/`);
        return response.data.data;
    },

    commentOnBlog: async (id: number, content: string) => {
        const response = await socialClient.post(`governance/blogs/${id}/comment/`, { content });
        return response.data.data;
    },

    supportDiagnosis: async (subject: string, description: string) => {
        const response = await socialClient.post("social/support/", { subject, description });
        return response.data.data;
    },

    // --- CONNECTIONS ---
    connectToUser: async (id: number, role: string = 'STUDENT') => {
        const response = await socialClient.post("social/feed/connect/", { target_id: id, target_role: role });
        return response.data;
    },

    respondToRequest: async (requestId: number, action: 'ACCEPT' | 'DECLINE') => {
        const response = await socialClient.post(`social/feed/${requestId}/respond_request/`, { action });
        return response.data;
    },

    getRequests: async () => {
        const response = await socialClient.get("social/feed/requests/");
        return response.data.data;
    },

    getNetworkStats: async () => {
        const response = await socialClient.get("social/feed/my_network/");
        return response.data.data;
    },

    getDetailedConnections: async () => {
        const response = await socialClient.get("social/feed/connections/");
        return response.data.data;
    },

    disconnectUser: async (connectionId: number) => {
        const response = await socialClient.post(`social/feed/${connectionId}/disconnect/`);
        return response.data;
    },

    // --- CHAT ---
    getChatSessions: async () => {
        const response = await socialClient.get("social/chat/list_sessions/");
        return response.data.data;
    },

    getChatMessages: async (sessionId: string) => {
        const response = await socialClient.get(`social/chat/messages/?session_id=${sessionId}`);
        return response.data.data;
    },

    getSessionDetail: async (sessionId: string) => {
        const response = await socialClient.get(`social/chat/session_detail/?session_id=${sessionId}`);
        return response.data.data;
    },

    startChat: async (userId: number, role: string = 'STUDENT') => {
        const response = await socialClient.post("social/chat/start_chat/", { user_id: userId, role });
        return response.data.data;
    },

    startGroupChat: async (peers: any[], name: string) => {
        const response = await socialClient.post("social/chat/start_group_chat/", { 
            peers: peers.map(p => ({ id: p.id, role: p.role })), 
            name 
        });
        return response.data.data;
    },

    updateGroupSettings: async (sessionId: string, readOnly: boolean) => {
        const response = await socialClient.post("social/chat/update_group_settings/", {
            session_id: sessionId,
            read_only: readOnly
        });
        return response.data;
    },

    removeParticipant: async (sessionId: string, userId: number, role: string) => {
        const response = await socialClient.post("social/chat/remove_participant/", {
            session_id: sessionId,
            user_id: userId,
            role: role
        });
        return response.data;
    },

    deleteChatSession: async (sessionId: string) => {
        const response = await socialClient.post("social/chat/delete_session/", { session_id: sessionId });
        return response.data;
    }
};
