// src/features/resumes/api.ts
import axios from "axios";
import { StudentResume, ResumeTemplate, AIOptimizationResponse, ATSCheckResponse } from "./types";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const resumeClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

resumeClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const resumeApi = {
    getResumes: async (): Promise<StudentResume[]> => {
        const response = await resumeClient.get("resumes/resume/");
        return response.data;
    },

    getTemplates: async (): Promise<ResumeTemplate[]> => {
        // Note: This endpoint should be added to the backend if not present
        // For now assuming it exists or using mock
        const response = await resumeClient.get("resumes/template/");
        return response.data;
    },

    getResume: async (id: number): Promise<StudentResume> => {
        const response = await resumeClient.get(`resumes/resume/${id}/`);
        return response.data;
    },

    createResume: async (data: any): Promise<StudentResume> => {
        const response = await resumeClient.post("resumes/resume/", data);
        return response.data;
    },

    updateResume: async (id: number, content: any): Promise<StudentResume> => {
        const response = await resumeClient.patch(`resumes/resume/${id}/`, { content });
        return response.data;
    },

    aiOptimize: async (id: number, target_jd: string): Promise<AIOptimizationResponse> => {
        const response = await resumeClient.post(`resumes/resume/${id}/ai_optimize/`, { target_jd });
        return response.data.data;
    },

    checkATS: async (resumeId: number, driveId: number): Promise<ATSCheckResponse> => {
        const response = await resumeClient.get(`resumes/resume/${resumeId}/check_ats_fit/?drive_id=${driveId}`);
        return response.data.data;
    }
};
