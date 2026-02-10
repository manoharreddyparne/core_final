import { useState, useEffect } from "react";
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
    KeyRound
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

import { useAuth } from "../context/AuthProvider/AuthProvider";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api/base";
import { getAccessToken, setAccessToken } from "../utils/tokenStorage";
import { SecureDeviceModal } from "../components/SecureDeviceModal";
import { ForcedLogoutModal } from "../components/ForcedLogoutModal";

export const AppLayout = () => {
    const { user, logout } = useAuth();
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

    const navItems = [
        { to: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student"] },
        { to: "/admin-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
        { to: "/profile", label: "My Profile", icon: User, roles: ["all"] },
        // Active Sessions moved to settings only
    ];

    const settingsSubItems = [
        { to: "/settings/profile", label: "Edit Profile", icon: User },
        { to: "/settings/change-password", label: "Change Password", icon: KeyRound },
        { to: "/settings/sessions", label: "Device Management", icon: Smartphone },
    ];

    const handleSecureDevice = async () => {
        setSecureModalOpen(true);
        setSecureStatus("loading");
        const startTime = Date.now();

        try {
            const token = getAccessToken();
            const res = await axios.post(`${API_BASE_URL}secure-device/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

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
                if (!loggedOutJti || loggedOutJti === currentJti) {
                    console.log("[AppLayout] ✅ Showing logout modal");
                    setShowLogoutModal(true);
                    setLogoutCountdown(5);
                } else {
                    console.log("[AppLayout] ❌ JTIs don't match - not showing modal");
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

    // Session validation - check if session is still active (for offline logout detection)
    useEffect(() => {
        const checkSessionValidity = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}sessions/validate/`);
                const data = response.data?.data;

                if (data && !data.is_valid && data.was_logged_out) {
                    console.log("[Session Validation] Session was invalidated:", data.reason);

                    // Dispatch event to show logout modal
                    window.dispatchEvent(new CustomEvent('session_invalidated', {
                        detail: { reason: data.reason }
                    }));
                }
            } catch (error) {
                // Ignore errors - might be network issue
                console.log("[Session Validation] Check failed:", error);
            }
        };

        // Check on visibility change (tab focus)
        const handleVisibilityChange = () => {
            if (!document.hidden && user) {
                console.log("[Session Validation] Tab visible - checking session");
                checkSessionValidity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check on mount
        if (user) {
            checkSessionValidity();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user]);

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
        if (!user || !navigator.geolocation) return;

        const sendLocation = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;

            // Send location update via WebSocket (if available from auth context)
            // For now, we can send it via API
            const token = getAccessToken();
            if (token) {
                axios.post(`${API_BASE_URL}sessions/update-location/`, {
                    latitude,
                    longitude
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => console.error("Failed to update location", err));
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

    const filteredNav = navItems.filter(item =>
        item.roles.includes("all") || (user?.role && item.roles.includes(user.role.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="font-bold text-lg text-blue-600">ExamPortal</div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col
                ${isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"}
                ${isSidebarCollapsed ? "md:w-20" : "md:w-64"}
            `}>

                {/* Brand + Collapse Toggle */}
                <div className={`p-6 border-b border-gray-100 hidden md:flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                    {!isSidebarCollapsed && <h2 className="text-2xl font-bold text-blue-600">ExamPortal</h2>}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                {/* User Info */}
                <div className={`p-6 flex items-center gap-3 bg-gray-50/50 ${isSidebarCollapsed ? "justify-center" : ""}`}>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold cursor-default" title={user?.username}>
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="overflow-hidden">
                            <p className="font-medium text-gray-900 truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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
                                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium mb-1
                                ${isActive
                                    ? "bg-blue-50 text-blue-600 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                        onClick={logout}
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
            />
        </div>
    );
};
