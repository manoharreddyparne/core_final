import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiClient } from "../../auth/api/base";
import { Filter } from "lucide-react";
import { toast } from "react-hot-toast";
import { extractApiError } from "../../auth/utils/extractApiError";
import { logger } from "../../../shared/utils/logger";

// Sub-components
import { InstitutionStats } from "../components/InstitutionManagement/InstitutionStats";
import { InstitutionControls } from "../components/InstitutionManagement/InstitutionControls";
import { InstitutionCard } from "../components/InstitutionManagement/InstitutionCard";
import { InstitutionDetailModal } from "../components/InstitutionManagement/InstitutionDetailModal";
import { ManualRegisterModal } from "../components/InstitutionManagement/ManualRegisterModal";
import { ProvisioningModal } from "../components/InstitutionManagement/ProvisioningModal";
import { DeleteConfirmModal } from "../components/InstitutionManagement/DeleteConfirmModal";
import { SchemaHealthDashboard } from "../components/InstitutionManagement/SchemaHealthDashboard";
import { SyncProgressModal } from "../components/InstitutionManagement/SyncProgressModal";

const statusMessages = [
    "Preparing a dedicated workspace for the institution's data.",
    "Setting up secure database partitions for student privacy.",
    "Applying institutional security protocols and access rules.",
    "Initializing the core learning modules and faculty tools.",
    "Finalizing the environment for a smooth launch.",
];

