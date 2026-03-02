// ✅ src/features/institution/pages/StudentRegistry.tsx

import { useState, useEffect, useRef } from "react";
import {
    Users,
    Search,
    Download,
    Plus,
    ChevronRight,
    CheckCircle2,
    Clock,
    Upload,
    Mail,
    ChevronLeft,
    BarChart2,
    X,
    BookOpen,
    Send,
    LayoutGrid,
    List,
    FileText,
    ShieldCheck,
    Activity,
    RefreshCw,
    User,
    GraduationCap,
    Globe,
    Lock,
    Zap,
    Loader2
} from "lucide-react";
import { instApiClient } from "../../auth/api/base";
import { academicApi } from "../../academic/api/academicApi";
import { toast } from "react-hot-toast";

interface Student {
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
    date_of_birth?: string;
    status: "ACTIVE" | "SEEDED";
}

interface SectionStat {
    name: string;
    total: number;
    activated: number;
}

export const StudentRegistry = () => {
    // 🚁 Navigation & Workspace Context
    const [subFeature, setSubFeature] = useState<"RECORDS" | "PORTAL">("RECORDS");
    const [viewMode, setViewMode] = useState<"CARDS" | "LIST">("CARDS");
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // 📊 State Hub
    const [students, setStudents] = useState<Student[]>([]);
    const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterProgram, setFilterProgram] = useState("");
    const [filterBranch, setFilterBranch] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "roll" | "cgpa" | "">("");
    const [loading, setLoading] = useState(true);    // true = sections are still loading
    const [sectionsLoaded, setSectionsLoaded] = useState(false);

    // 🛠️ Control Center
    const [showUpload, setShowUpload] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [viewingProfile, setViewingProfile] = useState<Student | null>(null);
    const [collisionInfo, setCollisionInfo] = useState<{ student: any; originalData: any } | null>(null);

    // 🏎️ Ingestion Engine States
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitPhase, setCommitPhase] = useState("");
    const [commitProgress, setCommitProgress] = useState(0);

    // 🧙‍♂️ Record Wizard (Manual Form)
    const [formStudents, setFormStudents] = useState<Partial<Student>[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);

    // 🧬 Governance Registry (Academic Infrastructure)
    const [registryDepts, setRegistryDepts] = useState<any[]>([]);
    const [registryProgs, setRegistryProgs] = useState<any[]>([]);
    const [registrySections, setRegistrySections] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 🔄 Sync Effects
    useEffect(() => {
        fetchSections();
        fetchAcademicRegistry();
        if (viewMode === "LIST" || activeSection) {
            fetchStudents();
        }
    }, [subFeature, viewMode, activeSection]);

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
            console.warn("Soft failure fetching academic registry for selectors", err);
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
            setLoading(false);      // ✅ ALWAYS clear loading after sections resolve
            setSectionsLoaded(true);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            let url = "students/";
            if (activeSection) url += `?section=${activeSection}`;
            const res = await instApiClient.get(url);
            if (res.data.success) {
                setStudents(res.data.data);
            }
        } catch (err) {
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    // 🧭 Navigation Handlers
    const switchSubFeature = (feature: "RECORDS" | "PORTAL") => {
        setSubFeature(feature);
        setActiveSection(null); // Reset drill-down
        setViewMode("CARDS"); // Reset to high-level view
    };

    const showAllStudents = () => {
        setActiveSection(null);
        setViewMode("LIST");
    };

    // 📄 Template Engine
    const downloadTemplate = () => {
        const headers = ["roll_number", "full_name", "program", "branch", "batch_year", "current_semester", "personal_email", "official_email", "phone_number", "date_of_birth", "admission_year", "passout_year", "cgpa", "10th_percent", "12th_percent", "active_backlogs"];
        const rows = [
            headers.join(","),
            ["2024-CSE-001", "P. Manohar Reddy", "B.Tech", "CSE", "2024", "1", "personal@gmail.com", "manohar@university.edu", "9876543210", "2005-06-15", "2024", "2028", "9.50", "95.5", "98.2", "0"].join(","),
        ];
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "AUIP_Student_Import_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Import template downloaded — 16 fields included");
    };

    // 📤 Bulk Operations
    const [isValidating, setIsValidating] = useState(false);
    const [valProgress, setValProgress] = useState(0);
    const [valMessage, setValMessage] = useState("");

    const handleFileSelect = async (e: any) => {
        const file = e.target?.files?.[0] || e;
        if (!file) return;

        setIsValidating(true);
        setValProgress(0);
        setValMessage("Initializing Data Scanner...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("preview", "true");

        try {
            const intervals = setInterval(() => {
                setValProgress(p => {
                    if (p > 50) setValMessage("Analyzing Academic Collisions...");
                    else setValMessage("Parsing Identity Vectors...");
                    return p < 90 ? p + 15 : p;
                });
            }, 300);

            const res = await instApiClient.post("bulk-seed-students/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            clearInterval(intervals);

            if (res.data.success) {
                setValProgress(100);
                setValMessage("Validation Matrix Complete");
                setTimeout(() => {
                    setIsValidating(false);
                    setPreviewData({ ...res.data.data, file });
                }, 800);
            }
        } catch (err) {
            setIsValidating(false);
            toast.error("Process error. Verify CSV column headers.");
        }
    };

    const commitGridData = async (updatedStudents: any[]) => {
        setIsCommitting(true);
        setCommitProgress(0);
        setCommitPhase("Allocating Cloud Resources...");

        try {
            const iv = setInterval(() => {
                setCommitProgress(p => {
                    if (p > 60) setCommitPhase("Writing Registry Blocks...");
                    else setCommitPhase("Synchronizing Identity Pool...");
                    return p < 95 ? p + 8 : p;
                });
            }, 200);

            await instApiClient.post("bulk-seed-students/", { preview: false, students: updatedStudents });

            clearInterval(iv);
            setCommitProgress(100);
            setCommitPhase("Migration Complete");

            setTimeout(() => {
                setIsCommitting(false);
                setShowUpload(false);
                setPreviewData(null);
                toast.success("Registry synchronization successful.");
                fetchStudents();
                fetchSections();
            }, 800);

        } catch (err) {
            setIsCommitting(false);
            toast.error("Migration failed. Connection dropped or data corrupt.");
        }
    };

    const handleInviteSection = async (sectionName: string) => {
        const loadingToast = toast.loading(`Broadcasting to Section ${sectionName}...`);
        try {
            const res = await instApiClient.post("students/bulk_invite/", { section: sectionName });
            toast.success(res.data.message || "Signal dispatched", { id: loadingToast });
            fetchSections();
            if (activeSection === sectionName) fetchStudents();
        } catch (err) {
            toast.error("Transmission failed", { id: loadingToast });
        }
    };

    const handleBulkInviteSelected = async () => {
        if (selectedStudents.length === 0) return;
        const loadingToast = toast.loading(`Dispatching to ${selectedStudents.length} student(s)...`);
        try {
            const res = await instApiClient.post("students/bulk_invite/", { roll_numbers: selectedStudents });
            toast.success(res.data?.message || "Activation signals sent", { id: loadingToast });
            setSelectedStudents([]);
            fetchStudents();
            fetchSections();
        } catch (err: any) {
            const msg = err.response?.data?.message || "Sync interrupted";
            toast.error(msg, { id: loadingToast });
        }
    };

    // Single-student direct invite (no race condition with setState)
    const handleSingleInvite = async (rollNumber: string) => {
        const loadingToast = toast.loading(`Sending activation link...`);
        try {
            const res = await instApiClient.post("students/bulk_invite/", { roll_numbers: [rollNumber] });
            toast.success(res.data?.message || "Activation link sent", { id: loadingToast });
            fetchStudents();
            fetchSections();
        } catch (err: any) {
            const msg = err.response?.data?.message || "Failed to send link";
            toast.error(msg, { id: loadingToast });
        }
    };

    // ➕ Manual Record Logic
    const openAddModal = () => {
        setIsEditMode(false);
        setFormStudents([{
            roll_number: "",
            full_name: "",
            official_email: "",
            personal_email: "",
            phone_number: "",
            section: activeSection || "",
            batch_year: new Date().getFullYear(),
            admission_year: new Date().getFullYear(),
            passout_year: new Date().getFullYear() + 4,
            program: "B.Tech",
            branch: "CSE",
            current_semester: 1,
            cgpa: "",
            date_of_birth: "",
        }]);
        setCurrentFormIndex(0);
        setShowFormModal(true);
    };

    const openEditModal = (student: Student) => {
        setIsEditMode(true);
        setFormStudents([student]);
        setCurrentFormIndex(0);
        setShowFormModal(true);
    };

    const updateFormStudent = (field: keyof Student, value: any) => {
        const updated = [...formStudents];
        updated[currentFormIndex] = { ...updated[currentFormIndex], [field]: value };
        setFormStudents(updated);
    };

    const handleManualSubmit = async () => {
        const loadingToast = toast.loading("Updating records...");
        try {
            for (const s of formStudents) {
                if (isEditMode) {
                    await instApiClient.patch(`students/${s.id}/`, s);
                } else {
                    await instApiClient.post("students/", s);
                }
            }
            toast.success("Registry update successful", { id: loadingToast });
            setShowFormModal(false);
            fetchStudents();
            fetchSections();
        } catch (err: any) {
            if (err.response?.data?.code === "DUPLICATE_IDENTITY") {
                toast.dismiss(loadingToast);
                setCollisionInfo({
                    student: err.response.data.student,
                    originalData: formStudents[currentFormIndex]
                });
                return;
            }
            toast.error(err.response?.data?.message || "Unique ID conflict detected", { id: loadingToast });
        }
    };

    const resolveCollision = async () => {
        if (!collisionInfo) return;
        const loadingToast = toast.loading("Merging identity records...");
        try {
            // Convert to PATCH
            await instApiClient.patch(`students/${collisionInfo.student.id}/`, collisionInfo.originalData);
            toast.success("Identity merged successfully", { id: loadingToast });
            setCollisionInfo(null);
            setShowFormModal(false);
            fetchStudents();
            fetchSections();
        } catch (err) {
            toast.error("Merge cluster failure", { id: loadingToast });
        }
    };

    const filteredStudents = students.filter((s: Student) => {
        const matchesSearch = (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.official_email?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesProgram = filterProgram ? s.program === filterProgram : true;
        const matchesBranch = filterBranch ? s.branch === filterBranch : true;
        const matchesYear = filterYear ? (s.batch_year || s.admission_year)?.toString() === filterYear : true;

        return matchesSearch && matchesProgram && matchesBranch && matchesYear;
    }).sort((a, b) => {
        if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
        if (sortBy === "roll") return (a.roll_number || "").localeCompare(b.roll_number || "");
        if (sortBy === "cgpa") return (Number(b.cgpa) || 0) - (Number(a.cgpa) || 0); // descending
        return 0; // default order
    });

    const totalStats = sectionStats.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        activated: acc.activated + curr.activated
    }), { total: 0, activated: 0 });

    // ✅ Only show empty state after sections have been fetched (not while loading)
    const isEmpty = sectionsLoaded && !loading && sectionStats.length === 0 && students.length === 0;

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center p-20 py-32 glass rounded-[3.5rem] border-white/5 bg-white/[0.01] animate-in fade-in zoom-in-95 duration-1000 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="w-32 h-32 bg-primary/10 rounded-[3rem] flex items-center justify-center text-primary mb-10 shadow-3xl shadow-primary/20 relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-[3rem] animate-ping opacity-20" />
                <Users className="w-12 h-12 relative group-hover:scale-110 transition-all" />
            </div>
            <div className="text-center space-y-4 max-w-md">
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Student Registry <span className="text-primary not-italic">Empty</span></h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">
                    Proprietary digital directory initialized.<br />
                    No synchronization detected for this institution.
                </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 mt-14">
                <button
                    onClick={() => setShowUpload(true)}
                    className="glass px-10 py-4 rounded-2xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 group"
                >
                    <Upload className="w-4 h-4 text-primary group-hover:-translate-y-1 transition-transform" />
                    Precision Import (CSV)
                </button>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">OR</div>
                <button
                    onClick={openAddModal}
                    className="bg-primary px-10 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:scale-110 transition-all flex items-center gap-3"
                >
                    <Plus className="w-4 h-4" /> Add Manual Entry
                </button>
            </div>
        </div>
    );

    // Show spinner only while sections haven't loaded yet — NOT when they loaded as []
    if (loading || !sectionsLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Synchronizing Student Cloud...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* 👑 Workspace Control */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Student <span className="text-primary not-italic tracking-normal">Cloud</span></h1>
                        <div className="flex items-center gap-5 mt-1">
                            <button
                                onClick={() => switchSubFeature("RECORDS")}
                                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${subFeature === "RECORDS" ? "text-primary bg-primary/5 px-3 py-1 rounded-lg" : "text-muted-foreground hover:text-white"}`}
                            >
                                <BookOpen className="w-3 h-3" /> Records
                            </button>
                            <button
                                onClick={() => switchSubFeature("PORTAL")}
                                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${subFeature === "PORTAL" ? "text-primary bg-primary/5 px-3 py-1 rounded-lg" : "text-muted-foreground hover:text-white"}`}
                            >
                                <Globe className="w-3 h-3" /> Portal Access
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="glass px-5 py-2.5 rounded-xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
                    >
                        <Upload className="w-4 h-4 text-primary" /> Import List
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-primary px-6 py-2.5 rounded-xl text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Record
                    </button>
                </div>
            </div>

            {/* 📊 Intelligence Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4 group hover:bg-white/[0.02] transition-all">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Headcount</p>
                        <p className={`text-xl font-black ${isEmpty ? 'text-white/20' : 'text-white'}`}>{totalStats.total}</p>
                    </div>
                </div>
                <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4 group hover:bg-white/[0.02] transition-all">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                        <Zap className={`w-5 h-5 ${totalStats.total > 0 ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Pulse Rate</p>
                        <p className={`text-xl font-black ${isEmpty ? 'text-white/20' : 'text-white'}`}>
                            {totalStats.total > 0 ? Math.round((totalStats.activated / totalStats.total) * 100) : 0}%
                        </p>
                    </div>
                </div>
                <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4 group hover:bg-white/[0.02] transition-all">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Unactivated</p>
                        <p className={`text-xl font-black ${isEmpty ? 'text-white/20' : 'text-white'}`}>{totalStats.total - totalStats.activated}</p>
                    </div>
                </div>
                <div className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4 group hover:bg-white/[0.02] transition-all">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Cohorts</p>
                        <p className={`text-xl font-black ${isEmpty ? 'text-white/20' : 'text-white'}`}>{sectionStats.length}</p>
                    </div>
                </div>
            </div>

            {isEmpty ? (
                <EmptyState />
            ) : (
                <>
                    {/* 🛠️ Dynamic Workspace */}
                    <div className="space-y-6">
                        {/* Mode Selector & Filter */}
                        {!activeSection && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 w-fit">
                                        <button
                                            onClick={() => setViewMode("CARDS")}
                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === "CARDS" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"}`}
                                        >
                                            <LayoutGrid className="w-3 h-3" /> Section View
                                        </button>
                                        <button
                                            onClick={showAllStudents}
                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === "LIST" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"}`}
                                        >
                                            <List className="w-3 h-3" /> Global List
                                        </button>
                                    </div>
                                    <div className="glass px-5 py-2.5 rounded-xl border-white/5 flex items-center gap-3 w-64 shadow-inner">
                                        <Search className="w-4 h-4 text-primary" />
                                        <input type="text" placeholder="Identity Search..." className="bg-transparent border-none outline-none text-white text-[11px] font-bold flex-1" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full bg-white/[0.02] p-3 rounded-2xl border border-white/5 shadow-inner">
                                    <select title="Filter by Program" className="glass bg-transparent px-4 py-2.5 rounded-xl border-white/5 text-white text-[10px] uppercase font-black outline-none flex-1 max-w-[150px]" value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
                                        <option value="" className="text-black">All Programs</option>
                                        {Array.from(new Set(students.map(s => s.program).filter(Boolean))).map(p => (
                                            <option key={p} value={String(p)} className="text-black">{p}</option>
                                        ))}
                                    </select>
                                    <select title="Filter by Branch" className="glass bg-transparent px-4 py-2.5 rounded-xl border-white/5 text-white text-[10px] uppercase font-black outline-none flex-1 max-w-[150px]" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                                        <option value="" className="text-black">All Branches</option>
                                        {Array.from(new Set(students.map(s => s.branch).filter(Boolean))).map(b => (
                                            <option key={b} value={String(b)} className="text-black">{b}</option>
                                        ))}
                                    </select>
                                    <select title="Filter by Year" className="glass bg-transparent px-4 py-2.5 rounded-xl border-white/5 text-white text-[10px] uppercase font-black outline-none flex-1 max-w-[150px]" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                                        <option value="" className="text-black">All Years</option>
                                        {Array.from(new Set(students.map(s => s.batch_year || s.admission_year).filter(Boolean))).map(y => (
                                            <option key={y} value={String(y)} className="text-black">{y}</option>
                                        ))}
                                    </select>
                                    <select title="Sort By" className="glass bg-transparent px-4 py-2.5 rounded-xl border-white/5 text-white text-[10px] uppercase font-black outline-none flex-1 max-w-[150px]" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                                        <option value="" className="text-black">Sort: Default</option>
                                        <option value="name" className="text-black">Sort: Name (A-Z)</option>
                                        <option value="roll" className="text-black">Sort: Roll No.</option>
                                        <option value="cgpa" className="text-black">Sort: CGPA (High-Low)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Breadcrumb Navigation */}
                        {activeSection && (
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-4 transition-all">
                                        <ChevronLeft className="w-4 h-4" /> All Sections
                                    </button>
                                    <div className="w-px h-6 bg-white/10" />
                                    <button onClick={showAllStudents} className="text-[10px] font-black text-muted-foreground hover:text-white uppercase tracking-widest transition-all">
                                        Global List
                                    </button>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Drill-down</p>
                                    <p className="text-xl font-black text-white italic truncate">Section {activeSection}</p>
                                </div>
                            </div>
                        )}

                        {/* 1. Global / Drill-down List */}
                        {(viewMode === "LIST" || activeSection) && (
                            <div className="glass rounded-[2rem] border-white/5 overflow-hidden shadow-2xl">
                                <table className="w-full text-left">
                                    <thead className="bg-white/[0.03]">
                                        <tr>
                                            {subFeature === "PORTAL" && (
                                                <th className="p-6 w-10 text-center">
                                                    <input type="checkbox" className="rounded-md" onChange={(e) => setSelectedStudents(e.target.checked ? filteredStudents.map(s => s.roll_number) : [])} />
                                                </th>
                                            )}
                                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {subFeature === "RECORDS" ? "Student Identity" : "Portal Access"}
                                            </th>
                                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Metadata</th>
                                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-white/[0.01]">
                                        {loading ? (
                                            Array(6).fill(0).map((_, i) => (
                                                <tr key={i}>
                                                    {subFeature === "PORTAL" && (
                                                        <td className="p-6 w-10 text-center">
                                                            <div className="h-4 w-4 bg-white/5 rounded-md animate-pulse" />
                                                        </td>
                                                    )}
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl glass border-white/10 bg-white/5 animate-pulse" />
                                                            <div className="space-y-2">
                                                                <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                                                                <div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex gap-2">
                                                            <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
                                                            <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="h-8 w-16 bg-white/10 rounded-lg ml-auto animate-pulse" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : filteredStudents.map(s => (
                                            <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                                                {subFeature === "PORTAL" && (
                                                    <td className="p-6 text-center">
                                                        <input type="checkbox" disabled={s.status === 'ACTIVE'} checked={selectedStudents.includes(s.roll_number)} onChange={() => setSelectedStudents(prev => prev.includes(s.roll_number) ? prev.filter(r => r !== s.roll_number) : [...prev, s.roll_number])} className="rounded-md" />
                                                    </td>
                                                )}
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl glass border-white/10 flex items-center justify-center text-[10px] font-black text-primary bg-primary/5">
                                                            {s.roll_number.slice(-3)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white tracking-tight">{subFeature === "RECORDS" ? s.full_name : s.official_email}</p>
                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.roll_number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {subFeature === "RECORDS" ? (
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                                            <span className="glass px-2 py-0.5 rounded-md border-white/5">{s.branch}</span>
                                                            <span className="text-primary font-black uppercase text-[9px] tracking-widest">Sec {s.section}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black tracking-widest ${s.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-white/5 text-muted-foreground'}`}>
                                                            {s.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-right space-x-2">
                                                    {subFeature === "RECORDS" ? (
                                                        <>
                                                            <button onClick={() => setViewingProfile(s)} className="px-3 py-1.5 glass rounded-lg border-white/10 text-[9px] font-black uppercase text-muted-foreground hover:text-white transition-all shadow-lg">Profile</button>
                                                            <button onClick={() => openEditModal(s)} className="px-4 py-1.5 bg-primary/10 rounded-lg border border-primary/20 text-[9px] font-black uppercase text-primary hover:bg-primary hover:text-white transition-all">Update</button>
                                                        </>
                                                    ) : (
                                                        s.status !== 'ACTIVE' && (
                                                            <button
                                                                onClick={() => handleSingleInvite(s.roll_number)}
                                                                title="Send Activation Link"
                                                                className="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {subFeature === "PORTAL" && selectedStudents.length > 0 && (
                                    <div className="p-6 bg-primary/5 border-t border-primary/20 flex justify-between items-center animate-in slide-in-from-bottom-2">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Targeting {selectedStudents.length} Students</p>
                                        <button onClick={handleBulkInviteSelected} className="bg-primary px-8 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl">Automate Dispatch</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. Section Card View */}
                        {viewMode === "CARDS" && !activeSection && (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {sectionStats.map((s, i) => (
                                    <div
                                        key={i}
                                        className="glass p-8 rounded-[2rem] border-white/5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group relative flex flex-col justify-between"
                                    >
                                        <div onClick={() => setActiveSection(s.name)} className="cursor-pointer">
                                            <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Assigned Cohort</h4>
                                            <p className="text-2xl font-black text-white italic tracking-tighter mb-6">{s.name || "UNASSIGNED"}</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                                    <span>Pulse Rate</span>
                                                    <span className="text-primary">{Math.round((s.activated / s.total) * 100)}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary shadow-sm shadow-primary/50" style={{ width: `${(s.activated / s.total) * 100}%` }} />
                                                </div>
                                                <p className="text-[10px] font-black text-white/50 tracking-widest">{s.total} HEADCOUNT</p>
                                            </div>
                                        </div>
                                        {subFeature === "PORTAL" && s.activated < s.total && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleInviteSection(s.name); }}
                                                className="mt-6 w-full py-3 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Dispatch to Section
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* 📤 Import Console Modal */}
            {showUpload && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-[3rem] border border-white/10 shadow-3xl">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Registry <span className="text-primary not-italic">Ingestion</span></h2>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Data Migration Console</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowUpload(false); setPreviewData(null); }} className="w-12 h-12 glass rounded-2xl border-white/10 flex items-center justify-center">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                            {(isValidating || isCommitting) ? (
                                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="w-40 h-40 relative mb-10 group">
                                        <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.5)]" style={{ animationDuration: "1.5s" }} />
                                        <div className="absolute inset-4 border-b-2 border-blue-400 rounded-full animate-[spin_2s_linear_reverse]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-4xl font-black text-white tabular-nums">{isValidating ? valProgress : commitProgress}<span className="text-xl text-primary">%</span></span>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white italic tracking-widest uppercase">
                                        {isValidating ? "Quantum Analysis" : "Cloud Transmission"}
                                    </h3>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mt-4 animate-pulse bg-primary/10 px-6 py-2 rounded-full border border-primary/20">
                                        {isValidating ? valMessage : commitPhase}
                                    </p>
                                </div>
                            ) : !previewData ? (
                                <div className="space-y-10 py-10">
                                    <div onClick={() => !isValidating && fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-[2.5rem] p-24 flex flex-col items-center text-center group cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all bg-white/[0.01]">
                                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 group-hover:text-primary transition-all mb-8 shadow-2xl group-hover:scale-110">
                                            <FileText className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white italic">Drop Import List</h3>
                                        <p className="text-muted-foreground text-[10px] mt-4 max-w-sm uppercase font-black tracking-widest leading-relaxed">
                                            Upload official CSV source. Existing records will be precision-matched; NEW IDs will be auto-seeded.
                                        </p>
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
                                    </div>
                                    <div className="text-center">
                                        <button onClick={downloadTemplate} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 mx-auto hover:opacity-80 transition-all bg-primary/5 px-6 py-3 rounded-xl border border-primary/20 hover:bg-primary/10">
                                            <Download className="w-4 h-4" /> Download Import Schema
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
                                    {/* Health Diagnostics Report */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="glass p-6 rounded-2xl border-white/5 bg-white/[0.02] flex flex-col items-center text-center">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Total Scanned</p>
                                            <p className="text-3xl font-black text-white">{previewData.summary.new_count + previewData.summary.update_count + previewData.summary.error_count}</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-center text-center">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">New Identities</p>
                                            <p className="text-3xl font-black text-white">{previewData.summary.new_count}</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl border-blue-500/20 bg-blue-500/5 flex flex-col items-center text-center">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Precision Updates</p>
                                            <p className="text-3xl font-black text-white">{previewData.summary.update_count}</p>
                                        </div>
                                        <div className="glass p-6 rounded-2xl border-red-500/20 bg-red-500/5 flex flex-col items-center text-center relative overflow-hidden">
                                            {previewData.summary.error_count > 0 && <div className="absolute inset-0 bg-red-500/10 animate-pulse" />}
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2 relative z-10">Critical Errors</p>
                                            <p className="text-3xl font-black text-white relative z-10">{previewData.summary.error_count}</p>
                                        </div>
                                    </div>

                                    {/* DataGrid Viewer & Editor */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-5 h-5 text-primary" /> DataGrid Inspector
                                            </h4>
                                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground glass px-3 py-1 rounded border-white/5">Read-Only View</span>
                                        </div>

                                        <div className="glass rounded-[1.5rem] border-white/5 overflow-x-auto shadow-inner max-h-[400px]">
                                            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                                                <thead className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md">
                                                    <tr>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Status</th>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Roll / ID</th>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Full Name</th>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Program</th>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Branch</th>
                                                        <th className="p-4 font-black uppercase text-muted-foreground border-b border-white/5">Official Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {/* Render Errors First */}
                                                    {previewData.errors.map((e: any, i: number) => (
                                                        <tr key={`err-${i}`} className="bg-red-500/10 hover:bg-red-500/20 transition-all">
                                                            <td className="p-4 font-black text-red-400">ERROR</td>
                                                            <td className="p-4 text-white font-bold">{e.roll}</td>
                                                            <td className="p-4 text-red-300 col-span-4" colSpan={4}>{e.error}</td>
                                                        </tr>
                                                    ))}
                                                    {/* Render Updates */}
                                                    {previewData.updates.map((u: any, i: number) => (
                                                        <tr key={`upd-${i}`} className="group hover:bg-white/[0.04] transition-all">
                                                            <td className="p-4 font-black text-blue-400 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> UPDATE</td>
                                                            <td className="p-4 text-white font-bold">{u.roll_number}</td>
                                                            <td className="p-4 text-gray-300">{u.full_name}</td>
                                                            <td colSpan={3} className="p-4 text-muted-foreground text-[9px] uppercase tracking-widest">
                                                                {Object.keys(u.diff).length} Attributes Modified
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Render New (Using raw data from backend patch) */}
                                                    {previewData.new_students.map((s: any, i: number) => (
                                                        <tr key={`new-${i}`} className="group hover:bg-white/[0.04] transition-all">
                                                            <td className="p-4 font-black text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> NEW</td>
                                                            <td className="p-4 text-white font-bold">{s.roll_number}</td>
                                                            <td className="p-4 text-gray-300">{s.full_name}</td>
                                                            <td className="p-4 text-gray-400">{s.raw?.program || "---"}</td>
                                                            <td className="p-4 text-gray-400">{s.raw?.branch || "---"}</td>
                                                            <td className="p-4 text-gray-400">{s.raw?.official_email || "---"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-8 glass rounded-[2.5rem] border-primary/20 bg-primary/[0.03] shadow-lg">
                                        <div className="flex items-center gap-5 text-muted-foreground">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-xl shadow-primary/30">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white italic tracking-tighter uppercase">Finalize Ingestion</p>
                                                <p className="text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-60">
                                                    {previewData.summary.error_count > 0 ? "Resolve critical errors before transmitting." : "Matrix is clear. Ready for cloud allocation."}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setPreviewData(null)} className="px-8 py-3.5 glass border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all rounded-xl">Discard</button>
                                            <button
                                                disabled={previewData.summary.error_count > 0}
                                                onClick={() => {
                                                    // Map the frontend state into an array to send back
                                                    commitGridData(previewData.valid_records);
                                                }}
                                                className="px-12 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-blue-500 hover:scale-105 transition-all disabled:opacity-20 disabled:scale-100 disabled:shadow-none"
                                            >
                                                Commit to Cloud
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🧙 Premium Form: Add / Edit Record — All 14 Fields */}
            {showFormModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl">
                        {/* Header */}
                        <div className="px-10 py-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-white italic tracking-tight uppercase">
                                        {isEditMode ? "Edit" : "Register"} <span className="text-primary not-italic">Student</span>
                                    </h1>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                                        {isEditMode ? "Update identity record" : `Entry ${currentFormIndex + 1} of ${formStudents.length}`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowFormModal(false)} className="w-10 h-10 glass rounded-xl border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/50 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                            {/* 🪪 Identity Section */}
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Identity
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Roll / ID <span className="text-red-400">*</span></label>
                                        <input placeholder="e.g. 2024-CSE-001" type="text" disabled={isEditMode}
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10 disabled:opacity-40"
                                            value={formStudents[currentFormIndex]?.roll_number || ''} onChange={(e) => updateFormStudent('roll_number', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Full Name <span className="text-red-400">*</span></label>
                                        <input placeholder="Legal name" type="text"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                            value={formStudents[currentFormIndex]?.full_name || ''} onChange={(e) => updateFormStudent('full_name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Date of Birth</label>
                                        <input type="date"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.date_of_birth || ''} onChange={(e) => updateFormStudent('date_of_birth', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Phone Number</label>
                                        <input placeholder="10-digit mobile" type="tel"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                            value={formStudents[currentFormIndex]?.phone_number || ''} onChange={(e) => updateFormStudent('phone_number', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* 📧 Contact Section */}
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <Mail className="w-3 h-3" /> Contact
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Official Email <span className="text-red-400">*</span></label>
                                        <input placeholder="name@university.edu" type="email"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                            value={formStudents[currentFormIndex]?.official_email || ''} onChange={(e) => updateFormStudent('official_email', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Personal Email</label>
                                        <input placeholder="personal@gmail.com" type="email"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                                            value={formStudents[currentFormIndex]?.personal_email || ''} onChange={(e) => updateFormStudent('personal_email', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* 🎓 Academic Section */}
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-3 h-3" /> Academic
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Program</label>
                                        <select className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all appearance-none"
                                            value={formStudents[currentFormIndex]?.program || ''} onChange={(e) => updateFormStudent('program', e.target.value)}>
                                            <option value="" className="bg-black">Select Program</option>
                                            {registryProgs.map(p => <option key={p.id} value={p.code} className="bg-black">{p.name} ({p.code})</option>)}
                                            {/* Fallback */}
                                            {registryProgs.length === 0 && ["B.Tech", "M.Tech", "MBA", "BCA", "MCA"].map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Branch / Dept</label>
                                        <select className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all appearance-none"
                                            value={formStudents[currentFormIndex]?.branch || ''} onChange={(e) => updateFormStudent('branch', e.target.value)}>
                                            <option value="" className="bg-black">Select Department</option>
                                            {registryDepts.map(d => <option key={d.id} value={d.code} className="bg-black">{d.name} ({d.code})</option>)}
                                            {/* Fallback */}
                                            {registryDepts.length === 0 && ["CSE", "ECE", "ME", "EEE", "IT"].map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Section</label>
                                        <select className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all appearance-none"
                                            value={formStudents[currentFormIndex]?.section || ''} onChange={(e) => updateFormStudent('section', e.target.value)}>
                                            <option value="" className="bg-black">Select Section</option>
                                            {registrySections
                                                .filter(s => s.program_code === formStudents[currentFormIndex]?.program || !formStudents[currentFormIndex]?.program)
                                                .map(s => <option key={s.id} value={s.name} className="bg-black">Section {s.name} (Sem {s.semester_number})</option>)}
                                            {/* Manual Fallback if registry is blank */}
                                            {["A", "B", "C", "D"].map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Current Semester</label>
                                        <select className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.current_semester || 1} onChange={(e) => updateFormStudent('current_semester', parseInt(e.target.value))}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Semester {n}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Batch Year</label>
                                        <input type="number" placeholder="2024"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.batch_year || ''} onChange={(e) => updateFormStudent('batch_year', parseInt(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Admission Year</label>
                                        <input type="number" placeholder="2024"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.admission_year || ''} onChange={(e) => updateFormStudent('admission_year', parseInt(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Expected Passout</label>
                                        <input type="number" placeholder="2028"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.passout_year || ''} onChange={(e) => updateFormStudent('passout_year', parseInt(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">CGPA</label>
                                        <input type="number" step="0.01" min="0" max="10" placeholder="0.00 – 10.00"
                                            className="w-full glass bg-white/5 border-white/10 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            value={formStudents[currentFormIndex]?.cgpa || ''} onChange={(e) => updateFormStudent('cgpa', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between flex-shrink-0">
                            {!isEditMode ? (
                                <button
                                    onClick={() => {
                                        setFormStudents([...formStudents, { roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1 }]);
                                        setCurrentFormIndex(formStudents.length);
                                    }}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase text-primary hover:text-white transition-all group"
                                >
                                    <div className="w-8 h-8 glass border-primary/20 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all"><Plus className="w-4 h-4" /></div>
                                    Add Sequential
                                </button>
                            ) : <div />}
                            <div className="flex items-center gap-3">
                                {formStudents.length > 1 && (
                                    <div className="flex glass p-1 rounded-xl border-white/10">
                                        <button disabled={currentFormIndex === 0} onClick={() => setCurrentFormIndex(currentFormIndex - 1)} className="p-1.5 disabled:opacity-20 text-white"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="px-3 text-[10px] font-black text-white/50 self-center">{currentFormIndex + 1}/{formStudents.length}</span>
                                        <button disabled={currentFormIndex === formStudents.length - 1} onClick={() => setCurrentFormIndex(currentFormIndex + 1)} className="p-1.5 disabled:opacity-20 text-white"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                )}
                                <button onClick={() => setShowFormModal(false)} className="px-6 py-3 glass rounded-xl text-white/50 font-black text-[9px] uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                                <button onClick={handleManualSubmit} className="bg-primary px-8 py-3 rounded-xl text-white font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> {isEditMode ? 'Save Changes' : 'Commit Record'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* 👤 View Profile Modal */}
            {viewingProfile && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/97 backdrop-blur-3xl animate-in zoom-in-95 duration-300">
                    <div className="glass w-full max-w-2xl overflow-hidden flex flex-col rounded-[3.5rem] border border-white/10 shadow-3xl">
                        <div className="p-12 relative overflow-hidden flex flex-col items-center text-center">
                            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/20 to-transparent opacity-50" />
                            <button onClick={() => setViewingProfile(null)} className="absolute top-10 right-10 w-12 h-12 glass rounded-2xl border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="relative z-10 space-y-6 flex flex-col items-center mt-4">
                                <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                                    <User className="w-12 h-12" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 px-4 py-1 glass rounded-full inline-block border-primary/20">{viewingProfile.roll_number}</p>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter">{viewingProfile.full_name}</h2>
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-50">{viewingProfile.official_email}</p>
                                    {viewingProfile.personal_email && <p className="text-white/30 text-xs mt-1">{viewingProfile.personal_email}</p>}
                                    {viewingProfile.phone_number && <p className="text-white/30 text-xs mt-0.5">📞 {viewingProfile.phone_number}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="px-12 pb-8 bg-white/[0.01] grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Program / Branch</p>
                                    <div className="flex items-center gap-3">
                                        <GraduationCap className="w-4 h-4 text-primary" />
                                        <p className="text-sm font-bold text-white uppercase">{viewingProfile.program || "B.Tech"} — {viewingProfile.branch}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Section · Semester</p>
                                    <div className="flex items-center gap-3">
                                        <LayoutGrid className="w-4 h-4 text-primary" />
                                        <p className="text-sm font-bold text-white uppercase">Section {viewingProfile.section} · Sem {viewingProfile.current_semester}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Batch / Passout</p>
                                    <p className="text-sm font-bold text-white">{viewingProfile.batch_year} → {viewingProfile.passout_year || "—"}</p>
                                </div>
                            </div>
                            <div className="space-y-5 border-l border-white/5 pl-8">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Account Status</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${viewingProfile.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                        <p className="text-sm font-black text-white">{viewingProfile.status}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">CGPA</p>
                                    <div className="flex items-center gap-3">
                                        <BarChart2 className="w-4 h-4 text-amber-400" />
                                        <p className="text-sm font-black text-white tracking-widest">{viewingProfile.cgpa || "0.00"}</p>
                                    </div>
                                </div>
                                {viewingProfile.date_of_birth && (
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Date of Birth</p>
                                        <p className="text-sm font-bold text-white">{viewingProfile.date_of_birth}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium italic opacity-50">
                                <Lock className="w-3 h-3" /> Secure Institutional Identity
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setViewingProfile(null); openEditModal(viewingProfile); }} className="px-6 py-3 bg-primary/10 text-primary font-black uppercase text-[9px] tracking-widest rounded-xl border border-primary/20 hover:bg-primary transition-all hover:text-white">Edit Profile</button>
                                <button onClick={() => setViewingProfile(null)} className="px-6 py-3 glass text-white font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border-white/10">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚨 Identity Collision Modal */}
            {collisionInfo && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-md overflow-hidden flex flex-col rounded-[2.5rem] border border-red-500/30 shadow-3xl">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto animate-pulse">
                                <Activity className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white italic">Identity Conflict Detected</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-2 leading-relaxed">
                                    The roll number <span className="text-white font-bold">{collisionInfo.student.roll_number}</span> is already mapped to <span className="text-white font-bold">{collisionInfo.student.full_name}</span>.
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5 space-y-3">
                            <button onClick={resolveCollision} className="w-full bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">
                                Update Existing Identity
                            </button>
                            <button onClick={() => setCollisionInfo(null)} className="w-full bg-white/5 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                Cancel &amp; Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 🏎️ Registry Transmission Modal (Progress Overlay) */}
            {isCommitting && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-black/90 backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
                    <div className="max-w-md w-full space-y-8 text-center">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                            <div className="relative w-full h-full glass rounded-full flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20">
                                <Activity className="w-12 h-12 text-primary animate-bounce" />
                            </div>
                            <svg className="absolute -inset-2 w-36 h-36 rotate-[-90deg]">
                                <circle
                                    cx="72" cy="72" r="68"
                                    fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.05"
                                />
                                <circle
                                    cx="72" cy="72" r="68"
                                    fill="none" stroke="currentColor" strokeWidth="4"
                                    className="text-primary transition-all duration-500 ease-out"
                                    strokeDasharray={427}
                                    strokeDashoffset={427 - (427 * commitProgress) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                Registry <span className="text-primary not-italic">Transmission</span>
                            </h2>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] font-mono animate-pulse">
                                {commitPhase}
                            </p>
                        </div>

                        <div className="glass p-6 rounded-[2rem] border-white/5 bg-white/[0.02] shadow-inner">
                            <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase mb-3">
                                <span>Optimization Engine</span>
                                <span className="text-white">{commitProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-700 ease-in-out"
                                    style={{ width: `${commitProgress}%` }}
                                />
                            </div>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-4 opacity-40">
                                Strictly synchronizing institutional identity bits...
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistry;
