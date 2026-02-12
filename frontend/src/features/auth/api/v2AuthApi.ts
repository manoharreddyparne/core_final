import { apiClient } from "./base";
import { ApiResponse, AuthResponse } from "./types";

export interface Institution {
    id: number;
    name: string;
    slug: string;
    domain: string;
}

export interface IdentityCheckResponse {
    detail: string;
    success: boolean;
}

export interface ActivationPayload {
    token: string;
    password: string;
}

export interface StudentLoginPayload {
    institution_id: number;
    identifier: string; // email or roll number
    password: string;
}

export interface FacultyLoginPayload {
    institution_id: number;
    email: string;
    password: string;
}

export interface FacultyMFAPayload {
    institution_id: number;
    email: string;
    otp: string;
}

/**
 * V2 Authentication API - Multi-Tenant Schema-Isolated Auth
 */
export const v2AuthApi = {
    /**
     * Public: List all approved institutions for selectors.
     */
    getInstitutions: async (): Promise<Institution[]> => {
        const res = await apiClient.get<Institution[]>("public/institutions/");
        return res.data;
    },

    /**
     * Registration Step 1: Check identity and trigger activation link.
     */
    checkIdentity: async (data: { institution_id: number; identifier: string; email: string }): Promise<IdentityCheckResponse> => {
        const res = await apiClient.post<IdentityCheckResponse>("auth/v2/check-identity/", data);
        return res.data;
    },

    /**
     * Registration Step 2: Set password via signed activation token.
     */
    activateAccount: async (data: ActivationPayload): Promise<{ detail: string; success: boolean }> => {
        const res = await apiClient.post<{ detail: string; success: boolean }>("auth/v2/activate/", data);
        return res.data;
    },

    /**
     * Student Login: Institution + Identifier + Password.
     */
    studentLogin: async (data: StudentLoginPayload): Promise<ApiResponse<AuthResponse>> => {
        const res = await apiClient.post<ApiResponse<AuthResponse>>("auth/v2/student/login/", data);
        return res.data;
    },

    /**
     * Faculty Login Initiation: Password check -> Triggers OTP.
     */
    facultyLogin: async (data: FacultyLoginPayload): Promise<ApiResponse<{ requires_otp: boolean; email_hint: string }>> => {
        const res = await apiClient.post<ApiResponse<{ requires_otp: boolean; email_hint: string }>>("auth/v2/faculty/login/", data);
        return res.data;
    },

    /**
     * Faculty Login Step 2: Verify MFA and get tokens.
     */
    verifyFacultyMFA: async (data: FacultyMFAPayload): Promise<ApiResponse<AuthResponse>> => {
        const res = await apiClient.post<ApiResponse<AuthResponse>>("auth/v2/faculty/mfa/", data);
        return res.data;
    },

    /**
     * SuperAdmin: Verify JIT Access Ticket.
     */
    verifyAdminTicket: async (ticket: string): Promise<{ valid: boolean }> => {
        const res = await apiClient.post<{ valid: boolean }>("auth/admin/verify-ticket/", { ticket });
        return res.data;
    }
};
