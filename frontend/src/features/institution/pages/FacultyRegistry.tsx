import { useState, useEffect } from "react";
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    Upload,
    Mail,
    X,
    Briefcase,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Database,
    Zap
} from "lucide-react";
import { createPortal } from "react-dom";
import { instApiClient } from "../../auth/api/base";
import { academicApi } from "../../academic/api/academicApi";
import { toast } from "react-hot-toast";
import { useFacultyBulkOperations } from "../hooks/useFacultyBulkOperations";
import { FacultyUploadConsole } from "../components/FacultyUploadConsole";
import { useDispatchSocket } from "../hooks/useDispatchSocket";
import { DispatchProgressModal } from "../components/DispatchProgressModal";

interface Faculty {
    id: number;
    employee_id: string;
    full_name: string;
    email: string;
    designation: string;
    department: string;
    joining_date: string;
    status: "ACTIVE" | "SEEDED";
}

export const FacultyRegistry = () => {
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [activeDept, setActiveDept] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal & Menu state
    const [activeMenu, setActiveMenu] = useState<number | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
    const [newFaculty, setNewFaculty] = useState({
        employee_id: "",
        full_name: "",
        email: "",
        personal_email: "",
        official_email: "",
        designation: "Assistant Professor",
        department: "",
        joining_date: new Date().toISOString().split('T')[0]
    });

    // Selection & Filter State
    const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showDispatch, setShowDispatch] = useState(false);

    const ws = useDispatchSocket();

    const refresh = () => {
        fetchDepartments();
        fetchFaculty();
    };

    const {
        isValidating, valProgress, valMessage,
        previewData, setPreviewData,
        isCommitting, commitPhase, commitProgress,
        handleFileSelect, commitGridData
    } = useFacultyBulkOperations(() => {
        refresh();
        setShowUpload(false);
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchFaculty();
    }, [activeDept, page, searchTerm, statusFilter]);

    const fetchDepartments = async () => {
        try {
            const res = await academicApi.list("departments");
            if (res.data.success) {
                const names = res.data.data.map((d: any) => d.code);
                setDepartments(["ALL", ...names]);
            }
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const fetchFaculty = async () => {
        setLoading(true);
        try {
            let url = `faculty/?page=${page}`;
            if (activeDept !== "ALL") url += `&department=${activeDept}`;
            if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
            if (searchTerm) url += `&search=${searchTerm}`;

            const res = await instApiClient.get(url);
            if (res.data.success) {
                setFaculty(res.data.data);
                if (res.data.total_pages) setTotalPages(res.data.total_pages);
            }
        } catch (err) {
            toast.error("Failed to load faculty registry");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = (empId: string) => {
        setSelectedFaculty([empId]);
        setShowDispatch(true);
        setTimeout(() => ws.dispatch([empId], undefined, "faculty"), 50);
    };

    const handleDelete = async (empId: string) => {
        if (!window.confirm(`Are you sure you want to remove educator ${empId}?`)) return;
        const loadingToast = toast.loading("Removing record...");
        try {
            const res = await instApiClient.delete(`faculty/${empId}/`);
            if (res.data.success) {
                toast.success("Educator removed", { id: loadingToast });
                refresh();
            }
        } catch (err) {
            toast.error("Failed to delete record", { id: loadingToast });
        }
    };

    const openEditModal = (f: Faculty) => {
        setIsEditMode(true);
        setEditingEmpId(f.employee_id);
        setNewFaculty({
            employee_id: f.employee_id,
            full_name: f.full_name,
            email: f.email,
            personal_email: (f as any).personal_email || "",
            official_email: (f as any).official_email || "",
            designation: f.designation,
            department: f.department,
            joining_date: f.joining_date
        });
        setIsAddModalOpen(true);
        setActiveMenu(null);
    };

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadingToast = toast.loading(isEditMode ? "Updating record..." : "Provisioning educator...");
        try {
            const res = isEditMode
                ? await instApiClient.patch(`faculty/${editingEmpId}/`, newFaculty)
                : await instApiClient.post("faculty/", newFaculty);
            if (res.data.success) {
                toast.success(isEditMode ? "Record updated" : "Educator provisioned successfully", { id: loadingToast });
                setIsAddModalOpen(false);
                setIsEditMode(false);
                setEditingEmpId(null);
                refresh();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add educator", { id: loadingToast });
        }
    };

    const downloadTemplate = () => {
        const headers = ["employee_id", "full_name", "official_email", "personal_email", "designation", "department", "joining_date"];
        const sample = ["EMP-001", "Dr. Manohar Reddy", "manohar@university.edu", "manohar.personal@gmail.com", "Assistant Professor", "CSE", "2024-01-15"];
        const blob = new Blob([[headers.join(","), sample.join(",")].join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement("a"), { href: url, download: "AUIP_Faculty_Template.csv" }).click();
        URL.revokeObjectURL(url);
        toast.success("Faculty Template downloaded");
    };

    const handleBulkInvite = () => {
        const targetIds = selectedFaculty.length > 0
            ? selectedFaculty
            : faculty.filter(f => f.status === "SEEDED").map(f => f.employee_id);

        if (targetIds.length === 0) return toast.error("No pending educators selected.");

        setShowDispatch(true);
        setTimeout(() => ws.dispatch(targetIds, undefined, "faculty"), 50);
        setSelectedFaculty([]);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden min-h-screen">
            <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible flex flex-wrap items-center justify-between gap-6">
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white italic tracking-tighter uppercase leading-none truncate flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-primary shrink-0" />
                        Faculty <span className="text-primary not-italic">Registry</span>
                    </h1>
                    <p className="text-muted-foreground text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] mt-2 opacity-50 flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                        Staff Provisioning & Academic Governance
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 shrink-0">
                    <button onClick={handleBulkInvite} className="glass px-5 py-2.5 md:px-7 md:py-3.5 rounded-2xl border-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2.5 hover:bg-white/5 transition-all group">
                        <Mail className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Send All Invites</span>
                        <span className="sm:hidden">Invites</span>
                    </button>
                    <button onClick={() => setShowUpload(true)} className="glass px-5 py-2.5 md:px-7 md:py-3.5 rounded-2xl border-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2.5 hover:bg-white/5 transition-all group">
                        <Upload className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Bulk Seed</span>
                        <span className="sm:hidden">Seed</span>
                    </button>
                    <button onClick={() => { setIsEditMode(false); setNewFaculty({ employee_id: "", full_name: "", email: "", official_email: "", personal_email: "", designation: "Assistant Professor", department: "", joining_date: new Date().toISOString().split('T')[0] }); setIsAddModalOpen(true); }} className="bg-primary px-6 py-2.5 md:px-8 md:py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2.5 hover:scale-105 transition-all shadow-xl shadow-primary/20">
                        <Plus className="w-4 h-4 text-white" />
                        <span className="hidden sm:inline">Add Educator</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 glass p-2 rounded-2xl border-white/5 flex items-center gap-2 pr-4">
                    <div className="bg-white/5 p-2.5 rounded-xl"><Search className="w-5 h-5 text-muted-foreground" /></div>
                    <input type="text" placeholder="Search by ID, Name or Email..." className="bg-transparent border-none focus:ring-0 text-white font-medium flex-1 text-sm outline-none" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    <div className="flex glass p-1 rounded-xl border-white/5 bg-black/40 mr-2 shrink-0">
                        {["ALL", "SEEDED", "ACTIVE"].map(f => (
                            <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? "bg-primary/20 text-primary shadow-lg" : "text-muted-foreground hover:text-white"}`}>{f}</button>
                        ))}
                    </div>
                    {departments.map(dept => (
                        <button key={dept} onClick={() => { setActiveDept(dept); setPage(1); }} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeDept === dept ? 'bg-primary text-white shadow-xl' : 'glass border-white/5 text-muted-foreground hover:text-white'}`}>{dept}</button>
                    ))}
                </div>
            </div>

            <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            <th className="p-6 border-b border-white/5 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                                    checked={faculty.length > 0 && faculty.every(f => selectedFaculty.includes(f.employee_id))}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedFaculty(faculty.map(f => f.employee_id));
                                        else setSelectedFaculty([]);
                                    }}
                                />
                            </th>
                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5">Educator Identity</th>
                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5">Role & Department</th>
                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5">Lifecycle</th>
                            <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse"><td colSpan={4} className="p-8"><div className="h-4 bg-white/5 rounded-full w-full"></div></td></tr>
                            ))
                        ) : faculty.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-muted-foreground uppercase font-black tracking-widest opacity-20 italic">No faculty records found.</td></tr>
                        ) : faculty.map((f) => (
                            <tr key={f.id} className={`hover:bg-white/[0.02] transition-all group ${selectedFaculty.includes(f.employee_id) ? "bg-primary/[0.03]" : ""}`}>
                                <td className="p-6 text-center border-b border-white/0 lg:border-white/5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        checked={selectedFaculty.includes(f.employee_id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedFaculty(p => [...p, f.employee_id]);
                                            else setSelectedFaculty(p => p.filter(id => id !== f.employee_id));
                                        }}
                                    />
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xs uppercase italic">{f.full_name?.charAt(0) || "?"}</div>
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-sm tracking-tight truncate">{f.full_name}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 truncate opacity-50">{f.employee_id}</p>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-[9px] text-primary/60 font-mono truncate">{f.email}</p>
                                                {(f as any).personal_email && <p className="text-[9px] text-gray-500 font-mono truncate">{(f as any).personal_email}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-primary/10 rounded-lg text-primary text-[10px] font-black uppercase tracking-tighter">{f.designation}</div>
                                        <Building2 className="w-3 h-3 text-white/20" />
                                        <div className="text-[10px] font-medium text-gray-300 uppercase tracking-widest">{f.department}</div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-gray-400 font-bold">Joined {f.joining_date || "N/A"}</span></div>
                                        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${f.status === 'ACTIVE' ? 'text-green-400' : 'text-amber-500'}`}><span className={`w-1 h-1 rounded-full ${f.status === 'ACTIVE' ? 'bg-green-400' : 'bg-amber-500 animate-pulse'}`} />{f.status} Account</div>
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {f.status === 'SEEDED' && (
                                            <button onClick={() => handleInvite(f.employee_id)} className="p-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all"><Mail className="w-4 h-4" /></button>
                                        )}
                                        <div className="relative">
                                            <button onClick={() => setActiveMenu(activeMenu === f.id ? null : f.id)} className="p-2.5 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-white transition-all"><MoreVertical className="w-4 h-4" /></button>
                                            {activeMenu === f.id && (
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    <button onClick={() => openEditModal(f)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all">Edit Record</button>
                                                    <button onClick={() => handleDelete(f.employee_id)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">Remove educator</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Page {page} of {totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl glass border-white/5 disabled:opacity-20 hover:text-primary transition-all"><ChevronLeft className="w-5 h-5" /></button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl glass border-white/5 disabled:opacity-20 hover:text-primary transition-all"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                )}
            </div>

            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); }} />
                    <div className="relative w-full max-w-2xl bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 shadow-[0_0_150px_rgba(0,0,0,0.9)] max-h-[90vh]">
                        {/* Header */}
                        <div className="p-10 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                                    {isEditMode ? 'Modify' : 'Provision'} <span className="text-primary not-italic">{isEditMode ? 'Record' : 'Educator'}</span>
                                </h2>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-3 opacity-50 flex items-center gap-2">
                                    <Database className="w-3 h-3 text-primary" />
                                    Identity Management Protocol active
                                </p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); }} className="p-4 rounded-2xl hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                            <form id="facultyForm" onSubmit={handleManualAdd} className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Employee Identity ID *</label>
                                        <input required disabled={isEditMode} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed placeholder:text-white/10" value={newFaculty.employee_id} onChange={e => setNewFaculty({ ...newFaculty, employee_id: e.target.value })} placeholder="e.g. EMP-2024-001" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Legal Professional Name *</label>
                                        <input required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold placeholder:text-white/10" value={newFaculty.full_name} onChange={e => setNewFaculty({ ...newFaculty, full_name: e.target.value })} placeholder="Dr. Full Name" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Institutional Official Email</label>
                                        <input type="email" required className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold placeholder:text-white/10" value={newFaculty.official_email} onChange={e => setNewFaculty({ ...newFaculty, official_email: e.target.value, email: e.target.value })} placeholder="faculty@university.edu" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Personal Alternate Email</label>
                                        <input type="email" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold placeholder:text-white/10" value={newFaculty.personal_email} onChange={e => setNewFaculty({ ...newFaculty, personal_email: e.target.value })} placeholder="name.personal@gmail.com" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Professional Designation</label>
                                        <input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold placeholder:text-white/10" value={newFaculty.designation} onChange={e => setNewFaculty({ ...newFaculty, designation: e.target.value })} placeholder="e.g. Professor / Dean" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Assigned Department</label>
                                        <div className="relative">
                                            <select className="w-full px-6 py-4 bg-[#0d0d12] border border-white/10 rounded-2xl text-white outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold appearance-none cursor-pointer" value={newFaculty.department} onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })}>
                                                <option value="" className="bg-black text-white">Choose Department</option>
                                                {departments.filter(d => d !== "ALL").map(d => <option key={d} value={d} className="bg-black text-white">{d}</option>)}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                                <MoreVertical className="w-4 h-4 rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Onboarding / Joining Date</label>
                                    <div className="relative">
                                        <input type="date" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white [color-scheme:dark] outline-none focus:border-primary focus:bg-primary/[0.02] transition-all text-sm font-bold cursor-text" value={newFaculty.joining_date} onChange={e => setNewFaculty({ ...newFaculty, joining_date: e.target.value })} />
                                        <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-10 border-t border-white/5 bg-white/[0.05] shrink-0">
                            <button form="facultyForm" type="submit" className="w-full py-6 bg-primary text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/40 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 group">
                                <Zap className="w-4 h-4 group-hover:animate-pulse" />
                                {isEditMode ? 'Authorize Registry Update' : 'Initialize Educator Provisioning'}
                            </button>
                        </div>
                        <FacultyEscListener onEsc={() => { setIsAddModalOpen(false); setIsEditMode(false); }} />
                    </div>
                </div>,
                document.body
            )}

            <FacultyUploadConsole
                isOpen={showUpload}
                onClose={() => setShowUpload(false)}
                isValidating={isValidating}
                valProgress={valProgress}
                valMessage={valMessage}
                isCommitting={isCommitting}
                commitPhase={commitPhase}
                commitProgress={commitProgress}
                previewData={previewData}
                onFileSelect={handleFileSelect}
                onDownloadTemplate={downloadTemplate}
                onDiscard={() => setPreviewData(null)}
                onCommit={commitGridData}
            />

            {selectedFaculty.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-[#0a0a0f]/90 backdrop-blur-2xl border border-primary/30 rounded-[2rem] px-8 py-4 shadow-[0_0_80px_rgba(99,102,241,0.2)] flex items-center gap-8">
                        <div className="flex items-center gap-4 border-r border-white/10 pr-8">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-white font-black italic tracking-tighter text-sm uppercase leading-none">{selectedFaculty.length} Educators</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Multi-Selection Active</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleBulkInvite} className="h-12 bg-primary px-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-105 transition-all flex items-center gap-2">
                                <Mail className="w-4 h-4" /> Send Invites
                            </button>
                            <button onClick={() => setSelectedFaculty([])} className="h-12 glass px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
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
        </div>
    );
};

const FacultyEscListener = ({ onEsc }: { onEsc: () => void }) => {
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onEsc();
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", h);
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", h);
        };
    }, [onEsc]);
    return null;
};

export default FacultyRegistry;
