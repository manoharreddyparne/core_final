// ✅ src/features/auth/api/institutionAdminApi.ts
import { apiClient, authHeaders } from "./base";
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
    const res = await apiClient.get<ApiResponse<CoreStudent[]>>("/admin/core-students/", {
        params,
        headers: authHeaders()
    });
    return res.data;
};

export const inviteStudent = async (stu_ref: string): Promise<ApiResponse<any>> => {
    const res = await apiClient.post<ApiResponse<any>>(
        `/admin/core-students/${stu_ref}/send_invitation/`,
        {},
        { headers: authHeaders() }
    );
    return res.data;
};

export const updateStudentAcademic = async (stu_ref: string, data: any): Promise<ApiResponse<CoreStudent>> => {
    const res = await apiClient.patch<ApiResponse<CoreStudent>>(
        `/admin/core-students/${stu_ref}/`,
        data,
        { headers: authHeaders() }
    );
    return res.data;
};
export const bulkUploadStudents = async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiResponse<any>>(
        "/admin/bulk-seed-students/",
        formData,
        {
            headers: {
                ...authHeaders(),
                "Content-Type": "multipart/form-data"
            }
        }
    );
    return res.data;
};
