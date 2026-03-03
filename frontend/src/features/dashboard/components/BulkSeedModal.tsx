// ✅ src/features/dashboard/components/BulkSeedModal.tsx

import { useState, useEffect } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { bulkUploadStudents } from "../../auth/api/institutionAdminApi";

import { createPortal } from "react-dom";

interface BulkSeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkSeedModal({ isOpen, onClose, onSuccess }: BulkSeedModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any | null>(null);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", h);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", h);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.name.endsWith('.csv')) {
                toast.error("Please upload a CSV file.");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);

        try {
            const res = await bulkUploadStudents(file);
            if (res.success) {
                setResult(res.data);
                toast.success("Bulk upload processed!");
                if (res.data.successful > 0) {
                    onSuccess();
                }
            } else {
                toast.error(res.message || "Upload failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "An error occurred during upload.");
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = "stu_ref,roll_number,full_name,department,batch_year,current_semester,official_email,tenth_percentage,twelfth_percentage,cgpa,attendance_percentage";
        const blob = new Blob([headers], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "auip_student_template.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-2xl bg-[#0a0a0b]/80 backdrop-blur-md border border-white/10 rounded-[2.5rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Batch <span className="text-primary tracking-normal not-italic">Seeding</span></h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Institutional Identity Provisioning</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {!result ? (
                        <>
                            {/* Template Download */}
                            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">CSV Template</p>
                                        <p className="text-xs text-gray-500">Download the required structure</p>
                                    </div>
                                </div>
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Template
                                </button>
                            </div>

                            {/* Dropzone */}
                            <div className={`relative border-2 border-dashed rounded-[2rem] transition-all p-12 text-center group ${file ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".csv"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                />
                                <div className="space-y-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all ${file ? 'bg-primary text-white scale-110' : 'bg-white/5 text-gray-500 group-hover:text-primary group-hover:scale-110'}`}>
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">
                                            {file ? file.name : "Click or drag CSV file"}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {file ? `${(file.size / 1024).toFixed(2)} KB` : "Max file size: 10MB"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    className="flex-[2] py-4 px-6 premium-gradient text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 text-xs"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : (
                                        "Initialize Seeding"
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass p-4 rounded-2xl border-white/5 text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total</p>
                                    <p className="text-2xl font-black text-white">{result.total || 0}</p>
                                </div>
                                <div className="glass p-4 rounded-2xl border-green-500/10 bg-green-500/5 text-center">
                                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Success</p>
                                    <p className="text-2xl font-black text-white">{result.success || 0}</p>
                                </div>
                                <div className="glass p-4 rounded-2xl border-red-500/10 bg-red-500/5 text-center">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Failed</p>
                                    <p className="text-2xl font-black text-white">{result.failed || 0}</p>
                                </div>
                            </div>

                            {/* Error Details */}
                            {result.errors.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Protocol Error Logs ({result.errors.length})
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {result.errors.map((err: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px]">
                                                <p className="text-red-400 font-bold mb-1 uppercase tracking-wider">Row {err.row}: {typeof err.error === 'object' ? JSON.stringify(err.error) : err.error}</p>
                                                <p className="text-gray-600 font-mono">Ref Identifier: {err.data?.stu_ref || 'N/A'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.failed === 0 && (
                                <div className="flex flex-col items-center justify-center p-12 bg-green-500/5 border border-green-500/10 rounded-[2rem] text-center">
                                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Handshake Complete</h3>
                                    <p className="text-gray-500 mt-2 text-xs uppercase tracking-widest font-bold">Every identity was correctly provisioned.</p>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-4 premium-gradient text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 text-xs"
                            >
                                Finalize Sync
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
