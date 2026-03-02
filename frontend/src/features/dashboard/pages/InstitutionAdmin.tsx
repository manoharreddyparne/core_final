import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../auth/api/base";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import {
    Plus, Globe, Building2, Search, CheckCircle2, XCircle, Clock,
    AlertCircle, FileText, Mail, Users, Phone, MapPin, Filter,
    ArrowRight, Loader2, Sparkles, ShieldCheck, Zap, Cpu, Lock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getAccessToken } from "../../auth/utils/tokenStorage";
import { extractApiError } from "../../auth/utils/extractApiError";
import { logger } from "../../../shared/utils/logger";

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
        { label: "Initializing Schema Isolation", icon: "🔐", color: "bg-primary", target: 5 },
        { label: "Running PostgreSQL Migrations", icon: "🗄️", color: "bg-blue-500", target: 85 }, // This takes ~3 minutes
        { label: "Seeding Registry Tables", icon: "📦", color: "bg-violet-500", target: 92 },
        { label: "Governance Verification", icon: "🛡️", color: "bg-amber-500", target: 97 },
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
            logger.error("[Manual-Reg] Error caught:", err);
            const errMsg = extractApiError(err, "Failed to onboard institution.");
            logger.log("[Manual-Reg] Toasting error message:", errMsg);
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
            logger.error("Failed to fetch institutions", err);
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
    // Replaced simulation with REAL-TIME WebSocket Streaming!
    useEffect(() => {
        if (!isQuantumProcessing) return;
        setApprovePhaseIdx(0);
        setApproveProgress(0);
        setApproveComplete(false);
    }, [isQuantumProcessing]);

    useEffect(() => {
        fetchInstitutions();

        // 🚀 REAL-TIME UPDATES: Listen for WebSocket events from useSessionSocket
        const handleWsUpdate = (event: any) => {
            const data = event.detail;
            logger.log("[Institution-Live] Received real-time update:", data);

            if (data?.type === "PROVISION_PROGRESS") {
                const progress = data.progress;
                setApproveProgress(progress);

                // Set phase based on progress and phases array
                let newPhase = 0;
                for (let i = 0; i < approvePhases.length; i++) {
                    if (progress >= approvePhases[i].target) {
                        newPhase = i + 1;
                    }
                }
                setApprovePhaseIdx(Math.min(newPhase, approvePhases.length - 1));

                if (progress >= 100) {
                    setApproveComplete(true);
                    toast.success("✅ Environment LIVE — Isolation Kernel Ready", { id: "provisioning-start", duration: 5000 });
                    fetchInstitutions();
                    // Keep active state for a bit for visual consistency
                    setTimeout(() => {
                        setIsQuantumProcessing(false);
                        setSelectedInst(null);
                        setActiveAction(null);
                        setIsActionLoading(false);
                    }, 2500);
                }
            } else {
                fetchInstitutions();
            }
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
            // Approve calls are now SYNCHRONOUS — schema creation + migrations happen before response.
            // This can take 2-3 minutes on remote DB. Set a 5-minute timeout.
            const axiosConfig = effectiveAction === "approve" ? { timeout: 300000 } : {};
            await apiClient.post(`superadmin/institutions/${slug}/${effectiveAction}/`, {}, axiosConfig);

            if (action === "approve") {
                if (isRegrant) {
                    toast.success(`Access restored for ${selectedInst?.name}. Their environment is now active again.`);
                    await fetchInstitutions();
                    setSelectedInst(null);
                } else {
                    // We DO NOT set complete here anymore. 
                    // WE wait for the WebSocket to tell us it's 100%.
                    toast.success(`Provisioning initialized for ${slug}. Building isolated environment...`, { id: "provisioning-start" });
                }
            } else {
                const actionLabel = action === "reject" ? "rejected" : action === "mark_review" ? "flagged for review" : action;
                toast.success(`Institution ${actionLabel} successfully.`);
                await fetchInstitutions();
                setSelectedInst(null);
            }
        } catch (err: any) {
            logger.error(`Failed to perform action ${action}`, err);
            toast.error(extractApiError(err, `Failed to ${action} institution.`));
        } finally {
            // If it's approval, we keep action loading / active until WS 100% or error
            if (action !== "approve") {
                setIsActionLoading(false);
                setActiveAction(null);
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
            default: return <Clock className="w-4 h-4 text-[var(--text-secondary)]" />;
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
                    <h1 className="text-5xl font-black text-[var(--text-primary)] px-1 tracking-tight">Institutional <span className="text-primary italic">Hub</span></h1>
                    <div className="flex items-center gap-2 px-1 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span>Domain Isolation & Governance Control Center</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass px-4 py-2 rounded-2xl border-[var(--border)] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Real-Time Sync</span>
                    </div>
                    <div className="glass px-4 py-2 rounded-2xl border-[var(--border)] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">{pendingCount} Pending Approvals</span>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 premium-gradient text-[var(--text-primary)] font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Manual Register
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative group w-full lg:max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search universities, domains, or slugs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-white/10 rounded-[1.5rem] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto font-bold no-scrollbar">
                    {["ALL", "PENDING", "REVIEW", "APPROVED", "REJECTED"].map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-5 py-2.5 rounded-xl text-xs transition-all border whitespace-nowrap ${activeFilter === f
                                ? "bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10"
                                : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
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
                            className="bg-[var(--bg-card)] border border-white/10 p-8 rounded-[2rem] space-y-6 hover:translate-y-[-4px] hover:border-primary/50 hover:bg-[var(--bg-card)] transition-all group relative cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-[var(--text-primary)] transition-all shadow-inner">
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
                                <h3 className="text-xl font-black text-[var(--text-primary)] leading-tight">{inst.name}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
                                    <Globe className="w-3 h-3 text-primary/40" />
                                    {inst.domain}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border)]">
                                <div className="space-y-1">
                                    <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-tighter">Learner Base</div>
                                    <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-primary/60" />
                                        {inst.student_count_estimate?.toLocaleString() || 0}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-tighter">Registration</div>
                                    <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <div className="w-3.5 h-1 px-1 bg-primary/20 rounded-full" />
                                        {inst.is_manual ? 'Manual' : 'System'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest pt-2">
                                <span className="group-hover:text-primary transition-colors italic">Review Metadata</span>
                                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-[var(--text-primary)] transform group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full glass p-24 rounded-[3rem] text-center space-y-4">
                        <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mx-auto text-[var(--text-secondary)]">
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
                    <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] bg-black/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center text-[var(--text-primary)] shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Institutional <span className="text-primary italic">Profile</span></h2>
                                <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">{selectedInst?.domain}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => !isActionLoading && setSelectedInst(null)}
                            disabled={isActionLoading}
                            className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    {selectedInst && (
                        <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

                            {/* Identity card */}
                            <div className="glass px-6 py-5 rounded-2xl border-[var(--border)] bg-white/[0.02] flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-[var(--text-primary)] shadow-xl shadow-primary/30 shrink-0">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-2 min-w-0">
                                    <h3 className="text-2xl font-black text-[var(--text-primary)] leading-tight tracking-tight truncate">{selectedInst.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${selectedInst.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                            selectedInst.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                                selectedInst.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                            }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                            {selectedInst.status}
                                        </span>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-xl text-[9px] text-[var(--text-secondary)] font-bold border border-[var(--border)]">
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
                                <div className="glass p-5 rounded-2xl border-[var(--border)] space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                        <Globe className="w-3.5 h-3.5" /> Web Governance
                                    </div>
                                    <p className="text-[var(--text-primary)] font-black text-lg tracking-tight">{selectedInst.domain}</p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Authorized Academic Domain</p>
                                </div>
                                <div className="glass p-5 rounded-2xl border-[var(--border)] space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                        <Users className="w-3.5 h-3.5" /> Learner Capacity
                                    </div>
                                    <p className="text-[var(--text-primary)] font-black text-lg tracking-tight">{selectedInst.student_count_estimate?.toLocaleString() || "—"}</p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Estimated User Pool</p>
                                </div>
                            </div>

                            {/* Contact grid */}
                            <div className="glass p-6 rounded-2xl border-[var(--border)] space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                                    <Phone className="w-3.5 h-3.5" /> Administrative Hub
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                            <Mail className="w-3 h-3 text-primary/60" /> Contact
                                        </div>
                                        <p className="text-[var(--text-primary)] font-bold text-sm truncate">{selectedInst.contact_email || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                            <Phone className="w-3 h-3 text-green-500/60" /> Phone
                                        </div>
                                        <p className="text-[var(--text-primary)] font-bold text-sm">{selectedInst.contact_number || "—"}</p>
                                    </div>
                                </div>
                                {selectedInst.address && (
                                    <div className="pt-3 border-t border-[var(--border)] space-y-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                            <MapPin className="w-3 h-3 text-red-500/60" /> Campus Address
                                        </div>
                                        <p className="text-[var(--text-primary)]/80 font-medium italic text-sm">{selectedInst.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* JSON payload */}
                            <div className="glass-dark p-5 rounded-2xl border-[var(--border)] bg-black/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-primary/40" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-[var(--text-primary)]">Application Payload</p>
                                            <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">JSON Secure Archive</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-primary/40 font-mono">#ID_{String(selectedInst.id || "").slice(-8) || "N/A"}</span>
                                </div>
                                <div className="bg-[var(--bg-base)]/60 rounded-xl p-4 group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <pre className="relative font-mono text-[10px] leading-relaxed text-primary/60 max-h-[150px] overflow-y-auto">
                                        {JSON.stringify(selectedInst.registration_data || selectedInst, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pinned action footer */}
                    <div className="border-t border-[var(--border)] bg-[var(--bg-base)]/60 px-6 py-4 shrink-0">
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
                                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
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
                                    className="h-11 px-5 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center gap-2 disabled:opacity-40"
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
                                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                                    Manual <span className="text-primary italic">Registration</span>
                                </h2>
                                <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-0.5">Onboard a trusted academic partner</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all group shrink-0 ml-4"
                        >
                            <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                        </button>
                    </div>

                    <div className="h-px bg-[var(--bg-card)] mx-7 shrink-0" />

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
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Institution Name *</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. MIT"
                                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
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
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Unique Slug *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. mit"
                                    className="w-full h-11 px-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-mono text-xs font-bold placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.slug}
                                    onChange={(e) => setNewInst({ ...newInst, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                />
                            </div>
                        </div>

                        {/* Row 2: Domain + Students */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Official Domain *</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. mit.edu"
                                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.domain}
                                        onChange={(e) => setNewInst({ ...newInst, domain: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Estimated Students</label>
                                <div className="relative group">
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.student_count_estimate}
                                        onChange={(e) => setNewInst({ ...newInst, student_count_estimate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Email + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Admin Contact Email *</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="admin@university.edu"
                                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.contact_email}
                                        onChange={(e) => setNewInst({ ...newInst, contact_email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Contact Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="+1 (555) 000-0000"
                                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        value={newInst.contact_number}
                                        onChange={(e) => setNewInst({ ...newInst, contact_number: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Address (full width) */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Campus Address</label>
                            <div className="relative group">
                                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <textarea
                                    placeholder="City, State, Country"
                                    rows={2}
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                                    value={newInst.address}
                                    onChange={(e) => setNewInst({ ...newInst, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </form>

                    {/* Footer (pinned) */}
                    <div className="h-px bg-[var(--bg-card)] mx-7 shrink-0" />
                    <div className="flex items-center justify-between p-6 shrink-0 gap-4">
                        <p className="text-[9px] text-gray-600 font-black flex items-center gap-1.5 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                            Manual Onboarding — Admin Privileged
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-10 px-5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] font-black text-xs uppercase tracking-widest transition-all"
                                disabled={isActionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                form="manual-reg-form"
                                type="submit"
                                disabled={isActionLoading}
                                className="h-10 px-6 bg-primary hover:bg-primary/90 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
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
            {/* ✅ Quantum Provisioning Modal — High-Performance wide layout */}
            <Dialog open={isQuantumProcessing} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] bg-transparent border-none shadow-none p-0 z-[200] outline-none overflow-hidden flex flex-col">
                    <div className="w-full bg-[#0d1117]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative flex flex-col flex-1 overflow-hidden shadow-[0_0_120px_rgba(var(--primary-rgb),0.1)]">

                        {/* Status Bar (Pinned Top) */}
                        <div className="flex items-center justify-between px-2 mb-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-700 ${approveComplete ? "bg-emerald-500/20 border-emerald-500/30" : "bg-primary/20 border-primary/30"}`}>
                                    {approveComplete ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">
                                        {approveComplete ? "Environment Live" : "Quantum Provisioning"}
                                    </h3>
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">v2.4 Kernel • Real-time Migrations</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-xl font-black tabular-nums ${approveComplete ? "text-emerald-400" : "text-primary"}`}>{Math.round(approveProgress)}%</span>
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden mt-1 border border-white/5">
                                    <div
                                        className={`h-full transition-all duration-700 ease-out ${approveComplete ? "bg-emerald-500" : "bg-primary"}`}
                                        style={{
                                            width: `${approveProgress}%`,
                                            backgroundColor: approveComplete ? undefined : 'var(--primary-solid)',
                                            boxShadow: approveComplete ? '0 0 10px rgba(16, 185, 129, 0.3)' : '0 0 10px rgba(59, 130, 246, 0.3)'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area (Two Columns on Desktop, Scrollable) */}
                        <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 space-y-6 lg:space-y-0 lg:flex lg:gap-8 custom-scrollbar">

                            {/* LEFT: Progress Steps */}
                            <div className="lg:w-[55%] space-y-4">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Deployment Pipeline</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {approvePhases.map((phase, i) => {
                                        const isDone = i < approvePhaseIdx || approveComplete;
                                        const isActive = i === approvePhaseIdx && !approveComplete;

                                        // Calculate sub-progress for current active phase
                                        const phaseStart = i === 0 ? 0 : approvePhases[i - 1].target;
                                        const phaseEnd = phase.target;
                                        const currentPhaseWidth = Math.min(100, Math.max(0, ((approveProgress - phaseStart) / (phaseEnd - phaseStart)) * 100));

                                        return (
                                            <div key={i} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 border ${isActive ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]" :
                                                isDone ? "bg-emerald-500/5 border-emerald-500/10 opacity-70" :
                                                    "bg-black/20 border-white/5 opacity-40 grayscale"
                                                }`}>
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm transition-all duration-500 ${isDone ? "bg-emerald-500/20 text-emerald-400" :
                                                    isActive ? "bg-primary/30 text-primary" :
                                                        "bg-black/40 text-gray-700"
                                                    }`}>
                                                    {isDone ? <CheckCircle2 className="w-4 h-4" /> :
                                                        isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                            <span className="text-xs font-black">{i + 1}</span>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[11px] font-black uppercase tracking-wider transition-colors duration-500 ${isDone ? "text-emerald-400" : isActive ? "text-white" : "text-gray-600"}`}>
                                                        {phase.icon} {phase.label}
                                                    </p>
                                                    {isActive && (
                                                        <div className="text-[8px] text-primary/60 font-mono mt-0.5 animate-pulse">
                                                            Processing sub-routine... {Math.round(currentPhaseWidth)}%
                                                        </div>
                                                    )}
                                                </div>
                                                {(isActive || isDone) && (
                                                    <div className="shrink-0 w-24 h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className={`h-full transition-all duration-500 ease-out ${isDone ? "bg-emerald-500" : "bg-primary"}`}
                                                            style={{
                                                                width: isDone ? "100%" : `${currentPhaseWidth}%`,
                                                                backgroundColor: isDone ? undefined : 'var(--primary-solid)'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* RIGHT: Lore & Insights */}
                            <div className="lg:w-[45%] flex flex-col gap-6">
                                <div className="space-y-3 flex-1 flex flex-col justify-center">
                                    <div className="bg-primary/10 border border-primary/15 rounded-3xl p-8 relative overflow-hidden group">
                                        <Zap className="absolute -top-4 -right-4 w-24 h-24 text-primary/10 group-hover:scale-110 transition-transform duration-1000" />
                                        <div className="relative">
                                            <div className="flex items-center gap-2 text-primary mb-3">
                                                <Sparkles className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quantum Insight</span>
                                            </div>
                                            <p className="text-white font-bold text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                {quantumLore[currentLoreIdx]}
                                            </p>
                                        </div>
                                    </div>

                                    {/* System Metrics (Pinned Bottom of Right Col) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 items-center justify-center text-center">
                                            <ShieldCheck className="w-5 h-5 text-green-500/40 mb-1" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Access Protocol</span>
                                            <span className="text-[10px] text-white font-bold">Zero-Trust V2</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1 items-center justify-center text-center">
                                            <Globe className="w-5 h-5 text-blue-500/40 mb-1" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Network Edge</span>
                                            <span className="text-[10px] text-white font-bold">Encrypted SQL</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Badges (Pinned Bottom) */}
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-10 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] shrink-0">
                            <span className="flex items-center gap-2"><Lock className="w-3 h-3" /> Encrypted Tunnel</span>
                            <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Core V4 Initialized</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-mono">SECURE_ONBOARD</span>
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
