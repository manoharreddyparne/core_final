// ✅ src/features/auth/api/institutionAdminApi.ts
import { instApiClient, authHeaders } from "./base";
import type { ApiResponse } from "./types";

export interface CoreStudent {
    stu_ref: string;
    roll_number: string;
    full_name: string;
    department: string;
    batch_year: number;
    current_semester: number;
    official_email: string;
    status: string;
    cgpa: string | null;
    attendance_percentage: string | null;
}

export const getCoreStudents = async (params?: any): Promise<ApiResponse<CoreStudent[]>> => {
    // Uses instApiClient -> BaseURL: /api/institution/
    const res = await instApiClient.get<ApiResponse<CoreStudent[]>>("students/", {
        params,
        // headers: authHeaders() // instApiClient interceptors handle this!
    });
    return res.data;
};

export const inviteStudent = async (stu_ref: string): Promise<ApiResponse<any>> => {
    const res = await instApiClient.post<ApiResponse<any>>(
        `students/${stu_ref}/send_invitation/`,
        {}
    );
    return res.data;
};

export const updateStudentAcademic = async (stu_ref: string, data: any): Promise<ApiResponse<CoreStudent>> => {
    const res = await instApiClient.patch<ApiResponse<CoreStudent>>(
        `students/${stu_ref}/`,
        data
    );
    return res.data;
};
export const bulkUploadStudents = async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await instApiClient.post<ApiResponse<any>>(
        "bulk-seed-students/",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );
    return res.data;
};
