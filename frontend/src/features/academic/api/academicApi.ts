import axios from "axios";
import { attachInterceptors } from "../../auth/api/base";

export const ACADEMIC_API_BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/courses/`
    : `http://localhost:8000/api/courses/`;

export const academicApiClient = axios.create({
    baseURL: ACADEMIC_API_BASE_URL,
    withCredentials: true,
});

// Apply robust silent refresh token logic
attachInterceptors(academicApiClient);
