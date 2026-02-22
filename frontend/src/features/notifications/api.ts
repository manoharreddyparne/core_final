import axios from "axios";
import { getAccessToken } from "../auth/utils/tokenStorage";

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

const notificationClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

notificationClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const notificationApi = {
    getNotifications: async () => {
        const response = await notificationClient.get("notifications/my-alerts/");
        return response.data;
    },
    markAsRead: async (id: number) => {
        const response = await notificationClient.post(`notifications/my-alerts/${id}/mark_as_read/`);
        return response.data;
    },
    markAllAsRead: async () => {
        const response = await notificationClient.post("notifications/my-alerts/mark_all_read/");
        return response.data;
    }
};
