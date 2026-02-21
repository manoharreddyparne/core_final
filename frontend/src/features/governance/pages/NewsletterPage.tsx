import React, { useEffect, useState } from 'react';
import { apiClient } from '../../auth/api/base';

export const NewsletterPage: React.FC = () => {
    const [newsletters, setNewsletters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get("governance/newsletters/").then(res => {
            setNewsletters(res.data.results || res.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Archiving Institutional Knowledge...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black text-white italic tracking-tight">Institutional <span className="text-indigo-400 NOT-italic">Newsletters</span></h1>
                <p className="text-muted-foreground mt-2 font-medium">Official updates, researcher spotlights, and platform status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsletters.map(nl => (
                    <div key={nl.id} className="glass p-0 rounded-[3rem] overflow-hidden group hover:border-indigo-500/30 transition-all">
                        <div className="h-48 bg-white/5 relative flex items-center justify-center overflow-hidden">
                            {nl.cover_image ? (
                                <img src={nl.cover_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={nl.title} />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                            )}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all"></div>
                            <div className="absolute bottom-6 left-8">
                                <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-full">{nl.month} {nl.year}</span>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{nl.title}</h3>
                            <button className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white flex items-center gap-2 transition-all">
                                READ VOLUME
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </button>
                        </div>
                    </div>
                ))}

                {newsletters.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-white/20 font-black italic text-2xl uppercase tracking-tighter">No volumes released yet in this era.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
