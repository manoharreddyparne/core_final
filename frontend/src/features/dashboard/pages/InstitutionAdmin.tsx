import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../auth/api/base";
import { getAccessToken } from "../../auth/utils/tokenStorage";
import {
    Plus, Globe, Building2, MoreVertical, Search, CheckCircle2, XCircle, Clock,
    AlertCircle, FileText, Mail, Users, Phone, MapPin, ChevronRight, Filter,
    ArrowRight, CheckCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

export const InstitutionAdmin = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [selectedInst, setSelectedInst] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newInst, setNewInst] = useState({
        name: "",
        slug: "",
        domain: "",
        contact_email: "",
        contact_number: "",
        address: ""
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const token = getAccessToken();
            await axios.post(`${API_BASE_URL}superadmin/institutions/`,
                { ...newInst, registration_data: { source: "manual_onboarding" } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Institution ${newInst.name} onboarded successfully!`);
            await fetchInstitutions();
            setIsCreateModalOpen(false);
            setNewInst({ name: "", slug: "", domain: "", contact_email: "", contact_number: "", address: "" });
        } catch (err) {
            console.error("Failed to create institution", err);
            toast.error("Failed to onboard institution. Check the console for details.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchInstitutions = useCallback(async () => {
        try {
            const token = getAccessToken();
            // ✅ FIX: API_BASE_URL already includes "/api/users/", so we just need "superadmin/..."
            const res = await axios.get(`${API_BASE_URL}superadmin/institutions/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstitutions(res.data);
        } catch (err) {
            console.error("Failed to fetch institutions", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInstitutions();

        // 🚀 REAL-TIME UPDATES: Listen for WebSocket events from useSessionSocket
        const handleWsUpdate = (event: any) => {
            const data = event.detail;
            console.log("[Institution-Live] Received real-time update:", data);
            fetchInstitutions();
        };

        const handleSelectFromSearch = (event: any) => {
            const inst = event.detail;
            setSelectedInst(inst);
        };

        window.addEventListener('institution-updated', handleWsUpdate as EventListener);
        window.addEventListener('select-institution', handleSelectFromSearch as EventListener);

        return () => {
            window.removeEventListener('institution-updated', handleWsUpdate as EventListener);
            window.removeEventListener('select-institution', handleSelectFromSearch as EventListener);
        };
    }, [fetchInstitutions]);

    const handleAction = async (slug: string, action: string) => {
        setIsActionLoading(true);
        try {
            const token = getAccessToken();
            // ✅ FIX: Remove redundant "users/"
            await axios.post(`${API_BASE_URL}superadmin/institutions/${slug}/${action}/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchInstitutions();
            setSelectedInst(null);
        } catch (err) {
            console.error(`Failed to perform action ${action}`, err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "APPROVED": return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case "REJECTED": return <XCircle className="w-4 h-4 text-red-400" />;
            case "PENDING": return <Clock className="w-4 h-4 text-amber-400" />;
            case "REVIEW": return <AlertCircle className="w-4 h-4 text-blue-400" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const filtered = institutions.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === "ALL" || inst.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const pendingCount = institutions.filter(i => i.status === "PENDING").length;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white px-1 tracking-tight">Institutional <span className="text-primary italic">Hub</span></h1>
                    <div className="flex items-center gap-2 px-1 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span>Domain Isolation & Governance Control Center</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass px-4 py-2 rounded-2xl border-white/5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Real-Time Sync</span>
                    </div>
                    <div className="glass px-4 py-2 rounded-2xl border-white/5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-white">{pendingCount} Pending Approvals</span>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Manual Register
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative group w-full lg:max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search universities, domains, or slugs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto font-bold no-scrollbar">
                    {["ALL", "PENDING", "REVIEW", "APPROVED", "REJECTED"].map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-5 py-2.5 rounded-xl text-xs transition-all border whitespace-nowrap ${activeFilter === f
                                ? "bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10"
                                : "bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10"
                                }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass h-[320px] rounded-[2.5rem] animate-pulse" />
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((inst) => (
                        <div
                            key={inst.id}
                            onClick={() => setSelectedInst(inst)}
                            className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6 hover:translate-y-[-4px] hover:border-primary/50 hover:bg-white/10 transition-all group relative cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${inst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                    inst.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                                        inst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                            "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                    }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
                                    {inst.status}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white leading-tight">{inst.name}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                    <Globe className="w-3 h-3 text-primary/40" />
                                    {inst.domain}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                <div className="space-y-1">
                                    <div className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Learner Base</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-primary/60" />
                                        {inst.student_count_estimate?.toLocaleString() || 0}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">Registration</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <div className="w-3.5 h-1 px-1 bg-primary/20 rounded-full" />
                                        {inst.is_manual ? 'Manual' : 'System'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest pt-2">
                                <span className="group-hover:text-primary transition-colors italic">Review Metadata</span>
                                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-white transform group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full glass p-24 rounded-[3rem] text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-500">
                            <Filter className="w-10 h-10" />
                        </div>
                        <p className="text-muted-foreground font-bold text-xl">No institutions match this criteria.</p>
                    </div>
                )}
            </div>

            {/* Detailed Overlay */}
            {selectedInst && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="fixed inset-0"
                        onClick={() => !isActionLoading && setSelectedInst(null)}
                    />
                    <div className="glass w-full max-w-2xl h-full rounded-[3.5rem] overflow-y-auto relative z-10 border-white/10 shadow-2xl animate-in slide-in-from-right duration-500 lg:duration-700 no-scrollbar">
                        <div className="sticky top-0 p-8 glass-dark border-b border-white/5 flex items-center justify-between z-20">
                            <h2 className="text-2xl font-black text-white">Institutional <span className="text-primary italic">Profile</span></h2>
                            <button
                                onClick={() => setSelectedInst(null)}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-10 pb-32">
                            {/* --- IDENTITY SECTION --- */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-lg shadow-primary/50" />
                                    <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">Domain Identity</span>
                                </div>
                                <div className="glass px-8 py-10 rounded-[2.5rem] border-white/5 bg-white/[0.02] flex items-center gap-8">
                                    <div className="w-24 h-24 rounded-[2rem] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                                        <Building2 className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-white leading-tight tracking-tight">{selectedInst.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${selectedInst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.1)]" :
                                                selectedInst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                                }`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-2 inline-block" />
                                                {selectedInst.status}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-xl text-[10px] text-gray-500 font-bold border border-white/5">
                                                <Clock className="w-3 h-3" />
                                                Registered {new Date(selectedInst.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- OPERATIONAL METRICS --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                        <Globe className="w-3.5 h-3.5" /> Web Governance
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-white font-black text-xl tracking-tight">{selectedInst.domain}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Authorized Academic Domain</p>
                                    </div>
                                </div>
                                <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                        <Users className="w-3.5 h-3.5" /> Learner Capacity
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-white font-black text-xl tracking-tight">{selectedInst.student_count_estimate?.toLocaleString() || "Not specified"}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estimated User Pool</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- CONTACT & GOVERNANCE --- */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-pink-500 rounded-full shadow-lg shadow-pink-500/50" />
                                    <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">Administrative Hub</span>
                                </div>
                                <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">
                                                <Mail className="w-3 h-3 text-primary/60" /> Point of Contact
                                            </div>
                                            <p className="text-white font-bold tracking-tight text-sm truncate">{selectedInst.contact_email}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">
                                                <Phone className="w-3 h-3 text-green-500/60" /> Registry Number
                                            </div>
                                            <p className="text-white font-bold tracking-tight text-sm">{selectedInst.contact_number || "Confidential/Unset"}</p>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-white/5 space-y-2">
                                        <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-[0.15em]">
                                            <MapPin className="w-3 h-3 text-red-500/60" /> Registered Headquarters
                                        </div>
                                        <p className="text-white/80 font-medium italic text-sm leading-relaxed">{selectedInst.address || "Digital-Only Establishment / No Address Provided"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- VERIFICATION CARD --- */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                                    <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">Registry verification</span>
                                </div>
                                <div className="glass-dark p-8 rounded-[2.5rem] border-white/5 bg-black/40 border-dashed border-2 flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-primary/40" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white">Application Payload</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">JSON Secure Archive</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-primary/40 font-mono tracking-tighter self-start">#ID_{String(selectedInst.id || "").slice(-8) || "N/A"}</span>
                                    </div>

                                    <div className="bg-black/60 rounded-3xl p-6 relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative font-mono text-[10px] leading-relaxed text-primary/70 max-h-[200px] overflow-y-auto no-scrollbar">
                                            {JSON.stringify(selectedInst.registration_data || selectedInst, null, 4)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="absolute bottom-0 left-0 w-full p-8 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center gap-4">
                            {selectedInst.status === "APPROVED" ? (
                                <div className="w-full flex items-center justify-between px-4">
                                    <div className="flex items-center gap-3 text-green-400">
                                        <CheckCircle2 className="w-6 h-6" />
                                        <span className="font-black">INSTITUTION ACTIVE</span>
                                    </div>
                                    <button
                                        onClick={() => handleAction(selectedInst.slug, "reject")}
                                        disabled={isActionLoading}
                                        className="px-6 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        Revoke Access
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleAction(selectedInst.slug, "approve")}
                                        disabled={isActionLoading}
                                        className="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {isActionLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Set to Approved"}
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedInst.slug, "mark_review")}
                                        disabled={isActionLoading}
                                        className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all font-mono text-xs"
                                    >
                                        Flag for Review
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedInst.slug, "reject")}
                                        disabled={isActionLoading}
                                        className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-2xl border border-red-500/10 transition-all"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstitutionAdmin;
