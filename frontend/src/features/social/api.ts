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

    getBlogsForYou: async () => {
        const response = await socialClient.get("governance/blogs/for_you/");
        return response.data.data;
    },

    createPost: async (content: string) => {
        const response = await socialClient.post("social/feed/", { content });
        return response.data;
    },

    supportDiagnosis: async (subject: string, description: string) => {
        const response = await socialClient.post("social/support/", { subject, description });
        return response.data.data;
    }
};
