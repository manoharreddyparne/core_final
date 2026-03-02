import { useState } from "react";
import { instApiClient } from "../../auth/api/base";
import { toast } from "react-hot-toast";

export const useBulkOperations = (onSuccess: () => void) => {
    const [isValidating, setIsValidating] = useState(false);
    const [valProgress, setValProgress] = useState(0);
    const [valMessage, setValMessage] = useState("");
    const [previewData, setPreviewData] = useState<any>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitPhase, setCommitPhase] = useState("");
    const [commitProgress, setCommitProgress] = useState(0);

    const handleFileSelect = async (e: any) => {
        const file = e.target?.files?.[0] || e;
        if (!file) return;

        setIsValidating(true);
        setValProgress(0);
        setValMessage("Scanning CSV Feed...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("preview", "true");

        // Fast progress animation — completes to 85% quickly
        let prog = 0;
        const intervals = setInterval(() => {
            prog = Math.min(prog + 20, 85);
            setValProgress(prog);
            if (prog > 60) setValMessage("Comparing Registry Entries...");
            else setValMessage("Scanning CSV Feed...");
        }, 200);

        try {
            const controller = new AbortController();
            // 30s hard timeout — backend should never take longer
            const timeout = setTimeout(() => controller.abort(), 30000);

            const res = await instApiClient.post("bulk-seed-students/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                signal: controller.signal,
            });

            clearTimeout(timeout);
            clearInterval(intervals);

            if (res.data.success) {
                setValProgress(100);
                setValMessage("Analysis Complete!");
                setTimeout(() => {
                    setIsValidating(false);
                    setPreviewData({ ...res.data.data, file });
                }, 500);
            }
        } catch (err: any) {
            clearInterval(intervals);
            setIsValidating(false);
            if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
                toast.error("Upload timed out. Check backend is running.");
            } else {
                toast.error("Process error. Verify CSV column headers.");
            }
        }
    };

    const commitGridData = async (updatedStudents: any[]) => {
        setIsCommitting(true);
        setCommitProgress(0);
        setCommitPhase("Allocating Cloud Resources...");

        try {
            const iv = setInterval(() => {
                setCommitProgress(p => {
                    if (p > 60) setCommitPhase("Writing Registry Blocks...");
                    else setCommitPhase("Synchronizing Identity Pool...");
                    return p < 95 ? p + 8 : p;
                });
            }, 200);

            await instApiClient.post("bulk-seed-students/", { preview: false, students: updatedStudents });

            clearInterval(iv);
            setCommitProgress(100);
            setCommitPhase("Migration Complete");

            setTimeout(() => {
                setIsCommitting(false);
                setPreviewData(null);
                toast.success("Registry synchronization successful.");
                onSuccess();
            }, 800);

        } catch (err) {
            setIsCommitting(false);
            toast.error("Migration failed. Connection dropped or data corrupt.");
        }
    };

    const handleInviteSection = async (sectionName: string) => {
        const loadingToast = toast.loading(`Broadcasting to Section ${sectionName}...`);
        try {
            const res = await instApiClient.post("students/bulk_invite/", { section: sectionName });
            toast.success(res.data.message || "Signal dispatched", { id: loadingToast });
            onSuccess();
        } catch (err) {
            toast.error("Transmission failed", { id: loadingToast });
        }
    };

    const handleBulkInviteSelected = async (rollNumbers: string[]) => {
        if (rollNumbers.length === 0) return;
        const loadingToast = toast.loading(`Dispatching to ${rollNumbers.length} student(s)...`);
        try {
            const res = await instApiClient.post("students/bulk_invite/", { roll_numbers: rollNumbers });
            toast.success(res.data?.message || "Activation signals sent", { id: loadingToast });
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Sync interrupted", { id: loadingToast });
        }
    };

    return {
        isValidating,
        valProgress,
        valMessage,
        previewData,
        setPreviewData,
        isCommitting,
        commitPhase,
        commitProgress,
        handleFileSelect,
        commitGridData,
        handleInviteSection,
        handleBulkInviteSelected
    };
};
