import React from 'react';

interface SmartResumeCanvasProps {
    data: any;
    activeSection: string;
}

export const SmartResumeCanvas: React.FC<SmartResumeCanvasProps> = ({ data, activeSection }) => {
    return (
        <div className="bg-white p-16 shadow-2xl min-h-[1056px] w-full max-w-[816px] mx-auto text-slate-800 font-serif leading-normal relative overflow-hidden group">
            {/* Professional Watermark/Border */}
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10"></div>

            {/* Header section */}
            <header className="border-b-2 border-slate-900 pb-6 mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
                    {data.personal_info?.name || "Your Name"}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm font-sans text-slate-600 font-bold uppercase tracking-wider">
                    <span>{data.personal_info?.email || "email@nexus.com"}</span>
                    <span>•</span>
                    <span>{data.personal_info?.phone || "+91 XXXXXXXXXX"}</span>
                    <span>•</span>
                    <span>{data.personal_info?.location || "Port Blair, India"}</span>
                </div>
            </header>

            {/* Dynamic Content */}
            <div className="space-y-8">
                {/* Summary */}
                {(activeSection === 'summary' || activeSection === 'all') && (
                    <section className="space-y-2 animate-in fade-in slide-in-from-left-4">
                        <h2 className="text-lg font-bold text-primary border-b border-primary/20 pb-1 uppercase tracking-widest font-sans">Professional Summary</h2>
                        <div className="text-slate-700 leading-relaxed text-justify outline-none p-2 rounded hover:bg-slate-50 transition-all" contentEditable>
                            {data.personal_info?.summary || "Ambitions engineering student with focus on AI and Cloud Architecture. Seeking opportunities to build scalable systems."}
                        </div>
                    </section>
                )}

                {/* Experience */}
                {(activeSection === 'experience' || activeSection === 'all') && (
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-primary border-b border-primary/20 pb-1 uppercase tracking-widest font-sans">Professional Experience</h2>
                        {data.experience?.length > 0 ? data.experience.map((exp: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between font-bold text-slate-900">
                                    <span>{exp.role}</span>
                                    <span className="font-sans text-sm">{exp.duration}</span>
                                </div>
                                <p className="text-slate-600 font-sans text-sm italic">{exp.company}</p>
                                <ul className="list-disc list-inside text-slate-700 text-sm ml-2 space-y-1">
                                    {exp.bullets?.map((b: string, i: number) => <li key={i}>{b}</li>)}
                                </ul>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic text-sm">Click to add experience...</p>
                        )}
                    </section>
                )}

                {/* Skills */}
                {(activeSection === 'skills' || activeSection === 'all') && (
                    <section className="space-y-2">
                        <h2 className="text-lg font-bold text-primary border-b border-primary/20 pb-1 uppercase tracking-widest font-sans">Technical Expertise</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm">
                            {data.skills?.map((skill: string) => (
                                <div key={skill} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    <span className="font-bold">{skill}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ATS Insights Overlay (Subtle) */}
                <div className="absolute bottom-8 right-8 pointer-events-none opacity-10 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl space-y-2 translate-y-4 group-hover:translate-y-0 transition-transform">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">ATS Signal strength</p>
                        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '85%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Footer */}
            <div className="absolute bottom-12 left-16 right-16 border-t border-slate-100 pt-4 flex justify-between items-center opacity-30 text-[9px] font-sans uppercase tracking-[0.3em]">
                <span>Generated by Nexora Smart Engine</span>
                <span>Verification ID: NEX-2026-X99</span>
            </div>
        </div>
    );
};

