// ✅ src/features/institution/pages/StudentRegistry.tsx
// Upgraded: Premium loader, real card vs list views, select-all, dispatch UX

import { useState, useMemo } from "react";
import {
    Users, Search, Plus, Upload, List, LayoutGrid, Zap, Activity, Send, RefreshCw,
    BarChart2, ChevronLeft, ChevronRight, CheckSquare, Square, Loader2, CheckCircle2,
    XCircle, ArrowRight, Mail, Shield
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useStudentRegistry, Student } from "../hooks/useStudentRegistry";
import { useBulkOperations } from "../hooks/useBulkOperations";
import { useDispatchSocket } from "../hooks/useDispatchSocket";
import { UploadConsole } from "../components/UploadConsole";
import { StudentProfileDrawer } from "../components/StudentProfileDrawer";
import { ManualEntryModal } from "../components/ManualEntryModal";
import { DispatchProgressModal } from "../components/DispatchProgressModal";
import { instApiClient } from "../../auth/api/base";

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
const SkeletonRow = () => (
    <tr className="border-b border-white/5">
        {[1, 2, 3, 4, 5].map(i => (
            <td key={i} className="px-4 py-4">
                <div className="h-4 bg-white/5 rounded-lg animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            </td>
        ))}
    </tr>
);

const SkeletonCard = () => (
    <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4 animate-pulse">
        <div className="h-3 bg-white/5 rounded-full w-20" />
        <div className="h-6 bg-white/5 rounded-xl w-3/4" />
        <div className="w-full h-1 bg-white/5 rounded-full" />
        <div className="h-3 bg-white/5 rounded-full w-1/2" />
    </div>
);

// ─── Dispatch Result Panel ───────────────────────────────────────────────────
interface DispatchResult {
    invited: string[];
    already_activated: string[];
    not_found: string[];
    failed: { roll: string; error: string }[];
}

