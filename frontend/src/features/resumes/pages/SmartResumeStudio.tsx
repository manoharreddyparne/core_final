// src/features/resumes/pages/SmartResumeStudio.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resumeApi } from '../api';
import { StudentResume } from '../types';
import { AIOptimizerPanel } from '../components/AIOptimizerPanel';
import { ATSScoreCard } from '../components/ATSScoreCard';

const SmartResumeStudio: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [resume, setResume] = useState<StudentResume | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('summary');

    useEffect(() => {
        if (id) {
            resumeApi.getResume(parseInt(id)).then(setResume).finally(() => setLoading(false));
        } else {
            // Mock or create new logic
            setLoading(false);
        }
    }, [id]);

    if (loading) return <div className="text-white animate-pulse">Initializing Studio...</div>;

    const mockContent = resume?.content || {
        summary: "Ambitious Engineering student with projects in AI...",
        experience: [],
        education: [{ school: "AUIP University", year: "2026" }],
        skills: ["React", "Python", "Cloud"]
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter italic">
                        Smart <span className="text-primary NOT-italic">Resume</span> Studio
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        RAG-Integrated Canvas Interface
                        {resume?.is_ai_optimized && <span className="ml-3 px-2 py-0.5 bg-green-400/20 text-green-400 rounded text-[10px] uppercase font-black">AI Optimized</span>}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-2 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Save Draft</button>
                    <button className="px-6 py-2 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20">Sync & Export</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left: Toolbar/Sections */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass p-4 rounded-[2.5rem] space-y-2">
                        {['summary', 'experience', 'education', 'projects', 'skills'].map(sec => (
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

                {/* center: Canvas */}
                <div className="lg:col-span-2">
                    <div className="glass bg-white p-12 rounded-[3.5rem] min-h-[800px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none opacity-20"></div>

                        <div className="relative z-10 space-y-8">
                            {/* Visual Resume Content Area */}
                            <div className="border-b-2 border-slate-100 pb-6 flex items-center justify-between">
                                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Manohar P.</h2>
                                <p className="text-slate-500 font-medium">Port Blair, Andaman & Nicobar</p>
                            </div>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">{activeSection}</h3>
                                <div className="text-slate-700 leading-relaxed font-serif text-lg min-h-[200px] outline-none" contentEditable>
                                    {activeSection === 'summary' && mockContent.summary}
                                    {activeSection === 'skills' && mockContent.skills.join(", ")}
                                    {activeSection === 'education' && mockContent.education[0].school}
                                    {activeSection === 'experience' && "Click to add professional experience..."}
                                    {activeSection === 'projects' && "No projects synced from your RAG profile yet."}
                                </div>
                            </section>

                            <div className="mt-20 pt-20 border-t border-slate-50 text-slate-300 text-[10px] font-mono flex justify-between">
                                <span>AUIP_RAG_ENCODER_V1.1</span>
                                <span>METADATA_SYNCED_2026</span>
                            </div>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-8 translate-y-full group-hover:translate-y-0 bg-gradient-to-t from-white via-white/95 to-transparent transition-all">
                            <button className="w-full py-4 bg-primary/10 border border-primary/20 text-primary font-black rounded-3xl hover:bg-primary/20 transition-all">
                                CLICK TO ENTER SMART-FOCUS MODE
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: AI & Meta */}
                <div className="lg:col-span-1 space-y-6">
                    <ATSScoreCard score={resume?.ats_score_cache || 0} missingKeywords={[]} />
                    <AIOptimizerPanel resumeId={parseInt(id || '0')} onOptimize={(sum) => console.log(sum)} />
                </div>
            </div>
        </div>
    );
};

export default SmartResumeStudio;
