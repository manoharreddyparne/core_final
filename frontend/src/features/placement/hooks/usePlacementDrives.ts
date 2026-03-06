import { useState, useEffect } from "react";
import { placementApi } from "../api";
import { PlacementDrive } from "../types";
import toast from "react-hot-toast";

export const usePlacementDrives = () => {
    const [drives, setDrives] = useState<PlacementDrive[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal Control States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    // Active Data States
    const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
    const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
    const [summary, setSummary] = useState<any>(null);

    const fetchDrives = async () => {
        try {
            setLoading(true);
            const [drivesData, summaryData] = await Promise.all([
                placementApi.getAdminDrives(),
                placementApi.getAnalyticsSummary()
            ]);
            setDrives(drivesData);
            setSummary(summaryData);
        } catch (error) {
            toast.error("Failed to fetch placement architecture.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrives();
    }, []);

    const handleOpenEdit = (drive: PlacementDrive) => {
        setEditingDrive(drive);
        setIsCreateModalOpen(true);
    };

    const handleOpenAnalytics = (drive: PlacementDrive) => {
        setSelectedDrive(drive);
        setIsAnalyticsModalOpen(true);
    };

    const handleOpenReview = (drive: PlacementDrive) => {
        setSelectedDrive(drive);
        setIsReviewModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingDrive(null);
        setIsCreateModalOpen(true);
    };

    const executeDelete = async (id: number) => {
        try {
            toast.loading("Executing System Purge...", { id: "delete_drive" });
            await placementApi.deleteDrive(id);
            toast.success("Intelligence Purge Complete.", { id: "delete_drive" });
            fetchDrives();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Purge Failed.", { id: "delete_drive" });
        }
    };

    const handleDeleteDrive = async (id: number) => {
        if (!window.confirm("CRITICAL: This will permanently purge this recruitment initiative from the system. ALL application data, manifest logs, and AI orchestrations for this drive will be lost. Execute Purge?")) return;
        executeDelete(id);
    };

    return {
        drives,
        loading,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isAnalyticsModalOpen,
        setIsAnalyticsModalOpen,
        isReviewModalOpen,
        setIsReviewModalOpen,
        selectedDrive,
        setSelectedDrive,
        editingDrive,
        setEditingDrive,
        summary,
        fetchDrives,
        handleOpenEdit,
        handleOpenAnalytics,
        handleOpenReview,
        openCreateModal,
        handleDeleteDrive,
        executeDelete
    };

};
