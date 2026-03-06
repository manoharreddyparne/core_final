import React, { useState } from "react";
import { usePlacementDrives } from "../hooks/usePlacementDrives";

// Extracted Governance Components
import PlacementRecruitmentModal from "../components/PlacementRecruitmentModal";
import PlacementAnalyticsModal from "../components/PlacementAnalyticsModal";
import ApplicationReviewModal from "../components/ApplicationReviewModal";
import PlacementHeader from "../components/PlacementHeader";
import PlacementDriveCard from "../components/PlacementDriveCard";
import PlacementEmptyState from "../components/PlacementEmptyState";
import IntelligenceMetrics from "../components/IntelligenceMetrics";
import PurgeConfirmModal from "../components/recruitment-modal/PurgeConfirmModal";

const AdminPlacementHub = () => {
    const {
        drives,
        loading,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isAnalyticsModalOpen,
        setIsAnalyticsModalOpen,
        isReviewModalOpen,
        setIsReviewModalOpen,
        selectedDrive,
        editingDrive,
        summary,
        fetchDrives,
        handleOpenEdit,
        handleOpenAnalytics,
        handleOpenReview,
        openCreateModal,
        executeDelete
    } = usePlacementDrives();

    const [deleteId, setDeleteId] = useState<number | null>(null);

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <PlacementHeader onInitiate={openCreateModal} />

            {summary && (
                <IntelligenceMetrics
                    totalDrives={summary.total_drives || 0}
                    activeApplications={summary.active_drives || 0}
                    placedCount={summary.placed_students || 0}
                />
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-indigo-500/20 shadow-xl" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] animate-pulse">
                        Establishing Secure Neural Bridge...
                    </p>
                </div>
            ) : drives.length === 0 ? (
                <PlacementEmptyState onInitiate={openCreateModal} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {drives.map(drive => (
                        <PlacementDriveCard
                            key={drive.id}
                            drive={drive}
                            onOpenAnalytics={handleOpenAnalytics}
                            onOpenReview={handleOpenReview}
                            onOpenEdit={handleOpenEdit}
                            onDelete={(id) => setDeleteId(id)}
                        />
                    ))}
                </div>
            )}

            {/* MODAL LAYER: Unified Management */}
            <PlacementRecruitmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { setIsCreateModalOpen(false); fetchDrives(); }}
                editingDrive={editingDrive}
            />

            {selectedDrive && (
                <>
                    <PlacementAnalyticsModal
                        isOpen={isAnalyticsModalOpen}
                        onClose={() => setIsAnalyticsModalOpen(false)}
                        drive={selectedDrive}
                        onBroadcastSuccess={fetchDrives}
                    />
                    <ApplicationReviewModal
                        isOpen={isReviewModalOpen}
                        onClose={() => setIsReviewModalOpen(false)}
                        drive={selectedDrive}
                    />
                </>
            )}

            <PurgeConfirmModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => deleteId && executeDelete(deleteId)}
                title="Execute Data Purge?"
                message="CRITICAL: This will permanently purge this recruitment initiative. ALL application data, manifest logs, and AI orchestrations will be lost. This action is irreversible."
            />
        </div>
    );
};

export default AdminPlacementHub;
