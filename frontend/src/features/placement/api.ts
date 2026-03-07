// src/features/placement/api.ts
import axios from "axios";
import { PlacementDrive, PlacementApplication } from "./types";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const placementClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

placementClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const placementApi = {
    getEligibleDrives: async (): Promise<PlacementDrive[]> => {
        const response = await placementClient.get("placement/drives/my_eligible_drives/");
        return response.data.data;
    },

    getApplications: async (driveId?: number): Promise<PlacementApplication[]> => {
        const url = driveId ? `placement/applications/?drive=${driveId}` : `placement/applications/`;
        const response = await placementClient.get(url);
        return response.data.results || response.data;
    },

    applyForDrive: async (driveId: number, resumeUrl: string): Promise<any> => {
        const response = await placementClient.post("placement/applications/", { drive: driveId, resume_url: resumeUrl });
        return response.data;
    },

    // --- ADMIN ENDPOINTS ---

    getAdminDrives: async (): Promise<PlacementDrive[]> => {
        const response = await placementClient.get("placement/drives/");
        return response.data.data ? response.data.data : response.data;
    },

    createDrive: async (data: any): Promise<any> => {
        let payload = data;
        let headers = {};

        if (data instanceof FormData) {
            headers = { "Content-Type": "multipart/form-data" };
        }

        const response = await placementClient.post("placement/drives/", payload, { headers });
        return response.data;
    },

    updateDrive: async (driveId: number, data: any): Promise<any> => {
        let payload = data;
        let headers = {};

        if (data instanceof FormData) {
            headers = { "Content-Type": "multipart/form-data" };
        }

        const response = await placementClient.patch(`placement/drives/${driveId}/`, payload, { headers });
        return response.data;
    },

    extractJD: async (input: File | string): Promise<any> => {
        if (typeof input === 'string') {
            const response = await placementClient.post("placement/drives/extract_jd/", { text: input });
            return response.data;
        } else {
            const formData = new FormData();
            formData.append("file", input);
            const response = await placementClient.post("placement/drives/extract_jd/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            return response.data;
        }
    },

    checkEligibility: async (formData: FormData): Promise<any> => {
        const response = await placementClient.post("placement/drives/check_eligibility/", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    },

    getEligibilityStats: async (driveId: number): Promise<any> => {
        const response = await placementClient.get(`placement/drives/${driveId}/eligibility_stats/`);
        return response.data;
    },

    activateDrive: async (driveId: number): Promise<any> => {
        const response = await placementClient.post(`placement/drives/${driveId}/activate/`);
        return response.data;
    },

    broadcastDrive: async (driveId: number): Promise<any> => {
        const response = await placementClient.post(`placement/drives/${driveId}/broadcast/`);
        return response.data;
    },

    broadcastProgress: async (driveId: number): Promise<any> => {
        const response = await placementClient.get(`placement/drives/${driveId}/broadcast_progress/`);
        return response.data;
    },

    manualAddStudent: async (driveId: number, rollNumber: string): Promise<any> => {
        const response = await placementClient.post(`placement/drives/${driveId}/manual_add_student/`, { roll_number: rollNumber });
        return response.data;
    },

    updateApplicationStatus: async (applicationId: number, status: string): Promise<any> => {
        const response = await placementClient.patch(`placement/applications/${applicationId}/update_status/`, { status });
        return response.data;
    },

    // --- ANALYTICS ---
    getAnalyticsSummary: async (): Promise<any> => {
        const response = await placementClient.get("placement/analytics/summary/");
        return response.data.data;
    },

    // --- ATS STAGE MANAGEMENT ---
    addApplicationStage: async (applicationId: number, data: { stage_name: string; scheduled_at?: string }): Promise<any> => {
        const response = await placementClient.post(`placement/applications/${applicationId}/add_stage/`, data);
        return response.data;
    },

    updateApplicationStage: async (applicationId: number, data: { stage_id: number; status: string; feedback?: string }): Promise<any> => {
        const response = await placementClient.patch(`placement/applications/${applicationId}/update_stage/`, data);
        return response.data;
    },

    deleteDrive: async (driveId: number): Promise<any> => {
        const response = await placementClient.delete(`placement/drives/${driveId}/`);
        return response.data;
    },

    searchStudents: async (query: string): Promise<any> => {
        const response = await placementClient.get(`placement/drives/search_students/?q=${query}`);
        return response.data;
    },
};
