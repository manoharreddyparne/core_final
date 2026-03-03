import { useState } from "react";
import { LogOut, RefreshCcw, Laptop, Smartphone, MapPin, Clock, Shield, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "../context/AuthProvider/AuthProvider";
import type { Session } from "../api/types";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export const SessionManager = () => {
  const {
    user,
    logout,
    sessions,
    loadingSessions: loading,
    loadSessions,
    killSession,
    killAllSessions,
  } = useAuth();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logoutTarget, setLogoutTarget] = useState<Session | "ALL" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleLogoutConfirm = async (mode: "ALL" | "OTHERS" | "SINGLE" = "SINGLE") => {
    if (!logoutTarget) return;
    setActionLoading(true);

    try {
      if (mode === "ALL") {
        await killAllSessions(false);
        await logout();
      } else if (mode === "OTHERS") {
        await killAllSessions(true);
      } else {
        if (typeof logoutTarget !== "string") {
          const wasCurrent = logoutTarget.is_current === true;
          await killSession(logoutTarget.id);
          // Only logout the entire app if the user terminated their OWN current session
          if (wasCurrent) {
            await logout();
          }
        }
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setActionLoading(false);
      setLogoutTarget(null);
    }
  };

  const getDeviceIcon = (session: Session) => {
    const dt = (session.device_type || session.os || "").toLowerCase();
    if (dt.includes("mobile") || dt.includes("android") || dt.includes("ios") || dt.includes("iphone"))
      return <Smartphone className="w-5 h-5" />;
    return <Laptop className="w-5 h-5" />;
  };

  // Build location display from backend data
  const getLocationDisplay = (session: Session) => {
    // 1. Check if we have lat/lng for a map link
    const hasCoords = session.latitude != null && session.longitude != null
      && session.latitude !== 0 && session.longitude !== 0;

    // 2. Build a human-readable label
    let label = session.ip_address || "Unknown";
    if (typeof session.location === "object" && session.location) {
      const parts = [session.location.city, session.location.region, session.location.country].filter(Boolean);
      if (parts.length > 0) label = parts.join(", ");
    }

    if (hasCoords) {
      return (
        <a
          href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    }

    return <span>{label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Active Sessions</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage devices where your account is currently logged in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {sessions.length > 1 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setLogoutTarget("ALL")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Logout Everywhere
            </Button>
          )}
        </div>
      </div>

      {/* Session Count */}
      {sessions.length > 0 && (
        <p className="text-xs text-[var(--text-secondary)]">
          {sessions.length} active session{sessions.length > 1 ? "s" : ""}
        </p>
      )}

      {/* Session Cards */}
      <div className="grid gap-4">
        {sessions.map((session: Session) => {
          const isExpanded = expandedId === session.id;
          // Use the backend-provided is_current flag (set by JTI match in device_sessions.py)
          const isCurrent = session.is_current === true;

          return (
            <Card
              key={session.id}
              className={cn(
                "transition-all duration-200 border-l-4 cursor-pointer hover:shadow-md",
                isCurrent ? "border-l-green-500 bg-green-500/5" : "border-l-muted",
                isExpanded ? "ring-2 ring-[var(--primary)]/20" : ""
              )}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${isCurrent ? "bg-green-500/10 text-green-500" : "bg-[var(--bg-card)] text-[var(--text-secondary)]"}`}>
                      {getDeviceIcon(session)}
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
                        {session.os || "Unknown OS"}
                        {session.browser && <span className="text-[var(--text-secondary)] font-normal text-sm">• {session.browser}</span>}
                        {isCurrent && (
                          <span className="bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded-full border border-green-500/20">
                            Current Device
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {getLocationDisplay(session)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {timeAgo(session.last_active)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoutTarget(session);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        <span className="text-xs">Revoke</span>
                      </Button>
                    )}
                    {isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoutTarget(session);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        <span className="text-xs">Sign Out</span>
                      </Button>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                      : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    }
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in fade-in slide-in-from-top-1">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-2">Device Details</h4>
                      <dl className="space-y-1.5">
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">IP Address</dt>
                          <dd className="font-mono text-[var(--text-primary)]">{session.ip_address}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">OS</dt>
                          <dd className="text-[var(--text-primary)]">{session.os || "Unknown"}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">Browser</dt>
                          <dd className="text-[var(--text-primary)]">{session.browser || "Unknown"}</dd>
                        </div>
                        {session.user_agent && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text-secondary)] shrink-0">User Agent</dt>
                            <dd className="text-[var(--text-primary)] text-right truncate max-w-[250px]" title={session.user_agent}>
                              {session.user_agent}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-2">Session Info</h4>
                      <dl className="space-y-1.5">
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">Logged In</dt>
                          <dd className="text-[var(--text-primary)]">{new Date(session.created_at).toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">Last Active</dt>
                          <dd className="text-[var(--text-primary)]">{new Date(session.last_active).toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">Expires</dt>
                          <dd className="text-[var(--text-primary)]">
                            {session.expires_at ? new Date(session.expires_at).toLocaleString() : "Session-based"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--text-secondary)]">Location</dt>
                          <dd className="text-[var(--text-primary)]">{getLocationDisplay(session)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No active sessions found.</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!logoutTarget} onOpenChange={(open: boolean) => !open && setLogoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {logoutTarget === "ALL"
                ? "Sign out of all devices?"
                : typeof logoutTarget !== "string" && logoutTarget?.is_current
                  ? "Sign out of current device?"
                  : "Revoke this session?"}
            </DialogTitle>
            <DialogDescription>
              {logoutTarget === "ALL"
                ? "You can choose to sign out of all devices including this one, or only other devices."
                : typeof logoutTarget !== "string" && logoutTarget?.is_current
                  ? "This will sign you out of the current device. You will be redirected to the login page."
                  : "This will invalidate the session on that device. The user will be logged out immediately."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setLogoutTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>

            {logoutTarget === "ALL" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleLogoutConfirm("OTHERS")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "Logout Others Only"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleLogoutConfirm("ALL")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "Logout Everywhere"}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => handleLogoutConfirm("SINGLE")}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Signing out..."
                  : typeof logoutTarget !== "string" && logoutTarget?.is_current
                    ? "Sign Out"
                    : "Revoke Session"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
