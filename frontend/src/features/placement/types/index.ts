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
    };
    status: string;
    stages: PlacementProcessStage[];
    applied_at: string;
}

export interface PlacementDrive {
    id: number;
    company_name: string;
    role: string;
    job_description: string;
    package_details: string;
    location: string;
    deadline: string;
    status: string;
    is_eligible: boolean;
    eligibility_reason?: string;
}
