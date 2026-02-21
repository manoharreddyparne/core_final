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
                        company: "AUIP Tech Labs",
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

                {/* center: Canvas */}
                <div className="lg:col-span-2 flex justify-center">
                    <SmartResumeCanvas data={resume} activeSection={activeSection} />
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
