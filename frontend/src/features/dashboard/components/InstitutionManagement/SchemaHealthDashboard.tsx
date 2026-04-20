import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../auth/api/base";
import { toast } from "react-hot-toast";
import { SyncProgressModal } from "./SyncProgressModal";
import {
    Activity,
    ShieldCheck,
    Database,
    AlertCircle,
    AlertTriangle,
    RefreshCcw,
    Zap,
    CheckCircle2,
    ChevronRight,
    ChevronDown,
    Loader2,
    Search,
    Filter,
    ArrowUpCircle,
    Package,
    XCircle,
    Clock,
    History,
    Shield,
    ArrowUpRight
} from "lucide-react";
import { logger } from "../../../../shared/utils/logger";

interface SchemaInstitution {
    id: number;
    name: string;
    slug: string;
    schema_name: string;
    is_current: boolean;
    pending_count: number;
    missing_tables_count: number;
    missing_tables?: { app: string; table: string; model: string }[];
    pending_migrations?: { app: string; display: string; migrations: string[]; count: number }[];
    last_update?: { version: string; date: string; duration: number } | null;
    status_code?: "UP_TO_DATE" | "OUT_OF_DATE" | "INCONSISTENT";
    error?: string;
}

interface HealthSummary {
    total_institutions: number;
    up_to_date: number;
    needs_update: number;
}

interface UpdateHistoryItem {
    id: number;
    version_label: string;
    status: string;
    migrations_count: number;
    migrations_applied: string[];
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
    triggered_by: string;
    error_message: string | null;
}

