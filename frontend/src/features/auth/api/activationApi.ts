// ✅ src/features/auth/api/activationApi.ts
import { apiClient } from "./base";
import type { ApiResponse } from "./types";

export interface StudentActivationData {
    full_name: string;
    email: string;
    roll_number: string;
    department: string;
    institution: string | null;
}

/**
 * Validate activation token and fetch student details
 */
export const validateActivationToken = async (token: string): Promise<ApiResponse<StudentActivationData>> => {
    const res = await apiClient.get<ApiResponse<StudentActivationData>>(`auth/v2/activate/?token=${token}`);
    return res.data;
};

/**
 * Activate student account
 */
export const activateStudentAccount = async (data: {
    token: string;
    password: string;
    username?: string;
}): Promise<ApiResponse<any>> => {
    const res = await apiClient.post<ApiResponse<any>>("auth/v2/activate/", data);
    return res.data;
};