export const InstitutionAdmin = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [selectedInst, setSelectedInst] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Provisioning States
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
    const [approvePhaseIdx, setApprovePhaseIdx] = useState(0);
    const [approveProgress, setApproveProgress] = useState(0);
    const [approveComplete, setApproveComplete] = useState(false);
    const [activeStatusMsg, setActiveStatusMsg] = useState("Initializing...");
    const [remTime, setRemTime] = useState<number | null>(null);
    const [migMetrics, setMigMetrics] = useState({ current: 0, total: 0 });
    const [isAborting, setIsAborting] = useState(false);
    const [approvePhasePct, setApprovePhasePct] = useState(0);
    const [provisionStartTime, setProvisionStartTime] = useState<number | null>(null);
    const [provisionElapsed, setProvisionElapsed] = useState<number | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [instToDelete, setInstToDelete] = useState<any | null>(null);

    // Sync Check
    const [syncStatus, setSyncStatus] = useState<{
        is_current: boolean;
        missing_updates: number;
        status_code?: "UP_TO_DATE" | "OUT_OF_DATE" | "INCONSISTENT";
        missing_tables_count?: number;
    } | null>(null);
    const [isSyncChecking, setIsSyncChecking] = useState(false);

    // Dynamic Sync States (Shared with SchemaHealthDashboard via Custom Events)
    const [isRepairSyncModalOpen, setIsRepairSyncModalOpen] = useState(false);
    const [repairSyncProgress, setRepairSyncProgress] = useState(0);
    const [repairSyncMsg, setRepairSyncMsg] = useState("Initializing...");
    const [repairSyncPhase, setRepairSyncPhase] = useState(0);
    const [repairSyncEta, setRepairSyncEta] = useState<number | undefined>();
    const [syncingSchema, setSyncingSchema] = useState<string | null>(null);

    const approvePhases = useMemo(() => [
        { label: "Securing Database", icon: "🔐", color: "bg-primary" },
        { label: "Building System Structure", icon: "🏗️", color: "bg-blue-500" },
        { label: "Setting up Components", icon: "⚙️", color: "bg-violet-500" },
        { label: "Applying Security Rules", icon: "🛡️", color: "bg-amber-500" },
        { label: "Completing Final Checks", icon: "✅", color: "bg-emerald-500" },
    ], []);

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
            toast.success(`Institution ${newInst.name} registered successfully!`);
            await fetchInstitutions();
            setIsCreateModalOpen(false);
            setNewInst({ name: "", slug: "", domain: "", contact_email: "", contact_number: "", address: "", student_count_estimate: "" });
        } catch (err: any) {
            toast.error(extractApiError(err, "Failed to register institution."));
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchInstitutions = useCallback(async () => {
        try {
            const res = await apiClient.get(`superadmin/institutions/`);
            const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
            setInstitutions(data);
        } catch (err) {
            logger.error("Failed to fetch institutions", err);
            setInstitutions(prev => prev.length > 0 ? prev : []);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced fetch to prevent 503 avalanche from rapid WS events
    const fetchDebounceRef = useRef<any>(null);
    const debouncedFetchInstitutions = useCallback(() => {
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = setTimeout(() => {
            fetchInstitutions();
        }, 2000);
    }, [fetchInstitutions]);

    // Message carousel
    useEffect(() => {
        let interval: any;
        if (isProvisioning) {
            interval = setInterval(() => {
                setCurrentMsgIdx(prev => (prev + 1) % statusMessages.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isProvisioning]);

    const checkSyncStatus = useCallback(async () => {
        if (!selectedInst?.slug || selectedInst.status !== "APPROVED") {
            setSyncStatus(null);
            return;
        }
        setIsSyncChecking(true);
        try {
            const resp = await apiClient.get(`superadmin/institutions/${selectedInst.slug}/verify_schema/`);
            const healthData = resp.data.data;
            if (healthData && typeof healthData === 'object') {
                setSyncStatus({
                    is_current: !!healthData.is_current,
                    missing_updates: healthData.pending_count ?? healthData.missing_updates ?? 0,
                    status_code: healthData.status_code,
                    missing_tables_count: healthData.missing_tables_count ?? 0
                });
            }
        } catch (err) {
            console.error("Schema verify failed:", err);
        } finally {
            setIsSyncChecking(false);
        }
    }, [selectedInst?.slug, selectedInst?.status]);

    useEffect(() => {
        checkSyncStatus();
    }, [checkSyncStatus]);

    useEffect(() => {
        fetchInstitutions();

        const handleWsUpdate = (event: any) => {
            const data = event.detail;
            if (data?.type === "PROVISION_PROGRESS") {
                const { schema_name, progress, message, phase_idx, eta, metrics } = data;
                
                // 1. Initial Provisioning (Forge)
                if (isProvisioning && schema_name === selectedInst?.schema_name) {
                    setApproveProgress(progress);
                    setActiveStatusMsg(message);
                    if (data.phase_pct !== undefined) setApprovePhasePct(data.phase_pct);
                    if (eta !== undefined) setRemTime(eta);
                    if (metrics) setMigMetrics(metrics);
                    if (phase_idx !== undefined) setApprovePhaseIdx(phase_idx);

                    if (progress >= 100 && phase_idx === 4) {
                        const elapsedMs = Date.now() - (provisionStartTime || Date.now());
                        setProvisionElapsed(Math.round(elapsedMs / 1000));
                        setRemTime(0);
                        setApproveComplete(true);
                        toast.success("Institution setup complete!", { id: "provisioning-start", duration: 5000 });
                        fetchInstitutions();
                        setIsActionLoading(false);
                        setActiveAction(null);
                    }
                }

                // 2. Repair Sync (from Modal or Dashboard)
                if (isRepairSyncModalOpen && (schema_name === syncingSchema || syncingSchema === "global_platform")) {
                    setRepairSyncProgress(progress);
                    setRepairSyncMsg(message);
                    setRepairSyncPhase(phase_idx);
                    setRepairSyncEta(eta);

                    if (progress >= 100) {
                        setTimeout(() => {
                            checkSyncStatus();
                            fetchInstitutions();
                            window.dispatchEvent(new CustomEvent('refresh-schema-health'));
                        }, 500);
                    }
                }
            } else if (data?.type === "ABORT_PROGRESS") {
                setIsAborting(true);
                setApproveProgress(data.progress);
                setActiveStatusMsg(data.message);

                if (data.progress >= 100) {
                    toast.error("Process aborted and resources reclaimed.");
                    setTimeout(() => {
                        setIsProvisioning(false);
                        setIsAborting(false);
                        setApproveProgress(0);
                        setActiveStatusMsg("");
                        fetchInstitutions();
                    }, 1500);
                }
            } else if (data?.type === "HEALTH_DISCREPANCY") {
                // Background scan detected a change
                const { discrepancies } = data;
                const relevant = discrepancies.find((d: any) => d.slug === selectedInst?.slug);
                if (relevant) {
                    // Only refresh if something actually changed (to prevent unnecessary UI flickers)
                    if (syncStatus?.status_code !== relevant.status_code || 
                        syncStatus?.missing_tables_count !== relevant.missing_tables_count) {
                        checkSyncStatus();
                    }
                }
                // Also trigger a refresh for the background dashboard list
                window.dispatchEvent(new CustomEvent('refresh-schema-health'));
            } else {
                debouncedFetchInstitutions();
            }
        };

        const handleSelectFromSearch = (event: any) => {
            setSelectedInst(event.detail);
        };

        window.addEventListener('institution-updated', handleWsUpdate as EventListener);
        window.addEventListener('select-institution', handleSelectFromSearch as EventListener);

        return () => {
            window.removeEventListener('institution-updated', handleWsUpdate as EventListener);
            window.removeEventListener('select-institution', handleSelectFromSearch as EventListener);
        };
    }, [fetchInstitutions, isProvisioning, selectedInst, isRepairSyncModalOpen, syncingSchema, checkSyncStatus, debouncedFetchInstitutions, provisionStartTime]);

    // Timer Countdown
    useEffect(() => {
        let interval: any;
        if (isProvisioning && remTime && remTime > 0) {
            interval = setInterval(() => {
                setRemTime(prev => (prev && prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isProvisioning, remTime]);

    // Sync selected institution
    useEffect(() => {
        if (selectedInst) {
            const updated = institutions.find(i => i.slug === selectedInst.slug || i.id === selectedInst.id);
            if (updated) setSelectedInst(updated);
        }
    }, [institutions]);

    const handleAction = async (slug: string, action: string) => {
        if (!slug) {
            toast.error("Cannot perform action: Missing unique identifier.");
            return;
        }

        if (action === "delete_institution") {
            setInstToDelete(selectedInst);
            setIsDeleteModalOpen(true);
            return;
        }

        const isRegrant = action === "approve" && selectedInst?.status === "REJECTED";
        const effectiveAction = isRegrant ? "grant_access" : action;

        setIsActionLoading(true);
        setActiveAction(action);

        if (action === "approve" && !isRegrant) {
            setIsProvisioning(true);
            setApproveProgress(0);
            setApprovePhaseIdx(0);
            setApproveComplete(false);
            setIsAborting(false);
            setProvisionStartTime(Date.now());
            setProvisionElapsed(null);
        }

        try {
            const axiosConfig = effectiveAction === "approve" ? { timeout: 300000 } : {};
            await apiClient.post(`superadmin/institutions/${slug}/${effectiveAction}/`, {}, axiosConfig);

            if (action === "approve") {
                if (isRegrant) {
                    toast.success(`Access restored for ${selectedInst?.name}.`);
                    await fetchInstitutions();
                    setSelectedInst(null);
                } else {
                    toast.success("Starting setup...", { id: "provisioning-start" });
                }
            } else if (action === "sync_schema") {
                setSyncingSchema(selectedInst?.schema_name || null);
                setIsRepairSyncModalOpen(true);
                setRepairSyncProgress(0);
                setRepairSyncMsg("Initialization matrix established...");
            } else if (action === "delete_institution") {
                toast.success("Institution deleted.");
                await fetchInstitutions();
                setSelectedInst(null);
            } else {
                toast.success("Action completed successfully.");
                await fetchInstitutions();
            }
        } catch (err: any) {
            const errorMsg = extractApiError(err, `Failed to ${action} institution.`);
            toast.error(errorMsg);

            // If approval fails before starting, stop provisioning modal
            if (action === "approve") {
                setIsProvisioning(false);
            }
        } finally {
            if (action !== "approve") {
                setIsActionLoading(false);
                setActiveAction(null);
                if (action !== "abort" && action !== "sync_schema") {
                    setTimeout(() => setIsProvisioning(false), 400);
                }
            }
        }
    };

    const handleAbortForge = async () => {
        if (!selectedInst?.slug) return;
        setIsActionLoading(true);
        setActiveAction('abort');
        try {
            await apiClient.post(`superadmin/institutions/${selectedInst.slug}/abort/`);
            setIsAborting(true);
            toast("Stopping setup process...", { id: "abort-toast", icon: "⚠️" });
        } catch (err) {
            toast.error("Failed to stop setup.");
            setIsActionLoading(false);
            setActiveAction(null);
        }
    };

    const performDelete = async () => {
        if (!instToDelete?.slug) return;
        setIsActionLoading(true);
        setActiveAction("delete_institution_performing"); // Use unique state to avoid button overlap
        try {
            await apiClient.post(`superadmin/institutions/${instToDelete.slug}/delete_institution/`);
            toast.success("Institution deleted successfully.");
            await fetchInstitutions();
            setSelectedInst(null);
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            toast.error(extractApiError(err, "Failed to delete institution."));
        } finally {
            setIsActionLoading(false);
            setActiveAction(null);
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
            <InstitutionStats
                pendingCount={pendingCount}
                setIsCreateModalOpen={setIsCreateModalOpen}
            />

            <InstitutionControls
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass h-[320px] rounded-[2.5rem] animate-pulse" />
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((inst) => (
                        <InstitutionCard
                            key={inst.id}
                            inst={inst}
                            onSelect={setSelectedInst}
                        />
                    ))
                ) : (
                    <div className="col-span-full glass p-24 rounded-[3rem] text-center space-y-4">
                        <div className="w-20 h-20 bg-[var(--bg-card)] rounded-full flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                            <Filter className="w-10 h-10" />
                        </div>
                        <p className="text-muted-foreground font-bold text-xl">No match found.</p>
                    </div>
                )}
            </div>

            {/* Schema Health Dashboard */}
            <SchemaHealthDashboard />

            <InstitutionDetailModal
                institution={selectedInst}
                isOpen={!!selectedInst}
                onClose={() => setSelectedInst(null)}
                isActionLoading={isActionLoading}
                activeAction={activeAction}
                onAction={handleAction}
                syncStatus={syncStatus}
                isSyncChecking={isSyncChecking}
            />

            <ManualRegisterModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                newInst={newInst}
                setNewInst={setNewInst}
                onSubmit={handleCreate}
                isActionLoading={isActionLoading}
            />

            <ProvisioningModal
                isOpen={isProvisioning}
                isAborting={isAborting}
                approveComplete={approveComplete}
                approveProgress={approveProgress}
                activeStatusMsg={activeStatusMsg}
                remTime={remTime}
                migMetrics={migMetrics}
                currentMsgIdx={currentMsgIdx}
                statusMessages={statusMessages}
                onClose={() => {
                    setIsProvisioning(false);
                    setSelectedInst(null);
                    setIsAborting(false);
                    setProvisionElapsed(null);
                }}
                onAbort={handleAbortForge}
                isActionLoading={isActionLoading}
                activeAction={activeAction}
                approvePhases={approvePhases}
                approvePhaseIdx={approvePhaseIdx}
                approvePhasePct={approvePhasePct}
                provisionElapsed={provisionElapsed}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={performDelete}
                institutionName={instToDelete?.name || ""}
                isActionLoading={isActionLoading && activeAction === "delete_institution_performing"}
            />

            <SyncProgressModal
                isOpen={isRepairSyncModalOpen}
                progress={repairSyncProgress}
                message={repairSyncMsg}
                phase={repairSyncPhase}
                eta={repairSyncEta}
                institutionName={selectedInst?.name}
                onClose={() => {
                    setIsRepairSyncModalOpen(false);
                    setSyncingSchema(null);
                    // Force refresh status in background
                    if ((window as any).__refreshCurrentSync) {
                        (window as any).__refreshCurrentSync();
                    }
                }}
            />
        </div>
    );
};

export default InstitutionAdmin;
