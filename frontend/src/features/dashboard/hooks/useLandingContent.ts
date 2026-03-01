// src/features/dashboard/hooks/useLandingContent.ts
// Fetches landing page content from the backend CMS (Django Admin managed).
// Falls back to env-based defaults if the API is unavailable.

import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const ENDPOINT = `${API_URL}/api/users/public/site-config/`;

export interface NavLink { label: string; href: string; }

export interface FeatureTile { title: string; desc: string; icon?: string; }

export interface TeamMember {
    name: string;
    role: string;
    bio?: string;
    photo_url?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
}

export interface LandingContent {
    brand: {
        logo_url: string;
        logo_alt: string;
        favicon_url: string;
    };
    seo: {
        title: string;
        description: string;
        og_image: string;
    };
    banner: {
        enabled: boolean;
        text: string;
        link: string;
        type: "info" | "success" | "warning";
    };
    hero: {
        badge: string;
        heading: string;
        subtext: string;
        cta_primary: string;
        cta_secondary: string;
    };
    stats: {
        enabled: boolean;
        active_users: string;
        placement_rate: string;
        institutions: string;
        ai_queries: string;
    };
    portals: {
        student: { title: string; desc: string };
        institution: { title: string; desc: string };
    };
    about: {
        badge: string;
        heading: string;
        body: string;
        bullets: string[];
    };
    features: FeatureTile[];
    team: {
        enabled: boolean;
        heading: string;
        subtext: string;
        members: TeamMember[];
    };
    testimonials: {
        enabled: boolean;
        items: { name: string; role: string; quote: string }[];
    };
    faq: {
        enabled: boolean;
        items: { q: string; a: string }[];
    };
    whitepaper: {
        heading: string;
        subtext: string;
        pdf_url: string;
        view_url: string;
    };
    footer: {
        tagline: string;
        contact_email: string;
        contact_phone?: string;
        contact_address?: string;
        copyright: string;
        socials: Record<string, string>;
    };
    nav: NavLink[];
}

// ─── Fallback defaults (env-backed) ─────────────────────────────────────────
const FALLBACK: LandingContent = {
    brand: {
        logo_url: "",
        logo_alt: "AUIP Platform",
        favicon_url: "",
    },
    seo: {
        title: "AUIP – The Operating System for Higher Education",
        description: "AUIP Platform connects students, faculty, and administration through AI-powered, zero-trust digital infrastructure.",
        og_image: "",
    },
    banner: {
        enabled: false,
        text: "",
        link: "",
        type: "info",
    },
    hero: {
        badge: "Enterprise-Grade Academic Cloud",
        heading: import.meta.env.VITE_APP_TAGLINE || "The Operating System for Higher Education",
        subtext: "AUIP connects students, faculty, and administration through an AI-powered, unified digital infrastructure. Zero-trust security meets intelligent academic governance.",
        cta_primary: "Access Portals",
        cta_secondary: "Read Whitepaper",
    },
    stats: {
        enabled: true,
        active_users: "4.2k",
        placement_rate: "98%",
        institutions: "34+",
        ai_queries: "1.2M",
    },
    portals: {
        student: {
            title: "Student Portal",
            desc: "Access your academic records, intelligent resume studio, placement opportunities, and a personalized AI assistant.",
        },
        institution: {
            title: "Institutional Gateway",
            desc: "Unified access for University Administrators and Faculty. Manage cohorts, analytics, and departmental governance.",
        },
    },
    about: {
        badge: "Next-Generation Infrastructure",
        heading: "Built for scale, designed for performance.",
        body: "The Adaptive University Intelligence Platform (AUIP) replaces fragmented legacy systems with a singular, high-performance ecosystem. Powered by advanced ML analytics and robust Tenant Schema isolation, we ensure uncompromised data integrity.",
        bullets: [
            "Multi-tenant architecture ensuring isolated data lakes.",
            "AI-driven talent discovery and placement matching.",
            "Automated verifiable credentials and dynamic portfolios.",
            "Real-time institutional health monitoring dashboards.",
        ],
    },
    features: [
        { title: "AI Governance Brain", desc: "Placement readiness scoring, at-risk detection, and auto-personalized mock assignments." },
        { title: "Quantum Shield Auth", desc: "Quad-Segment Cookie Fragmentation, HMAC key rotation, and device fingerprinting." },
        { title: "Multi-Tenant Isolation", desc: "Every institution gets its own PostgreSQL schema. Cross-tenant queries are structurally impossible." },
        { title: "Dynamic Eligibility Engine", desc: "AND/OR/nested logic for placement drives. One-student-one-job enforcement built-in." },
        { title: "Real-Time Analytics", desc: "WebSocket-driven dashboards for TPOs with placement stats, department-wise breakdowns." },
        { title: "Smart Resume Studio", desc: "AI-powered resume builder with verifiable credentials and ATS scoring." },
    ],
    team: {
        enabled: false,
        heading: "Built by a passionate team",
        subtext: "Meet the people behind the platform.",
        members: [],
    },
    testimonials: { enabled: false, items: [] },
    faq: { enabled: false, items: [] },
    whitepaper: {
        heading: "The AUIP Whitepaper",
        subtext: "Dive deep into our technical architecture, AI implementation frameworks, and the economic model of next-generation higher education systems.",
        pdf_url: "",
        // Hosted locally — viewable at /whitepaper.html in the same Vite server
        view_url: "/whitepaper.html",
    },
    footer: {
        tagline: import.meta.env.VITE_APP_TAGLINE || "Advancing global education through intelligent computing algorithms.",
        contact_email: import.meta.env.VITE_CONTACT_EMAIL || "contact@auip.edu",
        copyright: import.meta.env.VITE_COPYRIGHT || "© 2026 AUIP Foundation. All Systems Operational.",
        socials: {},
    },
    nav: [
        { label: "About", href: "#about" },
        { label: "Platform", href: "#features" },
        { label: "Whitepaper", href: "#whitepaper" },
        { label: "Contact", href: "#contact" },
    ],
};

const CACHE_KEY = "auip_landing_content_v2";
const CACHE_TTL = 5 * 60 * 1000; // 5 min in ms

export function useLandingContent() {
    const [content, setContent] = useState<LandingContent>(FALLBACK);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);

    useEffect(() => {
        // Check session cache first
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, ts } = JSON.parse(cached);
                if (Date.now() - ts < CACHE_TTL) {
                    setContent(data);
                    setFromCache(true);
                    setLoading(false);
                    return;
                }
            }
        } catch { /* ignore */ }

        let cancelled = false;
        fetch(ENDPOINT, { signal: AbortSignal.timeout(4000) })
            .then((r) => r.json())
            .then((json) => {
                if (cancelled) return;
                if (json?.success && json?.data) {
                    const merged = deepMerge(FALLBACK, json.data);
                    setContent(merged);
                    try {
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() }));
                    } catch { /* ignore */ }
                }
            })
            .catch(() => { /* use fallback silently */ })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, []);

    return { content, loading, fromCache };
}

// Simple deep merge — API data wins over fallback where non-empty
function deepMerge<T extends object>(fallback: T, override: Partial<T>): T {
    const result = { ...fallback };
    for (const key in override) {
        const v = override[key as keyof T];
        if (v && typeof v === "object" && !Array.isArray(v) && typeof fallback[key as keyof T] === "object") {
            result[key as keyof T] = deepMerge(fallback[key as keyof T] as any, v as any);
        } else if (v !== undefined && v !== null && v !== "") {
            result[key as keyof T] = v as T[keyof T];
        }
    }
    return result;
}
