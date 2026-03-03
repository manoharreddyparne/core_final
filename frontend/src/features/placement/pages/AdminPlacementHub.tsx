import React, { useEffect, useState } from "react";
import {
    Briefcase, FileText, UploadCloud, Users, CheckCircle, BrainCircuit, Activity, ChevronRight, X, BarChart3, Clock, Globe, Target
} from "lucide-react";
import { placementApi } from "../../placement/api";
import { PlacementDrive, PlacementApplication } from "../../placement/types";
import toast from "react-hot-toast";

const AdminPlacementHub = () => {
    const [drives, setDrives] = useState<PlacementDrive[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newDriveForm, setNewDriveForm] = useState<Partial<PlacementDrive>>({
        company_name: '',
        role: '',
        package_details: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        min_cgpa: 0,
        allowed_active_backlogs: 0,
        min_10th_percent: 0,
        min_12th_percent: 0,
        eligible_branches: [],
        eligible_batches: [],
        job_description: ''
    });

    const [editingDriveId, setEditingDriveId] = useState<number | null>(null);
    const [statsModalData, setStatsModalData] = useState<{ drive: PlacementDrive, stats: any } | null>(null);
    const [eligibleStudents, setEligibleStudents] = useState<string[]>([]); // Added state
    const [showStudentList, setShowStudentList] = useState(false); // Added state
    const [reviewModalData, setReviewModalData] = useState<{ drive: PlacementDrive, applications: PlacementApplication[] } | null>(null);
    const [manualRollNumber, setManualRollNumber] = useState("");
    const [addingStudent, setAddingStudent] = useState(false);

    // ESC Support for Modals
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsCreateModalOpen(false);
                setStatsModalData(null);
                setReviewModalData(null);
            }
        };
        if (isCreateModalOpen || statsModalData || reviewModalData) {
            window.addEventListener("keydown", handleEsc);
        }
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isCreateModalOpen, statsModalData, reviewModalData]);

    useEffect(() => {
        fetchDrives();
    }, []);

    const fetchDrives = async () => {
        try {
            setLoading(true);
            const data = await placementApi.getAdminDrives();
            setDrives(data);
        } catch (error) {
            toast.error("Failed to fetch placement drives.");
        } finally {
            setLoading(false);
        }
    };

    const handleJDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            setUploading(true);
            toast.loading("AI brain analyzing JD PDF...", { id: "jd" });

            const res = await placementApi.extractJD(file);
            const ext = res.data || res;

            if (ext) {
                setNewDriveForm(prev => ({
                    ...prev,
                    role: ext.role || prev.role,
                    package_details: ext.package_details || prev.package_details,
                    min_cgpa: ext.min_cgpa || prev.min_cgpa,
                    allowed_active_backlogs: ext.allowed_active_backlogs !== undefined ? ext.allowed_active_backlogs : prev.allowed_active_backlogs,
                    min_10th_percent: ext.min_10th_percent || prev.min_10th_percent,
                    min_12th_percent: ext.min_12th_percent || prev.min_12th_percent,
                    eligible_branches: ext.eligible_branches || prev.eligible_branches,
                    eligible_batches: ext.eligible_batches || prev.eligible_batches,
                    job_description: ext.other_requirements || prev.job_description,
                }));
                toast.success("AI extraction complete. Verify values below.", { id: "jd" });
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Extraction failed.", { id: "jd" });
        } finally {
            setUploading(false);
        }
    };

    const handleCreateDrive = async () => {
        try {
            toast.loading(editingDriveId ? "Updating Placement Drive..." : "Creating Placement Drive...", { id: "create_drive" });
            if (editingDriveId) {
                // Assuming Api has updateDrive
                await placementApi.updateDrive(editingDriveId, newDriveForm);
                toast.success("Drive Updated Successfully!", { id: "create_drive" });
            } else {
                await placementApi.createDrive(newDriveForm);
                toast.success("Drive Created Successfully!", { id: "create_drive" });
            }
            setIsCreateModalOpen(false);
            setEditingDriveId(null);
            fetchDrives();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save drive", { id: "create_drive" });
        }
    };

    const handleEditDrive = (drive: PlacementDrive) => {
        setNewDriveForm({
            company_name: drive.company_name,
            role: drive.role,
            package_details: drive.package_details,
            deadline: drive.deadline,
            min_cgpa: drive.min_cgpa,
            allowed_active_backlogs: drive.allowed_active_backlogs,
            min_10th_percent: drive.min_10th_percent,
            min_12th_percent: drive.min_12th_percent,
            eligible_branches: drive.eligible_branches,
            job_description: drive.job_description,
        });
        setEditingDriveId(drive.id as number);
        setIsCreateModalOpen(true);
    };

    const fetchStatsAndOpenModal = async (drive: PlacementDrive) => {
        try {
            toast.loading("Calculating real-time eligibility...", { id: "eligibility" });
            const res = await placementApi.getEligibilityStats(drive.id as number);
            setStatsModalData({ drive, stats: res.data });
            toast.success("Analytics retrieved", { id: "eligibility" });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch stats", { id: "eligibility" });
        }
    };

    const handleActivateAndBroadcast = async (driveId: number) => {
        try {
            toast.loading("Activating & Broadcasting...", { id: "broadcast" });
            // Step 1: Activate
            await placementApi.activateDrive(driveId);
            // Step 2: Broadcast (Sends Emails & Internal Notifications)
            await placementApi.broadcastDrive(driveId);

            toast.success("Broadcast successful! Students notified.", { id: "broadcast" });
            setStatsModalData(null);
            fetchDrives();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed during broadcast sequence", { id: "broadcast" });
        }
    };

    const handleManualAddStudent = async (driveId: number, e: React.FormEvent) => {
        e.preventDefault();
        if (!manualRollNumber.trim()) return;
        try {
            setAddingStudent(true);
            toast.loading("Adding student manually...", { id: "add_stu" });
            await placementApi.manualAddStudent(driveId, manualRollNumber);
            toast.success("Student assigned successfully!", { id: "add_stu" });
            setManualRollNumber("");
            // Refresh stats
            const res = await placementApi.getEligibilityStats(driveId);
            if (statsModalData) {
                setStatsModalData({ ...statsModalData, stats: res.data });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add student.", { id: "add_stu" });
        } finally {
            setAddingStudent(false);
        }
    };

    const fetchApplicationsAndOpenReview = async (drive: PlacementDrive) => {
        try {
            toast.loading("Fetching applications...", { id: "fetch_apps" });
            const apps = await placementApi.getApplications(drive.id as number);
            setReviewModalData({ drive, applications: apps });
            toast.dismiss("fetch_apps");
        } catch (error) {
            toast.error("Failed to load applications", { id: "fetch_apps" });
        }
    };

    const handleUpdateApplicationStatus = async (applicationId: number, status: string) => {
        try {
            toast.loading("Updating status...", { id: "update_status" });
            await placementApi.updateApplicationStatus(applicationId, status);
            toast.success("Status updated!", { id: "update_status" });

            // Re-fetch locally
            if (reviewModalData) {
                const updatedApps = await placementApi.getApplications(reviewModalData.drive.id as number);
                setReviewModalData({ ...reviewModalData, applications: updatedApps });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update status", { id: "update_status" });
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                        <Target className="w-8 h-8 text-indigo-400" />
                        Placement Governance & Analytics
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Automate JDs with AI, dynamically filter students, and broadcast drives securely.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingDriveId(null);
                        setNewDriveForm({
                            company_name: '', role: '', package_details: '', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                            min_cgpa: 0, allowed_active_backlogs: 0, min_10th_percent: 0, min_12th_percent: 0, eligible_branches: [], job_description: ''
                        });
                        setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                    <Briefcase className="w-4 h-4" />
                    New Placement Request
                </button>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : drives.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No Placement Drives Yet</h3>
                    <p className="text-gray-400 max-w-sm mb-6">
                        Start by creating a placement request. You can upload an HR's Job Description PDF and let the AI auto-fill the criteria.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors font-medium border border-white/10"
                    >
                        Create First Drive
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drives.map(drive => (
                        <div key={drive.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all relative overflow-hidden group">
                            {/* Status Badge */}
                            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-bl-xl ${drive.status === 'ACTIVE'
                                ? drive.is_broadcasted ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {drive.status === 'ACTIVE' ? (drive.is_broadcasted ? 'Broadcasted' : 'Active') : drive.status}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 truncate pr-20">{drive.company_name}</h3>
                            <p className="text-indigo-400 font-medium text-sm mb-4">{drive.role}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Globe className="w-4 h-4 text-gray-500" />
                                    <span>{drive.package_details || 'TBD Package'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <BarChart3 className="w-4 h-4 text-gray-500" />
                                    <span>CGPA: {drive.min_cgpa}+ | {(drive.allowed_active_backlogs ?? 0) > 0 ? `Max ${drive.allowed_active_backlogs} Backlogs` : 'No Active Backlogs'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span>Deadline: {new Date(drive.deadline).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    Created: {new Date(drive.created_at || Date.now()).toLocaleDateString()}
                                </span>

                                <div className="flex bg-indigo-500/10 rounded-lg overflow-hidden">
                                    {(drive.status === 'DRAFT' || drive.status === 'ACTIVE') && (
                                        <button
                                            onClick={() => handleEditDrive(drive)}
                                            className="px-3 py-1.5 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1 transition-colors border-r border-indigo-500/10"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => fetchStatsAndOpenModal(drive)}
                                        className="px-3 py-1.5 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1 transition-colors border-r border-indigo-500/10"
                                    >
                                        <Activity className="w-3.5 h-3.5" />
                                        Analytics
                                    </button>
                                    <button
                                        onClick={() => fetchApplicationsAndOpenReview(drive)}
                                        className="px-3 py-1.5 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        Review Apps
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE/UPLOAD MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Ultra-light translucent backdrop */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative bg-[#1a1c23]/80 backdrop-blur-md border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_120px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300">
                        <div className="sticky top-0 bg-[#1a1c23]/80 backdrop-blur-xl border-b border-white/10 p-5 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-xl font-bold text-white">{editingDriveId ? "Edit Placement Request" : "Create Placement Request"}</h2>
                                <p className="text-xs text-gray-400 mt-1">Institutional Governance Engine</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* AI UPLOAD ZONE */}
                            <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl text-center relative overflow-hidden group">
                                <BrainCircuit className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                                <h3 className="text-base font-semibold text-white mb-2">Let AI Extract the Criteria</h3>
                                <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
                                    Upload the Job Description / Requirements PDF provided by the company. Our intelligence engine will auto-fill the form.
                                </p>
                                <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-colors">
                                    <UploadCloud className="w-4 h-4" />
                                    {uploading ? "Extracting..." : "Upload JD PDF"}
                                    <input type="file" accept=".pdf" className="hidden" onChange={handleJDUpload} disabled={uploading} />
                                </label>
                            </div>

                            {/* MANUAL FORM */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Company Name</label>
                                    <input type="text" value={newDriveForm.company_name} onChange={e => setNewDriveForm({ ...newDriveForm, company_name: e.target.value })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" placeholder="e.g. Google, TCS" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Job Role</label>
                                    <input type="text" value={newDriveForm.role} onChange={e => setNewDriveForm({ ...newDriveForm, role: e.target.value })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" placeholder="e.g. SDE-1" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Package Details (LPA)</label>
                                    <input type="text" value={newDriveForm.package_details} onChange={e => setNewDriveForm({ ...newDriveForm, package_details: e.target.value })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" placeholder="e.g. 12 LPA" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Application Deadline</label>
                                    <input type="datetime-local" value={newDriveForm.deadline} onChange={e => setNewDriveForm({ ...newDriveForm, deadline: e.target.value })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-indigo-300">Minimum CGPA (Current)</label>
                                    <input type="number" step="0.1" value={newDriveForm.min_cgpa} onChange={e => setNewDriveForm({ ...newDriveForm, min_cgpa: parseFloat(e.target.value) })} className="w-full bg-indigo-500/10 border border-indigo-500/20 text-white rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-indigo-300">Allowed Active Backlogs</label>
                                    <input type="number" value={newDriveForm.allowed_active_backlogs} onChange={e => setNewDriveForm({ ...newDriveForm, allowed_active_backlogs: parseInt(e.target.value) })} className="w-full bg-indigo-500/10 border border-indigo-500/20 text-white rounded-xl px-4 py-2.5 text-sm" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">10th Grade Mini. %</label>
                                    <input type="number" value={newDriveForm.min_10th_percent} onChange={e => setNewDriveForm({ ...newDriveForm, min_10th_percent: parseFloat(e.target.value) })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">12th Grade Mini. %</label>
                                    <input type="number" value={newDriveForm.min_12th_percent} onChange={e => setNewDriveForm({ ...newDriveForm, min_12th_percent: parseFloat(e.target.value) })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm" />
                                </div>

                                {/* Can add multi-selects for branches/batches later, for now we let AI handle it or input as JSON strings if needed. For UI simplicity, just text fields */}
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-medium text-gray-400">Eligible Branches (e.g. CSE,IT,ECE)</label>
                                    <input type="text"
                                        value={newDriveForm.eligible_branches ? newDriveForm.eligible_branches.join(', ') : ''}
                                        onChange={e => setNewDriveForm({ ...newDriveForm, eligible_branches: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                        className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm"
                                        placeholder="Comma separated..." />
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-medium text-gray-400">Extracted/Additional Requirements</label>
                                    <textarea value={newDriveForm.job_description} onChange={e => setNewDriveForm({ ...newDriveForm, job_description: e.target.value })} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm min-h-[100px]" placeholder="Skills, requirements..." />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleCreateDrive} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg text-sm rounded-xl font-semibold transition-colors">
                                {editingDriveId ? "Update Drive" : "Save Drive as Draft"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYTICS & BROADCAST MODAL */}
            {statsModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Ultra-light translucent backdrop */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setStatsModalData(null)} />
                    <div className="relative bg-[#1a1c23]/80 backdrop-blur-md border border-indigo-500/20 rounded-[3rem] w-full max-w-lg shadow-[0_0_120px_rgba(79,70,229,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-gradient-to-b from-indigo-500/10 to-transparent">
                            <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl mx-auto shadow-xl shadow-indigo-500/20 mb-4 overflow-hidden p-2">
                                <span className="text-2xl font-black text-black">{statsModalData.drive.company_name[0]}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-center text-white">{statsModalData.drive.company_name}</h2>
                            <p className="text-center text-indigo-400 text-sm font-medium mt-1">{statsModalData.drive.role}</p>

                            <div className="mt-8 bg-black/40 border border-white/10 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-50"></div>
                                <div className="relative">
                                    <div className="text-5xl font-black text-white">{statsModalData.stats.total_eligible}</div>
                                    <div className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-widest">Total Eligible Students</div>
                                </div>
                            </div>

                            {Object.keys(statsModalData.stats.branch_breakdown || {}).length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch Breakdown</h4>
                                        <button
                                            onClick={() => setShowStudentList(!showStudentList)}
                                            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                                        >
                                            {showStudentList ? "Show Breakdown" : "View Names"}
                                        </button>
                                    </div>

                                    {!showStudentList ? (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            {Object.entries(statsModalData.stats.branch_breakdown).map(([branch, count]: any) => (
                                                <div key={branch} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="text-sm font-medium text-gray-300">{branch}</span>
                                                    <span className="text-sm font-bold text-white bg-indigo-500/20 px-2.5 py-1 rounded-lg">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="glass rounded-xl border-white/10 overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300 scrollbar-hide">
                                            <table className="w-full text-left text-[11px]">
                                                <thead className="bg-white/5 sticky top-0">
                                                    <tr>
                                                        <th className="p-3 font-bold text-gray-400 uppercase">Student</th>
                                                        <th className="p-3 font-bold text-gray-400 uppercase text-right">Branch</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {(statsModalData.stats.eligible_students || []).map((s: any) => (
                                                        <tr key={s.roll_number} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-3">
                                                                <p className="font-bold text-white">{s.full_name}</p>
                                                                <p className="text-[10px] text-gray-500 font-mono">{s.roll_number}</p>
                                                            </td>
                                                            <td className="p-3 text-right text-indigo-400 font-medium">{s.branch}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                                <p className="text-xs text-gray-400 text-center px-4">
                                    Broadcasting will instantly send an email and structural notification to all {statsModalData.stats.total_eligible} students, providing them an application link.
                                </p>

                                <div className="flex gap-3">
                                    <button onClick={() => setStatsModalData(null)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors">
                                        Close
                                    </button>
                                    <button
                                        disabled={statsModalData.drive.is_broadcasted || statsModalData.stats.total_eligible === 0}
                                        onClick={() => handleActivateAndBroadcast(statsModalData.drive.id as number)}
                                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        <Globe className="w-4 h-4" />
                                        {statsModalData.drive.is_broadcasted ? "Already Broadcasted" : "Activate & Broadcast"}
                                    </button>
                                </div>
                            </div>

                            {/* MANUAL OVERRIDE (TPO) */}
                            {(statsModalData.drive.status === 'ACTIVE') && (
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        TPO Manual Override
                                    </h4>
                                    <form onSubmit={(e) => handleManualAddStudent(statsModalData.drive.id as number, e)} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualRollNumber}
                                            onChange={e => setManualRollNumber(e.target.value)}
                                            placeholder="Enter Roll Number (e.g. 2211CS010446)"
                                            className="flex-1 bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm"
                                        />
                                        <button disabled={addingStudent} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-sm transition-colors">
                                            {addingStudent ? "Adding..." : "Add"}
                                        </button>
                                    </form>
                                    <p className="text-[10px] text-gray-500 mt-2">Bypasses eligibility criteria and application deadlines.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* REVIEW APPLICATIONS MODAL */}
            {reviewModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Ultra-light translucent backdrop */}
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setReviewModalData(null)} />
                    <div className="relative bg-[#1a1c23]/80 backdrop-blur-md w-full max-w-5xl rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-400" />
                                    Application Review
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">{reviewModalData.drive.company_name} - {reviewModalData.drive.role}</p>
                            </div>
                            <button onClick={() => setReviewModalData(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {reviewModalData.applications.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">No applications received yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {reviewModalData.applications.map(app => (
                                        <div key={app.id} className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white text-base">{app.student_details?.full_name || 'Unknown'}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                    <p className="text-xs text-indigo-400 font-mono">{app.student_details?.roll_number || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">{app.student_details?.branch || 'N/A'}</p>
                                                    <p className="text-xs text-gray-500 font-medium">CGPA: {app.student_details?.cgpa || '0.00'}</p>
                                                </div>
                                                <p className="text-[10px] text-gray-600 mt-1 truncate">{app.student_details?.email}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${app.status === 'APPLIED' ? 'bg-blue-500/20 text-blue-400' :
                                                    app.status === 'SHORTLISTED' ? 'bg-amber-500/20 text-amber-400' :
                                                        app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                                            app.status === 'PLACED' ? 'bg-green-500/20 text-green-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                                <div className="h-6 w-px bg-white/10 mx-2" />
                                                <select
                                                    value={app.status}
                                                    onChange={(e) => handleUpdateApplicationStatus(app.id as number, e.target.value)}
                                                    className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none"
                                                >
                                                    <option value="APPLIED">Applied</option>
                                                    <option value="SHORTLISTED">Shortlisted</option>
                                                    <option value="REJECTED">Rejected</option>
                                                    <option value="PLACED">Placed</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPlacementHub;
