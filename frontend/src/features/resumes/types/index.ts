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
    template: number;
    content: any; // The canvas JSON data
    is_ai_optimized: boolean;
    ats_score_cache: number;
    last_used_with_drive?: number;
    updated_at: string;
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