const DispatchResultPanel = ({ result, onClose }: { result: DispatchResult; onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="glass w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-3xl p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Dispatch Complete</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Activation Signal Report</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                        <p className="text-2xl font-black text-green-400">{result.invited.length}</p>
                        <p className="text-[9px] font-black text-green-400/60 uppercase tracking-widest">Dispatched</p>
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                        <p className="text-2xl font-black text-white">{result.already_activated.length}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Already Active</p>
                    </div>
                </div>
                {result.not_found.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="text-2xl font-black text-amber-400">{result.not_found.length}</p>
                            <p className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest">Not Found</p>
                        </div>
                    </div>
                )}
                {result.failed.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <div>
                            <p className="text-2xl font-black text-red-400">{result.failed.length}</p>
                            <p className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">Failed</p>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={onClose}
                className="w-full h-14 premium-gradient text-white rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
                Done <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const StudentRegistry = () => {
    const [subFeature, setSubFeature] = useState<"RECORDS" | "PORTAL">("RECORDS");
    const [viewMode, setViewMode] = useState<"CARDS" | "LIST">("CARDS");
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const {
        students, totalCount, page, totalPages, goToPage,
        sectionStats, loading,
        registryDepts, registryProgs, registrySections, refresh
    } = useStudentRegistry(activeSection, viewMode);

    const ws = useDispatchSocket();

    const {
        isValidating, valProgress, valMessage,
        previewData, setPreviewData,
        isCommitting, commitPhase, commitProgress,
        handleFileSelect, commitGridData,
        handleInviteSection, handleBulkInviteSelected
    } = useBulkOperations(refresh);

    // UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showUpload, setShowUpload] = useState(false);
    const [showDispatch, setShowDispatch] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formStudents, setFormStudents] = useState<Partial<Student>[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [viewingProfile, setViewingProfile] = useState<Student | null>(null);
    const [collisionInfo, setCollisionInfo] = useState<{ student: any; originalData: any } | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);

    // Template download
    const downloadTemplate = () => {
        const headers = ["roll_number", "full_name", "program", "branch", "batch_year", "current_semester", "personal_email", "official_email", "phone_number", "date_of_birth", "father_name", "gender", "category", "admission_year", "passout_year", "cgpa", "10th_percent", "12th_percent", "active_backlogs"];
        const rows = [headers.join(","), ["2024-CSE-001", "P. Manohar Reddy", "B.Tech", "CSE", "2024", "1", "personal@gmail.com", "manohar@university.edu", "9876543210", "2005-06-15", "Guardian Name", "Male", "GEN", "2024", "2028", "9.50", "95.5", "98.2", "0"].join(",")];
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.setAttribute("download", "AUIP_Student_Import_Template.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        toast.success("Import template downloaded");
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setFormStudents([{ roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1, gender: "", category: "", father_name: "" }]);
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
        const newForms = [...formStudents];
        newForms[currentFormIndex] = { ...newForms[currentFormIndex], [field]: value };
        setFormStudents(newForms);
    };

    const handleManualSubmit = async () => {
        const student = formStudents[currentFormIndex];
        if (!student.roll_number || !student.full_name || !student.official_email) {
            return toast.error("Identity bits missing (Roll, Name, Email)");
        }
        const loadingToast = toast.loading(isEditMode ? "Synchronizing Updates..." : "Seeding Registry...");
        try {
            const endpoint = isEditMode ? `students/${student.id}/` : "students/";
            const res = await (isEditMode ? instApiClient.put(endpoint, student) : instApiClient.post(endpoint, student));
            if (res.data.success || res.status === 201 || res.status === 200) {
                toast.success(isEditMode ? "Record precision-patched" : "Identity seeded successfully", { id: loadingToast });
                if (currentFormIndex < formStudents.length - 1) {
                    setCurrentFormIndex(prev => prev + 1);
                } else {
                    setShowFormModal(false);
                    refresh();
                }
            }
        } catch (err: any) {
            if (err.response?.data?.code === "DUPLICATE_IDENTITY") {
                toast.dismiss(loadingToast);
                setCollisionInfo({ student: err.response.data.student, originalData: student });
            } else {
                toast.error("Registry rejection. Integrity fault.", { id: loadingToast });
            }
        }
    };

    const resolveCollision = async () => {
        if (!collisionInfo) return;
        const loadingToast = toast.loading("Force-syncing Identity...");
        try {
            await instApiClient.patch(`students/${collisionInfo.student.id}/`, collisionInfo.originalData);
            toast.success("Identity conflict resolved.", { id: loadingToast });
            setCollisionInfo(null);
            setShowFormModal(false);
            refresh();
        } catch (err) {
            toast.error("Repair failed.", { id: loadingToast });
        }
    };

    const handleSingleInvite = (rollNumber: string) => {
        setSelectedStudents([rollNumber]);
        setShowDispatch(true);
        // Slight delay so modal renders first
        setTimeout(() => ws.dispatch([rollNumber]), 50);
    };

    // WebSocket-driven bulk dispatch
    const handleDispatch = () => {
        if (selectedStudents.length === 0) return;
        setShowDispatch(true);
        setTimeout(() => ws.dispatch(selectedStudents), 50);
        setSelectedStudents([]);
    };

    // Filtered data (client-side search on current page)
    const filteredStudents = useMemo(() => students.filter(s =>
        (searchTerm === "" ||
            s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.official_email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "ALL" || s.status === statusFilter)
    ), [students, searchTerm, statusFilter]);

    const seededStudents = useMemo(() => filteredStudents.filter(s => s.status !== "ACTIVE"), [filteredStudents]);

    // Server handles total pagination; we display what the server returned
    const paginatedStudents = filteredStudents; // already one page from server

    const allSeededOnPage = paginatedStudents.filter(s => s.status !== "ACTIVE").map(s => s.roll_number);
    const allSelected = allSeededOnPage.length > 0 && allSeededOnPage.every(r => selectedStudents.includes(r));
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedStudents(prev => prev.filter(r => !allSeededOnPage.includes(r)));
        } else {
            setSelectedStudents(prev => [...new Set([...prev, ...allSeededOnPage])]);
        }
    };

    return (
        <div className="space-y-6 md:space-y-10 p-2 md:p-6 min-h-screen bg-[#050505] text-white selection:bg-primary/30 w-full overflow-x-hidden">
            {/* Header */}
            <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] -z-10 rounded-full pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-8 mb-8">
                    <div className="flex items-center gap-4 md:gap-8 min-w-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-[2rem] border border-primary/20 flex items-center justify-center text-primary shadow-2xl group transition-all shrink-0">
                            <Users className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter uppercase leading-none">
                                Institutional <span className="text-primary not-italic">Hub</span>
                            </h1>
                            <p className="text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                Student Registry <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Real-Time Sync
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="flex glass p-1 rounded-2xl border-white/10 shadow-inner shrink-0 bg-black/40">
                            <button onClick={() => setSubFeature("RECORDS")} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${subFeature === 'RECORDS' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground hover:text-white'}`}>
                                <Users className="w-3.5 h-3.5" /> Records
                            </button>
                            <button onClick={() => setSubFeature("PORTAL")} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${subFeature === 'PORTAL' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground hover:text-white'}`}>
                                <Zap className="w-3.5 h-3.5" /> Activate
                            </button>
                        </div>
                        <div className="flex items-center gap-3 ml-auto md:ml-0">
                            <button onClick={() => setShowUpload(true)} className="bg-white/[0.03] border border-white/10 px-4 md:px-6 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-lg">
                                <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import CSV</span><span className="sm:hidden">Import</span>
                            </button>
                            <button onClick={openAddModal} className="bg-primary px-4 md:px-8 py-2 md:py-3 rounded-xl text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
                                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Student</span><span className="sm:hidden">Add</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search + View Toggle */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 pt-6 border-t border-white/5">
                    <div className="relative flex-1 group min-w-[200px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            placeholder="Search by name, roll number, or email..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/[0.02] transition-all"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex glass p-1 rounded-xl border-white/5 bg-black/40 shrink-0 overflow-hidden">
                            <button onClick={() => setStatusFilter("ALL")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "ALL" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>All</button>
                            <button onClick={() => setStatusFilter("SEEDED")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "SEEDED" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Seeded</button>
                            <button onClick={() => setStatusFilter("ACTIVE")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "ACTIVE" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Active</button>
                        </div>
                        {/* Only show card/list toggle when not in a section */}
                        {!activeSection && (
                            <div className="flex glass p-1 rounded-xl border-white/5 bg-black/40 shrink-0">
                                <button onClick={() => setViewMode("CARDS")} className={`p-3 rounded-lg transition-all ${viewMode === 'CARDS' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`} title="Grid View"><LayoutGrid className="w-5 h-5" /></button>
                                <button onClick={() => setViewMode("LIST")} className={`p-3 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`} title="List View"><List className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                // ── Premium Skeleton Loader ───────────────────────────────────
                (viewMode === "CARDS" && !activeSection) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                        <table className="w-full">
                            <tbody>{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                    {/* ── CARD VIEW (sections grid) ─────────────────────────── */}
                    {viewMode === "CARDS" && !activeSection ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {sectionStats.length === 0 ? (
                                <div className="col-span-full py-20 bg-white/[0.01] rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                                    <Activity className="w-12 h-12 text-white/10" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registry Vault is Empty.</p>
                                </div>
                            ) : sectionStats.map((s, i) => (
                                <div key={i} className="glass p-6 md:p-8 rounded-[2rem] border-white/5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group relative flex flex-col justify-between">
                                    <div onClick={() => setActiveSection(s.name)} className="cursor-pointer">
                                        <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Cohort</h4>
                                        <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter mb-4">{s.name || "UNASSIGNED"}</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                                <span>Activation Rate</span>
                                                <span className="text-primary">{s.total ? Math.round((s.activated / s.total) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary shadow-sm shadow-primary/50 transition-all duration-1000" style={{ width: `${s.total ? (s.activated / s.total) * 100 : 0}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                <span className="font-bold">{s.activated} active</span>
                                                <span>{s.total} total</span>
                                            </div>
                                        </div>
                                    </div>
                                    {subFeature === "PORTAL" && s.activated < s.total && (
                                        <button onClick={e => { e.stopPropagation(); handleInviteSection(s.name); }} className="mt-6 w-full py-3 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                                            <Send className="w-3.5 h-3.5" /> Send Invites to Section
                                        </button>
                                    )}
                                    <button onClick={() => setActiveSection(s.name)} className="mt-3 w-full py-2.5 glass rounded-xl text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2">
                                        <List className="w-3.5 h-3.5" /> View Students
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // ── LIST / TABLE VIEW ──────────────────────────────────
                        <div className="glass rounded-[2rem] md:rounded-[2.5rem] border-white/5 overflow-hidden shadow-3xl bg-white/[0.01] w-full">
                            {/* Section Header */}
                            {activeSection && (
                                <div className="p-6 md:p-8 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveSection(null)} className="w-10 h-10 glass border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-primary">
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Section <span className="text-primary not-italic">{activeSection}</span></h3>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{filteredStudents.length} students · {seededStudents.length} pending activation</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 w-full">
                                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white/[0.02]">
                                            {subFeature === "PORTAL" && (
                                                <th className="px-4 py-4 border-b border-white/5 w-10">
                                                    <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-white transition-colors">
                                                        {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                </th>
                                            )}
                                            <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Identity</th>
                                            <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Cohort</th>
                                            <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Status</th>
                                            <th className="px-4 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {paginatedStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={subFeature === "PORTAL" ? 5 : 4} className="py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <Search className="w-12 h-12 text-white/10" />
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No matching records found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedStudents.map((s) => (
                                            <tr key={s.id} className="group hover:bg-primary/[0.03] transition-all cursor-pointer" onClick={() => setViewingProfile(s)}>
                                                {subFeature === "PORTAL" && (
                                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                        {s.status !== 'ACTIVE' && (
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary cursor-pointer"
                                                                checked={selectedStudents.includes(s.roll_number)}
                                                                onChange={e => {
                                                                    if (e.target.checked) setSelectedStudents([...selectedStudents, s.roll_number]);
                                                                    else setSelectedStudents(selectedStudents.filter(id => id !== s.roll_number));
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all font-black text-sm italic">{s.full_name.charAt(0)}</div>
                                                        <div>
                                                            <p className="font-black text-white text-xs italic tracking-tight uppercase group-hover:text-primary transition-colors">{s.full_name}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{s.roll_number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-[10px] font-black text-white italic tracking-widest uppercase">{s.branch} · {s.section}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{s.program || "B.Tech"} · Sem {s.current_semester}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-400/50 animate-pulse'}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'ACTIVE' ? 'text-green-400' : 'text-amber-400/80'}`}>{s.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    {subFeature === "RECORDS" ? (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => setViewingProfile(s)} className="p-2 glass rounded-xl text-muted-foreground hover:text-white transition-all"><BarChart2 className="w-4 h-4" /></button>
                                                            <button onClick={() => openEditModal(s)} className="p-2 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all"><RefreshCw className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : s.status !== 'ACTIVE' ? (
                                                        <button onClick={() => handleSingleInvite(s.roll_number)} className="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg" title="Send activation link">
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="border-t border-white/5 p-4 flex items-center justify-between bg-[#111]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {totalCount === 0 ? "No records" : `Page ${page} of ${totalPages} · ${totalCount} total`}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-4">Page {page} / {totalPages}</span>
                                    <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* ── Bulk Dispatch Bar ───────────────────────── */}
                            {subFeature === "PORTAL" && selectedStudents.length > 0 && (
                                <div className="p-6 bg-primary/5 border-t border-primary/20 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{selectedStudents.length} student{selectedStudents.length > 1 ? "s" : ""} selected</p>
                                        <p className="text-[9px] text-muted-foreground font-bold mt-0.5">Activation invites will be sent to official + personal emails</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedStudents([])} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
                                            Clear
                                        </button>
                                        <button
                                            onClick={handleDispatch}
                                            className="bg-primary px-8 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                        >
                                            <Mail className="w-4 h-4" /> Send Activation Invites
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────────────────── */}
            {showUpload && (
                <UploadConsole
                    isOpen={showUpload} onClose={() => setShowUpload(false)}
                    isValidating={isValidating} valProgress={valProgress} valMessage={valMessage}
                    isCommitting={isCommitting} commitPhase={commitPhase} commitProgress={commitProgress}
                    previewData={previewData} onFileSelect={handleFileSelect} onDownloadTemplate={downloadTemplate}
                    onCommit={commitGridData} onDiscard={() => setPreviewData(null)}
                />
            )}
            {showFormModal && (
                <ManualEntryModal
                    isOpen={showFormModal} onClose={() => setShowFormModal(false)}
                    isEditMode={isEditMode} currentFormIndex={currentFormIndex} formStudents={formStudents}
                    onUpdateForm={updateFormStudent}
                    onAddSequential={() => setFormStudents([...formStudents, { roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1, gender: "", category: "", father_name: "" }])}
                    onSetIndex={setCurrentFormIndex} onSubmit={handleManualSubmit}
                />
            )}
            {viewingProfile && (
                <StudentProfileDrawer student={viewingProfile} onClose={() => setViewingProfile(null)} onEdit={openEditModal} />
            )}
            {showDispatch && (
                <DispatchProgressModal
                    state={ws.state}
                    events={ws.events}
                    summary={ws.summary}
                    errorMsg={ws.errorMsg}
                    pct={ws.pct}
                    current={ws.current}
                    total={ws.total}
                    onClose={() => { setShowDispatch(false); ws.reset(); refresh(); }}
                    onCancel={() => { ws.cancel(); setShowDispatch(false); }}
                />
            )}
            {collisionInfo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-md overflow-hidden rounded-[2.5rem] border border-red-500/30 shadow-3xl p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto animate-pulse"><Activity className="w-8 h-8" /></div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Identity Collision</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-2 leading-relaxed">
                            Roll <span className="text-white font-bold">{collisionInfo.student.roll_number}</span> already mapped to <span className="text-white font-bold">{collisionInfo.student.full_name}</span>.
                        </p>
                        <div className="pt-4 space-y-3">
                            <button onClick={resolveCollision} className="w-full bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">Update Existing Identity</button>
                            <button onClick={() => setCollisionInfo(null)} className="w-full bg-white/5 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel & Review</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistry;
