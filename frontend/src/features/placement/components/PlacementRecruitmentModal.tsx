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
import BroadcastProgressOverlay from "./recruitment-modal/BroadcastProgressOverlay";
import SelectedStudentsModal from "./recruitment-modal/SelectedStudentsModal";

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
    const [showSelectedModal, setShowSelectedModal] = useState(false);

    // Eligibility Manifest State
    const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [showEligibilityPreview, setShowEligibilityPreview] = useState(false);
    const [showStudentPreview, setShowStudentPreview] = useState(false);
    const [selectionRolls, setSelectionRolls] = useState<Set<string>>(new Set());
    const [isExclusionMode, setIsExclusionMode] = useState(true);
    const [extraRollNumber, setExtraRollNumber] = useState("");
    const [manualEntries, setManualEntries] = useState<any[]>([]);
    const [criteriaChanged, setCriteriaChanged] = useState(false);
    const [fullManifestStudents, setFullManifestStudents] = useState<any[]>([]);
    const [isFetchingManifest, setIsFetchingManifest] = useState(false);
    const lastMatchCriteriaRef = React.useRef<string>("");

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
        custom_criteria: {},
        auto_reminders_enabled: false,
        is_inclusion_mode: false,
        reminder_config: {}
    });

    const [expertise, setExpertise] = useState<any>(null);
    const [jdFile, setJdFile] = useState<File | null>(null);

    // Manifest Pagination & Filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [manifestQuery, setManifestQuery] = useState("");
    const [pageSize] = useState(50);

    const [showBroadcastProgress, setShowBroadcastProgress] = useState(false);
    const [currentDriveId, setCurrentDriveId] = useState<number | null>(null);
    const [broadcastMode, setBroadcastMode] = useState<'INITIAL' | 'REMINDER' | 'MISSING'>('INITIAL');
    const [showModeMenu, setShowModeMenu] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUploading(false);
            setCheckingEligibility(false);
            setShowEligibilityPreview(false);
            setShowStudentPreview(false);
            setShowBroadcastProgress(false);
            setBroadcastMode('INITIAL');
            setShowModeMenu(false);

            if (editingDrive) {
                setNewDriveForm({
                    ...editingDrive,
                    deadline: editingDrive.deadline ? new Date(editingDrive.deadline).toISOString().slice(0, 16) : ''
                });
                setIsExclusionMode(!editingDrive.is_inclusion_mode);
                setSelectionRolls(new Set(
                    editingDrive.is_inclusion_mode
                        ? (editingDrive.included_rolls || [])
                        : (editingDrive.excluded_rolls || [])
                ));
                setManualEntries(editingDrive.manual_students?.map(r => ({ roll_number: r, full_name: 'Manual Entry', is_manual: true })) || []);
                if (editingDrive.neural_metadata) setExpertise(editingDrive.neural_metadata);
                if (editingDrive.excluded_rolls) setSelectionRolls(new Set(editingDrive.excluded_rolls));
            } else {
                // Reset form completely for new drive
                setNewDriveForm({
                    company_name: '', role: '', package_details: '', location: '', experience_years: '', salary_range: '',
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                    min_cgpa: 0, min_ug_percentage: 0, allowed_active_backlogs: 0, min_10th_percent: 0, min_12th_percent: 0,
                    cgpa_to_percentage_multiplier: 9.5, eligible_branches: [], eligible_batches: [], job_description: '',
                    contact_details: [], hiring_process: [], custom_criteria: {},
                    auto_reminders_enabled: false,
                    is_inclusion_mode: false,
                    reminder_config: {}
                });
                setExpertise(null);
                setJdText('');
                setJdFile(null);
                setSelectionRolls(new Set());
                setManualEntries([]);
            }
        }
    }, [isOpen, editingDrive]);

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
                toast.success("JD extracted — running eligibility check...", { id: "jd" });

                // Auto-run match check after extraction
                setTimeout(() => handleCheckEligibility(1, ""), 300);
            }

        } catch (e: any) {
            toast.error(e.response?.data?.message || "Extraction failed.", { id: "jd" });
        } finally {
            setUploading(false);
        }
    };

    // Track criteria changes to suggest re-running match check
    const getCriteriaFingerprint = () => {
        return JSON.stringify({
            min_cgpa: newDriveForm.min_cgpa,
            min_ug_percentage: newDriveForm.min_ug_percentage,
            min_10th_percent: newDriveForm.min_10th_percent,
            min_12th_percent: newDriveForm.min_12th_percent,
            allowed_active_backlogs: newDriveForm.allowed_active_backlogs,
            eligible_branches: newDriveForm.eligible_branches,
            eligible_batches: newDriveForm.eligible_batches,
        });
    };

    useEffect(() => {
        const current = getCriteriaFingerprint();
        if (lastMatchCriteriaRef.current && lastMatchCriteriaRef.current !== current && showEligibilityPreview) {
            setCriteriaChanged(true);
        }
    }, [newDriveForm.min_cgpa, newDriveForm.min_ug_percentage, newDriveForm.min_10th_percent, newDriveForm.min_12th_percent, newDriveForm.allowed_active_backlogs, newDriveForm.eligible_branches, newDriveForm.eligible_batches]);

    // 🧪 Point 57: VERIFICATION LOGGING
    useEffect(() => {
        if (newDriveForm.auto_reminders_enabled) {
            console.log("[RECRUITMENT-LIFECYCLE] Active Config:", newDriveForm.reminder_config);
        }
    }, [newDriveForm.auto_reminders_enabled, newDriveForm.reminder_config]);

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
            'experience_years', 'salary_range', 'deadline', 'job_description',
            'auto_reminders_enabled', 'tpo_notes', 'is_inclusion_mode'
        ];

        scalarFields.forEach(field => {
            let val = (newDriveForm as any)[field];

            // Override with local UI state for selection mode
            if (field === 'is_inclusion_mode') {
                val = !isExclusionMode;
            }

            // Explicitly handle booleans to avoid 'false' || '' becoming ''
            if (typeof val === 'boolean') {
                formData.append(field, val ? 'true' : 'false');
            } else {
                formData.append(field, (val !== undefined && val !== null) ? String(val) : '');
            }
        });

        const numericFields = [
            'min_cgpa', 'min_ug_percentage', 'cgpa_to_percentage_multiplier',
            'allowed_active_backlogs', 'min_10th_percent', 'min_12th_percent'
        ];
        numericFields.forEach(field => {
            const val = (newDriveForm as any)[field];
            // Gracefully handle strings/numbers without sending "NaN"
            const parsed = parseFloat(String(val));
            if (!isNaN(parsed) && val !== '' && val !== null && val !== undefined) {
                formData.append(field, String(parsed));
            } else {
                formData.append(field, '0');
            }
        });

        // JSON Fields
        formData.append('eligible_branches', JSON.stringify(newDriveForm.eligible_branches || []));
        formData.append('eligible_batches', JSON.stringify(newDriveForm.eligible_batches || []));
        formData.append('contact_details', JSON.stringify(newDriveForm.contact_details || []));
        formData.append('hiring_process', JSON.stringify(newDriveForm.hiring_process || []));
        formData.append('custom_criteria', JSON.stringify(newDriveForm.custom_criteria || {}));
        formData.append('neural_metadata', JSON.stringify(newDriveForm.neural_metadata || {}));
        formData.append('reminder_config', JSON.stringify(newDriveForm.reminder_config || {}));
        // Universal Selection Mode logic is already handled in scalarFields above, 
        // but we ensure rolls are appended correctly.
        if (isExclusionMode) {
            formData.append('excluded_rolls', JSON.stringify(Array.from(selectionRolls)));
            formData.append('included_rolls', JSON.stringify([]));
        } else {
            formData.append('included_rolls', JSON.stringify(Array.from(selectionRolls)));
            formData.append('excluded_rolls', JSON.stringify([]));
        }

        // Use manualEntries state for persistence across pages
        const combinedManual = Array.from(new Set([
            ...manualEntries.map(s => s.roll_number),
            ...(newDriveForm.manual_students || [])
        ]));
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
            setCriteriaChanged(false);
            toast.loading(query ? "Filtering..." : "Finding eligible students...", { id: "eligibility" });

            const formData = prepareFormData();
            formData.append('page', String(page));
            formData.append('q', query || '');
            formData.append('page_size', String(pageSize));

            const res = await placementApi.checkEligibility(formData);
            let results = res.data?.eligible_students || [];

            const criteriaIds = new Set(results.map((s: any) => s.id));
            const activeManuals = manualEntries.filter(m => !criteriaIds.has(m.id));

            if (page === 1) {
                setEligibleStudents([...activeManuals, ...results]);
            } else {
                setEligibleStudents(results);
            }

            setTotalCount(res.data?.total_count || 0);
            setShowEligibilityPreview(true);
            // Save the criteria fingerprint after a successful check
            lastMatchCriteriaRef.current = getCriteriaFingerprint();
            toast.success(`Found ${res.data?.total_count || 0} eligible students`, { id: "eligibility" });
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

        setManualEntries(prev => {
            if (prev.some(s => s.roll_number === student.roll_number)) return prev;
            return [newStu, ...prev];
        });
        setEligibleStudents(prev => [newStu, ...prev]);
        toast.success(`Added ${student.full_name} to manifest.`, { id: "manual" });
    };

    const handleRemoveManualStudent = (roll: string) => {
        setEligibleStudents(prev => prev.filter(s => s.roll_number !== roll));
        setManualEntries(prev => prev.filter(s => s.roll_number !== roll));
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
        setSelectionRolls(prev => {
            const next = new Set(prev);
            if (next.has(roll)) next.delete(roll);
            else next.add(roll);
            return next;
        });
        // Clear full manifest if selection changes locally
        setFullManifestStudents([]);
    };

    const handlePreviewManifest = async () => {
        try {
            setIsFetchingManifest(true);
            toast.loading("Compiling full target audience manifest...", { id: "manifest" });
            const formData = prepareFormData();
            const res = await placementApi.getEligibilityManifest(formData);
            setFullManifestStudents(res.data?.students || []);
            setShowSelectedModal(true);
            toast.success("Manifest compiled.", { id: "manifest" });
        } catch (e: any) {
            toast.error("Failed to compile manifest.", { id: "manifest" });
        } finally {
            setIsFetchingManifest(false);
        }
    };

    const handleBulkExclusion = (exclude: boolean) => {
        // Universal toggle: 
        // If exclude=true (Deselect All), we enter Inclusion Mode with 0 students
        // If exclude=false (Select All), we enter Exclusion Mode with 0 students
        setIsExclusionMode(!exclude);
        setSelectionRolls(new Set());
        toast.success(exclude ? "Manifest cleared. Toggle students to include." : "Universal selection active.");
    };

    const handleCreateDrive = async (isBroadcast: boolean = false) => {
        try {
            const actionLabel = isBroadcast ? "Saving & Preparing Broadcast..." : "Syncing Draft...";
            toast.loading(actionLabel, { id: "create_drive" });

            const formData = prepareFormData();

            // 🧪 Point 57: Payload Verification
            console.log("[DRIVE-PROTOCOL] Payload Snapshot:", Object.fromEntries(formData.entries()));
            console.log("[LIFECYCLE-SYNC] Reminders Enabled:", newDriveForm.auto_reminders_enabled);

            // Set status based on action — but DON'T include broadcast flag
            // We'll call the dedicated broadcast endpoint separately
            if (isBroadcast) {
                formData.set('status', 'ACTIVE');
            } else if (!editingDrive) {
                formData.set('status', 'DRAFT');
            }

            // Append social blurbs to JD only on first creation if present
            if (expertise?.social_blurbs && !editingDrive) {
                let jdContent = (formData.get('job_description') as string) || '';
                jdContent += `\n\n[AI Social Blurbs]:\n${expertise.social_blurbs.join('\n')}`;
                formData.set('job_description', jdContent);
            }

            // Step 1: Save/Update the drive
            let response;
            if (editingDrive?.id) {
                response = await placementApi.updateDrive(editingDrive.id as number, formData);
            } else {
                response = await placementApi.createDrive(formData);
            }

            if (isBroadcast) {
                const driveId = response.data?.id || (editingDrive?.id);
                if (driveId) {
                    // Step 2: Open the WS overlay FIRST (so it connects before broadcast starts)
                    console.log(`[NEURAL-ORCHESTRATOR] Initializing Broadcast Sequence | Mode: ${broadcastMode} | DriveID: ${driveId}`);
                    setCurrentDriveId(driveId);
                    setShowBroadcastProgress(true);
                    toast.dismiss("create_drive");

                    // Step 3: Wait a moment for WS to connect, then trigger broadcast
                    setTimeout(async () => {
                        try {
                            await placementApi.broadcastDrive(driveId, broadcastMode);
                        } catch (broadcastErr: any) {
                            console.error("[BROADCAST] POST failed:", broadcastErr);
                            toast.error(broadcastErr.response?.data?.message || "Broadcast trigger failed", { id: "broadcast_err" });
                        }
                    }, 800);
                } else {
                    toast.success("Drive saved but could not determine ID for broadcast.", { id: "create_drive" });
                    onSuccess();
                }
            } else {
                const msg = "Strategic draft synchronized.";
                toast.success(msg, { id: "create_drive" });
                onSuccess();
            }
        } catch (error: any) {
            console.error("[DRIVE-SAVE] Error:", error.response?.data || error.message);
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
                            <h2 className="text-xl font-bold text-white leading-none">{editingDrive ? "Edit Placement Drive" : "Create New Placement Drive"}</h2>
                            <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest mt-1 font-black">Upload JD → Review Criteria → Find Eligible Students → Broadcast</p>
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
                                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em] mb-2">Preview</p>
                                <h3 className="text-2xl font-black text-white">How Students Will See This Drive</h3>
                            </div>
                            <PlacementDriveCard
                                drive={{ ...newDriveForm, status: 'ACTIVE', id: 0, is_broadcasted: true } as any}
                                onOpenAnalytics={() => { }}
                                onOpenReview={() => { }}
                                onOpenEdit={() => { }}
                                onDelete={() => { }}
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

                        {/* Criteria Changed Banner */}
                        {criteriaChanged && showEligibilityPreview && (
                            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-[11px] font-bold text-amber-400">Eligibility criteria changed. Student list may be outdated.</span>
                                </div>
                                <button
                                    onClick={() => handleCheckEligibility(1, manifestQuery)}
                                    className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-amber-500/30"
                                >
                                    Re-run Match Check
                                </button>
                            </div>
                        )}

                        <MatchCheckPreview
                            show={showEligibilityPreview || checkingEligibility}
                            eligibleStudents={eligibleStudents}
                            excludedRolls={selectionRolls}
                            isExclusionMode={isExclusionMode}
                            toggleExclusion={toggleExclusion}
                            handleBulkExclusion={handleBulkExclusion}
                            extraRollNumber={extraRollNumber}
                            setExtraRollNumber={setExtraRollNumber}
                            handleAddManualStudent={handleAddManualStudent}
                            onRemoveManualStudent={handleRemoveManualStudent}
                            currentPage={currentPage}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={(p) => handleCheckEligibility(p, manifestQuery)}
                            onManifestSearch={handleManifestSearch}
                            manifestSearchQuery={manifestQuery}
                        />
                    </div>
                )}

                {showBroadcastProgress && currentDriveId && (
                    <BroadcastProgressOverlay
                        driveId={currentDriveId}
                        onComplete={() => {
                            toast.success("Broadcast complete! Emails sent to all eligible students.", { id: "broadcast" });
                            onSuccess();
                            onClose();
                        }}
                        onClose={() => setShowBroadcastProgress(false)}
                    />
                )}

                <SelectedStudentsModal
                    isOpen={showSelectedModal}
                    onClose={() => setShowSelectedModal(false)}
                    selectedStudents={fullManifestStudents.length > 0 ? fullManifestStudents : eligibleStudents.filter(s =>
                        isExclusionMode ? !selectionRolls.has(s.roll_number) : selectionRolls.has(s.roll_number)
                    )}
                    driveName={newDriveForm.company_name || "New Drive"}
                />

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/40 px-10">
                    {/* Selection Counter */}
                    <div className="flex items-center gap-3">
                        {showEligibilityPreview && totalCount > 0 && (
                            <button
                                onClick={handlePreviewManifest}
                                disabled={isFetchingManifest}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all group disabled:opacity-50"
                            >
                                <Users className={`w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform ${isFetchingManifest ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                                    {isExclusionMode ? (totalCount - selectionRolls.size) : selectionRolls.size} Selected of {totalCount} Matched — [ {isFetchingManifest ? 'Compiling...' : 'Preview Selection'} ]
                                </span>
                            </button>
                        )}
                        {!showEligibilityPreview && (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                                <Activity className="w-3.5 h-3.5 text-indigo-500/50" />
                                {uploading ? "Processing JD..." : "Ready"}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider transition-colors">Cancel</button>

                        <button
                            onClick={() => handleCheckEligibility(1, manifestQuery)}
                            disabled={checkingEligibility || uploading}
                            className={`px-5 py-2.5 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 ${checkingEligibility || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {checkingEligibility ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                            <span>{showEligibilityPreview ? 'Re-check' : 'Find Eligible Students'}</span>
                        </button>

                        <button
                            onClick={() => handleCreateDrive(false)}
                            disabled={uploading}
                            className={`px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border border-white/10 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Save Draft
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => {
                                    if (editingDrive?.is_broadcasted && !showModeMenu) {
                                        setShowModeMenu(true);
                                    } else {
                                        handleCreateDrive(true);
                                    }
                                }}
                                disabled={uploading}
                                className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {editingDrive?.is_broadcasted ? 'Re-Broadcast' : 'Save & Broadcast'} <Target className={`w-4 h-4 ${showModeMenu ? 'rotate-180' : ''} transition-transform`} />
                            </button>

                            {showModeMenu && (
                                <div className="absolute bottom-full right-0 mb-3 w-56 bg-[#1a1c23] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <p className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Select Mode</p>
                                    <button
                                        onClick={() => { setBroadcastMode('INITIAL'); setShowModeMenu(false); handleCreateDrive(true); }}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-indigo-400 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between"
                                    >
                                        INITIAL (Resend to ALL)
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    </button>
                                    <button
                                        onClick={() => { setBroadcastMode('REMINDER'); setShowModeMenu(false); handleCreateDrive(true); }}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-amber-400 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between"
                                    >
                                        REMINDER (Only non-applied)
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    </button>
                                    <button
                                        onClick={() => setShowModeMenu(false)}
                                        className="w-full text-left px-3 py-2 text-[10px] font-black text-gray-500 hover:bg-white/5 rounded-lg transition-colors mt-1 border-t border-white/5 pt-2"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementRecruitmentModal;
