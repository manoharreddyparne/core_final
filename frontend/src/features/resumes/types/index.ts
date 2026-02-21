// src/features/resumes/types/index.ts

export interface ResumeTemplate {
    id: number;
    name: string;
    preview_image?: string;
    metadata: any;
}

export interface StudentResume {
    id: number;
    resume_name: string;
    template?: number;
    personal_info: {
        name: string;
        email: string;
        phone: string;
        location: string;
        summary: string;
    };
    education: any[];
    experience: any[];
    projects: any[];
    skills: string[];
    awards: any[];
    is_ai_optimized?: boolean;
    ats_score_cache: number;
    updated_at?: string;
}

export interface AIOptimizationResponse {
    optimization_summary: string;
    resume_id: number;
}

export interface ATSCheckResponse {
    score: number;
    missing: string[];
    advice: string;
}
