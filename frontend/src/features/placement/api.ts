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

    createDrive: async (data: Partial<PlacementDrive>): Promise<any> => {
        const response = await placementClient.post("placement/drives/", data);
        return response.data;
    },

    updateDrive: async (driveId: number, data: Partial<PlacementDrive>): Promise<any> => {
        const response = await placementClient.patch(`placement/drives/${driveId}/`, data);
        return response.data;
    },

    extractJD: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await placementClient.post("placement/drives/extract_jd/", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
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

    manualAddStudent: async (driveId: number, rollNumber: string): Promise<any> => {
        const response = await placementClient.post(`placement/drives/${driveId}/manual_add_student/`, { roll_number: rollNumber });
        return response.data;
    },

    updateApplicationStatus: async (applicationId: number, status: string): Promise<any> => {
        const response = await placementClient.patch(`placement/applications/${applicationId}/update_status/`, { status });
        return response.data;
    }
};
