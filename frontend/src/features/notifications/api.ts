import { coreApiClient as notificationClient } from "../auth/api/base";
import { API_CONFIG } from "../../config/api";

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
