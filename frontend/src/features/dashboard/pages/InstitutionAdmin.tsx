import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../auth/api/base";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import {
    Plus, Globe, Building2, Search, CheckCircle2, XCircle, Clock,
    AlertCircle, FileText, Mail, Users, Phone, MapPin, Filter,
    ArrowRight, Loader2, Sparkles, ShieldCheck, Zap
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getAccessToken } from "../../auth/utils/tokenStorage";
import { extractApiError } from "../../auth/utils/extractApiError";

export const InstitutionAdmin = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [selectedInst, setSelectedInst] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null); // tracks which button is spinning
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isQuantumProcessing, setIsQuantumProcessing] = useState(false);
    const [currentLoreIdx, setCurrentLoreIdx] = useState(0);
    const [approvePhaseIdx, setApprovePhaseIdx] = useState(0);
    const [approveProgress, setApproveProgress] = useState(0);
    const [approveComplete, setApproveComplete] = useState(false);

    const approvePhases = [
        { label: "Initializing Schema Isolation", icon: "🔐", color: "bg-primary", target: 18 },
        { label: "Running PostgreSQL Migrations", icon: "🗄️", color: "bg-blue-500", target: 42 },
        { label: "Seeding Registry Tables", icon: "📦", color: "bg-violet-500", target: 68 },
        { label: "Governance Verification", icon: "🛡️", color: "bg-amber-500", target: 88 },
        { label: "Finalizing Tenant Environment", icon: "✅", color: "bg-emerald-500", target: 100 },
    ];

    const [newInst, setNewInst] = useState({
        name: "",
        slug: "",
        domain: "",
        contact_email: "",
        contact_number: "",
        address: "",
        student_count_estimate: ""
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            await apiClient.post(`superadmin/institutions/`,
                { ...newInst, registration_data: { source: "manual_onboarding" } }
            );
            toast.success(`Institution ${newInst.name} onboarded successfully!`);
            await fetchInstitutions();
            setIsCreateModalOpen(false);
            setNewInst({ name: "", slug: "", domain: "", contact_email: "", contact_number: "", address: "", student_count_estimate: "" });
        } catch (err: any) {
            console.error("[Manual-Reg] Error caught:", err);
            const errMsg = extractApiError(err, "Failed to onboard institution.");
            console.log("[Manual-Reg] Toasting error message:", errMsg);
            toast.error(errMsg, { duration: 6000, id: "reg-error" });
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchInstitutions = useCallback(async () => {
        try {
            const res = await apiClient.get(`superadmin/institutions/`);
            // Defensively handle both direct arrays and DRF paginated responses
            const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
            setInstitutions(data);
        } catch (err) {
            console.error("Failed to fetch institutions", err);
            setInstitutions([]); // Ensure it's always an array
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ──── Lore carousel ──────────────────────────────────────────────
    useEffect(() => {
        let interval: any;
        if (isQuantumProcessing) {
            interval = setInterval(() => {
                setCurrentLoreIdx(prev => (prev + 1) % quantumLore.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isQuantumProcessing]);

    // ──── Approve: animated phase progress ticker ────────────────────
    useEffect(() => {
        if (!isQuantumProcessing) return;
        setApprovePhaseIdx(0);
        setApproveProgress(0);
        setApproveComplete(false);

        let phase = 0;
        const tick = setInterval(() => {
            setApproveProgress(prev => {
                const target = approvePhases[phase]?.target ?? 100;
                const next = prev + (Math.random() * 3 + 1); // 1-4% per tick
                if (next >= target && phase < approvePhases.length - 1) {
                    phase++;
                    setApprovePhaseIdx(phase);
                }
                return Math.min(next, target);
            });
        }, 300);

        return () => clearInterval(tick);
    }, [isQuantumProcessing]);

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

    // 🚀 Sync selected institution with refreshed list to fix stale status/data
    useEffect(() => {
        if (selectedInst) {
            const updated = institutions.find(i => i.slug === selectedInst.slug || i.id === selectedInst.id);
            if (updated) setSelectedInst(updated);
        }
    }, [institutions]);

    const handleAction = async (slug: string, action: string) => {
        if (!slug) {
            toast.error(`Cannot perform ${action}: This institution is missing a unique slug identifier.`);
            return;
        }

        setIsActionLoading(true);
        setActiveAction(action);

        const isRegrant = action === "approve" && selectedInst?.status === "REJECTED";
        const effectiveAction = isRegrant ? "grant_access" : action;

        if (action === "approve" && !isRegrant) {
            setIsQuantumProcessing(true);
            setApproveProgress(0);
            setApprovePhaseIdx(0);
            setApproveComplete(false);
        }

        try {
            await apiClient.post(`superadmin/institutions/${slug}/${effectiveAction}/`, {});

            if (action === "approve") {
                if (isRegrant) {
                    toast.success(`Access restored for ${selectedInst?.name}. Their environment is now active again.`);
                } else {
                    // Snap bar to 100% and show success state briefly
                    setApproveProgress(100);
                    setApprovePhaseIdx(approvePhases.length - 1);
                    setApproveComplete(true);
                    toast.success(`✅ ${slug} is now LIVE — tenant environment provisioned!`, { duration: 6000 });
                    await new Promise(r => setTimeout(r, 1800)); // let success state breathe
                }
            } else {
                const actionLabel = action === "reject" ? "rejected" : action === "mark_review" ? "flagged for review" : action;
                toast.success(`Institution ${actionLabel} successfully.`);
            }
            await fetchInstitutions();
            setSelectedInst(null);
        } catch (err: any) {
            console.error(`Failed to perform action ${action}`, err);
            toast.error(extractApiError(err, `Failed to ${action} institution.`));
        } finally {
            setIsActionLoading(false);
            setActiveAction(null);
            if (action === "approve") {
                setTimeout(() => setIsQuantumProcessing(false), 400);
            }
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
        const s = searchTerm.toLowerCase();
        const matchesSearch =
            (inst.name || "").toLowerCase().includes(s) ||
            (inst.slug || "").toLowerCase().includes(s) ||
            (inst.domain || "").toLowerCase().includes(s);
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

            {/* ── Institution Detail Dialog ─────────────────────────────────── */}
            <Dialog open={!!selectedInst} onOpenChange={(open) => { if (!open && !isActionLoading) setSelectedInst(null); }}>
                <DialogContent className="w-full max-w-2xl max-h-[90vh] bg-[#0a0d12] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden p-0">
                    {/* Sticky header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center text-white shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">Institutional <span className="text-primary italic">Profile</span></h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{selectedInst?.domain}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => !isActionLoading && setSelectedInst(null)}
                            disabled={isActionLoading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all disabled:opacity-30"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    {selectedInst && (
                        <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

                            {/* Identity card */}
                            <div className="glass px-6 py-5 rounded-2xl border-white/5 bg-white/[0.02] flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-xl shadow-primary/30 shrink-0">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-2 min-w-0">
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight truncate">{selectedInst.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${selectedInst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                            selectedInst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                                selectedInst.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                            }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                            {selectedInst.status}
                                        </span>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-xl text-[9px] text-gray-500 font-bold border border-white/5">
                                            <Clock className="w-3 h-3" />
                                            Registered {new Date(selectedInst.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        {selectedInst.is_manual && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-xl text-[9px] text-primary font-bold border border-primary/10">
                                                Manual Entry
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Metrics row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass p-5 rounded-2xl border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                        <Globe className="w-3.5 h-3.5" /> Web Governance
                                    </div>
                                    <p className="text-white font-black text-lg tracking-tight">{selectedInst.domain}</p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Authorized Academic Domain</p>
                                </div>
                                <div className="glass p-5 rounded-2xl border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                        <Users className="w-3.5 h-3.5" /> Learner Capacity
                                    </div>
                                    <p className="text-white font-black text-lg tracking-tight">{selectedInst.student_count_estimate?.toLocaleString() || "—"}</p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Estimated User Pool</p>
                                </div>
                            </div>

                            {/* Contact grid */}
                            <div className="glass p-6 rounded-2xl border-white/5 space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                                    <Phone className="w-3.5 h-3.5" /> Administrative Hub
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                            <Mail className="w-3 h-3 text-primary/60" /> Contact
                                        </div>
                                        <p className="text-white font-bold text-sm truncate">{selectedInst.contact_email || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                            <Phone className="w-3 h-3 text-green-500/60" /> Phone
                                        </div>
                                        <p className="text-white font-bold text-sm">{selectedInst.contact_number || "—"}</p>
                                    </div>
                                </div>
                                {selectedInst.address && (
                                    <div className="pt-3 border-t border-white/5 space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                            <MapPin className="w-3 h-3 text-red-500/60" /> Campus Address
                                        </div>
                                        <p className="text-white/80 font-medium italic text-sm">{selectedInst.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* JSON payload */}
                            <div className="glass-dark p-5 rounded-2xl border-white/5 bg-black/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-primary/40" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">Application Payload</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">JSON Secure Archive</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-primary/40 font-mono">#ID_{String(selectedInst.id || "").slice(-8) || "N/A"}</span>
                                </div>
                                <div className="bg-black/60 rounded-xl p-4 group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <pre className="relative font-mono text-[10px] leading-relaxed text-primary/60 max-h-[150px] overflow-y-auto">
                                        {JSON.stringify(selectedInst.registration_data || selectedInst, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pinned action footer */}
                    <div className="border-t border-white/5 bg-black/60 px-6 py-4 shrink-0">
                        {selectedInst?.status === "APPROVED" ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-black text-sm">INSTITUTION ACTIVE</span>
                                </div>
                                <button
                                    onClick={() => handleAction(selectedInst?.slug, "reject")}
                                    disabled={isActionLoading}
                                    className="h-10 px-5 rounded-xl text-red-400 hover:bg-red-500/10 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40"
                                >
                                    {activeAction === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Revoke Access
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                {/* Approve */}
                                <button
                                    onClick={() => handleAction(selectedInst?.slug, "approve")}
                                    disabled={isActionLoading}
                                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {activeAction === "approve" ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            {selectedInst?.status === "REJECTED" ? "Regrant Access" : "Approve & Provision"}
                                        </>
                                    )}
                                </button>
                                {/* Flag Review */}
                                <button
                                    onClick={() => handleAction(selectedInst?.slug, "mark_review")}
                                    disabled={isActionLoading}
                                    className="h-11 px-5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center gap-2 disabled:opacity-40"
                                >
                                    {activeAction === "mark_review" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-blue-400" />
                                    )}
                                    Review
                                </button>
                                {/* Reject */}
                                <button
                                    onClick={() => handleAction(selectedInst?.slug, "reject")}
                                    disabled={isActionLoading}
                                    className="h-11 px-5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-2xl border border-red-500/20 transition-all flex items-center gap-2 disabled:opacity-40"
                                >
                                    {activeAction === "reject" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ✅ Manual Register Modal — via Dialog for proper centering */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
                if (!open && isActionLoading) return; // Prevent closing while processing
                setIsCreateModalOpen(open);
            }}>
                <DialogContent className="w-full max-w-2xl max-h-[90vh] bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Ambient glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none -z-10" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 blur-[60px] rounded-full pointer-events-none -z-10" />

                    {/* Header (pinned) */}
                    <div className="flex items-start justify-between p-7 pb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">
                                    Manual <span className="text-primary italic">Registration</span>
                                </h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Onboard a trusted academic partner</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all group shrink-0 ml-4"
                        >
                            <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                        </button>
                    </div>

                    <div className="h-px bg-white/5 mx-7 shrink-0" />

                    {/* Scrollable form body */}
                    <form
                        id="manual-reg-form"
                        onSubmit={handleCreate}
                        className="flex-1 overflow-y-auto px-7 py-5 space-y-5 min-h-0"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                    >
                        {/* Row 1: Name + Slug */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Institution Name *</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. MIT"
                                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                            setNewInst({ ...newInst, name, slug });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Unique Slug *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. mit"
                                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs font-bold placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.slug}
                                    onChange={(e) => setNewInst({ ...newInst, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                />
                            </div>
                        </div>

                        {/* Row 2: Domain + Students */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Official Domain *</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. mit.edu"
                                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.domain}
                                        onChange={(e) => setNewInst({ ...newInst, domain: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Estimated Students</label>
                                <div className="relative group">
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.student_count_estimate}
                                        onChange={(e) => setNewInst({ ...newInst, student_count_estimate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Email + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Admin Contact Email *</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="admin@university.edu"
                                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.contact_email}
                                        onChange={(e) => setNewInst({ ...newInst, contact_email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Contact Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="+1 (555) 000-0000"
                                        className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.contact_number}
                                        onChange={(e) => setNewInst({ ...newInst, contact_number: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Address (full width) */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Campus Address</label>
                            <div className="relative group">
                                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <textarea
                                    placeholder="City, State, Country"
                                    rows={2}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                                    value={newInst.address}
                                    onChange={(e) => setNewInst({ ...newInst, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </form>

                    {/* Footer (pinned) */}
                    <div className="h-px bg-white/5 mx-7 shrink-0" />
                    <div className="flex items-center justify-between p-6 shrink-0 gap-4">
                        <p className="text-[9px] text-gray-600 font-black flex items-center gap-1.5 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                            Manual Onboarding — Admin Privileged
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-10 px-5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest transition-all"
                                disabled={isActionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                form="manual-reg-form"
                                type="submit"
                                disabled={isActionLoading}
                                className="h-10 px-6 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isActionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <><ArrowRight className="w-4 h-4" /> Finalize Registration</>
                                )}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* ✅ Quantum Provisioning Modal — high-intensity overlay */}
            <Dialog open={isQuantumProcessing} onOpenChange={() => { }}>
                <DialogContent className="max-w-xl bg-transparent border-none shadow-none p-0 z-[200]">
                    <div className="w-full space-y-8 relative">

                        {/* Glow orbs */}
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/15 blur-[100px] rounded-full pointer-events-none" />

                        {/* Header */}
                        <div className="text-center space-y-3 relative">
                            <div className="relative inline-block">
                                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border shadow-2xl transition-all duration-700 ${approveComplete
                                    ? "bg-emerald-500/20 border-emerald-500/40 shadow-emerald-500/20"
                                    : "bg-primary/10 border-primary/30 shadow-primary/20"
                                    }`}>
                                    {approveComplete
                                        ? <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                        : <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                    }
                                </div>
                                {!approveComplete && (
                                    <div className="absolute -inset-2 rounded-[2.5rem] border-2 border-primary/20 border-t-primary/60 animate-spin" style={{ animationDuration: '3s' }} />
                                )}
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-xl animate-bounce">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tight">
                                    {approveComplete ? (
                                        <>Environment <span className="text-emerald-400 italic">Live</span></>
                                    ) : (
                                        <>Quantum <span className="text-primary italic">Provisioning</span></>
                                    )}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">
                                    Isolated Tenant Environment Initialization
                                </p>
                            </div>
                        </div>

                        {/* Progress section */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-5 relative">
                            {/* Overall bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Overall Progress</span>
                                    <span className={`text-sm font-black tabular-nums ${approveComplete ? "text-emerald-400" : "text-primary"
                                        }`}>{Math.round(approveProgress)}%</span>
                                </div>
                                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 shadow-lg ${approveComplete ? "bg-emerald-500 shadow-emerald-500/40" : "bg-primary shadow-primary/40"
                                            }`}
                                        style={{ width: `${approveProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Phase steps */}
                            <div className="space-y-2">
                                {approvePhases.map((phase, i) => {
                                    const isDone = i < approvePhaseIdx || approveComplete;
                                    const isActive = i === approvePhaseIdx && !approveComplete;
                                    return (
                                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500 ${isActive ? "bg-primary/10 border border-primary/20" :
                                            isDone ? "bg-emerald-500/5 border border-emerald-500/10" :
                                                "border border-transparent"
                                            }`}>
                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-sm transition-all duration-500 ${isDone ? "bg-emerald-500/20" :
                                                isActive ? "bg-primary/20" :
                                                    "bg-white/5"
                                                }`}>
                                                {isDone ? <span className="text-emerald-400 text-xs">✓</span> :
                                                    isActive ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> :
                                                        <span className="text-gray-700 text-xs font-black">{i + 1}</span>}
                                            </div>
                                            <span className="text-xs font-bold flex-1 truncate">
                                                <span className={isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"}>
                                                    {phase.icon} {phase.label}
                                                </span>
                                            </span>
                                            {isActive && (
                                                <div className="shrink-0 w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full animate-progress-buffer" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Did you know card */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Did you know?</p>
                                <p className="text-white/70 font-medium italic text-sm leading-relaxed animate-in slide-in-from-bottom duration-700">
                                    {quantumLore[currentLoreIdx]}
                                </p>
                            </div>
                        </div>

                        {/* Footer badges */}
                        <div className="flex items-center justify-center gap-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-green-500/40" /> Encrypted Tunnel
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500/40" /> DB Isolation
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                                v2.4.0_SECURE
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// --- DATA: Premium Lore/Facts ---
const quantumLore = [
    "AUIP uses PostgreSQL Schema Isolation to ensure every institution lives in its own high-security digital vault.",
    "Our V2 Kernel enables students to access global resources while their personal data remains locked in tenant-specific storage.",
    "The 'Quantum Shield' prevents cross-tenant data leaks using dynamic search_path enforcement at the session level.",
    "AI-driven monitoring tracks unusual login patterns across all unified institutions in real-time.",
    "Onboarding a new university triggers a multi-stage migration flow that pre-seeds essential administrative registry data.",
    "The AUIP platform is designed to handle over 10 million concurrent student sessions with sub-100ms latency."
];

export default InstitutionAdmin;
