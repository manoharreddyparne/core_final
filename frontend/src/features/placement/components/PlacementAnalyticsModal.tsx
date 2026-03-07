import React, { useState, useEffect } from "react";
import {
    X, Activity, Globe, Users, BarChart3, Target
} from "lucide-react";
import toast from "react-hot-toast";
import { placementApi } from "../api";
import { PlacementDrive } from "../types";
import BroadcastProgressOverlay from "./recruitment-modal/BroadcastProgressOverlay";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    drive: PlacementDrive;
    onBroadcastSuccess: () => void;
}

const PlacementAnalyticsModal: React.FC<Props> = ({ isOpen, onClose, drive, onBroadcastSuccess }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showStudentList, setShowStudentList] = useState(false);
    const [manualRollNumber, setManualRollNumber] = useState("");
    const [addingStudent, setAddingStudent] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);

    useEffect(() => {
        if (isOpen && drive.id) {
            fetchStats();
        }
    }, [isOpen, drive.id]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await placementApi.getEligibilityStats(drive.id as number);
            setStats(res.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch analytics");
        } finally {
            setLoading(false);
        }
    };

    const handleActivateAndBroadcast = async () => {
        // Step 1: Open WS connection overlay FIRST
        setShowBroadcast(true);
        
        // Step 2: After WS connects, trigger the actual broadcast
        setTimeout(async () => {
            try {
                await placementApi.broadcastDrive(drive.id as number);
            } catch (error: any) {
                toast.error(error.response?.data?.message || "Recruitment Core Synchronization Failure", { id: "broadcast" });
            }
        }, 800);
    };

    const handleManualAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualRollNumber.trim()) return;
        try {
            setAddingStudent(true);
            toast.loading("Adding student manually...", { id: "add_stu" });
            await placementApi.manualAddStudent(drive.id as number, manualRollNumber);
            toast.success("Student assigned successfully!", { id: "add_stu" });
            setManualRollNumber("");
            fetchStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add student.", { id: "add_stu" });
        } finally {
            setAddingStudent(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative bg-[#1a1c23]/80 backdrop-blur-md border border-indigo-500/20 rounded-[3rem] w-full max-w-lg shadow-[0_0_120px_rgba(79,70,229,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 bg-gradient-to-b from-indigo-500/10 to-transparent">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20 overflow-hidden p-1.5">
                                <span className="text-xl font-black text-black uppercase">{drive.company_name[0]}</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white uppercase">{drive.company_name}</h2>
                                <p className="text-indigo-400 text-xs font-medium uppercase tracking-tight">{drive.role}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Calculating Live Eligibility...</p>
                        </div>
                    ) : stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center shadow-inner col-span-3">
                                    <div className="text-4xl font-black text-white">{stats.total_eligible}</div>
                                    <div className="text-[9px] font-black text-gray-500 mt-1 uppercase tracking-widest">Total Qualified Students</div>
                                </div>
                                <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-3 text-center col-span-1.5">
                                    <div className="text-xl font-black text-green-400">{stats.active_count}</div>
                                    <div className="text-[8px] font-bold text-green-500/60 uppercase tracking-tighter">Active Accounts</div>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-center col-span-1.5">
                                    <div className="text-xl font-black text-amber-500">{stats.inactive_count}</div>
                                    <div className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Inactive (Email only)</div>
                                </div>
                            </div>

                            {Object.keys(stats.branch_breakdown || {}).length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                                            Branch Breakdown
                                        </h4>
                                        <button
                                            onClick={() => setShowStudentList(!showStudentList)}
                                            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                                        >
                                            {showStudentList ? "Show Distribution" : "View Manifest"}
                                        </button>
                                    </div>

                                    {!showStudentList ? (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-48 overflow-y-auto scrollbar-hide">
                                            {Object.entries(stats.branch_breakdown).map(([branch, count]: any) => (
                                                <div key={branch} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="text-sm font-medium text-gray-300">{branch}</span>
                                                    <span className="text-sm font-bold text-white bg-indigo-500/20 px-2.5 py-1 rounded-lg">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="glass rounded-xl border-white/10 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300 scrollbar-hide border">
                                            <table className="w-full text-left text-[11px]">
                                                <thead className="bg-white/5 sticky top-0">
                                                    <tr>
                                                        <th className="p-3 font-bold text-gray-400 uppercase">Student</th>
                                                        <th className="p-3 font-bold text-gray-400 uppercase text-right">Branch</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {(stats.eligible_students || []).map((s: any) => (
                                                        <tr key={s.roll_number} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-3">
                                                                <p className="font-bold text-white">{s.full_name}</p>
                                                                <p className="text-[10px] text-gray-500 font-mono italic">{s.roll_number}</p>
                                                            </td>
                                                            <td className="p-3 text-right text-indigo-400 font-black">{s.branch}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                    <p className="text-[10px] text-indigo-300 text-center font-medium leading-relaxed">
                                        Broadcasting will trigger neural notifications & secure emails to all {stats.total_eligible} qualified candidates. Group communication hub will be established automatically.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        disabled={drive.is_broadcasted || stats.total_eligible === 0}
                                        onClick={handleActivateAndBroadcast}
                                        className="flex-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30"
                                    >
                                        <Globe className="w-4 h-4" />
                                        {drive.is_broadcasted ? "DRIVE LIVE & BROADCASTED" : "ESTABLISH & BROADCAST"}
                                    </button>
                                </div>
                            </div>

                            {drive.status === 'ACTIVE' && (
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-400" />
                                        TPO Governance Override
                                    </h4>
                                    <form onSubmit={handleManualAddStudent} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualRollNumber}
                                            onChange={e => setManualRollNumber(e.target.value)}
                                            placeholder="ROLL NUMBER (e.g. 2211CS...)"
                                            className="flex-1 bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase focus:border-indigo-500/50 outline-none"
                                        />
                                        <button disabled={addingStudent} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-[10px] transition-all uppercase">
                                            {addingStudent ? "PROCESSING..." : "FORCE ADD"}
                                        </button>
                                    </form>
                                    <p className="text-[9px] text-gray-600 mt-2 font-medium italic">Bypasses eligibility validation & system constraints.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showBroadcast && drive.id && (
                    <BroadcastProgressOverlay 
                        driveId={drive.id} 
                        onComplete={() => {
                            setShowBroadcast(false);
                            onBroadcastSuccess();
                            onClose();
                        }}
                        onClose={() => setShowBroadcast(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default PlacementAnalyticsModal;
