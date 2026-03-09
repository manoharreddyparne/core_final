// src/features/placement/types/index.ts

export interface PlacementProcessStage {
    id: number;
    stage_name: string;
    status: 'PENDING' | 'CLEARED' | 'FAILED';
    feedback?: string;
    scheduled_at?: string;
}

export interface PlacementApplication {
    id: number;
    drive: number;
    drive_details: {
        company_name: string;
        role: string;
        package_details: string;
        is_broadcasted?: boolean;
        chat_session_id?: string;
    };
    student_details?: {
        full_name: string;
        roll_number: string;
        email: string;
        branch: string;
        cgpa: number;
    };
    status: string;
    stages: PlacementProcessStage[];
    applied_at: string;
}

export interface PlacementDrive {
    id?: number;
    company_name: string;
    role: string;
    job_description?: string;
    package_details?: string;
    location?: string;
    experience_years?: string;
    qualifications?: string[];
    salary_range?: string;
    contact_details?: string[];
    hiring_process?: string[];
    custom_criteria?: Record<string, any>;
    deadline: string;
    status?: string;
    is_eligible?: boolean;
    eligibility_reason?: string;

    // Admin Fields
    min_cgpa?: number | string;
    min_ug_percentage?: number | string;
    cgpa_to_percentage_multiplier?: number | string;
    allowed_active_backlogs?: number | string;
    min_10th_percent?: number | string;
    min_12th_percent?: number | string;
    eligible_branches?: string[];
    eligible_batches?: number[];
    is_broadcasted?: boolean;
    chat_session_id?: string;
    created_at?: string;
    jd_document?: string | null;
    excluded_rolls?: string[];
    manual_students?: string[];
    is_inclusion_mode?: boolean;
    included_rolls?: string[];
    neural_metadata?: Record<string, any>;
    auto_reminders_enabled?: boolean;
    reminder_config?: Record<string, boolean>;
}

