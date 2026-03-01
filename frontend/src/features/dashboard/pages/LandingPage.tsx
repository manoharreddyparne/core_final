import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap, ShieldCheck, Globe, ArrowRight, FileText,
    Mail, Building2, ChevronRight, Zap, Target, ExternalLink,
    Download, Eye, Brain, Users, BarChart3, BookOpen,
    Twitter, Linkedin, Github, Youtube, Info, CheckCircle2,
    AlertTriangle, Plus, Minus, X,
} from "lucide-react";
import { useLandingContent } from "../hooks/useLandingContent";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import { InstitutionDirectory } from "../components/InstitutionDirectory";

// ─── Feature icon mapping (by title keyword) ─────────────────────────────────
const FEATURE_ICONS = [Brain, ShieldCheck, Users, BookOpen, BarChart3, FileText];
const FEATURE_COLORS = [
    { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
    { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", glow: "shadow-green-500/20" },
    { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/20" },
    { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/20" },
    { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", glow: "shadow-pink-500/20" },
    { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/20" },
];

const BANNER_STYLES = {
    info: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "#93c5fd", icon: Info },
    success: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.3)", text: "#6ee7b7", icon: CheckCircle2 },
    warning: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.3)", text: "#fcd34d", icon: AlertTriangle },
};

const SOCIAL_ICONS: Record<string, typeof Twitter> = {
    twitter: Twitter, linkedin: Linkedin, github: Github, youtube: Youtube,
};

export const LandingPage = () => {
    const navigate = useNavigate();
    const { content, loading } = useLandingContent();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const scrollTo = (id: string) => {
        document.getElementById(id.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
    };

    const bannerStyle = BANNER_STYLES[content.banner?.type ?? "info"];
    const BannerIcon = bannerStyle.icon;

    return (
        <div
            className="min-h-screen font-inter selection:bg-blue-500/30 transition-colors duration-300"
            style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
        >
            {/* ════════════════════════════════ ANNOUNCEMENT BANNER */}
            {content.banner?.enabled && !bannerDismissed && (
                <div
                    className="flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium relative"
                    style={{ background: bannerStyle.bg, borderBottom: `1px solid ${bannerStyle.border}`, color: bannerStyle.text }}
                >
                    <BannerIcon className="w-4 h-4 shrink-0" />
                    <span>
                        {content.banner.text}
                        {content.banner.link && (
                            <a href={content.banner.link} className="ml-2 underline font-bold hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer">
                                Learn more →
                            </a>
                        )}
                    </span>
                    <button onClick={() => setBannerDismissed(true)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ════════════════════════════════ NAVIGATION */}
            <nav
                className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-3xl border-b"
                style={{ background: "var(--nav-bg)", borderColor: "var(--border)" }}
            >
                {/* Logo — uses brand.logo_url from CMS if set */}
                <div className="flex items-center gap-3">
                    {content.brand?.logo_url ? (
                        <img
                            src={content.brand.logo_url}
                            alt={content.brand.logo_alt || "AUIP Platform"}
                            className="h-10 w-auto object-contain"
                        />
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <Globe className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight uppercase italic">
                                AUIP <span className="text-blue-500 not-italic">Platform</span>
                            </span>
                        </>
                    )}
                </div>

                {/* Desktop nav links — include institutions anchor */}
                <div className="hidden md:flex items-center gap-8">
                    {[...content.nav, { label: "Institutions", href: "#institutions" }].map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                            className="text-xs font-black uppercase tracking-widest transition-colors duration-200 hover:text-blue-400"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={() => navigate("/auth/student/login")}
                        className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full border transition-all duration-200 hover:bg-white/5"
                        style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => navigate("/auth/register-university")}
                        className="hidden md:flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest text-white rounded-full premium-gradient hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        Register Institution
                    </button>
                </div>
            </nav>

            {/* ════════════════════════════════ HERO */}
            <header className="relative pt-24 pb-28 px-4 flex flex-col items-center text-center overflow-hidden">
                {/* Ambient glows */}
                <div className="absolute inset-0 pointer-events-none -z-10">
                    <div className="absolute top-[5%] left-[15%] w-[45vw] h-[45vw] max-w-[560px] max-h-[560px] rounded-full blur-[140px] animate-pulse-slow" style={{ background: "var(--primary-glow)" }} />
                    <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full blur-[140px] animate-pulse-slow" style={{ background: "rgba(139,92,246,0.12)", animationDelay: "1s" }} />
                </div>

                {/* Badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 border animate-in fade-in slide-in-from-bottom-4 duration-700"
                    style={{ background: "var(--glass-bg)", borderColor: "rgba(59,130,246,0.25)", color: "#60a5fa" }}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {loading ? <span className="skeleton h-3 w-40 rounded" /> : content.hero.badge}
                </div>

                {/* Heading */}
                <h1 className="text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter max-w-5xl leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {loading
                        ? <span className="skeleton h-20 w-full rounded-2xl block" />
                        : <>
                            {content.hero.heading.includes("Higher Education")
                                ? <>{content.hero.heading.split("Higher Education")[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Higher Education</span></>
                                : <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">{content.hero.heading}</span>
                            }
                        </>
                    }
                </h1>

                {/* Sub */}
                <p
                    className="mt-8 text-lg md:text-xl max-w-2xl leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000"
                    style={{ color: "var(--text-secondary)" }}
                >
                    {loading ? <span className="skeleton h-6 w-full rounded block mt-2" /> : content.hero.subtext}
                </p>

                {/* CTAs */}
                <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
                    <button
                        onClick={() => scrollTo("portals")}
                        className="flex items-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-widest text-white rounded-[2rem] premium-gradient hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        {content.hero.cta_primary} <ChevronRight className="w-5 h-5" />
                    </button>
                    <a
                        href="/whitepaper.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-widest rounded-[2rem] border transition-all duration-200 hover:scale-105"
                        style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--glass-bg)" }}
                    >
                        <FileText className="w-4 h-4" /> {content.hero.cta_secondary}
                    </a>
                </div>

                {/* CMS-driven live stats */}
                {content.stats?.enabled && (
                    <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full animate-in fade-in duration-1000">
                        {[
                            { val: content.stats.active_users, label: "Active Users" },
                            { val: content.stats.placement_rate, label: "Placement Rate" },
                            { val: content.stats.institutions, label: "Institutions" },
                            { val: content.stats.ai_queries, label: "AI Queries" },
                        ].map(({ val, label }) => (
                            <div
                                key={label}
                                className="rounded-2xl border p-4 text-center"
                                style={{ background: "var(--glass-bg)", borderColor: "var(--border)" }}
                            >
                                <div className="text-2xl font-black text-blue-400">{val}</div>
                                <div className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {/* ════════════════════════════════ PORTALS */}
            <section id="portals" className="py-24 px-4 border-y" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="max-w-6xl mx-auto space-y-14">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Secure Access Protocols</p>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Select Your Gateway</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Student */}
                        <div
                            onClick={() => navigate("/auth/student/login")}
                            className="group relative p-10 rounded-[3rem] border cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/15 flex flex-col gap-6 overflow-hidden"
                            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                <GraduationCap className="w-8 h-8" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black">{content.portals.student.title}</h3>
                                <p style={{ color: "var(--text-secondary)" }} className="leading-relaxed">{content.portals.student.desc}</p>
                            </div>
                            <div className="mt-auto flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-widest">
                                Enter Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                        </div>

                        {/* Institution */}
                        <div
                            onClick={() => navigate("/auth/inst-admin/login")}
                            className="group relative p-10 rounded-[3rem] border cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/15 flex flex-col gap-6 overflow-hidden"
                            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black">{content.portals.institution.title}</h3>
                                <p style={{ color: "var(--text-secondary)" }} className="leading-relaxed">{content.portals.institution.desc}</p>
                            </div>
                            <div className="mt-auto flex items-center gap-2 text-xs font-black text-purple-400 uppercase tracking-widest">
                                Secure Login <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                        </div>

                        {/* Register Institution */}
                        <div
                            onClick={() => navigate("/auth/register-university")}
                            className="group relative p-10 rounded-[3rem] border cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/15 flex flex-col gap-6 overflow-hidden"
                            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                            <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black">Register Institution</h3>
                                <p style={{ color: "var(--text-secondary)" }} className="leading-relaxed">New university? Apply to join the AUIP Academic Network and get your institutional environment provisioned.</p>
                            </div>
                            <div className="mt-auto flex items-center gap-2 text-xs font-black text-green-400 uppercase tracking-widest">
                                Apply Now <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════ ABOUT */}
            <section id="about" className="py-24 px-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-8">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border"
                            style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.25)", color: "#a78bfa" }}
                        >
                            <Zap className="w-3.5 h-3.5" /> {content.about.badge}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            {content.about.heading.includes("performance")
                                ? <>{content.about.heading.split("performance")[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">performance.</span></>
                                : content.about.heading
                            }
                        </h2>
                        <p className="text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>{content.about.body}</p>
                        <ul className="space-y-4">
                            {content.about.bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* System status mock card */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-600/10 rounded-[3rem] blur-3xl" />
                        <div
                            className="relative rounded-[3rem] p-8 space-y-6 shadow-2xl border"
                            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                        >
                            <div className="flex items-center justify-between pb-5 border-b" style={{ borderColor: "var(--border)" }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                        <Target className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black">System Status</div>
                                        <div className="text-xs text-green-400 font-mono">100% Operational</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-green-500/10 text-green-400">Live</span>
                            </div>
                            <div className="space-y-3">
                                {["Students Activated", "Placement Drives", "Institutions Onboarded"].map((label, i) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
                                        <div className="skeleton h-3 rounded-full" style={{ width: `${[45, 65, 30][i]}%` }} />
                                    </div>
                                ))}
                            </div>
                            {/* Stats counters from CMS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-24 rounded-2xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-blue-400">{content.stats?.active_users ?? "4.2k"}</div>
                                        <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Active Users</div>
                                    </div>
                                </div>
                                <div className="h-24 rounded-2xl bg-purple-500/5 border border-purple-500/15 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-purple-400">{content.stats?.placement_rate ?? "98%"}</div>
                                        <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Placement Rate</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════ PLATFORM FEATURES */}
            <section id="features" className="py-24 px-4 border-y" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="max-w-6xl mx-auto space-y-14">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Full Platform Suite</p>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Everything you need</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {content.features.map((feat, i) => {
                            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                            const c = FEATURE_COLORS[i % FEATURE_COLORS.length];
                            return (
                                <div
                                    key={i}
                                    className={`group p-8 rounded-3xl border ${c.border} hover:shadow-xl ${c.glow} transition-all duration-300 hover:-translate-y-1`}
                                    style={{ background: "var(--bg-elevated)" }}
                                >
                                    <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center ${c.text} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-black mb-3">{feat.title}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{feat.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════ INSTITUTION DIRECTORY */}
            <InstitutionDirectory />

            <section id="whitepaper" className="py-28 px-4 relative overflow-hidden">
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                    <div className="w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full blur-[150px]" style={{ background: "var(--primary-glow)" }} />
                </div>
                <div className="max-w-4xl mx-auto relative z-10 space-y-10">
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <FileText className="w-10 h-10 text-blue-400" />
                            </div>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                            {content.whitepaper.heading.includes("AUIP")
                                ? <>{content.whitepaper.heading.split("AUIP ")[0]}AUIP <span className="italic font-light">{content.whitepaper.heading.split("AUIP ")[1] || "Whitepaper"}</span></>
                                : content.whitepaper.heading
                            }
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {content.whitepaper.subtext}
                        </p>
                    </div>

                    {/* Panel */}
                    <div className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                        {/* Inline HTML viewer — works because /whitepaper.html is same-origin */}
                        <iframe
                            src={content.whitepaper.view_url || "/whitepaper.html"}
                            className="w-full"
                            style={{ height: "560px", border: "none", display: "block" }}
                            title="AUIP Whitepaper Preview"
                        />

                        {/* Action bar */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-6 border-t" style={{ borderColor: "var(--border)" }}>
                            <a
                                href={content.whitepaper.view_url || "/whitepaper.html"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl border text-sm font-black uppercase tracking-widest transition-all hover:scale-105"
                                style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}
                            >
                                <Eye className="w-4 h-4" /> Open Full Page
                            </a>
                            {content.whitepaper.pdf_url ? (
                                <a
                                    href={content.whitepaper.pdf_url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-white premium-gradient hover:scale-105 active:scale-95 transition-all duration-200"
                                >
                                    <Download className="w-4 h-4" /> Download PDF
                                </a>
                            ) : (
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                                    <Download className="w-4 h-4" /> PDF Coming Soon
                                </span>
                            )}
                            <a
                                href="/whitepaper.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest ml-auto transition-colors hover:text-blue-400"
                                style={{ color: "var(--text-muted)" }}
                            >
                                New Tab <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════ TEAM (CMS-gated) */}
            {content.team?.enabled && content.team.members.length > 0 && (
                <section id="team" className="py-24 px-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="max-w-6xl mx-auto space-y-14">
                        <div className="text-center space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>The People</p>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight">{content.team.heading}</h2>
                            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>{content.team.subtext}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {content.team.members.map((member, i) => (
                                <div
                                    key={i}
                                    className="flex flex-col items-center text-center p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                    style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                                >
                                    {/* Avatar */}
                                    {member.photo_url ? (
                                        <img
                                            src={member.photo_url}
                                            alt={member.name}
                                            className="w-24 h-24 rounded-3xl object-cover mb-5 shadow-lg ring-2 ring-white/10"
                                        />
                                    ) : (
                                        <div
                                            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 text-white text-3xl font-black shadow-lg"
                                            style={{ background: `linear-gradient(135deg, hsl(${(i * 67) % 360}, 70%, 55%), hsl(${(i * 67 + 120) % 360}, 70%, 45%))` }}
                                        >
                                            {member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <h3 className="text-lg font-black mb-1">{member.name}</h3>
                                    <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>{member.role}</p>
                                    {member.bio && (
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{member.bio}</p>
                                    )}

                                    {/* Social links */}
                                    {(member.linkedin || member.github || member.twitter) && (
                                        <div className="flex items-center gap-3 mt-5 pt-5 border-t w-full justify-center" style={{ borderColor: "var(--border)" }}>
                                            {member.linkedin && (
                                                <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:text-blue-400"
                                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                                                >
                                                    <Linkedin className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            {member.github && (
                                                <a href={member.github} target="_blank" rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:text-white"
                                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                                                >
                                                    <Github className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            {member.twitter && (
                                                <a href={member.twitter} target="_blank" rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:text-sky-400"
                                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                                                >
                                                    <Twitter className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ════════════════════════════════ TESTIMONIALS (CMS-gated) */}
            {content.testimonials?.enabled && content.testimonials.items.length > 0 && (
                <section className="py-24 px-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="max-w-6xl mx-auto space-y-14">
                        <div className="text-center space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>What They Say</p>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Trusted by institutions</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {content.testimonials.items.map((t, i) => (
                                <div key={i} className="p-8 rounded-3xl border flex flex-col gap-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                                    <p className="text-sm leading-relaxed italic" style={{ color: "var(--text-secondary)" }}>"{t.quote}"</p>
                                    <div className="mt-auto flex items-center gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black">{t.name}</div>
                                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ════════════════════════════════ FAQ (CMS-gated) */}
            {content.faq?.enabled && content.faq.items.length > 0 && (
                <section className="py-24 px-4 border-t" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                    <div className="max-w-3xl mx-auto space-y-12">
                        <div className="text-center space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Frequently Asked</p>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Questions & Answers</h2>
                        </div>
                        <div className="space-y-3">
                            {content.faq.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border overflow-hidden transition-all duration-200"
                                    style={{ background: "var(--bg-elevated)", borderColor: openFaq === i ? "rgba(59,130,246,0.4)" : "var(--border)" }}
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between gap-4 p-6 text-left"
                                    >
                                        <span className="font-bold text-sm">{item.q}</span>
                                        {openFaq === i ? <Minus className="w-4 h-4 shrink-0 text-blue-400" /> : <Plus className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
                                    </button>
                                    {openFaq === i && (
                                        <div className="px-6 pb-6 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ════════════════════════════════ FOOTER */}
            <footer id="contact" className="border-t py-16 px-6" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 pb-10 border-b mb-8" style={{ borderColor: "var(--border)" }}>
                    {/* Brand */}
                    <div className="md:col-span-2 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight uppercase italic">AUIP</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-secondary)" }}>
                            {content.footer.tagline}
                        </p>
                        <a
                            href={`mailto:${content.footer.contact_email}`}
                            className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Mail className="w-4 h-4" /> {content.footer.contact_email}
                        </a>
                        {/* Social links from CMS */}
                        {Object.keys(content.footer.socials ?? {}).length > 0 && (
                            <div className="flex items-center gap-3 pt-2">
                                {Object.entries(content.footer.socials).map(([platform, url]) => {
                                    const Icon = SOCIAL_ICONS[platform];
                                    if (!Icon || !url) return null;
                                    return (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Platform links */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest">Platform</h4>
                        <ul className="space-y-3">
                            {[
                                { l: "Student Portal", h: "/auth/student/login" },
                                { l: "Institution Login", h: "/auth/inst-admin/login" },
                                { l: "Register University", h: "/auth/register-university" },
                                { l: "Member Institutions", h: "/#institutions" },
                                { l: "Verify Certificate", h: "/verify-certificate/approval/lookup" },
                                { l: "Whitepaper", h: "/whitepaper.html" },
                                { l: "Infrastructure Status", h: "/auth/infrastructure-status" },
                            ].map(({ l, h }) => (
                                <li key={l}>
                                    <a
                                        href={h}
                                        className="text-sm transition-colors hover:text-blue-400"
                                        style={{ color: "var(--text-muted)" }}
                                        target={h.startsWith("/whitepaper") ? "_blank" : undefined}
                                        rel="noopener noreferrer"
                                    >{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest">Legal</h4>
                        <ul className="space-y-3">
                            {["Privacy Policy", "Terms of Service", "Data Processing", "Security"].map((l) => (
                                <li key={l}>
                                    <a href="#" className="text-sm transition-colors hover:text-blue-400" style={{ color: "var(--text-muted)" }}>{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{content.footer.copyright}</p>
                    <div className="flex items-center gap-6">
                        {[
                            { dot: "bg-green-500", label: "API Online" },
                            { dot: "bg-green-500", label: "Databases Synced" },
                        ].map(({ dot, label }) => (
                            <span key={label} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
