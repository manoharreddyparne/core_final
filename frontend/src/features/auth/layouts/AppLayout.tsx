import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link, NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Briefcase, GraduationCap,
    MessageSquare, Settings, LogOut, Bell, Search,
    Menu, X, ShieldCheck, Zap, ChevronRight, Globe, Lock,
    Database, Cpu, BarChart3, Fingerprint, Activity,
    BookOpen, Terminal, Sparkles, Filter, MoreVertical,
    FileText, UserPlus, Component, Layers, Workflow,
    ChevronDown, User, Shield, KeyRound, Smartphone,
    PanelLeftClose, PanelLeftOpen, HelpCircle, Brain, Target, FlaskConical,
    Building2, MessageCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthProvider/AuthProvider';
import { NotificationOverlay } from '../../notifications/NotificationOverlay';
import { GlobalSearch } from '../../dashboard/components/GlobalSearch';
import { FloatingAIAssistant } from '../../intelligence/components/FloatingAIAssistant';
import { SecureDeviceModal } from '../components/SecureDeviceModal';
import { ForcedLogoutModal } from '../components/ForcedLogoutModal';
import { apiClient } from '../api/base';
import { notificationApi } from "../../notifications/api";
import { getAccessToken, hasAccessToken, isHydrating } from "../utils/tokenStorage";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import { useSecureCooldown } from '../hooks/useSecureCooldown';
import { secureDevice } from '../../user/api/userSecurityApi';

/* ========================================================================
   SUB-COMPONENTS
   ======================================================================== */

interface SidebarItemProps {
    item: {
        to: string;
        label: string;
        icon: any;
        badge?: string | number;
    };
    collapsed: boolean;
    onClick?: () => void;
}

