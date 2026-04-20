import React, { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, Home, ArrowLeft, Terminal, Activity, Lock } from "lucide-react";

export const PageNotFound = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        document.title = "Page Not Found | Nexora Portal";
    }, []);

    const errorRef = useMemo(() => `ERR_${Math.random().toString(36).substring(7).toUpperCase()}`, []);

    return (
        <div className="flex flex-col items-center justify-start md:justify-center min-h-screen bg-[#050505] text-white font-mono p-4 md:p-8 py-12 md:py-20 relative overflow-y-auto">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
                <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/50 blur-sm animate-[scan_4s_linear_infinite]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
            </div>

            <div className="w-full max-w-3xl text-center space-y-12 animate-in fade-in zoom-in slide-in-from-bottom-5 duration-1000 relative z-10">
                {/* Visual Header */}
                <div className="flex justify-center relative">
                    <div className="p-10 md:p-14 rounded-full bg-red-500/5 border border-red-500/10 shadow-[0_0_100px_rgba(239,68,68,0.15)] relative group">
                        <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-20" />
                        <Lock className="w-20 h-20 md:w-24 md:h-24 text-red-500 animate-[float_4s_ease-in-out_infinite]" />
                        
                        {/* Data Tags */}
                        <div className="absolute -top-4 -right-8 bg-red-600 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                            BREACH_L4
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-black uppercase tracking-[0.4em] text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Security Alert: Access Denied
                        </div>
                        <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none select-none">
                            404
                        </h1>
                        <h2 className="text-xl md:text-2xl font-black tracking-[0.3em] uppercase text-red-500/50">Page Not Found</h2>
                    </div>

                    <div className="max-w-xl mx-auto p-1 py-1 bg-gradient-to-r from-red-500/20 via-transparent to-red-500/20 rounded-[2.5rem]">
                        <div className="p-8 md:p-10 bg-[#080808] border border-white/5 rounded-[2.4rem] relative overflow-hidden shadow-2xl">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Terminal className="w-12 h-12" />
                           </div>
                           
                            <p className="text-gray-400 text-sm md:text-base leading-relaxed font-bold uppercase tracking-wide">
                                The link you followed may be broken or the page does not exist. Please check the URL or use the buttons below.
                            </p>
                            
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-t border-white/5 pt-8">
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">
                                    <Activity className="w-3.5 h-3.5 text-red-500/80" />
                                    <span>STATUS: ERROR</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">
                                    <Terminal className="w-3.5 h-3.5 text-blue-500/80" />
                                    <span>HASH: {errorRef}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                    <Link
                        to="/"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-14 py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] active:scale-[0.98] transition-all duration-300"
                    >
                        <Home className="w-5 h-5" />
                        Return to Base
                    </Link>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-14 py-5 border-2 border-white/10 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:border-white/30 hover:text-white hover:bg-white/5 transition-all duration-300 backdrop-blur-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Previous Node
                    </button>
                </div>

                <div className="pt-8 opacity-20">
                    <div className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-700">
                        Nexora Infrastructure v2.5
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                  0% { top: 0; opacity: 0; }
                  50% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-15px); }
                }
            `}</style>
        </div>
    );
};

