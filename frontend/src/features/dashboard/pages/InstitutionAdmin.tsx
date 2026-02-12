import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../auth/api/base";
import { getAccessToken } from "../../auth/utils/tokenStorage";
import { Plus, Globe, Building2, MoreVertical, Search, CheckCircle2, XCircle, Clock, AlertCircle, FileText, Mail, Users, Phone, MapPin, ChevronRight, Filter } from "lucide-react";

export const InstitutionAdmin = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [selectedInst, setSelectedInst] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchInstitutions = useCallback(async () => {
        try {
            const token = getAccessToken();
            const res = await axios.get(`${API_BASE_URL}users/superadmin/institutions/`, {
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
    }, [fetchInstitutions]);

    const handleAction = async (slug: string, action: string) => {
        setIsActionLoading(true);
        try {
            const token = getAccessToken();
            await axios.post(`${API_BASE_URL}users/superadmin/institutions/${slug}/${action}/`, {}, {
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
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-white">{pendingCount} Pending Approvals</span>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95">
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
                            className={`glass p-8 rounded-[2.5rem] space-y-6 hover:border-primary/50 transition-all group relative cursor-pointer ${inst.status === "PENDING" ? "border-amber-500/20" : "border-white/5"
                                }`}
                        >
                            {inst.status === "PENDING" && (
                                <div className="absolute -top-3 left-8 px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded-lg shadow-lg">
                                    New Request
                                </div>
                            )}

                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/10 group-hover:premium-gradient group-hover:text-white transition-all">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase ${inst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                        inst.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                                            inst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                                "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                    }`}>
                                    {getStatusIcon(inst.status)}
                                    {inst.status}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-extrabold text-white group-hover:text-primary transition-colors">{inst.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{inst.slug}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                    <Globe className="w-4 h-4 text-primary/60" />
                                    <span>{inst.domain}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                    <Users className="w-4 h-4 text-primary/60" />
                                    <span>~{inst.student_count_estimate || 0} Students</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold">
                                <span className="text-gray-500 italic">View Details</span>
                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
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

                        <div className="p-10 space-y-12 pb-32">
                            {/* Header Info */}
                            <div className="flex items-start gap-6">
                                <div className="w-24 h-24 rounded-[2rem] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/20">
                                    <Building2 className="w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white leading-tight">{selectedInst.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${selectedInst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                                selectedInst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                            }`}>
                                            {selectedInst.status}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono italic">Created on {new Date(selectedInst.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> Educational Domain
                                    </label>
                                    <p className="text-white font-bold text-lg">{selectedInst.domain}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Student Load Estimate
                                    </label>
                                    <p className="text-white font-bold text-lg">{selectedInst.student_count_estimate || 0} Learners</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Admin Point of Contact
                                    </label>
                                    <p className="text-white font-bold text-lg">{selectedInst.contact_email}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Contact Number
                                    </label>
                                    <p className="text-white font-bold text-lg">{selectedInst.contact_number || "Not provided"}</p>
                                </div>
                                <div className="col-span-full space-y-2 pt-4 border-t border-white/5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Registered Office/Campus
                                    </label>
                                    <p className="text-white font-medium italic">{selectedInst.address || "No address on record"}</p>
                                </div>
                            </div>

                            {/* Raw Application Data */}
                            {selectedInst.registration_data && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Full Application Payload
                                    </label>
                                    <pre className="p-6 bg-black/40 rounded-3xl border border-white/5 text-[10px] text-primary/80 font-mono overflow-x-auto">
                                        {JSON.stringify(selectedInst.registration_data, null, 2)}
                                    </pre>
                                </div>
                            )}
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
