import { useState, useEffect } from "react";
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

export const useStudentRegistry = (activeSection: string | null, viewMode: "CARDS" | "LIST") => {
    const [students, setStudents] = useState<Student[]>([]);
    const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
        try {
            const res = await instApiClient.get("students/sections/");
            setSectionStats(res.data);
        } catch (err) {
            console.error("Failed to fetch sections", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            let url = "students/";
            if (activeSection) url += `?section=${activeSection}`;

            const res = await instApiClient.get(url);

            // Handle paginated DRF response
            if (res.data?.results) {
                let allStudents = [...res.data.results];
                const totalCount = res.data.count || allStudents.length;
                const pageSize = allStudents.length;

                // If there are more pages, fetch them in parallel
                if (totalCount > pageSize && pageSize > 0) {
                    const totalPages = Math.ceil(totalCount / pageSize);
                    const pagePromises = [];
                    for (let p = 2; p <= totalPages; p++) {
                        const sep = url.includes('?') ? '&' : '?';
                        pagePromises.push(instApiClient.get(`${url}${sep}page=${p}`));
                    }
                    const pages = await Promise.all(pagePromises);
                    for (const pg of pages) {
                        if (pg.data?.results) allStudents = [...allStudents, ...pg.data.results];
                    }
                }

                // Map status field for compatibility
                setStudents(allStudents.map((s: any) => ({
                    ...s,
                    status: s.status || (s.is_active_account ? "ACTIVE" : "SEEDED"),
                })));
            } else if (res.data?.success) {
                // Fallback: non-paginated response
                setStudents(res.data.data);
            }
        } catch (err) {
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSections();
        fetchAcademicRegistry();
    }, []);

    useEffect(() => {
        if (viewMode === "LIST" || activeSection) {
            fetchStudents();
        }
    }, [viewMode, activeSection]);

    return {
        students,
        sectionStats,
        loading,
        registryDepts,
        registryProgs,
        registrySections,
        refresh: () => {
            fetchSections();
            fetchStudents();
        }
    };
};
