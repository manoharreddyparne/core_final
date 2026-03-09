import React, { useState, useEffect } from 'react';
import { 
    BookOpen, Search, Filter, Download, User, Calendar, 
    ChevronRight, Book, GraduationCap, Award, FileText,
    Plus, CheckCircle, Clock, AlertCircle, X
} from 'lucide-react';
import { apiClient, coreApiClient } from '../../auth/api/base';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import toast from 'react-hot-toast';

interface ResearchPaper {
    id: string;
    title: string;
    abstract: string;
    student_name: string;
    student_roll: string;
    keywords: string;
    co_authors: string;
    research_area: string;
    research_paper: string;
    publication_date: string;
    is_approved: boolean;
    created_at: string;
}

const ResearchHub: React.FC = () => {
    const { role: userRole } = useAuth();
    const [papers, setPapers] = useState<ResearchPaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        fetchPapers();
    }, []);

    const fetchPapers = async () => {
        setLoading(true);
        try {
            const res = await coreApiClient.get('projects/showcase/?category=RESEARCH_PAPER');

            const data = res.data?.results || res.data?.data || res.data || [];
            setPapers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch research papers', err);
            toast.error('Could not load research repository');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append('category', 'RESEARCH_PAPER');
        
        const tid = toast.loading('Submitting manuscript for review...');
        try {
            await coreApiClient.post('projects/showcase/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Manuscript submitted successfully! Awaiting faculty review.', { id: tid });
            setIsUploadModalOpen(false);
            fetchPapers();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Upload failed', { id: tid });
        }
    };

    const filteredPapers = papers.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.keywords.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen pb-20 space-y-8 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-indigo-600/20 via-primary/10 to-transparent border border-white/10 p-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 space-y-6 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                        <Award className="w-4 h-4" /> Academic Excellence Hub
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter leading-tight uppercase">
                        Institutional <span className="text-primary not-italic">Research Repository</span>
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                        A centralized system for students to publish and explore high-impact research papers, 
                        following the IJRSI standard workflow for peer review and publication.
                    </p>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-8 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3"
                        >
                            <Plus className="w-5 h-5" /> Submit Manuscript
                        </button>
                        <div className="glass p-1 pl-4 flex items-center gap-2 rounded-2xl border-white/10 min-w-[300px]">
                            <Search className="w-5 h-5 text-muted-foreground" />
                            <input 
                                type="text" 
                                placeholder="Search by topic, keyword, or author..."
                                className="bg-transparent border-none outline-none text-white text-sm w-full py-3"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Papers List */}
                <div className="lg:col-span-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <BookOpen className="w-12 h-12 text-primary animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Indexing Repository...</p>
                        </div>
                    ) : filteredPapers.length === 0 ? (
                        <div className="glass p-20 rounded-[3rem] border-white/5 text-center space-y-4">
                            <Book className="w-16 h-16 text-muted-foreground/30 mx-auto" />
                            <h3 className="text-2xl font-black text-white italic">No Research Found</h3>
                            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                                We couldn't find any papers matching your query. Be the first to publish!
                            </p>
                        </div>
                    ) : (
                        filteredPapers.map(paper => (
                            <div 
                                key={paper.id}
                                onClick={() => setSelectedPaper(paper)}
                                className={`glass p-8 rounded-[2.5rem] border-white/5 hover:border-primary/30 transition-all cursor-pointer group ${selectedPaper?.id === paper.id ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors leading-tight">
                                            {paper.title}
                                        </h3>
                                        <div className="flex gap-2">
                                            {paper.is_approved ? (
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-green-500/20">
                                                    <CheckCircle className="w-3 h-3" /> Published
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-amber-500/20">
                                                    <Clock className="w-3 h-3" /> Under Review
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-sm font-medium line-clamp-3 leading-relaxed">
                                        {paper.abstract}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                                            <User className="w-4 h-4 text-primary" /> {paper.student_name}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                                            <Calendar className="w-4 h-4 text-primary" /> {new Date(paper.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                                            <FileText className="w-4 h-4 text-primary" /> {paper.research_area || 'General Research'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Details Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {selectedPaper ? (
                        <div className="glass p-10 rounded-[3rem] border-white/10 sticky top-8 space-y-8 animate-in slide-in-from-right-10 duration-500">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Manuscript Overview</h4>
                                <h2 className="text-2xl font-black text-white leading-tight">{selectedPaper.title}</h2>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase">Authors</p>
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black">
                                            {selectedPaper.student_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">{selectedPaper.student_name}</p>
                                            <p className="text-[9px] text-muted-foreground">Main Author • {selectedPaper.student_roll}</p>
                                        </div>
                                    </div>
                                    {selectedPaper.co_authors && (
                                        <p className="text-[10px] text-gray-400 font-medium italic">Co-authors: {selectedPaper.co_authors}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Research Abstract</p>
                                <p className="text-sm text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto pr-4 scrollbar-thin">
                                    {selectedPaper.abstract}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPaper.keywords.split(',').map((k, i) => (
                                        <span key={i} className="px-3 py-1 glass border-white/5 text-[10px] text-primary font-bold rounded-lg uppercase tracking-wider">
                                            {k.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-8">
                                <a 
                                    href={selectedPaper.research_paper} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full py-4 bg-white/10 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                                >
                                    <Download className="w-5 h-5" /> Download PDF
                                </a>
                                {selectedPaper.is_approved ? (
                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest">
                                        <CheckCircle className="w-4 h-4" /> Peer Reviewed & Certified
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                            <Clock className="w-4 h-4" /> Pending Peer Review
                                        </div>
                                        {['FACULTY', 'TEACHER', 'ADMIN', 'INSTITUTION_ADMIN', 'INST_ADMIN'].includes(String(userRole || '').toUpperCase()) && (
                                            <button 
                                                onClick={async () => {
                                                    const tid = toast.loading('Certifying manuscript...');
                                                    try {
                                                        await coreApiClient.post(`projects/showcase/${selectedPaper.id}/approve/`);

                                                        toast.success('Manuscript certified and published.', { id: tid });
                                                        fetchPapers();
                                                    } catch (err) {
                                                        toast.error('Certification failed.', { id: tid });
                                                    }
                                                }}
                                                className="w-full py-4 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-green-700 transition-all flex items-center justify-center gap-3"
                                            >
                                                <Award className="w-5 h-5" /> Certify & Publish
                                            </button>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>
                    ) : (
                        <div className="glass p-10 rounded-[3rem] border-white/5 sticky top-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5">
                                <ChevronRight className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                            <h4 className="text-xl font-black text-white italic">Select a Paper</h4>
                            <p className="text-muted-foreground text-sm font-medium">Click on any manuscript from the repository to view full details and download papers.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsUploadModalOpen(false)} />
                    <div className="relative glass w-full max-w-2xl rounded-[3rem] border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 p-8">
                            <button onClick={() => setIsUploadModalOpen(false)} className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white border-white/10 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleUpload} className="p-12 space-y-8 max-h-[90vh] overflow-y-auto pr-8 scrollbar-thin">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Submit <span className="text-primary not-italic">Manuscript</span></h2>
                                <p className="text-muted-foreground text-xs mt-2 font-medium uppercase tracking-widest">IJRSI Peer-Review Submission Workflow</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Paper Title</label>
                                    <input name="title" required placeholder="Enter full research title..." className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Abstract</label>
                                    <textarea name="abstract" required rows={6} placeholder="Summarize your research objectives, methodology, and results..." className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all resize-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Keywords</label>
                                        <input name="keywords" required placeholder="AI, Machine Learning, Cloud..." className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Research Area</label>
                                        <input name="research_area" required placeholder="Computer Science..." className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Co-Authors</label>
                                    <input name="co_authors" placeholder="Enter comma separated co-author names (if any)..." className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Upload PDF (Manuscript)</label>
                                    <div className="relative group">
                                        <input type="file" name="research_paper" required accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className="glass p-8 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-primary transition-all">
                                            <Download className="w-8 h-8 text-primary/50 group-hover:text-primary animate-bounce" />
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Click or drag manuscript PDF</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        By submitting, you confirm that this is your original work and follows the institution's ethics policy. 
                                        Once submitted, it will undergo peer review by assigned faculty members.
                                    </p>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-primary text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all">
                                Submit for Review
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResearchHub;
