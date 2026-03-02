// ✅ src/features/institution/pages/StudentRegistry.tsx

import { useState } from "react";
import {
    Users, Search, Plus, Upload, List, LayoutGrid, Zap, Activity, Send, RefreshCw, BarChart2,
    ChevronLeft, ChevronRight, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useStudentRegistry, Student } from "../hooks/useStudentRegistry";
import { useBulkOperations } from "../hooks/useBulkOperations";
import { UploadConsole } from "../components/UploadConsole";
import { StudentProfileDrawer } from "../components/StudentProfileDrawer";
import { ManualEntryModal } from "../components/ManualEntryModal";
import { instApiClient } from "../../auth/api/base";

export const StudentRegistry = () => {
    // 🚁 Navigation & Workspace Context
    const [subFeature, setSubFeature] = useState<"RECORDS" | "PORTAL">("RECORDS");
    const [viewMode, setViewMode] = useState<"CARDS" | "LIST">("CARDS");
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // 📊 State Hub (Hooks)
    const {
        students,
        sectionStats,
        loading,
        registryDepts,
        registryProgs,
        registrySections,
        refresh
    } = useStudentRegistry(activeSection, viewMode);

    const {
        isValidating, valProgress, valMessage,
        previewData, setPreviewData,
        isCommitting, commitPhase, commitProgress,
        handleFileSelect, commitGridData,
        handleInviteSection, handleBulkInviteSelected
    } = useBulkOperations(refresh);

    // 🔍 Local UI State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [showUpload, setShowUpload] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formStudents, setFormStudents] = useState<Partial<Student>[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [viewingProfile, setViewingProfile] = useState<Student | null>(null);
    const [collisionInfo, setCollisionInfo] = useState<{ student: any; originalData: any } | null>(null);

    // 🧭 Template Engine
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

    // 🧙‍♂️ Record Wizard Handlers
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

    const handleSingleInvite = async (rollNumber: string) => {
        const loadingToast = toast.loading(`Sending activation link...`);
        try {
            await instApiClient.post("students/bulk_invite/", { roll_numbers: [rollNumber] });
            toast.success("Activation link sent", { id: loadingToast });
            refresh();
        } catch (err) {
            toast.error("Transmission failed", { id: loadingToast });
        }
    };

    // Filtered Content Logic
    const filteredStudents = students.filter(s =>
        (searchTerm === "" ||
            s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.official_email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "ALL" || s.status === statusFilter)
    );

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 md:space-y-10 p-2 md:p-6 min-h-screen bg-[#050505] text-white selection:bg-primary/30 w-full overflow-x-hidden">
            {/* 1. Fluid Header Context */}
            <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] -z-10 rounded-full pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="flex items-center gap-4 md:gap-8 min-w-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-[2rem] border border-primary/20 flex items-center justify-center text-primary shadow-2xl group transition-all shrink-0">
                            <Users className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter uppercase leading-none truncate">
                                Institutional <span className="text-primary not-italic">Hub</span>
                            </h1>
                            <p className="text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] mt-2 flex items-center gap-2">
                                Governance Control <span className="hidden xs:inline">Center</span> <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Real-Time Sync
                            </p>
                        </div>
                    </div>

                    {/* Action Hub */}
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="flex glass p-1 rounded-2xl border-white/10 shadow-inner shrink-0 bg-black/40">
                            <button onClick={() => setSubFeature("RECORDS")} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${subFeature === 'RECORDS' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground hover:text-white'}`}>
                                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="xs:inline">Global</span>
                            </button>
                            <button onClick={() => setSubFeature("PORTAL")} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${subFeature === 'PORTAL' ? 'bg-primary text-white shadow-xl' : 'text-muted-foreground hover:text-white'}`}>
                                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="xs:inline">Provision</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 ml-auto md:ml-0">
                            <button onClick={() => setShowUpload(true)} className="bg-white/[0.03] border border-white/10 px-4 md:px-6 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 md:gap-3 shadow-lg">
                                <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Registry Ingestion</span><span className="sm:hidden">Ingest</span>
                            </button>
                            <button onClick={openAddModal} className="bg-primary px-4 md:px-8 py-2 md:py-3 rounded-xl text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2 md:gap-3">
                                <Plus className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">Manual Register</span><span className="sm:hidden">Manual</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub-Header: Search & View Modes */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 pt-6 border-t border-white/5">
                    <div className="relative flex-1 group min-w-[200px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            placeholder="Filter students, cohorts, or roll numbers..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/[0.02] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex glass p-1 rounded-xl border-white/5 shadow-xl bg-black/40 shrink-0 overflow-hidden">
                            <button onClick={() => setStatusFilter("ALL")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "ALL" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>All</button>
                            <button onClick={() => setStatusFilter("SEEDED")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "SEEDED" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Seeded</button>
                            <button onClick={() => setStatusFilter("ACTIVE")} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === "ACTIVE" ? 'bg-primary/20 text-primary shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Active</button>
                        </div>
                        <div className="flex glass p-1 rounded-xl border-white/5 shadow-xl bg-black/40 shrink-0">
                            <button onClick={() => setViewMode("CARDS")} className={`p-3 rounded-lg transition-all ${viewMode === 'CARDS' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`} title="Card View"><LayoutGrid className="w-5 h-5" /></button>
                            <button onClick={() => setViewMode("LIST")} className={`p-3 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`} title="List View"><List className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 md:py-40 flex flex-col items-center justify-center gap-6 animate-pulse">
                    <Activity className="w-16 h-16 text-primary animate-bounce opacity-20" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] italic">Synthesizing Registry Workspace...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                    {(viewMode === "LIST" || activeSection) && (
                        <div className="glass rounded-[2rem] md:rounded-[2.5rem] border-white/5 overflow-hidden shadow-3xl bg-white/[0.01] w-full">
                            {activeSection && (
                                <div className="p-6 md:p-8 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveSection(null)} className="w-10 h-10 glass border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-primary"><ChevronLeft className="w-6 h-6" /></button>
                                        <div>
                                            <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Section <span className="text-primary not-italic">{activeSection}</span> Records</h3>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Isolated Cohort View</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 w-full">
                                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white/[0.02]">
                                            {subFeature === "PORTAL" && <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5 w-10">Select</th>}
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Identity</th>
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Cohort Details</th>
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5">Account Status</th>
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-[10px] text-muted-foreground border-b border-white/5 text-right">Actions</th>
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
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox" className="w-5 h-5 rounded-lg border-white/10 bg-white/5 checked:bg-primary transition-all cursor-pointer"
                                                            checked={selectedStudents.includes(s.roll_number)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedStudents([...selectedStudents, s.roll_number]);
                                                                else setSelectedStudents(selectedStudents.filter(id => id !== s.roll_number));
                                                            }} />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all font-black text-sm italic">{s.full_name.charAt(0)}</div>
                                                        <div>
                                                            <p className="font-black text-white text-xs italic tracking-tight uppercase group-hover:text-primary transition-colors">{s.full_name}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 group-hover:text-white transition-colors">{s.roll_number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-white italic tracking-widest uppercase">{s.branch} · {s.section}</p>
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{s.program || "B.Tech"} · Sem {s.current_semester}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10 animate-pulse'}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'ACTIVE' ? 'text-white' : 'text-muted-foreground'}`}>{s.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                    {subFeature === "RECORDS" ? (
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => setViewingProfile(s)} className="p-2.5 glass rounded-xl text-muted-foreground hover:text-white transition-all"><BarChart2 className="w-4 h-4" /></button>
                                                            <button onClick={() => openEditModal(s)} className="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all"><RefreshCw className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        s.status !== 'ACTIVE' && (
                                                            <button onClick={() => handleSingleInvite(s.roll_number)} className="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg"><Send className="w-4 h-4" /></button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="border-t border-white/5 p-4 flex items-center justify-between bg-[#111]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} Records
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-4">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 glass rounded-lg text-white/50 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {subFeature === "PORTAL" && selectedStudents.length > 0 && (
                                <div className="p-6 bg-primary/5 border-t border-primary/20 flex justify-between items-center animate-in slide-in-from-bottom-2">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Targeting {selectedStudents.length} Students</p>
                                    <button onClick={() => handleBulkInviteSelected(selectedStudents)} className="bg-primary px-8 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl">Automate Dispatch</button>
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === "CARDS" && !activeSection && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {sectionStats.length === 0 ? (
                                <div className="col-span-full py-20 bg-white/[0.01] rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-4">
                                    <Activity className="w-12 h-12 text-white/10" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registry Vault is Empty.</p>
                                </div>
                            ) : sectionStats.map((s, i) => (
                                <div key={i} className="glass p-6 md:p-8 rounded-[2rem] border-white/5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group relative flex flex-col justify-between">
                                    <div onClick={() => setActiveSection(s.name)} className="cursor-pointer">
                                        <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Assigned Cohort</h4>
                                        <p className="text-xl md:text-2xl font-black text-white italic tracking-tighter mb-6">{s.name || "UNASSIGNED"}</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                                <span>Pulse Rate</span>
                                                <span className="text-primary">{s.total ? Math.round((s.activated / s.total) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary shadow-sm shadow-primary/50" style={{ width: `${s.total ? (s.activated / s.total) * 100 : 0}%` }} />
                                            </div>
                                            <p className="text-[10px] font-black text-white/50 tracking-widest">{s.total} HEADCOUNT</p>
                                        </div>
                                    </div>
                                    {subFeature === "PORTAL" && s.activated < s.total && (
                                        <button onClick={(e) => { e.stopPropagation(); handleInviteSection(s.name); }} className="mt-6 w-full py-3 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                                            <Send className="w-3.5 h-3.5" /> Dispatch to Section
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3. Modals & Layout Overlays — Using Portals for Absolute Isolation */}
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
                    onUpdateForm={updateFormStudent} onAddSequential={() => setFormStudents([...formStudents, { roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1, gender: "", category: "", father_name: "" }])}
                    onSetIndex={setCurrentFormIndex} onSubmit={handleManualSubmit}
                />
            )}

            {viewingProfile && (
                <StudentProfileDrawer
                    student={viewingProfile} onClose={() => setViewingProfile(null)}
                    onEdit={openEditModal}
                />
            )}

            {collisionInfo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-md overflow-hidden rounded-[2.5rem] border border-red-500/30 shadow-3xl p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto animate-pulse">
                            <Activity className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Identity Collision Detected</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-2 leading-relaxed">
                            The roll number <span className="text-white font-bold">{collisionInfo.student.roll_number}</span> is already mapped to <span className="text-white font-bold">{collisionInfo.student.full_name}</span>.
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
