// Session validation utility
import axios from "axios";
import { API_BASE_URL } from "./base";
import { getAccessToken } from "../utils/tokenStorage";

export interface SessionValidationResponse {
    is_valid: boolean;
    was_logged_out?: boolean;
    reason?: string;
    last_active?: string;
    expires_at?: string;
}

export const validateSession = async (): Promise<SessionValidationResponse | null> => {
    try {
        const token = getAccessToken();
        if (!token) {
            console.warn("[Session Validation] No access token found");
            return null;
        }

        const response = await axios.get(`${API_BASE_URL}sessions/validate/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.data;
    } catch (error) {
        console.error("[Session Validation] Failed:", error);
        return null;
    }
};
