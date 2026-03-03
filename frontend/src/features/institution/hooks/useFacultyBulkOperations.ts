import { useState, useEffect } from "react";
import { instApiClient } from "../../auth/api/base";
import { toast } from "react-hot-toast";

export const useFacultyBulkOperations = (onSuccess: () => void) => {
    const [isValidating, setIsValidating] = useState(false);
    const [valProgress, setValProgress] = useState(0);
    const [valMessage, setValMessage] = useState("");
    const [previewData, setPreviewData] = useState<any>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitPhase, setCommitPhase] = useState("");
    const [commitProgress, setCommitProgress] = useState(0);

    useEffect(() => {
        const handleProgress = (e: any) => {
            const data = e.detail;
            if (data.action === "bulk_upload_progress") {
                setCommitProgress(data.progress || 0);
                setCommitPhase(data.message || "");
            }
        };
        window.addEventListener("bulk-upload-progress", handleProgress);
        return () => window.removeEventListener("bulk-upload-progress", handleProgress);
    }, []);

    const handleFileSelect = async (e: any) => {
        const file = e.target?.files?.[0] || e;
        if (!file) return;

        setIsValidating(true);
        setValProgress(0);
        setValMessage("Scanning Faculty Registry...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("preview", "true");

        // UI progression animation
        let prog = 0;
        const intervals = setInterval(() => {
            prog = Math.min(prog + 15, 90);
            setValProgress(prog);
            if (prog > 45) setValMessage("Analyzing Staff Overlap...");
        }, 200);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);

            const res = await instApiClient.post("bulk-seed-faculty/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                signal: controller.signal,
            });

            clearTimeout(timeout);
            clearInterval(intervals);

            if (res.data.success) {
                setValProgress(100);
                setValMessage("Signal Processing Complete!");
                setTimeout(() => {
                    setIsValidating(false);
                    setPreviewData({ ...res.data.data, file });
                }, 500);
            }
        } catch (err: any) {
            clearInterval(intervals);
            setIsValidating(false);
            toast.error("Upload failed. Verify CSV headers: employee_id, full_name, email, designation, department");
        }
    };

    const commitGridData = async (updatedFaculty: any[]) => {
        setIsCommitting(true);
        setCommitProgress(0);
        setCommitPhase("Initializing Global Sync...");

        try {
            await instApiClient.post("bulk-seed-faculty/", { preview: false, faculty: updatedFaculty });

            setCommitProgress(100);
            setCommitPhase("Synchronization Complete");


            setTimeout(() => {
                setIsCommitting(false);
                setPreviewData(null);
                toast.success("Institutional Faculty records updated.");
                onSuccess();
            }, 800);

        } catch (err) {
            setIsCommitting(false);
            toast.error("Synchronization failed. Registry locked.");
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
        commitGridData
    };
};
