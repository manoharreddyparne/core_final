// src/features/projects/pages/ShowcaseHub.tsx
import React, { useEffect, useState } from 'react';
import { projectsApi } from '../api';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import {
    Search,
    Upload,
    FileText,
    Presentation,
    BookOpen,
    Paperclip,
    Heart,
    Eye,
    X,
    ChevronRight,
    ChevronDown,
    Link as LinkIcon,
    Users as UsersIcon,
    ShieldCheck,
    CheckCircle,
    Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ShowcaseHub: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [ordering, setOrdering] = useState("-created_at");

    // UI States
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isApproving, setIsApproving] = useState<string | null>(null);

    // Form States
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [abstract, setAbstract] = useState("");
    const [category, setCategory] = useState("DOCUMENTATION");
    const [groupName, setGroupName] = useState("");
    const [batchId, setBatchId] = useState("");
    const [projectLink, setProjectLink] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [researchFile, setResearchFile] = useState<File | null>(null);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            let filter = categoryFilter !== "ALL" ? categoryFilter : "";
            const data = await projectsApi.getProjects(searchTerm || filter, ordering);
            setProjects(data.results || data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(fetchProjects, 300);
        return () => clearTimeout(delaySearch);
    }, [searchTerm, categoryFilter, ordering]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return toast.error("Title and Main File are required");

        try {
            setIsUploading(true);
            await projectsApi.uploadProject({
                title,
                description,
                abstract,
                category,
                group_name: groupName,
                batch_id: batchId,
                project_link: projectLink,
                file,
                documentation_file: docFile,
                research_paper: researchFile
            });
            toast.success("Project submitted for review!");
            setShowUploadModal(false);

            // Reset state
            setTitle("");
            setDescription("");
            setAbstract("");
            setGroupName("");
            setBatchId("");
            setProjectLink("");
            setFile(null);
            setDocFile(null);
            setResearchFile(null);

            fetchProjects();
        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.detail || err.response?.data?.[0] || err.message || "Submission failed";
            toast.error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        } finally {
            setIsUploading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            setIsApproving(id);
            await projectsApi.approveProject(id);
            toast.success("Project approved successfully!");
            setProjects(prev => prev.map(p => p.id === id ? { ...p, is_approved: true } : p));
        } catch (err) {
            console.error(err);
            toast.error("Approval failed");
        } finally {
            setIsApproving(null);
        }
    };

    const handleLike = async (id: string) => {
        try {
            const res = await projectsApi.likeProject(id);
            setProjects(prev => prev.map(p =>
                p.id === id ? { ...p, likes_count: res.likes_count, is_liked: res.status === 'liked' } : p
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const userRole = user?.role?.toLowerCase() || '';
    const isFacultyOrAdmin = ['faculty', 'admin', 'institution_admin', 'inst_admin', 'super_admin'].includes(userRole);

    const getIcon = (cat: string) => {
        switch (cat) {
            case 'PPT': return <Presentation className="w-6 h-6 text-orange-500" />;
            case 'RESEARCH_PAPER': return <BookOpen className="w-6 h-6 text-green-500" />;
            case 'DOCUMENTATION': return <FileText className="w-6 h-6 text-blue-500" />;
            default: return <Paperclip className="w-6 h-6 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-6xl font-black text-white italic tracking-tighter">
                        SHOWCASE <span className="text-primary NOT-italic">HUB</span>
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg max-w-2xl">
                        The institution's premier project repository. Sharing innovation across batches and fostering scholarly collaboration.
                    </p>
                </div>
                {userRole === 'student' && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-3 px-8 py-5 bg-white text-blue-900 font-black rounded-3xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 transition-all group"
                    >
                        <Upload className="w-5 h-5 group-hover:bounce-y" />
                        SUBMIT PROJECT
                    </button>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="glass p-5 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center border-white/5 shadow-2xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by title, student, group, or roll number..."
                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-6 text-white focus:outline-none focus:border-primary transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="ALL">All Disciplines</option>
                        <option value="DOCUMENTATION">Documentation</option>
                        <option value="PPT">Presentations</option>
                        <option value="RESEARCH_PAPER">Research Papers</option>
                    </select>
                    <select
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        value={ordering}
                        onChange={(e) => setOrdering(e.target.value)}
                    >
                        <option value="-created_at">Recently Added</option>
                        <option value="-views_count">Top Trending</option>
                        <option value="-likes_count">Highest Rated</option>
                    </select>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-96 glass animate-pulse rounded-[3rem]"></div>
                    ))}
                </div>
            ) : projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className={`glass group rounded-[3rem] border-white/5 hover:border-primary/30 transition-all overflow-hidden flex flex-col relative ${!project.is_approved ? 'opacity-80' : ''}`}
                        >
                            {!project.is_approved && (
                                <div className="absolute top-6 right-6 z-10">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-yellow-500/30 backdrop-blur-md">
                                        <Info className="w-3 h-3" />
                                        Pending Review
                                    </span>
                                </div>
                            )}

                            <div className="p-8 space-y-5 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-white/5 rounded-2xl">
                                        {getIcon(project.category)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                            {project.category_display}
                                        </span>
                                        {project.batch_id && (
                                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                                                Batch: {project.batch_id}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                        {project.title}
                                    </h3>
                                    {project.group_name && (
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            {project.group_name}
                                        </div>
                                    )}
                                    <p className="text-sm text-white/40 line-clamp-3 leading-relaxed font-medium italic">
                                        {project.description || "Project summary not provided."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                                    <div className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center text-white font-black text-lg shadow-lg">
                                        {project.student_name?.[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-white leading-none mb-1">{project.student_name}</span>
                                        <span className="text-xs text-white/30 font-black tracking-widest">{project.student_roll}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-white/5 flex flex-col gap-4">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleLike(project.id)}
                                            className={`flex items-center gap-2 text-xs font-black transition-all ${project.is_liked ? 'text-pink-500' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Heart className={`w-4 h-4 ${project.is_liked ? 'fill-current' : ''}`} />
                                            {project.likes_count}
                                        </button>
                                        <div className="flex items-center gap-2 text-xs text-white/40 font-black">
                                            <Eye className="w-4 h-4" />
                                            {project.views_count}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {project.project_link && (
                                            <a
                                                href={project.project_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                                title="Project Link"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                            </a>
                                        )}
                                        <a
                                            href={project.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-primary text-white font-black rounded-xl hover:scale-105 transition-all shadow-xl shadow-primary/30 flex items-center gap-2 text-xs"
                                        >
                                            VIEW SUBMISSION
                                            <ChevronRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>

                                {isFacultyOrAdmin && !project.is_approved && (
                                    <button
                                        onClick={() => handleApprove(project.id)}
                                        disabled={isApproving === project.id}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-500 border border-green-500/30 rounded-xl font-black text-xs hover:bg-green-500 hover:text-white transition-all disabled:opacity-50 mt-2"
                                    >
                                        {isApproving === project.id ? (
                                            <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                                        ) : (
                                            <CheckCircle className="w-4 h-4" />
                                        )}
                                        APPROVE SUBMISSION
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass p-24 rounded-[3.5rem] text-center space-y-8 border-white/5 shadow-inner">
                    <div className="w-32 h-32 mx-auto bg-white/5 rounded-[2.5rem] flex items-center justify-center shadow-xl rotate-3">
                        <BookOpen className="w-12 h-12 text-white/20" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-white italic tracking-tighter">THE REPOSITORY IS <span className="text-primary NOT-italic underline decoration-4">EMPTY</span></h2>
                        <p className="text-white/40 max-w-xl mx-auto font-medium text-lg leading-relaxed">
                            No projects have been approved for display yet. Students are encouraged to contribute their academic masterpieces.
                        </p>
                    </div>
                    {userRole === 'student' && (
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-10 py-5 bg-white text-blue-900 font-black rounded-2xl hover:scale-110 transition-all shadow-2xl"
                        >
                            INITIATE FIRST SUBMISSION
                        </button>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setShowUploadModal(false)}></div>
                    <div className="glass-dark border border-white/10 w-full max-w-4xl rounded-[3rem] p-10 relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-10 sticky top-0 bg-[#0b1120]/80 backdrop-blur-md pt-2 pb-6 z-20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/30">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-white italic tracking-tight">
                                        SUBMIT <span className="text-primary NOT-italic">THESIS</span>
                                    </h2>
                                    <p className="text-white/30 text-xs font-black uppercase tracking-widest mt-1 italic">Phase 1: Academic Peer Review</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em] ml-1">Universal Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:border-primary transition-all font-bold placeholder:text-white/10 shadow-inner"
                                        placeholder="Enter the full academic title..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Group Identifier</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all font-bold"
                                            placeholder="e.g. AI-Team-Alpha"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Batch Code</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all font-bold"
                                            placeholder="e.g. 2024-CSE-A"
                                            value={batchId}
                                            onChange={(e) => setBatchId(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Academic Category</label>
                                    <div className="relative group">
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white/70 font-bold focus:outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-inner"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            <option value="DOCUMENTATION">Phase 1: Final Documentation</option>
                                            <option value="PPT">Phase 2: Presentation (PPT)</option>
                                            <option value="RESEARCH_PAPER">Phase 3: Scholarly Research Paper</option>
                                            <option value="OTHER">Generic Academic Attachment</option>
                                        </select>
                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none group-hover:text-primary transition-colors" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Live Reference (Optional)</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                        <input
                                            type="url"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pl-14 text-white focus:outline-none focus:border-primary transition-all font-bold placeholder:text-white/10"
                                            placeholder="https://github.com/..."
                                            value={projectLink}
                                            onChange={(e) => setProjectLink(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Project Tagline (Short Description)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:border-primary transition-all font-bold placeholder:text-white/10 shadow-inner"
                                        placeholder="A one-sentence hook for your project..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Executive Summary (Abstract)</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white min-h-[160px] focus:outline-none focus:border-primary transition-all resize-none italic font-medium leading-relaxed shadow-inner"
                                        placeholder="Synthesize your project's core objectives, methodology, and primary results here..."
                                        value={abstract}
                                        onChange={(e) => setAbstract(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Academic Assets (PDF Required)</label>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input type="file" className="hidden" id="p-main" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required />
                                            <label htmlFor="p-main" className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-primary/20 rounded-lg"><Upload className="w-4 h-4 text-primary" /></div>
                                                    <span className="text-sm font-bold text-white/60">Final Submission*</span>
                                                </div>
                                                <span className="text-xs text-primary font-black truncate max-w-[150px]">{file ? file.name : "Select File"}</span>
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <input type="file" className="hidden" id="p-doc" onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)} />
                                            <label htmlFor="p-doc" className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-blue-500/20 rounded-lg"><FileText className="w-4 h-4 text-blue-500" /></div>
                                                    <span className="text-sm font-bold text-white/60">Full Documentation</span>
                                                </div>
                                                <span className="text-xs text-blue-500 font-black truncate max-w-[150px]">{docFile ? docFile.name : "Optional"}</span>
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <input type="file" className="hidden" id="p-research" onChange={(e) => setResearchFile(e.target.files ? e.target.files[0] : null)} />
                                            <label htmlFor="p-research" className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><BookOpen className="w-4 h-4 text-emerald-500" /></div>
                                                    <span className="text-sm font-bold text-white/60">Research Paper</span>
                                                </div>
                                                <span className="text-xs text-emerald-500 font-black truncate max-w-[150px]">{researchFile ? researchFile.name : "Optional"}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-6">
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="w-full py-8 bg-white text-blue-950 font-black text-xl rounded-[2.5rem] hover:scale-[1.01] transition-all shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-blue-900/30 border-t-blue-900 rounded-full animate-spin"></div>
                                            TRANSMITTING DATA...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-7 h-7" />
                                            SUBMIT FOR FACULTY REVIEW
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-white/20 mt-6 font-black uppercase tracking-[0.5em]">Project will be visible to others only after faculty authorization</p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowcaseHub;
