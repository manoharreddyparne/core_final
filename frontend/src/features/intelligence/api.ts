// src/features/intelligence/api.ts
import axios from "axios";
import { IntelligenceDashboard, AIResponse } from "./types";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const intelligenceClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

intelligenceClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const intelligenceApi = {
    getDashboard: async (): Promise<IntelligenceDashboard> => {
        const response = await intelligenceClient.get("intelligence/dashboard/");
        return response.data.data;
    },

    askAI: async (query: string): Promise<string> => {
        const response = await intelligenceClient.post("intelligence/assistant/ask_ai/", { query });
        return response.data.data.response;
    }
};