const SidebarNavItem: React.FC<SidebarItemProps> = ({ item, collapsed, onClick }) => (
    <NavLink
        to={item.to}
        onClick={onClick}
        title={collapsed ? item.label : ""}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold mb-1 group relative
            ${isActive
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
            }
            ${collapsed ? "justify-center" : ""}
            `
        }
    >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="truncate">{item.label}</span>
                {item.badge && (
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded-md border border-primary/20">
                        {item.badge}
                    </span>
                )}
            </div>
        )}
        {collapsed && item.badge && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm" />
        )}
    </NavLink>
);

/* ========================================================================
   MAIN APPLICATION FRAME
   ======================================================================== */

export const AppLayout: React.FC = () => {
    const { user, logout, bootstrapping, bootstrapped } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastValidationRef = useRef<number>(0);

    // UI Orchestration
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [confirmLogoutModal, setConfirmLogoutModal] = useState(false);

    // Security & Session States
    const [secureModalOpen, setSecureModalOpen] = useState(false);
    const [secureStatus, setSecureStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [secureData, setSecureData] = useState<any>(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(60);
    const [logoutReason, setLogoutReason] = useState("");

    const { canSecure, startCooldown, remainingSeconds } = useSecureCooldown();

    const role = user?.role || 'STUDENT';
    const normalizedRole = role.toLowerCase();
    const isInstAdmin = ['admin', 'inst_admin', 'institution_admin'].includes(normalizedRole);
    const isFaculty = ['faculty', 'teacher'].includes(normalizedRole);

    const isInstitutionContext = location.pathname.startsWith("/institution");
    const isGlobalContext = location.pathname.startsWith("/superadmin") || (normalizedRole === 'super_admin' && !isInstitutionContext);

    // ⚡️ 1. Sidebar Resizing Logic
    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => setIsResizing(false);

    const resize = (e: MouseEvent) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                setSidebarWidth(newWidth);
                if (isSidebarCollapsed && newWidth > 120) setIsSidebarCollapsed(false);
            }
        }
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing]);

    // 🔗 2. Dynamic Navigation Grid
    const navItems = useMemo(() => [
        // STUDENT HUB
        // PRIMARY MODULES
        { to: "/research", label: "Research Hub", icon: BookOpen, roles: ["student", "faculty", "teacher", "institution_admin", "admin", "inst_admin"], badge: "NEW" },

        { to: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student"] },

        { to: "/student-intelligence", label: "Intelligence Hub", icon: Brain, roles: ["student"] },
        { to: "/resume-studio", label: "Resume Studio", icon: FileText, roles: ["student"] },


        { to: "/placement-hub", label: "Placements", icon: Briefcase, roles: ["student"] },
        { to: "/mock-tests", label: "Mock Tests", icon: FlaskConical, roles: ["student", "faculty", "teacher"] },
        { to: "/newsletters", label: "Newsletters", icon: FileText, roles: ["student"] },

        { to: "/support-hub", label: "Support", icon: HelpCircle, roles: ["student"] },

        // FACULTY HUB
        { to: "/faculty-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["faculty", "teacher"] },
        { to: "/faculty/academic", label: "Academic Control", icon: Building2, roles: ["faculty", "teacher"] },

        // GLOBAL HUB (SUPER ADMIN)
        { to: "/superadmin/dashboard", label: "Global Status", icon: LayoutDashboard, roles: ["super_admin"], hideInInstitution: true },
        { to: "/superadmin/institutions", label: "Institutions", icon: Building2, roles: ["super_admin"], hideInInstitution: true },

        // INSTITUTIONAL HUB (ADMINS)
        { to: "/institution/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["institution_admin", "admin"], hideInGlobal: true },
        { to: "/institution/students", label: "Student Base", icon: User, roles: ["institution_admin", "admin"], hideInGlobal: true },
        { to: "/institution/placements", label: "Placements & JD AI", icon: Target, roles: ["institution_admin", "admin"], hideInGlobal: true },
        { to: "/institution/brain", label: "Governance Brain", icon: Brain, roles: ["institution_admin", "admin", "faculty"], hideInGlobal: true },
        { to: "/institution/analytics", label: "TPO Analytics", icon: BarChart3, roles: ["institution_admin", "admin"], hideInGlobal: true },
        { to: "/institution/faculty", label: "Academic Faculty", icon: Users, roles: ["institution_admin", "admin", "inst_admin"], hideInGlobal: true },
        { to: "/institution/academic", label: "Academic Hub", icon: Building2, roles: ["institution_admin", "admin", "inst_admin"], hideInGlobal: true },



        // CROSS-ROLE TOOLS
        { to: "/professional-hub", label: "Professional Hub", icon: Globe, roles: ["all"] },
        { to: "/discovery", label: "Search Network", icon: Search, roles: ["all"] },
        { to: "/chat-hub", label: "Comms Hub", icon: MessageCircle, roles: ["all"], badge: 'SECURE' },
        { to: "/profile", label: "My Profile", icon: User, roles: ["all"] },
    ], [isInstAdmin, isFaculty, role]);

    const filteredNav = useMemo(() => {
        return navItems.filter(item => {
            const roleMatch = item.roles.includes("all") || (normalizedRole && item.roles.some(allowed => {
                if (allowed === "inst_admin" || allowed === "institution_admin" || allowed === "admin") {
                    return isInstAdmin;
                }
                if (allowed === "faculty" || allowed === "teacher") {
                    return isFaculty;
                }
                return normalizedRole === allowed;
            }));
            if (!roleMatch) return false;
            if (isGlobalContext && (item as any).hideInGlobal) return false;
            if (isInstitutionContext && (item as any).hideInInstitution) return false;
            return true;
        });
    }, [navItems, normalizedRole, isGlobalContext, isInstitutionContext]);

    // 📡 3. Background Services (Notification & Heartbeat)
    useEffect(() => {
        if (!user) return;
        const fetchCount = () => {
            notificationApi.getNotifications().then(res => {
                const list = res?.data || (Array.isArray(res) ? res : []);
                if (Array.isArray(list)) {
                    setUnreadNotifs(list.filter((n: any) => n && !n.is_read).length);
                }
            }).catch(err => console.warn("[AppLayout] Notif fetch failed", err));
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user, isNotificationsOpen]);

    // forced logout & shortcut logic
    useEffect(() => {
        const handleSearchShortcut = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        const handleForceLogout = (event: any) => {
            const detail = event.detail;
            setLogoutReason(detail?.reason || "Security breach detected.");
            setShowLogoutModal(true);
            setLogoutCountdown(60);
        };
        const handleSecureDeviceTrigger = async () => {
            setSecureModalOpen(true);
            if (!canSecure) {
                setSecureStatus("success");
                setSecureData({ already_secured: true, secured_at: Date.now() - (45 * 60 * 1000 - remainingSeconds * 1000) });
                return;
            }

            setSecureStatus("loading");
            try {
                await secureDevice();
                startCooldown();
                setSecureStatus("success");
                setSecureData({ already_secured: false, secured_at: Date.now() });
            } catch (e) {
                setSecureStatus("error");
            }
        };

        window.addEventListener('keydown', handleSearchShortcut);
        window.addEventListener('force-logout', handleForceLogout);
        window.addEventListener('trigger-secure-modal', handleSecureDeviceTrigger);
        return () => {
            window.removeEventListener('keydown', handleSearchShortcut);
            window.removeEventListener('force-logout', handleForceLogout);
            window.removeEventListener('trigger-secure-modal', handleSecureDeviceTrigger);
        };
    }, [canSecure, remainingSeconds, startCooldown]);

    // 📱 4. Mobile Navigation Sync
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    if (bootstrapping && !bootstrapped) {
        return (
            <div className="fixed inset-0 bg-[#050608] flex flex-col items-center justify-center z-[100] gap-8">
                <div className="w-24 h-24 border-t-4 border-primary rounded-full animate-spin shadow-2xl shadow-primary/20" />
                <h2 className="text-2xl font-black text-white tracking-widest uppercase italic">AUIP <span className="text-primary NOT-italic">Matrix</span></h2>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#050608] text-gray-200 flex flex-col md:flex-row font-sans overflow-hidden selection:bg-primary/30">

            {/* 🛸 1. Sidebar Matrix */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-[#0a0b10] border-r border-white/5 transform transition-all duration-300 md:static md:h-screen flex flex-col shrink-0
                    ${isMobileMenuOpen ? "translate-x-0 w-80 shadow-[0_0_50px_rgba(0,0,0,1)]" : "-translate-x-full md:translate-x-0"}
                    ${isResizing ? "transition-none" : ""}
                `}
                style={{ width: isMobileMenuOpen ? "320px" : (isSidebarCollapsed ? "100px" : `${sidebarWidth}px`) }}
            >
                {/* 🔌 Resizer Handle */}
                {!isSidebarCollapsed && (
                    <div onMouseDown={startResizing} className="hidden md:block absolute -right-[4px] top-0 w-[8px] h-full cursor-col-resize z-50 group hover:bg-primary/20 transition-all" />
                )}

                {/* Brand Identity */}
                <div className={`h-24 px-8 border-b border-white/5 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left duration-700">
                            <h2 className="text-2xl font-black tracking-tighter text-white italic">AUIP<span className="text-primary NOT-italic">.</span></h2>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] leading-none mt-1">Platform</p>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-500 hover:text-primary transition-all">
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
                    </button>
                </div>

                {/* Identity Module */}
                <div className={`p-6 mt-6 flex items-center gap-4 bg-white/[0.02] mx-4 rounded-3xl border border-white/5 ${isSidebarCollapsed ? "justify-center px-0" : ""}`}>
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-xl shadow-primary/20">
                        {user?.username?.[0].toUpperCase()}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="overflow-hidden">
                            <p className="font-black text-xs text-white uppercase tracking-widest truncate">{user?.username}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <p className="text-[9px] text-primary uppercase font-black tracking-widest">{user?.role}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar custom-scrollbar">
                    {filteredNav.map((item) => (
                        <SidebarNavItem key={item.to} item={item} collapsed={isSidebarCollapsed} onClick={() => setIsMobileMenuOpen(false)} />
                    ))}

                    {/* Settings Intelligence Group */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        {isSidebarCollapsed ? (
                            <NavLink to="/settings" className={({ isActive }) => `flex items-center justify-center p-4 rounded-2xl transition-all ${isActive ? "bg-primary text-white shadow-xl" : "text-gray-500 hover:bg-white/[0.04]"}`}>
                                <Settings className="w-6 h-6" />
                            </NavLink>
                        ) : (
                            <>
                                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="flex w-full items-center justify-between px-4 py-4 text-gray-400 hover:bg-white/[0.04] rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest group">
                                    <div className="flex items-center gap-4">
                                        <Settings className="w-5 h-5 group-hover:text-primary transition-colors" />
                                        <span>Configuration</span>
                                    </div>
                                    {isSettingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {isSettingsOpen && (
                                    <div className="ml-6 pl-4 border-l-2 border-white/5 mt-2 space-y-1 animate-in slide-in-from-left-2 duration-300">
                                        {[
                                            { to: "/settings/profile", label: "Edit Profile", icon: User },
                                            { to: "/settings/change-password", label: "Change Password", icon: KeyRound },
                                            { to: "/settings/security", label: "Security", icon: Shield },
                                            { to: "/settings/sessions", label: "Device Management", icon: Smartphone },
                                        ].map(sub => (
                                            <NavLink key={sub.to} to={sub.to} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${isActive ? "text-primary bg-primary/5" : "text-gray-500 hover:text-white"}`}>
                                                <sub.icon className="w-4 h-4" />
                                                <span>{sub.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </nav>

                {/* Operative Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-4">
                    <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                        {!isSidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-[.3em] text-white/20">Aesthetics</span>}
                        <ThemeToggle />
                    </div>
                    {/* Secure My Device — dispatches the global event wired in AppLayout */}
                    <button
                        onClick={() => canSecure && window.dispatchEvent(new CustomEvent('trigger-secure-modal'))}
                        disabled={!canSecure}
                        title={isSidebarCollapsed ? (canSecure ? 'Secure My Device' : `Cooldown: ${remainingSeconds}s`) : undefined}
                        className={`group flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all border border-transparent 
                            ${canSecure
                                ? 'text-green-400/60 hover:text-green-400 bg-green-500/[0.02] hover:bg-green-500/[0.06] hover:border-green-500/10'
                                : 'text-gray-600 bg-white/[0.02] cursor-not-allowed'}
                            ${isSidebarCollapsed ? "justify-center px-0" : ""}
                        `}
                    >
                        <ShieldCheck className={`w-4 h-4 shrink-0 transition-transform ${canSecure ? 'group-hover:scale-110' : ''}`} />
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col items-start">
                                <span className="font-black text-[9px] tracking-[0.35em] uppercase">Secure Device</span>
                                {!canSecure && <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{remainingSeconds}s Remaining</span>}
                            </div>
                        )}
                    </button>
                    <button onClick={() => setConfirmLogoutModal(true)} className={`group flex items-center gap-4 w-full h-14 px-6 rounded-2xl text-red-500/50 hover:text-red-500 bg-red-500/[0.02] hover:bg-red-500/[0.08] transition-all border border-transparent hover:border-red-500/10 ${isSidebarCollapsed ? "justify-center px-0" : ""}`}>
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        {!isSidebarCollapsed && <span className="font-black text-[10px] tracking-[0.4em] uppercase">Terminate</span>}
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile active */}
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[40] md:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />}

            {/* 🏗️ 2. Execution Stage */}
            <main className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative ${isInstitutionContext ? 'bg-[#050608]' : 'bg-[#07080b]'}`}>

                {/* 🛡️ Global Layer Anchor for Overlays */}
                <div className="relative flex-1 min-h-0 min-w-0 flex flex-col">
                    {/* Top Bar for Chat or Global Tools */}
                    <div className={`h-24 flex items-center justify-end px-8 md:px-14 gap-8 sticky top-0 z-[100] backdrop-blur-3xl bg-inherit/10 shrink-0`}>
                        {/* Mobile Menu Trigger */}
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden mr-auto w-12 h-12 glass rounded-2xl flex items-center justify-center">
                            <Menu className="w-6 h-6 text-white" />
                        </button>

                        <div className="flex items-center gap-4">
                            {/* Neural Omni-Search */}
                            <button onClick={() => setIsSearchOpen(true)} className="hidden sm:flex glass-dark h-12 px-6 rounded-2xl border-white/5 items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all group">
                                <Search className="w-5 h-5 group-hover:text-primary transition-all duration-500" />
                                <span>Matrix Search</span>
                                <div className="ml-4 px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-[8px] opacity-40">⌘K</div>
                            </button>

                            {/* Alert Matrix Trigger */}
                            <div className="relative">
                                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className={`w-12 h-12 rounded-2xl glass-dark border-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all relative ${isNotificationsOpen ? 'ring-2 ring-primary/50 text-primary' : ''}`}>
                                    <Bell className="w-6 h-6" />
                                    {unreadNotifs > 0 && <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_15px_rgba(235,108,34,1)] animate-pulse" />}
                                </button>
                                {isNotificationsOpen && (
                                    <div className="absolute top-[120%] right-0 z-[200] origin-top-right">
                                        <NotificationOverlay isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Routing Viewport — proper flex-1+min-h-0 ensures overflow-y-auto works */}
                    <div className={`mx-auto w-full flex-1 min-h-0 ${location.pathname === '/chat-hub' ? 'overflow-hidden' : (isInstitutionContext ? 'max-w-full p-4 md:p-8 overflow-y-auto overflow-x-hidden' : 'max-w-[1920px] p-6 md:p-14 overflow-y-auto overflow-x-hidden')} animate-in fade-in duration-500`}>
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* 🛸 Global Singularity Modules */}
            <SecureDeviceModal open={secureModalOpen} onOpenChange={setSecureModalOpen} status={secureStatus} data={secureData} />
            <ForcedLogoutModal open={showLogoutModal} countdown={logoutCountdown} reason={logoutReason} />
            {isSearchOpen && <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
            <FloatingAIAssistant />

            {/* Sign-out Confirmation Singularity */}
            {confirmLogoutModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                    <div className="glass-dark border border-white/10 p-12 rounded-[4rem] max-w-md w-full shadow-[0_50px_100px_rgba(0,0,0,1)] text-center space-y-10 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/[0.02] translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                        <div className="w-24 h-24 rounded-[3rem] bg-red-500/10 flex items-center justify-center mx-auto ring-1 ring-red-500/20 relative z-10 transition-transform duration-500 group-hover:scale-110">
                            <LogOut className="w-12 h-12 text-red-500" />
                        </div>
                        <div className="space-y-4 relative z-10">
                            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Terminate Link?</h2>
                            <p className="text-gray-500 font-bold uppercase text-[11px] tracking-widest leading-relaxed">System buffers will be cleared. <br />Encryption keys will be purged from local cache.</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                            <button onClick={() => setConfirmLogoutModal(false)} className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all uppercase text-[11px] tracking-widest">Abort</button>
                            <button onClick={logout} className="flex-1 py-5 bg-red-500 hover:bg-red-600 text-white font-black rounded-3xl transition-all shadow-2xl shadow-red-500/30 uppercase text-[11px] tracking-widest">Confirm Exit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLayout;
