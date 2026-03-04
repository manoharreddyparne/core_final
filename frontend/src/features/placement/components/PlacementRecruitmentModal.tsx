import React, { useState, useEffect } from "react";
import {
    X, UploadCloud, BrainCircuit, Target, Briefcase, Activity, FileText, Phone, DollarSign, Clock, ListChecks
} from "lucide-react";
import toast from "react-hot-toast";
import { placementApi } from "../api";
import { PlacementDrive } from "../types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingDrive?: PlacementDrive | null;
}

const PlacementRecruitmentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, editingDrive }) => {
    const [uploading, setUploading] = useState(false);
    const [activeInputTab, setActiveInputTab] = useState<'upload' | 'text'>('upload');
    const [jdText, setJdText] = useState("");
    const [showAddField, setShowAddField] = useState(false);

    const [newDriveForm, setNewDriveForm] = useState<Partial<PlacementDrive>>({
        company_name: '',
        role: '',
        package_details: '',
        location: '',
        experience_years: '',
        salary_range: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        min_cgpa: 0,
        min_ug_percentage: 0,
        allowed_active_backlogs: 0,
        min_10th_percent: 0,
        min_12th_percent: 0,
        eligible_branches: [],
        eligible_batches: [],
        job_description: '',
        contact_details: [],
        hiring_process: [],
        custom_criteria: {}
    });

    const [expertise, setExpertise] = useState<{
        primary_skills?: string[];
        secondary_skills?: string[];
        difficulty_level?: number;
        drive_type?: 'PREMIUM' | 'GENERAL';
        social_blurbs?: string[];
        role_category?: string;
        narrative_summary?: string;
        key_highlights?: string[];
    } | null>(null);

    useEffect(() => {
        if (editingDrive) {
            setNewDriveForm({
                ...editingDrive,
                deadline: editingDrive.deadline ? new Date(editingDrive.deadline).toISOString().slice(0, 16) : ''
            });
        }
    }, [editingDrive]);

    const [jdFile, setJdFile] = useState<File | null>(null);

    const performExtraction = async (input: File | string) => {
        try {
            setUploading(true);
            if (input instanceof File) setJdFile(input);
            toast.loading("Neural Core parsing JD intelligence...", { id: "jd" });

            const res = await placementApi.extractJD(input);
            const ext = res.data || res;

            if (ext) {
                setNewDriveForm(prev => ({
                    ...prev,
                    company_name: ext.company_name || prev.company_name,
                    role: ext.role || prev.role,
                    package_details: ext.package_details || prev.package_details,
                    location: ext.location || prev.location,
                    experience_years: ext.experience_years || prev.experience_years,
                    salary_range: ext.salary_range || prev.salary_range,
                    min_cgpa: ext.min_cgpa || prev.min_cgpa,
                    min_ug_percentage: ext.min_ug_percentage || prev.min_ug_percentage,
                    allowed_active_backlogs: ext.allowed_active_backlogs !== undefined ? ext.allowed_active_backlogs : prev.allowed_active_backlogs,
                    min_10th_percent: ext.min_10th_percent || prev.min_10th_percent,
                    min_12th_percent: ext.min_12th_percent || prev.min_12th_percent,
                    eligible_branches: ext.eligible_branches || prev.eligible_branches,
                    eligible_batches: ext.eligible_batches || prev.eligible_batches,
                    job_description: ext.job_description || prev.job_description || ext.narrative_summary || '',
                    contact_details: ext.contact_details || prev.contact_details || [],
                    hiring_process: ext.hiring_process || prev.hiring_process || [],
                    custom_criteria: ext.custom_criteria || prev.custom_criteria || {}
                }));

                setExpertise({
                    primary_skills: ext.primary_skills,
                    secondary_skills: ext.secondary_skills,
                    difficulty_level: ext.difficulty_level,
                    drive_type: ext.drive_type,
                    social_blurbs: ext.social_blurbs,
                    role_category: ext.role_category,
                    narrative_summary: ext.narrative_summary,
                    key_highlights: ext.key_highlights
                });

                toast.success("Intelligence Extraction complete!", { id: "jd" });
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Extraction failed.", { id: "jd" });
        } finally {
            setUploading(false);
        }
    };

    const handleJDUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        performExtraction(e.target.files[0]);
    };

    const handleTextAnalysis = () => {
        if (!jdText || jdText.length < 50) {
            toast.error("Please paste at least 50 characters of JD text.");
            return;
        }
        performExtraction(jdText);
    };

    const handleCreateDrive = async () => {
        try {
            toast.loading(editingDrive ? "Updating Placement Drive..." : "Creating Placement Drive...", { id: "create_drive" });

            const formData = new FormData();

            // Basic fields
            formData.append('company_name', newDriveForm.company_name || '');
            formData.append('role', newDriveForm.role || '');
            formData.append('package_details', newDriveForm.package_details || '');
            formData.append('location', newDriveForm.location || '');
            formData.append('experience_years', newDriveForm.experience_years || '');
            formData.append('salary_range', newDriveForm.salary_range || '');
            formData.append('deadline', newDriveForm.deadline || '');
            formData.append('min_cgpa', String(newDriveForm.min_cgpa || 0));
            formData.append('min_ug_percentage', String(newDriveForm.min_ug_percentage || 0));
            formData.append('cgpa_to_percentage_multiplier', String(newDriveForm.cgpa_to_percentage_multiplier || 9.5));
            formData.append('allowed_active_backlogs', String(newDriveForm.allowed_active_backlogs || 0));
            formData.append('min_10th_percent', String(newDriveForm.min_10th_percent || 0));
            formData.append('min_12th_percent', String(newDriveForm.min_12th_percent || 0));

            // JSON fields
            formData.append('eligible_branches', JSON.stringify(newDriveForm.eligible_branches || []));
            formData.append('eligible_batches', JSON.stringify(newDriveForm.eligible_batches || []));
            formData.append('job_description', newDriveForm.job_description || '');
            formData.append('contact_details', JSON.stringify(newDriveForm.contact_details || []));
            formData.append('hiring_process', JSON.stringify(newDriveForm.hiring_process || []));
            formData.append('custom_criteria', JSON.stringify(newDriveForm.custom_criteria || {}));

            // File field
            if (jdFile) {
                formData.append('jd_document', jdFile);
            }

            if (editingDrive?.id) {
                await placementApi.updateDrive(editingDrive.id as number, formData);
                toast.success("Drive Updated Successfully!", { id: "create_drive" });
            } else {
                await placementApi.createDrive(formData);
                toast.success("Drive Created Successfully!", { id: "create_drive" });
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save drive", { id: "create_drive" });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative bg-[#1a1c23]/80 backdrop-blur-md border border-white/10 rounded-[3rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_120px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300">
                <div className="sticky top-0 bg-[#1a1c23]/80 backdrop-blur-xl border-b border-white/10 p-5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <Target className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none">{editingDrive ? "Modify Placement Intelligence" : "Expertise Orchestrator v4.2"}</h2>
                            <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest mt-1 font-black">AI-Powered Recruitment Interface</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {uploading && (
                    <div className="absolute inset-0 z-[110] bg-[#1a1c23]/90 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.5)_0%,transparent_70%)] animate-pulse" />
                        </div>

                        <div className="relative mb-12">
                            <div className="w-32 h-32 border-2 border-indigo-500/20 rounded-full animate-reverse-spin" />
                            <div className="absolute inset-0 w-32 h-32 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                                <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center space-y-4 relative z-10 px-6">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Analyzing Unstructured Intelligence</h2>
                            <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.5em] animate-pulse">Neural Core: Executing Semantic Mapping...</p>

                            <div className="max-w-xs mx-auto pt-8">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-indigo-500 animate-pulse rounded-full shadow-[0_0_15px_rgba(99,102,241,1)] w-2/3" />
                                </div>
                                <div className="flex justify-between mt-3 text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 outline-none">
                                    <span>OCR Layer</span>
                                    <span>Entity Discretization</span>
                                    <span>Logic Bridge</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                            {!editingDrive && (
                                <div className="p-1.5 bg-black/40 rounded-2xl border border-white/5 flex gap-1">
                                    <button
                                        onClick={() => setActiveInputTab('upload')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeInputTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <UploadCloud className="w-4 h-4" /> PDF Upload
                                    </button>
                                    <button
                                        onClick={() => setActiveInputTab('text')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeInputTab === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <FileText className="w-4 h-4" /> Paste JD Text
                                    </button>
                                </div>
                            )}

                            {activeInputTab === 'upload' ? (
                                <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[2.5rem] text-center relative overflow-hidden group">
                                    <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
                                    <h3 className="text-base font-bold text-white mb-2">Neural Extraction Engine</h3>
                                    <p className="text-[11px] text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed font-medium">
                                        Drop your Brochure, PDF, or JD document here. AI will atomize the text into structured placement data.
                                    </p>
                                    <label className="inline-flex items-center gap-2 cursor-pointer px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95">
                                        <UploadCloud className="w-4 h-4" />
                                        {uploading ? "Analyzing Deep Semantics..." : "Select Document"}
                                        <input type="file" accept=".pdf" className="hidden" onChange={handleJDUpload} disabled={uploading} />
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <textarea
                                        value={jdText}
                                        onChange={e => setJdText(e.target.value)}
                                        placeholder="Paste the Job Description text here for AI analysis..."
                                        className="w-full h-40 bg-black/40 border border-white/10 rounded-[2rem] p-5 text-sm text-gray-300 focus:border-indigo-500/50 outline-none transition-all resize-none font-medium"
                                    />
                                    <button
                                        onClick={handleTextAnalysis}
                                        disabled={uploading || jdText.length < 50}
                                        className="w-full py-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        {uploading ? "Analyzing Unstructured Text..." : "Execute Neural Analysis"}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                                        <Briefcase className="w-3 h-3 text-indigo-400" /> Organization
                                    </label>
                                    <input type="text" value={newDriveForm.company_name} onChange={e => setNewDriveForm({ ...newDriveForm, company_name: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" placeholder="e.g. NVIDIA Corporation" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                                        <Target className="w-3 h-3 text-indigo-400" /> Functional Role
                                    </label>
                                    <input type="text" value={newDriveForm.role} onChange={e => setNewDriveForm({ ...newDriveForm, role: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" placeholder="e.g. Fullstack Developer" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                                        <DollarSign className="w-3 h-3 text-indigo-400" /> Package / CTC
                                    </label>
                                    <input type="text" value={newDriveForm.package_details} onChange={e => setNewDriveForm({ ...newDriveForm, package_details: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" placeholder="e.g. 18.5 LPA" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-indigo-400" /> Deadline
                                    </label>
                                    <input type="datetime-local" value={newDriveForm.deadline} onChange={e => setNewDriveForm({ ...newDriveForm, deadline: e.target.value })} className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 focus:bg-white/[0.07] outline-none transition-all" />
                                </div>

                                <div className="p-6 bg-black/40 border border-white/5 rounded-3xl col-span-2 space-y-6">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5" /> Governance Intelligence & Synthesis
                                    </h4>

                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Min CGPA</label>
                                            <input type="number" step="0.1" value={newDriveForm.min_cgpa} onChange={e => setNewDriveForm({ ...newDriveForm, min_cgpa: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">UG %</label>
                                            <input type="number" step="0.1" value={newDriveForm.min_ug_percentage} onChange={e => setNewDriveForm({ ...newDriveForm, min_ug_percentage: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Backlogs</label>
                                            <input type="number" value={newDriveForm.allowed_active_backlogs} onChange={e => setNewDriveForm({ ...newDriveForm, allowed_active_backlogs: parseInt(e.target.value) })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0" />
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Conversion Key</label>
                                            <input type="number" step="0.1" value={newDriveForm.cgpa_to_percentage_multiplier || 9.5} onChange={e => setNewDriveForm({ ...newDriveForm, cgpa_to_percentage_multiplier: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-emerald-500/30 text-emerald-400 px-1 py-2 text-sm focus:border-emerald-500 outline-none transition-all" />
                                            <p className="text-[7px] text-gray-600 uppercase mt-1">Multiplies CGPA for % logic</p>
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">10th %</label>
                                            <input type="number" step="0.1" value={newDriveForm.min_10th_percent} onChange={e => setNewDriveForm({ ...newDriveForm, min_10th_percent: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">12th %</label>
                                            <input type="number" step="0.1" value={newDriveForm.min_12th_percent} onChange={e => setNewDriveForm({ ...newDriveForm, min_12th_percent: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-indigo-500/30 text-white px-1 py-2 text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700" placeholder="0.0" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1">Eligibility Clusters</label>
                                    <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 rounded-[2rem]">
                                        {['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'BBA'].map(branch => (
                                            <button
                                                key={branch}
                                                type="button"
                                                onClick={() => {
                                                    const current = newDriveForm.eligible_branches || [];
                                                    const updated = current.includes(branch) ? current.filter(b => b !== branch) : [...current, branch];
                                                    setNewDriveForm({ ...newDriveForm, eligible_branches: updated });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${newDriveForm.eligible_branches?.includes(branch)
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                                    }`}
                                            >
                                                {branch}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-[#12141a] border border-white/10 rounded-[3rem] p-7 h-full flex flex-col shadow-2xl overflow-y-auto scrollbar-hide">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2.5">
                                    <BrainCircuit className="w-4 h-4 text-indigo-400" /> Intelligence Ledger
                                </h4>

                                {!expertise ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-20">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Activity className="w-8 h-8 text-gray-400 animate-pulse" />
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Waiting for Input</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="flex items-center justify-between p-5 bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-3xl shadow-lg">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">AI Tier Ranking</p>
                                                <p className="text-base font-black text-white mt-1 uppercase italic tracking-tight">{expertise.drive_type} DRIVE</p>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${expertise.drive_type === 'PREMIUM'
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                                }`}>
                                                {expertise.drive_type === 'PREMIUM' ? 'T1' : 'GL'}
                                            </div>
                                        </div>

                                        {expertise.narrative_summary && (
                                            <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem]">
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                    <BrainCircuit className="w-3.5 h-3.5" /> Neural Archetype
                                                </p>
                                                <p className="text-[11px] text-gray-300 font-medium leading-relaxed italic">
                                                    {expertise.narrative_summary}
                                                </p>
                                                {expertise.key_highlights && (
                                                    <div className="flex flex-wrap gap-2 mt-4">
                                                        {expertise.key_highlights.map((h, i) => (
                                                            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-gray-400">
                                                                {h}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Target className="w-3 h-3 text-indigo-400" /> Location
                                                </label>
                                                <input type="text" value={newDriveForm.location} onChange={e => setNewDriveForm({ ...newDriveForm, location: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-indigo-500/50" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <DollarSign className="w-3 h-3 text-emerald-400" /> Salary / Range
                                                </label>
                                                <input type="text" value={newDriveForm.salary_range} onChange={e => setNewDriveForm({ ...newDriveForm, salary_range: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-emerald-500/50" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-amber-400" /> Experience
                                                </label>
                                                <input type="text" value={newDriveForm.experience_years} onChange={e => setNewDriveForm({ ...newDriveForm, experience_years: e.target.value })} className="w-full bg-white/5 border border-white/5 text-gray-300 rounded-xl px-3 py-2 text-[11px] font-bold outline-none border-l-2 border-l-amber-500/50" />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Stack Decomposition</p>
                                            <div className="flex flex-wrap gap-2">
                                                {expertise.primary_skills?.map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-tight shadow-xl shadow-indigo-600/20 ring-1 ring-white/20">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {expertise.secondary_skills?.map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-white/5 text-gray-400 text-[10px] font-bold rounded-xl uppercase tracking-tight border border-white/10">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {newDriveForm.custom_criteria && (
                                            <div className="pt-6 border-t border-white/10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                        <ListChecks className="w-3.5 h-3.5" /> Ad-hoc Intelligence
                                                    </p>
                                                    <button
                                                        onClick={() => setShowAddField(true)}
                                                        className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-tighter transition-colors"
                                                    >
                                                        + Add Field
                                                    </button>
                                                </div>

                                                {showAddField && (
                                                    <div className="mb-4 flex gap-2 animate-in slide-in-from-top-2 duration-300">
                                                        <input
                                                            type="text"
                                                            placeholder="Criterion Name (e.g. Bond Period)"
                                                            className="flex-1 bg-white/5 border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = (e.target as HTMLInputElement).value;
                                                                    if (val) {
                                                                        setNewDriveForm({
                                                                            ...newDriveForm,
                                                                            custom_criteria: { ...newDriveForm.custom_criteria, [val]: "Not Specified" }
                                                                        });
                                                                        setShowAddField(false);
                                                                    }
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => setShowAddField(false)}
                                                            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-gray-500 hover:text-white"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {Object.entries(newDriveForm.custom_criteria).map(([k, v]) => (
                                                        <div key={k} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center flex-wrap gap-2">
                                                            <span className="text-[9px] font-black text-gray-500 uppercase min-w-[100px]">{k.replace(/_/g, ' ')}</span>
                                                            <input
                                                                type="text"
                                                                value={String(v)}
                                                                onChange={e => {
                                                                    setNewDriveForm({
                                                                        ...newDriveForm,
                                                                        custom_criteria: { ...newDriveForm.custom_criteria, [k]: e.target.value }
                                                                    });
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-[10px] font-bold text-gray-300 outline-none focus:text-white transition-colors"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/40 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                AI Generation Output
                                            </p>
                                            <div className="space-y-3 relative z-10">
                                                {expertise.social_blurbs?.map((blurb, i) => (
                                                    <p key={i} className="text-xs text-gray-200 font-bold leading-relaxed italic border-l-2 border-indigo-500 pl-3 py-1 bg-white/5 rounded-r-xl">
                                                        "{blurb}"
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/40 px-10">
                    <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-mono font-black italic">
                        <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                        CORE_ENGINE_STATE: {uploading ? "EXECUTING_NEURAL_MAP" : "SYSTEM_READY"}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-black text-gray-500 hover:text-white transition-all uppercase tracking-widest">Abort</button>
                        <button type="button" onClick={handleCreateDrive} className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] text-xs rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 group flex items-center gap-2">
                            {editingDrive ? "Update Architecture" : "Establish Manifest"}
                            <Target className="w-4 h-4 group-hover:rotate-45 transition-all" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementRecruitmentModal;
