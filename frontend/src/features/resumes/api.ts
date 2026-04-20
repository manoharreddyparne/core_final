import { coreApiClient as resumeClient } from "../auth/api/base";
import { API_CONFIG } from "../../config/api";
import { StudentResume, ResumeTemplate, AIOptimizationResponse, ATSCheckResponse } from "./types";

export const resumeApi = {
    getResumes: async (): Promise<StudentResume[]> => {
        const response = await resumeClient.get("resumes/builder/");
        return response.data;
    },

    getTemplates: async (): Promise<ResumeTemplate[]> => {
        const response = await resumeClient.get("resumes/template/");
        return response.data;
    },

    getResume: async (id: number): Promise<StudentResume> => {
        const response = await resumeClient.get(`resumes/builder/${id}/`);
        return response.data;
    },

    createResume: async (data: any): Promise<StudentResume> => {
        const response = await resumeClient.post("resumes/builder/", data);
        return response.data;
    },

    updateResume: async (id: number, content: any): Promise<StudentResume> => {
        const response = await resumeClient.patch(`resumes/builder/${id}/`, { content });
        return response.data;
    },

    aiOptimize: async (id: number, target_jd: string): Promise<AIOptimizationResponse> => {
        const response = await resumeClient.post(`resumes/builder/${id}/ai_optimize/`, { target_jd });
        return response.data.data;
    },

    checkATS: async (resumeId: number, driveId: number): Promise<ATSCheckResponse> => {
        const response = await resumeClient.get(`resumes/builder/${resumeId}/check_ats_fit/?drive_id=${driveId}`);
        return response.data.data;
    }
};
