import React, { useState, useEffect } from "react";
import { X, Target, Activity, Users } from "lucide-react";
import toast from "react-hot-toast";
import { placementApi } from "../api";
import { PlacementDrive } from "../types";

// Sub-components
import ProcessingOverlay from "./recruitment-modal/ProcessingOverlay";
import JDInputSection from "./recruitment-modal/JDInputSection";
import DriveDetailsSection from "./recruitment-modal/DriveDetailsSection";
import GovernanceSection from "./recruitment-modal/GovernanceSection";
import ExpertiseLedger from "./recruitment-modal/ExpertiseLedger";
import MatchCheckPreview from "./recruitment-modal/MatchCheckPreview";
import PlacementDriveCard from "./PlacementDriveCard";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingDrive?: PlacementDrive | null;
}

const PlacementRecruitmentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, editingDrive }) => {
    // UI State
    const [uploading, setUploading] = useState(false);
    const [activeInputTab, setActiveInputTab] = useState<'upload' | 'text'>('upload');
    const [jdText, setJdText] = useState("");
    const [showAddField, setShowAddField] = useState(false);
    
    // Eligibility Manifest State
    const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [showEligibilityPreview, setShowEligibilityPreview] = useState(false);
    const [showStudentPreview, setShowStudentPreview] = useState(false);
    const [excludedRolls, setExcludedRolls] = useState<Set<string>>(new Set());
    const [extraRollNumber, setExtraRollNumber] = useState("");

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
        cgpa_to_percentage_multiplier: 9.5,
        eligible_branches: [],
        eligible_batches: [],
        job_description: '',
        contact_details: [],
        hiring_process: [],
        custom_criteria: {}
    });

    const [expertise, setExpertise] = useState<any>(null);
    const [jdFile, setJdFile] = useState<File | null>(null);

    // Manifest Pagination & Filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [manifestQuery, setManifestQuery] = useState("");
    const [pageSize] = useState(50);

    useEffect(() => {
        if (editingDrive) {
            setNewDriveForm({
                ...editingDrive,
                deadline: editingDrive.deadline ? new Date(editingDrive.deadline).toISOString().slice(0, 16) : ''
            });
            if (editingDrive.neural_metadata) setExpertise(editingDrive.neural_metadata);
            if (editingDrive.excluded_rolls) setExcludedRolls(new Set(editingDrive.excluded_rolls));
        }
    }, [editingDrive]);

    const performExtraction = async (input: File | string) => {
        try {
            setUploading(true);
            if (input instanceof File) setJdFile(input);
            toast.loading("Neural Core parsing JD intelligence...", { id: "jd" });

            const res = await placementApi.extractJD(input);
            const ext = res.data || res;

            if (ext) {
                const sanitizeNum = (v: any) => (typeof v === 'number' ? v : (v === 'Not Specified' || !v ? 0 : parseFloat(String(v)) || 0));
                const sanitizeArray = (v: any) => (Array.isArray(v) ? v.filter(x => x !== 'Not Specified') : []);

                setNewDriveForm(prev => ({
                    ...prev,
                    company_name: ext.company_name || prev.company_name,
                    role: ext.role || prev.role,
                    package_details: ext.package_details || prev.package_details,
                    location: ext.location || prev.location,
                    experience_years: ext.experience_years || prev.experience_years,
                    salary_range: ext.salary_range || prev.salary_range,
                    min_cgpa: sanitizeNum(ext.min_cgpa),
                    min_ug_percentage: sanitizeNum(ext.min_ug_percentage),
                    allowed_active_backlogs: sanitizeNum(ext.allowed_active_backlogs),
                    min_10th_percent: sanitizeNum(ext.min_10th_percent),
                    min_12th_percent: sanitizeNum(ext.min_12th_percent),
                    eligible_branches: sanitizeArray(ext.eligible_branches),
                    eligible_batches: sanitizeArray(ext.eligible_batches).map((b: any) => parseInt(String(b)) || 0).filter((b: number) => b > 1900),
                    job_description: ext.job_description || prev.job_description || ext.narrative_summary || '',
                    manual_students: prev.manual_students || [],
                    neural_metadata: ext
                }));
                 // Use ext directly as expertise state
                setExpertise(ext);
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
        e.target.value = ''; // Reset to allow re-selection
    };

    const handleTextAnalysis = () => {
        if (!jdText || jdText.length < 50) {
            toast.error("Please paste at least 50 characters of JD text.");
            return;
        }
        performExtraction(jdText);
    };

    const prepareFormData = () => {
        const formData = new FormData();
        
        // Map scalar fields
        const scalarFields = [
            'company_name', 'role', 'package_details', 'location', 
            'experience_years', 'salary_range', 'deadline', 'job_description'
        ];
        
        scalarFields.forEach(field => {
            formData.append(field, String((newDriveForm as any)[field] || ''));
        });

        // Numeric fields — force to '0' if empty
        const numericFields = [
            'min_cgpa', 'min_ug_percentage', 'cgpa_to_percentage_multiplier',
            'allowed_active_backlogs', 'min_10th_percent', 'min_12th_percent'
        ];
        numericFields.forEach(field => {
            const val = (newDriveForm as any)[field];
            formData.append(field, (val !== undefined && val !== null && val !== '') ? String(val) : '0');
        });

        // JSON Fields
        formData.append('eligible_branches', JSON.stringify(newDriveForm.eligible_branches || []));
        formData.append('eligible_batches', JSON.stringify(newDriveForm.eligible_batches || []));
        formData.append('contact_details', JSON.stringify(newDriveForm.contact_details || []));
        formData.append('hiring_process', JSON.stringify(newDriveForm.hiring_process || []));
        formData.append('custom_criteria', JSON.stringify(newDriveForm.custom_criteria || {}));
        formData.append('neural_metadata', JSON.stringify(newDriveForm.neural_metadata || {}));
        formData.append('excluded_rolls', JSON.stringify(Array.from(excludedRolls)));
        
        const manualRolls = eligibleStudents.filter(s => s.is_manual).map(s => s.roll_number);
        // Also combine with existing manual_students if editing
        const combinedManual = Array.from(new Set([...manualRolls, ...(newDriveForm.manual_students || [])]));
        formData.append('manual_students', JSON.stringify(combinedManual));

        // UUID and Files
        if (newDriveForm.chat_session_id) {
            formData.append('chat_session_id', newDriveForm.chat_session_id);
        }
        
        if (jdFile) {
            formData.append('jd_document', jdFile);
        } else if (newDriveForm.jd_document && typeof newDriveForm.jd_document === 'string') {
            // If it's an existing file, let backend know by sending the URL (backend will ignore but keep current file)
            // Or omit entirely. We keep it to avoid missing field errors if any.
            formData.append('jd_document', newDriveForm.jd_document);
        }

        return formData;
    };

    const handleCheckEligibility = async (page = 1, query = manifestQuery) => {
        try {
            setCheckingEligibility(true);
            setCurrentPage(page);
            toast.loading(query ? "Filtering manifest..." : "Calculating matches...", { id: "eligibility" });
            
            const formData = prepareFormData();
            // Inject pagination and search into formData for the backend
            formData.append('page', String(page));
            formData.append('q', query);
            formData.append('page_size', String(pageSize));

            const res = await placementApi.checkEligibility(formData);
            setEligibleStudents(res.data?.eligible_students || []);
            setTotalCount(res.data?.total_count || 0);
            setShowEligibilityPreview(true);
            toast.success(`Found ${res.data?.total_count || 0} students!`, { id: "eligibility" });
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Check failed.", { id: "eligibility" });
        } finally {
            setCheckingEligibility(false);
        }
    };

    const handleManifestSearch = (val: string) => {
        setManifestQuery(val);
        // Debounce search
        if ((window as any)._manifestSearchTimer) clearTimeout((window as any)._manifestSearchTimer);
        (window as any)._manifestSearchTimer = setTimeout(() => {
            handleCheckEligibility(1, val);
        }, 500);
    };

    const handleAddManualStudent = async (student: any) => {
        if (!student) return;
        
        // Check if already in list
        if (eligibleStudents.some(s => s.roll_number === student.roll_number)) {
            toast.error("Student already in manifest.", { id: "manual" });
            return;
        }

        const newStu = {
            ...student,
            is_manual: true
        };

        setEligibleStudents(prev => [newStu, ...prev]);
        toast.success(`Added ${student.full_name} to manifest.`, { id: "manual" });
    };

    const handleRemoveManualStudent = (roll: string) => {
        setEligibleStudents(prev => prev.filter(s => s.roll_number !== roll));
        // Also remove from newDriveForm.manual_students if present
        if (newDriveForm.manual_students?.includes(roll)) {
            setNewDriveForm(prev => ({
                ...prev,
                manual_students: prev.manual_students?.filter(r => r !== roll)
            }));
        }
        toast.success("Manual entry purged.");
    };

    const toggleExclusion = (roll: string) => {
        setExcludedRolls(prev => {
            const next = new Set(prev);
            if (next.has(roll)) next.delete(roll);
            else next.add(roll);
            return next;
        });
    };

    const handleBulkExclusion = (exclude: boolean) => {
        if (exclude) {
            setExcludedRolls(new Set(eligibleStudents.map(s => s.roll_number)));
            toast.success("All students deselected.");
        } else {
            setExcludedRolls(new Set());
            toast.success("All students selected.");
        }
    };

    const handleCreateDrive = async (isBroadcast: boolean = false) => {
        try {
            const actionLabel = isBroadcast ? "Broadcasting Intelligence..." : "Syncing Draft...";
            toast.loading(actionLabel, { id: "create_drive" });
            
            const formData = prepareFormData();
            
            // Set status based on action
            if (isBroadcast) {
                formData.set('status', 'ACTIVE');
                // We'll let the backend trigger notifications if this flag is present
                formData.append('broadcast', 'true');
            } else if (!editingDrive) {
                formData.set('status', 'DRAFT');
            }

            // Append social blurbs to JD only on first creation if present
            if (expertise?.social_blurbs && !editingDrive) {
                let jdContent = (formData.get('job_description') as string) || '';
                jdContent += `\n\n[AI Social Blurbs]:\n${expertise.social_blurbs.join('\n')}`;
                formData.set('job_description', jdContent);
            }

            let response;
            if (editingDrive?.id) {
                response = await placementApi.updateDrive(editingDrive.id as number, formData);
            } else {
                response = await placementApi.createDrive(formData);
            }
            
            const msg = isBroadcast ? "Target students notified! Drive is Live." : "Strategic draft synchronized.";
            toast.success(msg, { id: "create_drive" });
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Protocol failure", { id: "create_drive" });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative bg-[#1a1c23]/80 backdrop-blur-md border border-white/10 rounded-[3rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_120px_rgba(0,0,0,0.6)]">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1c23]/80 backdrop-blur-xl border-b border-white/10 p-5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <Target className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-none">{editingDrive ? "Manage Placement Drive" : "New Recruitment Venture"}</h2>
                            <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest mt-1 font-black">Intelligence-Led Placement Orchestrator</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setShowStudentPreview(!showStudentPreview)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showStudentPreview ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                            {showStudentPreview ? "Edit Mode" : "Student View Preview"}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {uploading && <ProcessingOverlay />}

                {showStudentPreview ? (
                    <div className="flex-1 overflow-y-auto p-12 flex items-center justify-center bg-black/40">
                       <div className="w-full max-w-md">
                           <div className="text-center mb-8">
                               <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em] mb-2">Simulation Mode</p>
                               <h3 className="text-2xl font-black text-white">Student Intelligence Perspective</h3>
                           </div>
                           <PlacementDriveCard 
                                drive={{...newDriveForm, status: 'ACTIVE', id: 0, is_broadcasted: true} as any}
                                onOpenAnalytics={() => {}}
                                onOpenReview={() => {}}
                                onOpenEdit={() => {}}
                                onDelete={() => {}}
                           />
                           <p className="text-center mt-8 text-xs text-gray-500 font-medium max-w-xs mx-auto">
                               This is how qualified students will see your opportunity in their Professional Hub.
                           </p>
                       </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Main Interaction Zone */}
                            <div className="lg:col-span-8 space-y-6">
                                <JDInputSection 
                                    activeInputTab={activeInputTab}
                                    setActiveInputTab={setActiveInputTab}
                                    jdText={jdText}
                                    setJdText={setJdText}
                                    uploading={uploading}
                                    handleJDUpload={handleJDUpload}
                                    handleTextAnalysis={handleTextAnalysis}
                                    isEditing={!!editingDrive}
                                />

                                <DriveDetailsSection formData={newDriveForm} setFormData={setNewDriveForm} />
                                
                                <GovernanceSection formData={newDriveForm} setFormData={setNewDriveForm} />
                            </div>

                            {/* Analysis Sidebar */}
                            <div className="lg:col-span-4 space-y-6">
                                <ExpertiseLedger 
                                    expertise={expertise}
                                    formData={newDriveForm}
                                    setFormData={setNewDriveForm}
                                    showAddField={showAddField}
                                    setShowAddField={setShowAddField}
                                />
                            </div>
                        </div>

                        <MatchCheckPreview 
                            show={showEligibilityPreview || checkingEligibility}
                            eligibleStudents={eligibleStudents}
                            excludedRolls={excludedRolls}
                            toggleExclusion={toggleExclusion}
                            handleBulkExclusion={handleBulkExclusion}
                            extraRollNumber={extraRollNumber}
                            setExtraRollNumber={setExtraRollNumber}
                            handleAddManualStudent={handleAddManualStudent}
                            onRemoveManualStudent={handleRemoveManualStudent}
                            // Pagination Props
                            currentPage={currentPage}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={(p) => handleCheckEligibility(p, manifestQuery)}
                            onManifestSearch={handleManifestSearch}
                            manifestSearchQuery={manifestQuery}
                        />
                    </div>
                )}

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/40 px-10">
                    <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-mono font-black italic">
                        <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                        CORE_ENGINE: {uploading ? "EXECUTING_MAP" : "READY"}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest">Abort</button>
                        
                        <button 
                            onClick={() => handleCheckEligibility(1, manifestQuery)}
                            disabled={checkingEligibility || uploading}
                            className={`px-6 py-2.5 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${checkingEligibility || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {checkingEligibility ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                            <span>{showEligibilityPreview ? 'Re-Sync Match' : 'Run Match Check'}</span>
                        </button>

                        <button 
                            onClick={() => handleCreateDrive(false)}
                            disabled={uploading}
                            className={`px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span>Save Draft</span>
                        </button>

                        <button 
                            onClick={() => handleCreateDrive(true)}
                            disabled={uploading}
                            className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span>Post & Broadcast</span> <Target className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementRecruitmentModal;
