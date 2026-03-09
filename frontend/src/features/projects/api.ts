// src/features/projects/api.ts
import axios from "axios";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const projectsClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

projectsClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const projectsApi = {
    getProjects: async (search: string = '', ordering: string = '-created_at') => {
        const response = await projectsClient.get(`projects/showcase/?search=${search}&ordering=${ordering}`);
        return response.data;
    },

    getProjectDetail: async (id: string) => {
        const response = await projectsClient.get(`projects/showcase/${id}/`);
        return response.data;
    },

    uploadProject: async (data: {
        title: string;
        description: string;
        abstract: string;
        category: string;
        group_name?: string;
        batch_id?: string;
        file: File;
        documentation_file?: File | null;
        research_paper?: File | null;
        project_link?: string;
    }) => {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('abstract', data.abstract);
        formData.append('category', data.category);
        if (data.group_name) formData.append('group_name', data.group_name);
        if (data.batch_id) formData.append('batch_id', data.batch_id);
        formData.append('file', data.file);
        if (data.documentation_file) formData.append('documentation_file', data.documentation_file);
        if (data.research_paper) formData.append('research_paper', data.research_paper);
        if (data.project_link) formData.append('project_link', data.project_link);

        const response = await projectsClient.post("projects/showcase/", formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    approveProject: async (id: string) => {
        const response = await projectsClient.post(`projects/showcase/${id}/approve/`);
        return response.data;
    },

    likeProject: async (id: string) => {
        const response = await projectsClient.post(`projects/showcase/${id}/like/`);
        return response.data;
    },

    deleteProject: async (id: string) => {
        const response = await projectsClient.delete(`projects/showcase/${id}/`);
        return response.data;
    }
};
