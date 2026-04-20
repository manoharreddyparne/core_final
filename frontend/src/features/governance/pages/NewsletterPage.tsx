import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, Building, CheckCircle2, Plus } from 'lucide-react';

export const NewsletterPage: React.FC = () => {
    const [newsletters, setNewsletters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState<string[]>(['Microsoft', 'Google']);

    const companies = [
        { name: "Microsoft", role: "Redmond, WA", color: "from-blue-500 to-blue-600" },
        { name: "Google", role: "Mountain View, CA", color: "from-green-500 to-green-600" },
        { name: "Amazon AWS", role: "Seattle, WA", color: "from-orange-500 to-orange-600" },
        { name: "Nexora Tech Labs", role: "HQ", color: "from-indigo-500 to-indigo-600" }
    ];

    useEffect(() => {
        // Fetch dynamic, real-world articles representing company newsletters
        axios.get("https://dev.to/api/articles?tag=technology&top=7")
            .then(res => setNewsletters(res.data))
            .catch(err => console.error("Failed to load external newsletters", err))
            .finally(() => setLoading(false));
    }, []);

    const toggleFollow = (company: string) => {
        setFollowing(prev => prev.includes(company) ? prev.filter(c => c !== company) : [...prev, company]);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Syncing Tech Newsletters...</p>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700 h-full">

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight">Nexus <span className="text-indigo-400 NOT-italic">Bulletins</span></h1>
                    <p className="text-muted-foreground mt-2 font-medium">Read global newsletters and tech company release notes, tailored for placements.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {newsletters.map((nl: any) => (
                        <a href={nl.url} target="_blank" rel="noreferrer" key={nl.id} className="glass p-0 rounded-[3rem] overflow-hidden group hover:border-indigo-500/30 transition-all block">
                            <div className="h-40 bg-white/5 relative flex items-center justify-center overflow-hidden">
                                {nl.cover_image ? (
                                    <img src={nl.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={nl.title} />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                                )}
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all"></div>
                                <div className="absolute top-4 left-6 flex gap-2">
                                    {nl.tag_list?.slice(0, 2).map((tag: string) => (
                                        <span key={tag} className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase rounded-full">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 space-y-4">
                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">{nl.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2">{nl.description}</p>
                                <div className="pt-4 flex items-center justify-between border-t border-white/5">
                                    <div className="flex items-center gap-3">
                                        <img src={nl.user?.profile_image} className="w-8 h-8 rounded-full" alt="Author" />
                                        <span className="text-xs text-white font-bold">{nl.user?.name}</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* Right Sidebar: Follow Companies */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
                <div className="glass p-6 rounded-[2.5rem] border-white/5">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                        <Building className="w-5 h-5 text-indigo-400" />
                        Company Publishers
                    </h2>

                    <div className="space-y-4">
                        {companies.map(c => {
                            const isFollowing = following.includes(c.name);
                            return (
                                <div key={c.name} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white font-black shadow-lg`}>
                                            {c.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{c.name}</p>
                                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{c.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleFollow(c.name)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFollowing ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white hover:bg-indigo-500 hover:text-white'}`}
                                    >
                                        {isFollowing ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border-white/5 bg-gradient-to-b from-indigo-500/10 to-transparent text-center space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Newsletter Digest</p>
                    <p className="text-sm text-gray-300">Opt-in to daily email summaries of your followed companies.</p>
                    <button className="w-full py-3 premium-gradient text-white font-bold rounded-xl shadow-xl shadow-indigo-500/20 uppercase text-xs tracking-widest">
                        Configure Alerts
                    </button>
                </div>
            </div>

        </div>
    );
};