export const SchemaHealthDashboard = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<HealthSummary | null>(null);
    const [institutions, setInstitutions] = useState<SchemaInstitution[]>([]);
    const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
    const [history, setHistory] = useState<UpdateHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const fetchHealth = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("superadmin/institutions/schema_health/");
            const data = res.data?.data;
            if (data) {
                setSummary(data.summary || {
                    total_institutions: data.institutions?.length || 0,
                    up_to_date: data.institutions?.filter((i: any) => i.is_current).length || 0,
                    needs_update: data.institutions?.filter((i: any) => !i.is_current).length || 0
                });
                setInstitutions(data.institutions || []);
            }
        } catch (err) {
            logger.error("Failed to fetch schema health", err);
            toast.error("Failed to fetch schema health data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async (slug: string) => {
        setHistoryLoading(true);
        try {
            const res = await apiClient.get(`superadmin/institutions/${slug}/schema_update_history/`);
            const data = res.data?.data;
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            logger.error("Failed to fetch update history", err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const handleSync = async (slug: string, schemaName: string) => {
        setSyncingSlug(slug);
        setActiveSyncSchema(schemaName);
        setIsSyncModalOpen(true);
        try {
            await apiClient.post(`superadmin/institutions/${slug}/sync_schema/`);
        } catch (err) {
            toast.error(`Sync failed for ${slug}`);
            setSyncingSlug(null);
            setIsSyncModalOpen(false);
        }
    };

    // Sync States
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
    const [syncProgress, setSyncProgress] = useState<Record<string, { progress: number; message: string; phase: number; eta?: number }>>({});
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [activeSyncSchema, setActiveSyncSchema] = useState<string | null>(null);

    const handleSyncAll = async () => {
        setSyncConfirmOpen(false);
        setIsSyncingAll(true);
        setActiveSyncSchema("global_platform");
        setIsSyncModalOpen(true);
        try {
            await apiClient.post("superadmin/institutions/sync_all_schemas/");
        } catch (err) {
            toast.error("Global synchronization failed to initiate.");
            setIsSyncingAll(false);
            setIsSyncModalOpen(false);
        }
    };

    // Update Progress State from WebSocket
    useEffect(() => {
        const handler = (e: any) => {
            const data = e.detail;
            if (data?.type === "PROVISION_PROGRESS") {
                const { schema_name, progress, message, phase_idx, eta } = data;

                setSyncProgress(prev => ({
                    ...prev,
                    [schema_name]: { progress, message, phase: phase_idx, eta }
                }));

                // If it hits 100%, we don't necessarily fetch ALL health immediately to avoid flickering
                // But we can mark that ONE institution as 'current' in local state optimistically
                if (progress >= 100) {
                    setInstitutions(prev => prev.map(inst =>
                        inst.schema_name === schema_name
                            ? { ...inst, is_current: true, pending_count: 0, pending_migrations: [] }
                            : inst
                    ));

                    setTimeout(() => {
                        setSyncProgress(prev => {
                            const New = { ...prev };
                            delete New[schema_name];
                            return New;
                        });
                        if (schema_name === "global_platform") {
                            setIsSyncingAll(false);
                            fetchHealth();
                        } else {
                            setSyncingSlug(null);
                        }
                    }, 2000);
                }
            } else if (data?.type === "INSTITUTION_PROVISIONED") {
                fetchHealth();
            }
        };

        window.addEventListener('institution-updated', handler as any);
        window.addEventListener('refresh-schema-health', fetchHealth as any);
        return () => {
            window.removeEventListener('institution-updated', handler as any);
            window.removeEventListener('refresh-schema-health', fetchHealth as any);
        };
    }, [fetchHealth]);

    const toggleExpand = (slug: string) => {
        if (expandedSlug === slug) {
            setExpandedSlug(null);
            setHistory([]);
        } else {
            setExpandedSlug(slug);
            fetchHistory(slug);
        }
    };

    useEffect(() => {
        if (isVisible) fetchHealth();
    }, [isVisible, fetchHealth]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    const getStatusIcon = (inst: SchemaInstitution) => {
        if (inst.error) return <XCircle className="w-4 h-4 text-red-500" />;
        if (inst.status_code === 'INCONSISTENT') return <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />;
        if (inst.is_current) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    };

    const getStatusColor = (inst: SchemaInstitution) => {
        if (inst.error || inst.status_code === 'INCONSISTENT') return "border-red-500/20 bg-red-500/5";
        if (inst.is_current) return "border-emerald-500/20 bg-emerald-500/5";
        return "border-amber-500/20 bg-amber-500/5";
    };

    return (
        <div className="space-y-4">
            {/* Simple Header */}
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="w-full glass p-5 rounded-[2rem] flex items-center justify-between group hover:border-primary/20 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Database className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                            Database <span className="text-primary italic">Status</span>
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                            Migration health for all institutions
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {summary && !isVisible && (
                        <div className="flex items-center gap-2">
                            {summary.needs_update > 0 && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                    {summary.needs_update} Pending
                                </span>
                            )}
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                {summary.up_to_date} Current
                            </span>
                        </div>
                    )}
                    <ChevronRight className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${isVisible ? "rotate-90" : ""}`} />
                </div>
            </button>

            {/* Dashboard Content */}
            {isVisible && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Summary Row */}
                    {!syncProgress["global_platform"] && summary && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="glass p-5 rounded-2xl border-emerald-500/10">
                                <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest block mb-1">Up to Date</span>
                                <p className="text-3xl font-black text-emerald-400">{summary.up_to_date}</p>
                            </div>
                            <div className="glass p-5 rounded-2xl border-amber-500/10">
                                <span className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest block mb-1">Needs Update</span>
                                <p className="text-3xl font-black text-amber-400">{summary.needs_update}</p>
                            </div>
                            <div className="glass p-5 rounded-2xl border-blue-500/10">
                                <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest block mb-1">Total institutions</span>
                                <p className="text-3xl font-black text-blue-400">{summary.total_institutions}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            {(summary?.needs_update ?? 0) === 0 ? (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] bg-white/5 border border-white/5 shadow-none opacity-80 cursor-default">
                                    <CheckCircle2 className="w-4 h-4" />
                                    No updates available
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSyncConfirmOpen(true)}
                                    disabled={isLoading || isSyncingAll}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Zap className={`w-4 h-4 ${isSyncingAll ? "animate-pulse" : ""}`} />
                                    {isSyncingAll ? "Updating All..." : "Update All"}
                                </button>
                            )}
                        </div>
                        <button
                            onClick={fetchHealth}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            Refresh Status
                        </button>
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="glass p-5 rounded-2xl flex items-center justify-between animate-pulse">
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="w-10 h-10 rounded-xl bg-white/5" />
                                        <div className="space-y-2 flex-1 max-w-sm">
                                            <div className="w-3/4 h-3 bg-white/5 rounded-full" />
                                            <div className="w-1/2 h-2.5 bg-white/5 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="w-20 h-6 rounded-lg bg-white/5" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {institutions.map((inst) => (
                                <div key={inst.id} className={`rounded-2xl border ${getStatusColor(inst)} overflow-hidden`}>
                                    <div className="p-4 flex items-center justify-between">
                                        <button
                                            onClick={() => toggleExpand(inst.slug)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            {getStatusIcon(inst)}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-[var(--text-primary)]">{inst.name}</p>
                                                    {inst.status_code === 'INCONSISTENT' && (
                                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded border border-red-500/20">
                                                            Inconsistent
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                                    Schema: {inst.schema_name}
                                                    {inst.last_update && <span className="ml-2 opacity-50">• Last Sync: {inst.last_update.version}</span>}
                                                </p>
                                            </div>
                                        </button>

                                        <div className="flex items-center gap-3">
                                            {syncProgress[inst.schema_name] ? (
                                                <div className="flex flex-col items-end gap-1.5 w-32">
                                                    <div className="flex justify-between w-full text-[8px] font-black text-white/40 uppercase tracking-widest">
                                                        <span>Syncing</span>
                                                        <span className="text-primary">{syncProgress[inst.schema_name].progress}%</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-300"
                                                            style={{ width: `${syncProgress[inst.schema_name].progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {inst.pending_count > 0 && (
                                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                            {inst.pending_count} Pending
                                                        </span>
                                                    )}
                                                    {(!inst.is_current || inst.status_code === 'INCONSISTENT') && !inst.error && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSync(inst.slug, inst.schema_name);
                                                            }}
                                                            disabled={!!syncingSlug || isSyncingAll}
                                                            className={`h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${inst.status_code === 'INCONSISTENT' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-primary text-white"
                                                                } hover:opacity-80 disabled:opacity-50`}
                                                        >
                                                            {syncingSlug === inst.slug ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                                                (inst.status_code === 'INCONSISTENT' ? "Repair & Sync" : "Sync Now")}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded: Pending Details & History */}
                                    {expandedSlug === inst.slug && (
                                        <div className="border-t border-white/5 p-4 space-y-4 bg-black/20">
                                            {inst.status_code === 'INCONSISTENT' && inst.missing_tables && (
                                                <div className="mb-6 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                                    <div className="flex items-center gap-2 mb-3 text-red-500">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">CRITICAL: STRUCTURAL INCONSISTENCY</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {inst.missing_tables.map((t, idx) => (
                                                            <div key={idx} className="px-3 py-1 bg-red-500/10 border border-red-500/10 rounded-lg">
                                                                <span className="text-[10px] font-mono text-red-400">{t.table}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="mt-3 text-[10px] text-white/40 italic">
                                                        These tables exist in Django models but are missing from the database. Click "REPAIR & SYNC" to restore them.
                                                    </p>
                                                </div>
                                            )}

                                            {inst.pending_migrations && inst.pending_migrations.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Pending Migrations</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                                                        {inst.pending_migrations.map((m) => (
                                                            <div key={m.app} className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                                <p className="font-black text-white/80">{m.display} <span className="text-amber-400 ml-1">({m.count})</span></p>
                                                                <p className="opacity-40 font-mono text-[8px] truncate">{m.migrations.join(", ")}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                                    <History className="w-3 h-3" /> Update History
                                                </p>
                                                {historyLoading ? (
                                                    <div className="p-4 text-[10px] opacity-50 italic">Loading audit trail...</div>
                                                ) : history.length === 0 ? (
                                                    <div className="p-4 text-[10px] opacity-30 italic">No previous updates recorded.</div>
                                                ) : (
                                                    <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {history.map((h) => (
                                                            <div key={h.id} className="bg-white/5 p-2 rounded-lg flex items-center justify-between text-[10px]">
                                                                <div>
                                                                    <span className="font-black text-white/70">{h.version_label}</span>
                                                                    <span className="mx-2 opacity-30">|</span>
                                                                    <span className="opacity-50">{formatDate(h.started_at)}</span>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${h.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                    {h.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Premium Confirmation Modal */}
            {syncConfirmOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Global Synchronization</h3>
                            <p className="text-white/50 text-sm leading-relaxed mb-8">
                                You are about to synchronize the database schema for all institutions.
                                This process will apply pending updates across the entire platform.
                                Are you sure you want to proceed?
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSyncConfirmOpen(false)}
                                    className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-bold transition-all border border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSyncAll}
                                    className="px-6 py-4 bg-primary hover:bg-primary-hover rounded-2xl text-white font-bold transition-all shadow-lg shadow-primary/20"
                                >
                                    Yes, Sync All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Progress Modal */}
            <SyncProgressModal
                isOpen={isSyncModalOpen}
                onClose={() => {
                    setIsSyncModalOpen(false);
                    setIsSyncingAll(false);
                    setSyncingSlug(null);
                    setActiveSyncSchema(null);
                }}
                progress={activeSyncSchema ? (syncProgress[activeSyncSchema]?.progress || 0) : 0}
                message={activeSyncSchema ? (syncProgress[activeSyncSchema]?.message || "Initializing...") : "Initializing..."}
                phase={activeSyncSchema ? (syncProgress[activeSyncSchema]?.phase || 0) : 0}
                eta={activeSyncSchema ? syncProgress[activeSyncSchema]?.eta : undefined}
                isGlobal={isSyncingAll}
                institutionName={activeSyncSchema || ""}
            />
        </div>
    );
};
