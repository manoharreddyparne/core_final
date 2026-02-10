// ✅ FINAL — FULL + SAFE
// src/features/user/api/userApi.ts

import { api } from "../../auth/axios";

/* -----------------------------------------------
   TYPES
----------------------------------------------- */

export interface Student {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  roll_number?: string;
  admission_year?: string;
  batch?: string;
}

export interface Teacher {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
}

export interface StudentInput {
  roll_number: string;
  email: string;
  admission_year?: string;
  batch?: string;
}

export interface CreateStudentResponse {
  created: {
    roll_number?: string;
    email: string;
    password?: string;
  }[];
  skipped: {
    roll_number?: string;
    email?: string;
    reason: string;
  }[];
}

export interface CreateTeacherResponse {
  created: {
    email: string;
    password?: string;
    department?: string;
  }[];
  skipped: {
    email?: string;
    reason: string;
  }[];
}

/* -----------------------------------------------
   PROFILE
----------------------------------------------- */

export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  roll_number?: string;
  admission_year?: string;
  batch?: string;
  department?: string;
}

/** Backend aggregate shape from GET /profile/ */
export interface ProfileAggregate {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    first_time_login: boolean;
    need_password_reset: boolean;
    avatar: string | null;
  };
  role_info: Record<string, any>;
  security_info: {
    last_login: string | null;
    recent_devices: {
      ip_address: string;
      user_agent: string;
      last_active: string;
    }[];
    two_factor_enabled: boolean;
  };
}

export const getProfile = async (): Promise<ProfileAggregate | null> => {
  const { data } = await api.get("profile/");
  return data?.data ?? null;
};

export const updateProfile = async (
  payload: ProfilePayload
): Promise<any> => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, v as any);
  });

  const { data } = await api.patch("profile/update/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data?.data ?? null;
};

/* -----------------------------------------------
   CREATE STUDENTS
----------------------------------------------- */

export const createStudent = async (
  student: StudentInput
): Promise<CreateStudentResponse> => {
  const { data } = await api.post<CreateStudentResponse>(
    "/admin/create-student/",
    student
  );
  return data;
};

export const createStudents = async (
  students: StudentInput[]
): Promise<CreateStudentResponse> => {
  const { data } = await api.post<CreateStudentResponse>(
    "/admin/create-student/",
    students
  );
  return data;
};

/* -----------------------------------------------
   CREATE TEACHER
----------------------------------------------- */

export const createTeacher = async (teacher: {
  email: string;
  department?: string;
}): Promise<CreateTeacherResponse> => {
  const { data } = await api.post<CreateTeacherResponse>(
    "/admin/create-teacher/",
    { teachers: [teacher] }
  );
  return data;
};

/* -----------------------------------------------
   SEARCH STUDENTS
----------------------------------------------- */

export const searchStudents = async (params: {
  roll_number?: string;
  batch?: string;
}): Promise<Student[]> => {
  const { data } = await api.get("/admin/search-student/", { params });
  return data?.data ?? [];
};

/* -----------------------------------------------
   SEARCH TEACHERS
----------------------------------------------- */

export const searchTeachers = async (params: {
  email?: string;
  department?: string;
}): Promise<Teacher[]> => {
  const { data } = await api.get("/admin/search-teacher/", { params });
  return data?.data ?? [];
};

/* -----------------------------------------------
   STUDENT DETAIL
----------------------------------------------- */

export const getStudent = async (id: number): Promise<any> => {
  const { data } = await api.get(`/admin/students/${id}/`);
  return data?.data ?? null;
};

export const updateStudent = async (
  id: number,
  payload: ProfilePayload
): Promise<any> => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, v as any);
  });

  const { data } = await api.patch(`/admin/students/${id}/update/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data?.data ?? null;
};

/* -----------------------------------------------
   TEACHER DETAIL
----------------------------------------------- */

export const getTeacher = async (id: number): Promise<any> => {
  const { data } = await api.get(`/admin/teachers/${id}/`);
  return data?.data ?? null;
};

export const updateTeacher = async (
  id: number,
  payload: ProfilePayload
): Promise<any> => {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, v as any);
  });

  const { data } = await api.patch(`/admin/teachers/${id}/update/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data?.data ?? null;
};
