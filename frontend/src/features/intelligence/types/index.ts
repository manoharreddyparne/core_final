// src/features/intelligence/types/index.ts

export interface GovernanceMetrics {
    readiness: number;
    behavior: number;
    top_interests: [string, number][];
    controls: Record<string, any>;
}

export interface PlacementSummary {
    total: number;
    shortlisted: number;
    active_stages: number;
}

export interface IntelligenceDashboard {
    governance: GovernanceMetrics;
    placement_summary: PlacementSummary;
    recent_ai_guidance: string[];
    recent_blogs?: any[]; // For professional hub integration
    system_status: string;
}

export interface AIResponse {
    response: string;
}
