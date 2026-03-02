import axios from "axios";
import { attachInterceptors } from "../../auth/api/base";

export const ACADEMIC_API_BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/courses/`
    : `http://localhost:8000/api/courses/`;

export const academicApiClient = axios.create({
    baseURL: ACADEMIC_API_BASE_URL,
    withCredentials: true,
});

attachInterceptors(academicApiClient);

// High-level API helpers for Academic Hub
export const academicApi = {
    // Generic CRUD
    list: (resource: string, params?: any) => academicApiClient.get(`${resource}/`, { params }),
    get: (resource: string, id: string | number) => academicApiClient.get(`${resource}/${id}/`),
    create: (resource: string, data: any) => academicApiClient.post(`${resource}/`, data),
    update: (resource: string, id: string | number, data: any) => academicApiClient.patch(`${resource}/${id}/`, data),
    delete: (resource: string, id: string | number) => academicApiClient.delete(`${resource}/${id}/`),

    // Specialized Actions
    getCurrentYear: () => academicApiClient.get('academic-years/current/'),
    bulkEnroll: (data: any) => academicApiClient.post('enrollments/bulk_enroll/', data),
    markAttendanceBulk: (data: any) => academicApiClient.post('attendance/mark_bulk/', data),
    bulkEnterMarks: (data: any) => academicApiClient.post('marks/bulk_enter/', data),
    getStudentReport: (roll: string) => academicApiClient.get('attendance/student_report/', { params: { roll_number: roll } }),
    getLowAttendance: (subject: string, threshold = 75) => academicApiClient.get('attendance/low_attendance_students/', { params: { subject_code: subject, threshold } }),
    getClassMarks: (subject: string) => academicApiClient.get('marks/class_report/', { params: { subject_code: subject } }),
};
