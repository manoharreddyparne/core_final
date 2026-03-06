import React, { useState, useEffect } from "react";
import {
    X, Users, CheckCircle, Clock, AlertCircle, TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";
import { placementApi } from "../api";
import { PlacementDrive, PlacementApplication } from "../types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    drive: PlacementDrive;
}

const ApplicationReviewModal: React.FC<Props> = ({ isOpen, onClose, drive }) => {
    const [applications, setApplications] = useState<PlacementApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && drive.id) {
            fetchApplications();
        }
    }, [isOpen, drive.id]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const apps = await placementApi.getApplications(drive.id as number);
            setApplications(apps);
        } catch (error) {
            toast.error("Failed to load candidates");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (applicationId: number, status: string) => {
        try {
            toast.loading("Updating Candidate Status...", { id: "update_status" });
            await placementApi.updateApplicationStatus(applicationId, status);
            toast.success("Status Synchronized!", { id: "update_status" });
            fetchApplications();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update status", { id: "update_status" });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative bg-[#1a1c23]/80 backdrop-blur-md w-full max-w-5xl rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <Users className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Candidate Review List</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                {drive.company_name} • {drive.role} • {applications.length} Candidates
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Synchronizing Records...</p>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                <Clock className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No candidates have established eligibility yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {applications.map(app => (
                                <div key={app.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.08] transition-all hover:border-white/20 group">
                                    <div className="flex-1 flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl font-black text-indigo-400 uppercase shadow-inner">
                                            {app.student_details?.full_name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base uppercase tracking-tight">{app.student_details?.full_name || 'Candidate Details Restricted'}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5 font-mono">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/10">
                                                    {app.student_details?.roll_number || 'N/A'}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    CGPA: {app.student_details?.cgpa || '0.00'}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tight">{app.student_details?.branch || 'GENERAL'}</span>
                                            </div>
                                            <p className="text-[9px] text-gray-600 mt-2 font-medium tracking-wide uppercase">{app.student_details?.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-black/20 p-2.5 rounded-2xl border border-white/5">
                                        <div className="flex flex-col items-end px-3">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Governance State</p>
                                            <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${app.status === 'APPLIED' ? 'text-blue-400' :
                                                    app.status === 'SHORTLISTED' ? 'text-amber-400' :
                                                        app.status === 'REJECTED' ? 'text-red-400' :
                                                            app.status === 'PLACED' ? 'text-green-400' :
                                                                'text-gray-400'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <div className="h-10 w-px bg-white/10 hidden md:block" />
                                        <select
                                            value={app.status}
                                            onChange={(e) => handleUpdateStatus(app.id as number, e.target.value)}
                                            className="bg-[#1a1c23] border border-white/10 text-white text-[10px] font-black uppercase rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none cursor-pointer transition-all hover:bg-white/5 shadow-xl"
                                        >
                                            <option value="APPLIED">Pending Applied</option>
                                            <option value="SHORTLISTED">Move to Shortlist</option>
                                            <option value="REJECTED">Reject / Defer</option>
                                            <option value="PLACED">Confirm Placement</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-white/10 flex items-center justify-center bg-black/20 gap-3">
                    <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Synchronized Records • TPO Intelligence Dashboard</p>
                </div>
            </div>
        </div>
    );
};

export default ApplicationReviewModal;
