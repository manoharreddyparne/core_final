// src/features/resumes/pages/SmartResumeStudio.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resumeApi } from '../api';
import { StudentResume } from '../types';
import { AIOptimizerPanel } from '../components/AIOptimizerPanel';
import { ATSScoreCard } from '../components/ATSScoreCard';

import { SmartResumeCanvas } from '../components/SmartResumeCanvas';

const SmartResumeStudio: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [resume, setResume] = useState<StudentResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('all');
    const [studioMode, setStudioMode] = useState<'canvas' | 'templates' | 'analyze'>('canvas');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (id && id !== 'new') {
            resumeApi.getResume(parseInt(id)).then(setResume).finally(() => setLoading(false));
        } else {
            // Default mock for 'new'
            setResume({
                id: 0,
                resume_name: "Draft Resume",
                personal_info: {
                    name: "Manohar P.",
                    email: "manohar@auip-nexus.com",
                    phone: "+91 94342 XXXXX",
                    location: "Port Blair, S. Andaman",
                    summary: "Aspiring Cloud Architect and Software Engineer with deep interest in AI/ML."
                },
                skills: ["React", "Python", "Docker", "AWS", "TypeScript"],
                experience: [
                    {
                        company: "Nexora Tech Labs",
                        role: "Student Intern",
                        duration: "Jan 2026 - Present",
                        bullets: ["Developing multi-tenant AI architecture", "Scaling PostgreSQL for 10k users"]
                    }
                ],
                education: [],
                projects: [],
                awards: [],
                ats_score_cache: 78
            });
            setLoading(false);
        }
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-primary/20"></div>
            <p className="text-muted-foreground font-black tracking-widest animate-pulse uppercase text-xs">Calibrating Resume Canvas...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter italic">
                        Smart <span className="text-primary NOT-italic">Resume</span> Studio
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Professional Canvas Interface | {resume?.resume_name}
                        {resume?.is_ai_optimized && <span className="ml-3 px-2 py-0.5 bg-green-400/20 text-green-400 rounded text-[10px] uppercase font-black">AI Optimized</span>}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-2 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Save Draft</button>
                    <button className="px-6 py-2 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20">Sync & Export</button>
                    <button
                        onClick={() => setStudioMode('analyze')}
                        className={`px-6 py-2 border font-bold rounded-2xl transition-all ${studioMode === 'analyze' ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                        Upload PDF for Analysis
                    </button>
                    <button
                        onClick={() => setStudioMode('templates')}
                        className={`px-6 py-2 border font-bold rounded-2xl transition-all flex items-center gap-2 ${studioMode === 'templates' ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Templates
                    </button>
                    <button onClick={() => setStudioMode('canvas')} className="px-6 py-2 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20">Resume Editor</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left: Toolbar/Sections */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass p-4 rounded-[2.5rem] space-y-2">
                        {['all', 'summary', 'experience', 'education', 'projects', 'skills'].map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(sec)}
                                className={`w-full text-left px-6 py-4 rounded-3xl font-bold transition-all capitalize
                                    ${activeSection === sec ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-400 hover:text-white hover:bg-white/5"}
                                `}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>
                </div>

                {/* center: Canvas / Templates / Upload */}
                <div className="lg:col-span-2 flex justify-center">
                    {studioMode === 'canvas' && (
                        <SmartResumeCanvas data={resume} activeSection={activeSection} />
                    )}

                    {studioMode === 'templates' && (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black text-white italic">Premium <span className="text-primary NOT-italic">Templates</span></h3>
                                <div className="text-xs text-primary font-bold uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">10,000+ Available</div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { name: "Executive Minimalist", img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop", color: "from-gray-900 to-gray-800" },
                                    { name: "Creative Designer", img: "https://images.unsplash.com/photo-1626785773579-c13f6bf563ce?w=400&h=500&fit=crop", color: "from-pink-500 to-rose-500" },
                                    { name: "Tech Architect", img: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=500&fit=crop", color: "from-blue-600 to-indigo-600" },
                                    { name: "Modern Startup", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop", color: "from-emerald-500 to-teal-500" }
                                ].map((t, i) => (
                                    <div key={i} className="group cursor-pointer">
                                        <div className={`aspect-[1/1.4] rounded-3xl bg-gradient-to-br ${t.color} p-2 relative overflow-hidden shadow-2xl`}>
                                            <img src={t.img} className="w-full h-full object-cover rounded-2xl opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <button onClick={() => setStudioMode('canvas')} className="px-6 py-3 bg-white text-black font-black rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all">Use Template</button>
                                            </div>
                                        </div>
                                        <p className="text-white font-bold mt-3 text-center text-sm">{t.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {studioMode === 'analyze' && (
                        <div className="w-full glass p-12 rounded-[3rem] border-dashed border-2 border-white/20 flex flex-col items-center justify-center text-center space-y-6 hover:border-primary transition-colors cursor-pointer group animate-in zoom-in-95">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">Upload Existing Resume</h3>
                                <p className="text-gray-400 mt-2 font-medium">Drop your PDF here. The Governance Brain will extract data, identify weak points, and auto-score it.</p>
                            </div>
                            <input type="file" className="hidden" id="pdf-upload" onChange={(e) => {
                                if (e.target.files) {
                                    setUploading(true);
                                    setTimeout(() => {
                                        setUploading(false);
                                        setStudioMode('canvas');
                                        alert("AI extraction complete! ATS Score cached.");
                                    }, 2000);
                                }
                            }} />
                            <label htmlFor="pdf-upload" className="px-8 py-4 bg-primary text-white font-bold rounded-2xl cursor-pointer hover:bg-primary/90 shadow-xl shadow-primary/20">
                                {uploading ? "Analyzing Document..." : "Select File"}
                            </label>
                        </div>
                    )}
                </div>

                {/* Right: AI & Meta */}
                <div className="lg:col-span-1 space-y-6">
                    <ATSScoreCard score={resume?.ats_score_cache || 0} missingKeywords={[]} />
                    <AIOptimizerPanel resumeId={parseInt(id || '0')} onOptimize={(sum) => console.log(sum)} />
                </div>
            </div>
        </div >
    );
};

export default SmartResumeStudio;

