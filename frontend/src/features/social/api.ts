// src/features/social/api.ts
import { coreApiClient as socialClient } from "../auth/api/base";
import { API_CONFIG } from "../../config/api";

export const socialApi = {
    getFeed: async () => {
        const response = await socialClient.get("social/feed/");
        return response.data;
    },

    getDiscovery: async (search: string = '') => {
        const response = await socialClient.get(`chathub/network/discover/?search=${search}`);
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
                formData.append('media_url', mediaData); 
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

    // --- NETWORK ---
    connectToUser: async (id: number, role: string = 'STUDENT') => {
        const response = await socialClient.post("chathub/network/connect/", { target_id: id, target_role: role });
        return response.data;
    },

    respondToRequest: async (requestId: number, action: 'ACCEPT' | 'DECLINE') => {
        const response = await socialClient.post(`chathub/network/${requestId}/respond_request/`, { action });
        return response.data;
    },

    getRequests: async () => {
        const response = await socialClient.get("chathub/network/requests/");
        return response.data.data;
    },

    getNetworkStats: async () => {
        const response = await socialClient.get("chathub/network/my_stats/");
        return response.data.data;
    },

    getDetailedConnections: async () => {
        const response = await socialClient.get("chathub/network/connections/");
        return response.data.data;
    },

    disconnectUser: async (connectionId: number) => {
        const response = await socialClient.post(`chathub/network/${connectionId}/disconnect/`);
        return response.data;
    },

    // --- CHAT (MIGRATED TO CHATHUB) ---
    getChatSessions: async (search: string = '') => {
        const response = await socialClient.get(`chathub/sessions/list_sessions/?search=${search}`);
        return response.data.data;
    },

    getChatMessages: async (sessionId: string) => {
        const response = await socialClient.get(`chathub/messages/${sessionId}/history/`);
        return response.data.data;
    },

    getSessionDetail: async (sessionId: string) => {
        const response = await socialClient.get(`chathub/sessions/${sessionId}/detail/`);
        return response.data.data;
    },

    joinChatGate: async (sessionId: string) => {
        const response = await socialClient.post(`chathub/sessions/${sessionId}/join_gate/`);
        return response.data;
    },
    requestAccess: async (sessionId: string) => {
        const response = await socialClient.post(`chathub/invites/request_access/`, { session_id: sessionId });
        return response.data;
    },

    joinViaLink: async (token: string) => {
        const response = await socialClient.post(`chathub/invites/join/${token}/`);
        return response.data;
    },

    startChat: async (userId: number, role: string = 'STUDENT') => {
        const response = await socialClient.post("chathub/sessions/start_chat/", { user_id: userId, role });
        return response.data.data;
    },

    startGroupChat: async (peers: any[], name: string) => {
        const response = await socialClient.post("chathub/sessions/start_group/", { 
            peers: peers.map(p => ({ id: p.id, role: p.role })), 
            name 
        });
        return response.data.data;
    },

    getInviteRequests: async () => {
        const response = await socialClient.get("chathub/invites/pending_requests/");
        return response.data.data;
    },

    resolveInviteRequest: async (requestId: number, action: 'APPROVE' | 'REJECT') => {
        const response = await socialClient.post(`chathub/invites/${requestId}/resolve_request/`, { action });
        return response.data;
    },

    addParticipant: async (sessionId: string, userId: number, role: string, name?: string) => {
        const response = await socialClient.post(`chathub/participants/${sessionId}/add_participant/`, {
            user_id: userId,
            role: role,
            name: name
        });
        return response.data;
    },

    removeParticipant: async (sessionId: string, userId: number, role: string) => {
        const response = await socialClient.post(`chathub/participants/${sessionId}/remove_participant/`, {
            user_id: userId,
            role: role
        });
        return response.data;
    },

    leaveGroup: async (sessionId: string) => {
        const response = await socialClient.post(`chathub/participants/${sessionId}/leave_group/`);
        return response.data;
    },

    deleteChatSession: async (sessionId: string) => {
        const response = await socialClient.delete(`chathub/sessions/${sessionId}/`);
        return response.data;
    },

    // --- NETWORK ---
    searchConnections: async (query: string) => {
        const response = await socialClient.get(`chathub/network/search/?q=${query}`);
        return response.data.data;
    },

    // --- SUPPORT ---
    supportDiagnosis: async (subject: string, description: string) => {
        const response = await socialClient.post("social/support/", { subject, description });
        return response.data.data;
    },
    updateGroupSettings: async (sessionId: string, readOnly: boolean, openInvite?: boolean, inviteExpiry?: string | null) => {
        const response = await socialClient.post(`chathub/participants/${sessionId}/update_settings/`, { 
            read_only_for_students: readOnly,
            open_invite: openInvite,
            invite_expiry_at: inviteExpiry
        });
        return response.data;
    },
    establishAndBroadcast: async (sessionId: string) => {
        const response = await socialClient.post(`chathub/sessions/${sessionId}/establish_and_broadcast/`);
        return response.data;
    },
    generateInviteLink: async (sessionId: string, expiryHours?: number) => {
        const response = await socialClient.post(`chathub/invites/generate_link/`, { 
            session_id: sessionId,
            expiry_hours: expiryHours
        });
        return response.data.data;
    },
};
