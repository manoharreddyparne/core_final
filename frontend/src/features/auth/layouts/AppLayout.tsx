import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    User,
    Smartphone,
    Settings,
    ShieldCheck,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    KeyRound,
    Building2,
    Users,
    Search,
    Brain,
    FileText,
    Briefcase,
    Globe,
    HelpCircle,
    MessageCircle,
    Bell
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useAuth } from "../context/AuthProvider/AuthProvider";
import { Button } from "@/components/ui/button";
import { apiClient } from "../api/base";
import { getAccessToken, setAccessToken, hasAccessToken, isHydrating } from "../utils/tokenStorage";
import { SecureDeviceModal } from "../components/SecureDeviceModal";
import { ForcedLogoutModal } from "../components/ForcedLogoutModal";
import { GlobalSearch } from "../../dashboard/components/GlobalSearch";
import { FloatingAIAssistant } from "../../intelligence/components/FloatingAIAssistant";

export const AppLayout = () => {
    const { user, logout, bootstrapping, bootstrapped } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // UI States
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true); // Default open for visibility

    // Secure Device Modal State
    const [secureModalOpen, setSecureModalOpen] = useState(false);
    const [secureStatus, setSecureStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [secureData, setSecureData] = useState<any>(null);

    // Forced Logout Modal State
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutCountdown, setLogoutCountdown] = useState(5);
    const [logoutReason, setLogoutReason] = useState<string | undefined>(undefined);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [confirmLogoutModal, setConfirmLogoutModal] = useState(false);
    const lastValidationRef = useRef<number>(0);

    // 🛡️ LOADING GATE: Don't render ANYTHING until we know the auth status
    if (bootstrapping && !bootstrapped) {
        return (
            <div className="fixed inset-0 bg-[#0b1120] flex flex-col items-center justify-center z-[100] gap-8">
                <div className="relative">
                    <div className="w-24 h-24 border-t-4 border-b-4 border-primary/30 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-t-4 border-primary rounded-full animate-spin" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">AUIP <span className="text-primary italic font-black">Secure</span></h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Initializing Encrypted Session...</p>
                </div>
            </div>
        );
    }

    // Cmd/Ctrl + K shortcut for global search
    useEffect(() => {
        const handleSearchShortcut = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleSearchShortcut);
        return () => window.removeEventListener('keydown', handleSearchShortcut);
    }, []);

    const isInstitutionContext = location.pathname.startsWith("/institution");
    // ✅ STRICT CONTEXT: If Super Admin is not explicitly in /institution, they are in Global Context
    // This covers /profile, /settings, / etc.
    const isGlobalContext = location.pathname.startsWith("/superadmin") ||
        (user?.role?.toUpperCase() === 'SUPER_ADMIN' && !isInstitutionContext);

    const navItems = [
        // STUDENT HUB
        { to: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student"] },
        { to: "/student-intelligence", label: "Intelligence Hub", icon: Brain, roles: ["student"] },
        { to: "/resume-studio", label: "Resume Studio", icon: FileText, roles: ["student"] },
        { to: "/placement-hub", label: "Careers", icon: Briefcase, roles: ["student"] },
        { to: "/professional-hub", label: "Social Hub", icon: Globe, roles: ["student"] },
        { to: "/chat-hub", label: "Messages & Connect", icon: MessageCircle, roles: ["student"] },
        { to: "/newsletters", label: "Nexus Bulletins", icon: FileText, roles: ["student"] },
        { to: "/support-hub", label: "Support", icon: HelpCircle, roles: ["student"] },

        // GLOBAL HUB (SUPER ADMIN)
        {
            to: "/superadmin/dashboard",
            label: "Global Status",
            icon: LayoutDashboard,
            roles: ["super_admin"],
            hideInInstitution: true
        },
        {
            to: "/superadmin/institutions",
            label: "Institutions",
            icon: Building2,
            roles: ["super_admin"],
            hideInInstitution: true
        },

        // INSTITUTIONAL HUB (INST ADMIN & PROXY)
        {
            to: "/institution/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            roles: ["institution_admin", "super_admin", "admin"],
            hideInGlobal: true
        },
        {
            to: "/institution/students",
            label: "Student Base",
            icon: User,
            roles: ["institution_admin", "super_admin", "admin"],
            hideInGlobal: true
        },
        {
            to: "/institution/faculty",
            label: "Faculty Hub",
            icon: Users,
            roles: ["institution_admin", "super_admin"],
            hideInGlobal: true
        },

        { to: "/profile", label: "My Profile", icon: User, roles: ["all"] },
    ];

    const settingsSubItems = [
        { to: "/settings/profile", label: "Edit Profile", icon: User },
        { to: "/settings/change-password", label: "Change Password", icon: KeyRound },
        { to: "/settings/sessions", label: "Device Management", icon: Smartphone },
    ];

    const filteredNav = navItems.filter(item => {
        const userRole = user?.role?.toLowerCase();
        const roleMatch = item.roles.includes("all") || (userRole && item.roles.some(allowed => {
            if (allowed === "inst_admin" || allowed === "institution_admin") {
                return userRole === "inst_admin" || userRole === "institution_admin";
            }
            return userRole === allowed;
        }));
        if (!roleMatch) return false;

        // 2. Context Check
        // If we are in Global Dashboard, hide items meant for Institution-only
        if (isGlobalContext && (item as any).hideInGlobal) return false;

        // If we are in Institution Dashboard, hide items meant for Global-only
        if (isInstitutionContext && (item as any).hideInInstitution) return false;

        return true;
    });

    const handleSecureDevice = async () => {
        setSecureModalOpen(true);
        setSecureStatus("loading");
        const startTime = Date.now();

        try {
            // ✅ Use apiClient (interceptors handle auth)
            // relative path: "secure-device/" -> base + "secure-device/"
            const res = await apiClient.post("secure-device/", {});

            // If already secured, show immediately (no animation wait)
            if (res.data.data?.already_secured) {
                setSecureStatus("success");
                setSecureData(res.data.data);
            } else {
                // If newly secured, ensure we show the animation for at least 3s
                const elapsed = Date.now() - startTime;
                const remaining = 3000 - elapsed;
                if (remaining > 0) {
                    await new Promise(resolve => setTimeout(resolve, remaining));
                }

                setSecureStatus("success");
                setSecureData(res.data.data);
                if (res.data.data?.access) {
                    setAccessToken(res.data.data.access);
                }
            }
        } catch (err: any) {
            console.error("Secure device failed", err);
            setSecureStatus("error");
            toast.error(err.response?.data?.message || "Failed to secure device.");
            setSecureModalOpen(false); // Close on error to show toast
        }
    };

    // Listen for trigger events from other pages (e.g. SecurityOverview)
    useEffect(() => {
        const handleTrigger = () => handleSecureDevice();
        window.addEventListener('trigger-secure-modal', handleTrigger);
        return () => window.removeEventListener('trigger-secure-modal', handleTrigger);
    }, [handleSecureDevice]);

    // Listen for force logout events from WebSocket
    useEffect(() => {
        const handleForceLogout = (event: any) => {
            console.log("[AppLayout] Force logout event received!", event.detail);
            const detail = event.detail;
            const loggedOutJti = detail?.jti;

            // Get current session JTI from token
            const token = getAccessToken();
            if (!token) {
                console.warn("[AppLayout] No access token found");
                return;
            }

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentJti = payload.jti;

                console.log("[AppLayout] JTI Comparison:");
                console.log("  - Logged out JTI:", loggedOutJti);
                console.log("  - Current JTI:", currentJti);
                console.log("  - Match:", loggedOutJti === currentJti);

                // Show modal if JTIs match OR if no JTI provided (fallback to show modal)
                if (loggedOutJti && loggedOutJti === currentJti) {
                    console.info("[AppLayout] 🛑 Force logout applicable to this tab. Showing modal.");
                    setLogoutReason(detail?.reason || "Session terminated.");
                    setShowLogoutModal(true);
                    setLogoutCountdown(5);
                } else if (!loggedOutJti) {
                    // Fallback for older events or broad terminations
                    console.info("[AppLayout] ⚠️ Force logout received without JTI. Logging out safely.");
                    setLogoutReason(detail?.reason);
                    setShowLogoutModal(true);
                    setLogoutCountdown(5);
                } else {
                    console.log("[AppLayout] 🛡️ Force logout ignored: applies to a different device.");
                }
            } catch (error) {
                console.error("[AppLayout] Failed to parse token:", error);
            }
        };

        window.addEventListener('force_logout', handleForceLogout as EventListener);
        console.log("[AppLayout] ✅ Force logout listener registered");

        return () => {
            window.removeEventListener('force_logout', handleForceLogout as EventListener);
            console.log("[AppLayout] ❌ Force logout listener removed");
        };
    }, []);

    // Session validation - "Heartbeat" only on Tab Wakeup/Focus
    useEffect(() => {
        const checkSessionValidity = async () => {
            try {
                // 🛑 Block if no token yet or not bootstrapped
                if (!bootstrapped || !hasAccessToken() || !user) return;

                // ✅ Use apiClient to check pulse
                const response = await apiClient.get("sessions/validate/");
                const data = response.data?.data;

                if (data && !data.is_valid && data.was_logged_out) {
                    console.info("[Heartbeat] Session was invalidated remotely:", data.reason);
                    window.dispatchEvent(new CustomEvent('session_invalidated', {
                        detail: { reason: data.reason }
                    }));
                }
            } catch (error) {
                console.debug("[Heartbeat] Pulse check failed (network/auth)", error);
            }
        };

        const handleVisibilityChange = () => {
            // Only check if becoming visible AND it's been at least 10 seconds since last check
            const now = Date.now();
            if (!document.hidden && bootstrapped && user && (now - lastValidationRef.current > 10000)) {
                console.debug("[Heartbeat] Tab woke up - checking session pulse");
                lastValidationRef.current = now;
                checkSessionValidity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // OPTIONAL: One initial check 2 seconds after mount to catch stale state, 
        // but rely on WebSocket for real-time.
        const initialTimer = setTimeout(() => {
            if (bootstrapped && user) checkSessionValidity();
        }, 2000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(initialTimer);
        };
    }, [user, bootstrapped]);

    // 🔁 SESSION PERSISTENCE FIX: 
    // Ensure that reloads preserve the current route if authenticated.
    useEffect(() => {
        if (bootstrapped && user && location.pathname !== "/login" && !location.pathname.includes("/verify")) {
            sessionStorage.setItem("auip_last_valid_path", location.pathname);
            console.debug("[AppLayout] Syncing path persistence:", location.pathname);
        }
    }, [location.pathname, bootstrapped, user]);

    // Listen for session invalidated events (from offline logout detection)
    useEffect(() => {
        const handleSessionInvalidated = (event: any) => {
            const detail = event.detail;
            console.log("[Session Invalidated] Reason:", detail?.reason);

            setShowLogoutModal(true);
            setLogoutCountdown(5);
        };

        window.addEventListener('session_invalidated', handleSessionInvalidated as EventListener);
        return () => {
            window.removeEventListener('session_invalidated', handleSessionInvalidated as EventListener);
        };
    }, []);

    // Countdown timer for forced logout
    useEffect(() => {
        if (!showLogoutModal) return;

        const interval = setInterval(() => {
            setLogoutCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    logout(); // Auto-logout after countdown
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showLogoutModal, logout]);

    // Geolocation tracking - send location to backend via WebSocket
    useEffect(() => {
        if (!user || !bootstrapped || !navigator.geolocation) return;

        const sendLocation = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;

            // Send location update via API
            // ✅ GUARD: Skip if no user, no token, or HYDRATING (to avoid race conditions)
            if (hasAccessToken() && user && !isHydrating()) {
                console.debug("[Geolocation] Periodic update triggered");
                apiClient.post("sessions/update-location/", {
                    latitude,
                    longitude
                }).catch(err => {
                    if (err.response?.status === 401) {
                        console.debug("[Geolocation] Update failed (401) - session likely rotating.");
                    } else {
                        console.debug("Failed to update location", err);
                    }
                });
            }
        };

        const errorHandler = (err: GeolocationPositionError) => {
            console.log("[Geolocation] Permission denied or error:", err.message);
        };

        // Request location on mount
        navigator.geolocation.getCurrentPosition(sendLocation, errorHandler, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });

        // Update every 5 minutes
        const intervalId = setInterval(() => {
            navigator.geolocation.getCurrentPosition(sendLocation, errorHandler, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        }, 300000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [user]);

    return (
        <div className="min-h-screen bg-[#0b1120] text-foreground flex flex-col md:flex-row font-sans">
            {/* Mobile Header */}
            <div className="md:hidden bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="font-bold text-lg text-primary">AUIP <span className="text-white italic">Platform</span></div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-black/40 backdrop-blur-2xl border-r border-white/5 transform transition-all duration-300 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col
                ${isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"}
                ${isSidebarCollapsed ? "md:w-20" : "md:w-80"}
            `}>

                {/* Brand + Collapse Toggle */}
                <div className={`p-6 border-b border-white/5 hidden md:flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                    {!isSidebarCollapsed && <h2 className="text-2xl font-black tracking-tighter text-white">AUIP <span className="text-primary italic">Platform</span></h2>}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                {/* User Info */}
                <div className={`p-6 mt-4 flex items-center gap-3 bg-white/5 mx-4 rounded-3xl ${isSidebarCollapsed ? "justify-center px-0" : ""}`}>
                    <div className="shrink-0 w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center text-white font-bold cursor-default" title={user?.username}>
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm text-white truncate">{user?.username}</p>
                            <p className="text-[10px] text-primary uppercase font-black tracking-widest">{user?.role}</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0 custom-scrollbar">
                    {filteredNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            title={isSidebarCollapsed ? item.label : ""}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold mb-2
                                ${isActive
                                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
                                ${isSidebarCollapsed ? "justify-center" : ""}
                                `
                            }
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}

                    {/* Settings Group */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        {isSidebarCollapsed ? (
                            <NavLink
                                to="/settings"
                                className={({ isActive }) => `flex items-center justify-center p-3 rounded-lg transition-all ${isActive ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </NavLink>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className="flex w-full items-center justify-between px-3 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-all font-medium"
                                >
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-5 h-5" />
                                        <span>Settings</span>
                                    </div>
                                    {isSettingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>

                                {isSettingsOpen && (
                                    <div className="ml-4 pl-3 border-l-2 border-gray-100 mt-1 space-y-1">
                                        {settingsSubItems.map(sub => (
                                            <NavLink
                                                key={sub.to}
                                                to={sub.to}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all
                                                    ${isActive
                                                        ? "text-blue-600 bg-blue-50/50 font-medium"
                                                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                                    }`
                                                }
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
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

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
                    <Button
                        variant="outline"
                        className={`w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 ${isSidebarCollapsed ? "px-0 justify-center" : "justify-start"}`}
                        onClick={handleSecureDevice}
                        title="Secure My Device"
                    >
                        <ShieldCheck className={`w-5 h-5 shrink-0 ${secureStatus === 'loading' ? 'animate-pulse' : ''}`} />
                        {!isSidebarCollapsed && "Secure Device"}
                    </Button>

                    <button
                        onClick={() => setConfirmLogoutModal(true)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium ${isSidebarCollapsed ? "justify-center" : ""}`}
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!isSidebarCollapsed && "Sign Out"}
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen w-full">
                <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="md:invisible font-bold text-gray-500 uppercase tracking-widest text-[10px]">Portal Access</div>
                        <div className="flex items-center gap-4">
                            <button className="relative w-10 h-10 rounded-2xl glass border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            </button>
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="glass px-4 py-2 rounded-2xl border-white/5 flex items-center gap-3 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
                            >
                                <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
                                <span className="hidden sm:inline">Type <span className="text-white hover:text-primary">Cmd+K</span> to search everything...</span>
                                <span className="sm:hidden">Search...</span>
                            </button>
                        </div>
                    </div>
                    <Outlet />
                </div>
            </main>

            {/* Secure Device Modal */}
            <SecureDeviceModal
                open={secureModalOpen}
                onOpenChange={setSecureModalOpen}
                status={secureStatus}
                data={secureData}
            />

            {/* Forced Logout Modal */}
            <ForcedLogoutModal
                open={showLogoutModal}
                countdown={logoutCountdown}
                reason={logoutReason}
            />

            {/* Global Search Overlay */}
            {user && (
                <GlobalSearch
                    isOpen={isSearchOpen}
                    onClose={() => setIsSearchOpen(false)}
                />
            )}

            {/* AI Assistant Chatbot */}
            {user && <FloatingAIAssistant />}

            {/* Logout Confirmation Modal */}
            {confirmLogoutModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass bg-[#0b1120] p-8 rounded-[3rem] max-w-sm w-full shadow-2xl space-y-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <LogOut className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-center text-white">Sign Out?</h2>
                        <p className="text-gray-400 text-center text-sm font-medium">
                            Are you sure you want to log out and terminate your current encrypted session securely?
                        </p>
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setConfirmLogoutModal(false)}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmLogoutModal(false);
                                    logout();
                                }}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
