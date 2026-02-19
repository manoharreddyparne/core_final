import { useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, ShieldCheck, Globe, ArrowRight } from "lucide-react";

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 glass border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Globe className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">AUIP <span className="text-blue-400">Platform</span></h1>
                </div>
                <div className="text-sm font-medium text-gray-400">
                    Secure Institutional Gateway
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <ShieldCheck className="w-4 h-4" />
                    Zero-Trust Architecture Active
                </div>

                <h2 className="text-5xl md:text-7xl font-black tracking-tighter max-w-4xl leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    The Future of <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Academic Governance
                    </span>
                </h2>

                <p className="text-lg md:text-xl text-gray-400 max-w-2xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                    Seamlessly connecting students, faculty, and administration through a secure, unified digital infrastructure.
                </p>

                {/* Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">

                    {/* Student Portal */}
                    <div
                        onClick={() => navigate("/auth/student/login")}
                        className="group glass p-8 rounded-3xl border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-start gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <GraduationCap className="w-7 h-7" />
                        </div>
                        <div className="text-left space-y-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Student Portal</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300">Access exams, results, and academic records securely.</p>
                        </div>
                        <div className="mt-auto pt-6 w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-blue-400">
                            <span>Login</span>
                            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Faculty Portal */}
                    <div
                        onClick={() => navigate("/auth/faculty/login")} // Assuming this route exists or uses student login for now
                        className="group glass p-8 rounded-3xl border border-white/5 hover:border-purple-500/50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col items-start gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="text-left space-y-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Faculty Hub</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300">Manage courses, grading, and student engagement.</p>
                        </div>
                        <div className="mt-auto pt-6 w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-purple-400">
                            <span>Access</span>
                            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Admin Portal */}
                    <div
                        onClick={() => navigate("/auth/inst-admin/login")}
                        className="group glass p-8 rounded-3xl border border-white/5 hover:border-pink-500/50 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-500/10 flex flex-col items-start gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div className="text-left space-y-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">Admin Portal</h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300">Management & oversight for departmental administrators.</p>
                        </div>
                        <div className="mt-auto pt-6 w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-pink-400">
                            <span>Governance</span>
                            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-6 w-full text-center text-xs text-gray-600 font-mono">
                <p>&copy; 2026 AUIP Platform. All Systems Operational.</p>
            </footer>
        </div>
    );
};
