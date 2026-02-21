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
        return response.data;
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
    }
};
