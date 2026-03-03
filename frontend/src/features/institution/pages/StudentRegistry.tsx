import { useState, useMemo } from "react";
import { Users, Search, Plus, Upload, List, LayoutGrid, Zap, Activity } from "lucide-react";
import { toast } from "react-hot-toast";

import { useStudentRegistry, Student } from "../hooks/useStudentRegistry";
import { useBulkOperations } from "../hooks/useBulkOperations";
import { useDispatchSocket } from "../hooks/useDispatchSocket";

import { SkeletonRow, SkeletonCard } from "../components/SkeletonLoaders";
import { SectionGrid } from "../components/SectionGrid";
import { StudentTable } from "../components/StudentTable";
import { UploadConsole } from "../components/UploadConsole";
import { StudentProfileDrawer } from "../components/StudentProfileDrawer";
import { ManualEntryModal } from "../components/ManualEntryModal";
import { DispatchProgressModal } from "../components/DispatchProgressModal";
import { instApiClient } from "../../auth/api/base";

export const StudentRegistry = () => {
    const [subFeature, setSubFeature] = useState<"RECORDS" | "PORTAL">("RECORDS");
    const [viewMode, setViewMode] = useState<"CARDS" | "LIST">("CARDS");
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const { students, totalCount, page, totalPages, goToPage, sectionStats, loading, refresh } =
        useStudentRegistry(activeSection, viewMode);

    const ws = useDispatchSocket();

    const {
        isValidating, valProgress, valMessage,
        previewData, setPreviewData,
        isCommitting, commitPhase, commitProgress,
        handleFileSelect, commitGridData, handleInviteSection,
    } = useBulkOperations(refresh);

    // UI state
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [showDispatch, setShowDispatch] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formStudents, setFormStudents] = useState<Partial<Student>[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [viewingProfile, setViewingProfile] = useState<Student | null>(null);
    const [collisionInfo, setCollisionInfo] = useState<{ student: any; originalData: any } | null>(null);

    const downloadTemplate = () => {
        const headers = ["roll_number", "full_name", "program", "branch", "batch_year", "current_semester", "personal_email", "official_email", "phone_number", "date_of_birth", "father_name", "gender", "category", "admission_year", "passout_year", "cgpa", "10th_percent", "12th_percent", "active_backlogs"];
        const sample = ["2024-CSE-001", "P. Manohar Reddy", "B.Tech", "CSE", "2024", "1", "personal@gmail.com", "manohar@university.edu", "9876543210", "2005-06-15", "Guardian", "Male", "GEN", "2024", "2028", "9.50", "95.5", "98.2", "0"];
        const blob = new Blob([[headers.join(","), sample.join(",")].join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement("a"), { href: url, download: "AUIP_Student_Template.csv" }).click();
        URL.revokeObjectURL(url);
        toast.success("Template downloaded");
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setFormStudents([{ roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1, gender: "", category: "", father_name: "" }]);
        setCurrentFormIndex(0); setShowFormModal(true);
    };
    const openEditModal = (s: Student) => {
        setIsEditMode(true); setFormStudents([s]); setCurrentFormIndex(0); setShowFormModal(true);
    };
    const updateFormStudent = (field: keyof Student, value: any) => {
        const f = [...formStudents]; f[currentFormIndex] = { ...f[currentFormIndex], [field]: value }; setFormStudents(f);
    };
    const handleManualSubmit = async () => {
        const s = formStudents[currentFormIndex];
        if (!s.roll_number || !s.full_name || !s.official_email) return toast.error("Roll, Name, Email required");
        const id = toast.loading(isEditMode ? "Updating..." : "Seeding...");
        try {
            const res = await (isEditMode ? instApiClient.put(`students/${s.id}/`, s) : instApiClient.post("students/", s));
            if (res.data.success || [200, 201].includes(res.status)) {
                toast.success(isEditMode ? "Updated" : "Seeded", { id });
                if (currentFormIndex < formStudents.length - 1) setCurrentFormIndex(p => p + 1);
                else { setShowFormModal(false); refresh(); }
            }
        } catch (err: any) {
            if (err.response?.data?.code === "DUPLICATE_IDENTITY") {
                toast.dismiss(id); setCollisionInfo({ student: err.response.data.student, originalData: s });
            } else toast.error("Failed", { id });
        }
    };
    const resolveCollision = async () => {
        if (!collisionInfo) return;
        const id = toast.loading("Force-syncing...");
        try {
            await instApiClient.patch(`students/${collisionInfo.student.id}/`, collisionInfo.originalData);
            toast.success("Resolved", { id }); setCollisionInfo(null); setShowFormModal(false); refresh();
        } catch { toast.error("Repair failed", { id }); }
    };

    const handleSingleInvite = (roll: string) => {
        setSelectedStudents([roll]); setShowDispatch(true);
        setTimeout(() => ws.dispatch([roll]), 50);
    };
    const handleDispatch = () => {
        if (!selectedStudents.length) return;
        setShowDispatch(true);
        setTimeout(() => ws.dispatch(selectedStudents), 50);
        setSelectedStudents([]);
    };

    const filteredStudents = useMemo(() => students.filter(s =>
        (searchTerm === "" || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.official_email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "ALL" || s.status === statusFilter)
    ), [students, searchTerm, statusFilter]);

    const seededCount = useMemo(() => filteredStudents.filter(s => s.status !== "ACTIVE").length, [filteredStudents]);
    const allSeededOnPage = filteredStudents.filter(s => s.status !== "ACTIVE").map(s => s.roll_number);
    const allSelected = allSeededOnPage.length > 0 && allSeededOnPage.every(r => selectedStudents.includes(r));

    const isCards = viewMode === "CARDS" && !activeSection;

    return (
        <div className="space-y-6 md:space-y-10 p-2 md:p-6 min-h-screen bg-[#050505] text-white w-full overflow-x-hidden">

            {/* ── Header ── */}
            <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] -z-10 rounded-full pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4 md:gap-8 min-w-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-[2rem] border border-primary/20 flex items-center justify-center text-primary shadow-2xl shrink-0">
                            <Users className="w-8 h-8 md:w-10 md:h-10" />
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
                        <div className="flex glass p-1 rounded-2xl border-white/10 bg-black/40 shrink-0">
                            {(["RECORDS", "PORTAL"] as const).map(f => (
                                <button key={f} onClick={() => setSubFeature(f)} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${subFeature === f ? "bg-primary text-white shadow-xl" : "text-muted-foreground hover:text-white"}`}>
                                    {f === "RECORDS" ? <Users className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} {f === "RECORDS" ? "Records" : "Activate"}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 ml-auto md:ml-0">
                            <button onClick={() => setShowUpload(true)} className="bg-white/[0.03] border border-white/10 px-4 md:px-6 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 shadow-lg">
                                <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import CSV</span>
                            </button>
                            <button onClick={openAddModal} className="bg-primary px-4 md:px-8 py-2 md:py-3 rounded-xl text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
                                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Student</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 pt-6 border-t border-white/5">
                    <div className="relative flex-1 group min-w-[200px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            placeholder="Search name, roll, email..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm font-bold text-white outline-none focus:border-primary/40 focus:bg-primary/[0.02] transition-all"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); goToPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex glass p-1 rounded-xl border-white/5 bg-black/40 shrink-0 overflow-hidden">
                            {["ALL", "SEEDED", "ACTIVE"].map(f => (
                                <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? "bg-primary/20 text-primary shadow-lg" : "text-muted-foreground hover:text-white"}`}>{f}</button>
                            ))}
                        </div>
                        {!activeSection && (
                            <div className="flex glass p-1 rounded-xl border-white/5 bg-black/40 shrink-0">
                                <button onClick={() => setViewMode("CARDS")} className={`p-3 rounded-lg transition-all ${viewMode === "CARDS" ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}><LayoutGrid className="w-5 h-5" /></button>
                                <button onClick={() => setViewMode("LIST")} className={`p-3 rounded-lg transition-all ${viewMode === "LIST" ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}><List className="w-5 h-5" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            {loading ? (
                isCards ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                        <table className="w-full"><tbody>{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</tbody></table>
                    </div>
                )
            ) : isCards ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-in fade-in duration-500">
                    <SectionGrid
                        sectionStats={sectionStats}
                        subFeature={subFeature}
                        onSelectSection={setActiveSection}
                        onInviteSection={name => { setShowDispatch(true); setTimeout(() => ws.dispatch([], name), 50); }}
                    />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StudentTable
                        students={filteredStudents}
                        activeSection={activeSection}
                        subFeature={subFeature}
                        selectedStudents={selectedStudents}
                        allSelected={allSelected}
                        page={page} totalPages={totalPages} totalCount={totalCount} seededCount={seededCount}
                        onToggleSelectAll={() => {
                            if (allSelected) setSelectedStudents(p => p.filter(r => !allSeededOnPage.includes(r)));
                            else setSelectedStudents(p => [...new Set([...p, ...allSeededOnPage])]);
                        }}
                        onToggleSelect={(roll, checked) =>
                            setSelectedStudents(p => checked ? [...p, roll] : p.filter(r => r !== roll))
                        }
                        onViewProfile={setViewingProfile}
                        onEdit={openEditModal}
                        onSingleInvite={handleSingleInvite}
                        onBack={() => setActiveSection(null)}
                        onGoToPage={goToPage}
                        onClearSelection={() => setSelectedStudents([])}
                        onDispatch={handleDispatch}
                    />
                </div>
            )}

            {/* ── Modals ── */}
            {showUpload && (
                <UploadConsole
                    isOpen onClose={() => setShowUpload(false)}
                    isValidating={isValidating} valProgress={valProgress} valMessage={valMessage}
                    isCommitting={isCommitting} commitPhase={commitPhase} commitProgress={commitProgress}
                    previewData={previewData} onFileSelect={handleFileSelect} onDownloadTemplate={downloadTemplate}
                    onCommit={commitGridData} onDiscard={() => setPreviewData(null)}
                />
            )}
            {showFormModal && (
                <ManualEntryModal
                    isOpen onClose={() => setShowFormModal(false)}
                    isEditMode={isEditMode} currentFormIndex={currentFormIndex} formStudents={formStudents}
                    onUpdateForm={updateFormStudent}
                    onAddSequential={() => setFormStudents(p => [...p, { roll_number: "", full_name: "", official_email: "", section: activeSection || "", batch_year: new Date().getFullYear(), program: "B.Tech", branch: "CSE", current_semester: 1, gender: "", category: "", father_name: "" }])}
                    onSetIndex={setCurrentFormIndex} onSubmit={handleManualSubmit}
                />
            )}
            {viewingProfile && <StudentProfileDrawer student={viewingProfile} onClose={() => setViewingProfile(null)} onEdit={openEditModal} />}
            {showDispatch && (
                <DispatchProgressModal
                    state={ws.state} events={ws.events} summary={ws.summary} errorMsg={ws.errorMsg}
                    pct={ws.pct} current={ws.current} total={ws.total}
                    onClose={() => { setShowDispatch(false); ws.reset(); refresh(); }}
                    onCancel={() => { ws.cancel(); setShowDispatch(false); }}
                />
            )}
            {collisionInfo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass w-full max-w-md rounded-[2.5rem] border border-red-500/30 p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto animate-pulse"><Activity className="w-8 h-8" /></div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Identity Collision</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Roll <strong className="text-white">{collisionInfo.student.roll_number}</strong> already mapped to <strong className="text-white">{collisionInfo.student.full_name}</strong>.
                        </p>
                        <div className="pt-4 space-y-3">
                            <button onClick={resolveCollision} className="w-full bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Update Existing Identity</button>
                            <button onClick={() => setCollisionInfo(null)} className="w-full bg-white/5 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistry;
