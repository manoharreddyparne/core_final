import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { createPortal } from "react-dom";
import { instApiClient } from "../../auth/api/base";
import { academicApi } from "../../academic/api/academicApi";
import { toast } from "react-hot-toast";

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
    const [previewData, setPreviewData] = useState<any>(null);
    const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDepartments();
        fetchFaculty();
    }, [activeDept]);

    const fetchDepartments = async () => {
        try {
            const res = await academicApi.list("departments");
            if (res.data.success) {
                const names = res.data.data.map((d: any) => d.code);
                setDepartments(["ALL", ...names]);
            } else {
                const legacyRes = await instApiClient.get("faculty/departments/");
                if (legacyRes.data.success) setDepartments(["ALL", ...legacyRes.data.data]);
            }
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const fetchFaculty = async () => {
        setLoading(true);
        try {
            const url = activeDept === "ALL" ? "faculty/" : `faculty/?department=${activeDept}`;
            const res = await instApiClient.get(url);
            if (res.data.success) setFaculty(res.data.data);
        } catch (err) {
            toast.error("Failed to load faculty registry");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (empId: string) => {
        const loadingToast = toast.loading("Sending activation link...");
        try {
            const res = await instApiClient.post("faculty/bulk_invite/", {
                identifiers: [empId]
            });
            if (res.data.success) {
                toast.success("Activation link sent!", { id: loadingToast });
                fetchFaculty();
            } else {
                toast.error(res.data.message || "Failed to send link", { id: loadingToast });
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to send link", { id: loadingToast });
        }
    };

    const handleDelete = async (empId: string) => {
        if (!window.confirm(`Are you sure you want to remove educator ${empId}?`)) return;
        const loadingToast = toast.loading("Removing record...");
        try {
            const res = await instApiClient.delete(`faculty/${empId}/`);
            if (res.data.success) {
                toast.success("Educator removed", { id: loadingToast });
                fetchFaculty();
                fetchDepartments();
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
            designation: f.designation,
            department: f.department,
            joining_date: f.joining_date
        });
        setIsAddModalOpen(true);
        setActiveMenu(null);
    };

    const handleBulkInvite = async () => {
        const toInvite = faculty.filter(f => f.status === "SEEDED").map(f => f.employee_id);
        if (toInvite.length === 0) return toast.error("No pending faculty to invite.");
        const loadingToast = toast.loading(`Sending ${toInvite.length} activation links...`);
        try {
            const res = await instApiClient.post("faculty/bulk_invite/", {
                identifiers: toInvite
            });
            if (res.data.success) {
                toast.success(res.data.message, { id: loadingToast });
                fetchFaculty();
            }
        } catch (err: any) {
            toast.error("Bulk invite failed.", { id: loadingToast });
        }
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newFaculty, setNewFaculty] = useState({
        employee_id: "",
        full_name: "",
        email: "",
        designation: "Assistant Professor",
        department: "",
        joining_date: new Date().toISOString().split('T')[0]
    });

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
                fetchFaculty();
                fetchDepartments();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add educator", { id: loadingToast });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean = true) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("preview", isPreview ? "true" : "false");
        const loadingToast = toast.loading(isPreview ? "Analyzing CSV..." : "Applying faculty changes...");
        try {
            const res = await instApiClient.post("bulk-seed-faculty/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.success) {
                toast.success(isPreview ? "Analysis complete" : "Faculty Registry updated", { id: loadingToast });
                if (isPreview) setPreviewData({ ...res.data.data, file });
                else {
                    setShowUpload(false);
                    setPreviewData(null);
                    fetchFaculty();
                    fetchDepartments();
                }
            }
        } catch (err) {
            toast.error("Upload failed.", { id: loadingToast });
        }
    };

    const filteredFaculty = faculty.filter(f =>
        (f.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (f.employee_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (f.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
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
                    <button onClick={() => { setIsEditMode(false); setNewFaculty({ employee_id: "", full_name: "", email: "", designation: "Assistant Professor", department: "", joining_date: new Date().toISOString().split('T')[0] }); setIsAddModalOpen(true); }} className="bg-primary px-6 py-2.5 md:px-8 md:py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2.5 hover:scale-105 transition-all shadow-xl shadow-primary/20">
                        <Plus className="w-4 h-4 text-white" />
                        <span className="hidden sm:inline">Add Educator</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 glass p-2 rounded-2xl border-white/5 flex items-center gap-2 pr-4">
                    <div className="bg-white/5 p-2.5 rounded-xl"><Search className="w-5 h-5 text-muted-foreground" /></div>
                    <input type="text" placeholder="Search by ID, Name or Email..." className="bg-transparent border-none focus:ring-0 text-white font-medium flex-1 text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    {departments.map(dept => (
                        <button key={dept} onClick={() => setActiveDept(dept)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeDept === dept ? 'bg-primary text-white shadow-xl' : 'glass border-white/5 text-muted-foreground hover:text-white'}`}>{dept}</button>
                    ))}
                </div>
            </div>

            <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02]">
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
                        ) : filteredFaculty.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-muted-foreground">No faculty records found.</td></tr>
                        ) : filteredFaculty.map((f) => (
                            <tr key={f.id} className="hover:bg-white/[0.02] transition-all group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xs">{f.full_name.charAt(0)}</div>
                                        <div>
                                            <p className="text-white font-bold text-sm tracking-tight">{f.full_name}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{f.employee_id} • {f.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-primary/10 rounded-lg text-primary text-[10px] font-black uppercase tracking-tighter">{f.designation}</div>
                                        <Building2 className="w-3 h-3 text-white/20" />
                                        <div className="text-[10px] font-medium text-gray-300">{f.department}</div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-gray-400">Joined {f.joining_date || "N/A"}</span></div>
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
                                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#0a0a0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                                    <button onClick={() => openEditModal(f)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all">Edit Record</button>
                                                    <button onClick={() => handleDelete(f.employee_id)} className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all">Remove educator</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); }} />
                    <div className="relative w-full max-w-xl bg-[#0a0a0f]/80 backdrop-blur-md rounded-[3rem] border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 shadow-[0_0_120px_rgba(0,0,0,0.6)]">
                        <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/5">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">{isEditMode ? 'Update' : 'Seed'} <span className="text-primary not-italic">{isEditMode ? 'Record' : 'Educator'}</span></h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Institutional Identity Provisioning</p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); }} className="p-3 rounded-xl hover:bg-white/5 text-gray-500 transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleManualAdd} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Employee ID *</label>
                                    <input required disabled={isEditMode} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm disabled:opacity-50" value={newFaculty.employee_id} onChange={e => setNewFaculty({ ...newFaculty, employee_id: e.target.value })} placeholder="EMP-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Full Name *</label>
                                    <input required className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm" value={newFaculty.full_name} onChange={e => setNewFaculty({ ...newFaculty, full_name: e.target.value })} placeholder="Dr. Manohar Reddy" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Official Email *</label>
                                <input required type="email" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm" value={newFaculty.email} onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })} placeholder="educator@auip.edu" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Designation</label>
                                    <input className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm" value={newFaculty.designation} onChange={e => setNewFaculty({ ...newFaculty, designation: e.target.value })} placeholder="Assistant Professor" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Department</label>
                                    <select className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all text-sm appearance-none" value={newFaculty.department} onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })}>
                                        <option value="" className="bg-black">Sync with Registry</option>
                                        {departments.filter(d => d !== "ALL").map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all mt-4">{isEditMode ? 'Authorize Update' : 'Initialize Provisioning'}</button>
                        </form>
                        <FacultyEscListener onEsc={() => { setIsAddModalOpen(false); setIsEditMode(false); }} />
                    </div>
                </div>,
                document.body
            )}

            {showUpload && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setShowUpload(false)} />
                    <div className="relative bg-[#0a0a0f]/80 backdrop-blur-md w-full max-w-4xl rounded-[3rem] border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 shadow-[0_0_120px_rgba(0,0,0,0.6)]">
                        <div className="p-10 flex items-center justify-between border-b border-white/5 bg-white/5">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Batch <span className="text-primary not-italic">Seeding</span></h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">High-Volume Staff Provisioning</p>
                            </div>
                            <button onClick={() => setShowUpload(false)} className="p-3 rounded-xl hover:bg-white/5 text-gray-500 transition-all"><X className="w-8 h-8" /></button>
                        </div>
                        <div className="p-10 overflow-y-auto custom-scrollbar">
                            {!previewData ? (
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-[3rem] p-24 flex flex-col items-center text-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all group">
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-all">
                                        <Upload className="w-12 h-12 text-primary" />
                                    </div>
                                    <p className="text-white font-black text-xl italic uppercase tracking-tighter">Select Registry CSV</p>
                                    <p className="text-muted-foreground text-[10px] mt-4 max-w-xs uppercase tracking-[0.2em] font-black leading-relaxed">Required: ID, Name, Email, Role, Dept</p>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                                </div>
                            ) : (
                                <div className="space-y-10 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="glass p-8 rounded-3xl bg-green-500/[0.03] border-green-500/10 text-center">
                                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">New Identity Seeds</p>
                                            <p className="text-4xl font-black text-white tracking-tighter">{previewData.summary.new_count}</p>
                                        </div>
                                        <div className="glass p-8 rounded-3xl bg-primary/[0.03] border-primary/10 text-center">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Registry Updates</p>
                                            <p className="text-4xl font-black text-white tracking-tighter">{previewData.summary.update_count}</p>
                                        </div>
                                        <div className="glass p-8 rounded-3xl bg-red-500/[0.03] border-red-500/10 text-center">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Protocol Conflicts</p>
                                            <p className="text-4xl font-black text-white tracking-tighter">{previewData.summary.error_count}</p>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-blue-500/[0.02] rounded-[2rem] border border-blue-500/10 flex items-center gap-4">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Checked payload against institutional neural lattice. Ready for synchronization.</p>
                                    </div>
                                    <div className="flex justify-end gap-4 pt-10 border-t border-white/5">
                                        <button onClick={() => setPreviewData(null)} className="px-10 py-4 glass rounded-2xl text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">Discard Buffer</button>
                                        <button onClick={() => handleFileUpload({ target: { files: [previewData.file] } } as any, false)} className="px-12 py-4 bg-primary rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl shadow-primary/20 hover:scale-105 transition-all">Commit to Registry</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <FacultyEscListener onEsc={() => setShowUpload(false)} />
                    </div>
                </div>,
                document.body
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
