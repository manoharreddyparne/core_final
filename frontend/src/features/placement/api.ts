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

    getApplications: async (): Promise<PlacementApplication[]> => {
        const response = await placementClient.get("placement/applications/");
        return response.data;
    },

    applyForDrive: async (driveId: number, resumeUrl: string): Promise<any> => {
        const response = await placementClient.post("placement/applications/", { drive: driveId, resume_url: resumeUrl });
        return response.data;
    }
};
