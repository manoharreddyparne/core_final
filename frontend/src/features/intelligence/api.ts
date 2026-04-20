import { coreApiClient as intelligenceClient } from "../auth/api/base";
import { API_CONFIG } from "../../config/api";
import { IntelligenceDashboard, AIResponse } from "./types";

export const intelligenceApi = {
    getDashboard: async (): Promise<IntelligenceDashboard> => {
        const response = await intelligenceClient.get("intelligence/dashboard/");
        return response.data.data;
    },

    askAI: async (query: string, conversationId?: string | number): Promise<{ response: string, conversation_id: number }> => {
        const response = await intelligenceClient.post("intelligence/assistant/ask_ai/", {
            query,
            conversation_id: conversationId
        });
        return response.data.data;
    },

    getConversations: async (): Promise<any[]> => {
        const response = await intelligenceClient.get("intelligence/assistant/conversations/");
        return response.data.data;
    },

    getMessages: async (conversationId: string | number): Promise<any[]> => {
        const response = await intelligenceClient.get(`intelligence/assistant/messages/?conversation_id=${conversationId}`);
        return response.data.data;
    },

    deleteConversation: async (conversationId: string | number): Promise<void> => {
        await intelligenceClient.delete("intelligence/assistant/delete_conversation/", {
            data: { conversation_id: conversationId }
        });
    },

    getHistory: async (): Promise<{ role: 'user' | 'ai', text: string }[]> => {
        const response = await intelligenceClient.get("intelligence/assistant/history/");
        return response.data.data;
    }
};
