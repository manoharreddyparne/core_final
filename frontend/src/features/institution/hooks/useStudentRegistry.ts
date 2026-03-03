import { useState, useEffect, useCallback } from "react";
import { instApiClient } from "../../auth/api/base";
import { academicApi } from "../../academic/api/academicApi";
import { toast } from "react-hot-toast";

export interface Student {
    id: number;
    roll_number: string;
    full_name: string;
    official_email: string;
    personal_email?: string;
    phone_number?: string;
    section: string;
    batch_year: number;
    admission_year?: number;
    passout_year?: number;
    program?: string;
    branch: string;
    current_semester: number;
    cgpa?: number | string;
    "10th_percent"?: number | string;
    "12th_percent"?: number | string;
    active_backlogs?: number;
    date_of_birth?: string;
    gender?: string;
    category?: string;
    father_name?: string;
    status: "ACTIVE" | "SEEDED";
}

export interface SectionStat {
    name: string;
    total: number;
    activated: number;
}

interface PaginatedState {
    students: Student[];
    count: number;        // total from server
    page: number;
    pageSize: number;
}

/**
 * Server-side paginated student registry.
 * - Never fetches more than one page at a time (no parallel page blasting)
 * - page_size=100, max_page_size=500 (set on backend)
 * - Exposes goToPage() for navigation
 */
export const useStudentRegistry = (activeSection: string | null, viewMode: "CARDS" | "LIST", searchTerm = "", statusFilter = "ALL") => {
    const [students, setStudents] = useState<Student[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 100;

    const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
    const [loading, setLoading] = useState(false);
    const [registryDepts, setRegistryDepts] = useState<any[]>([]);
    const [registryProgs, setRegistryProgs] = useState<any[]>([]);
    const [registrySections, setRegistrySections] = useState<any[]>([]);

    const fetchAcademicRegistry = async () => {
        try {
            const [depts, progs, secs] = await Promise.all([
                academicApi.list("departments"),
                academicApi.list("programs"),
                academicApi.list("sections")
            ]);
            if (depts.data.success) setRegistryDepts(depts.data.data);
            if (progs.data.success) setRegistryProgs(progs.data.data);
            if (secs.data.success) setRegistrySections(secs.data.data);
        } catch (err) {
            console.warn("Soft failure fetching academic registry", err);
        }
    };

    const fetchSections = async () => {
        try {
            const res = await instApiClient.get("students/sections/");
            if (res.data.success) {
                setSectionStats(res.data.data);
            } else {
                setSectionStats([]);
            }
        } catch (err) {
            console.error("Failed to fetch sections", err);
            setSectionStats([]);
        }
    };

    const fetchStudents = useCallback(async (targetPage = 1) => {
        if (viewMode === "CARDS" && !activeSection) return;
        setLoading(true);
        try {
            let url = `students/?page_size=${PAGE_SIZE}&page=${targetPage}`;
            // If searching, ignore section to enable Global Discovery
            if (activeSection && !searchTerm.trim()) url += `&section=${encodeURIComponent(activeSection)}`;
            if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            if (statusFilter !== "ALL") url += `&status=${statusFilter}`;

            const res = await instApiClient.get(url);

            if (res.data?.results !== undefined) {
                const count = res.data.count ?? 0;
                setTotalCount(count);
                setStudents(
                    res.data.results.map((s: any) => ({
                        ...s,
                        status: s.status || (s.is_active_account ? "ACTIVE" : "SEEDED"),
                    }))
                );
            } else if (res.data?.success) {
                // Non-paginated fallback
                setStudents(res.data.data);
                setTotalCount(res.data.data.length);
            }
        } catch (err) {
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    }, [viewMode, activeSection, searchTerm, statusFilter]);

    // Sections + academic meta: load once
    useEffect(() => {
        fetchSections();
        fetchAcademicRegistry();
    }, []);

    // Re-fetch when section/view/search/status changes — reset to page 1
    useEffect(() => {
        setPage(1);
        fetchStudents(1);
    }, [viewMode, activeSection, searchTerm, statusFilter]);

    const goToPage = (newPage: number) => {
        setPage(newPage);
        fetchStudents(newPage);
    };

    return {
        students,
        totalCount,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        goToPage,
        sectionStats,
        loading,
        registryDepts,
        registryProgs,
        registrySections,
        refresh: () => {
            fetchSections();
            fetchStudents(page);
        }
    };
};
