import { useState, useCallback } from "react";
import { LogOut, RefreshCcw, Laptop, Smartphone, Globe, MapPin, Clock, Shield } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

// Helper for relative time without date-fns dep
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export const SessionManager = () => {
  const {
    user,
    logout,
    sessions,
    connected,
    loading,
    loadSessions,
    logoutOneSession,
    logoutAllSessions,
  } = useAuth();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logoutTarget, setLogoutTarget] = useState<Session | "ALL" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleLogoutConfirm = async (mode: "ALL" | "OTHERS" | "SINGLE" = "SINGLE") => {
    if (!logoutTarget) return;
    setActionLoading(true);

    try {
      if (mode === "ALL") {
        await logoutAllSessions(false); // false = logout everything
        await logout();
      } else if (mode === "OTHERS") {
        await logoutAllSessions(true); // true = exclude current
        // No logout() call needed, we stay logged in
      } else {
        // Single session
        if (typeof logoutTarget !== "string") {
          await logoutOneSession(logoutTarget.id);
          if (logoutTarget.is_current) {
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

  const currentSession = sessions.find((s: Session) => s.jti === user?.id?.toString()) || sessions.find((s: Session) => s.is_current);

  const getDeviceIcon = (type?: string) => {
    if (type?.toLowerCase().includes("mobile")) return <Smartphone className="w-5 h-5" />;
    return <Laptop className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Active Sessions</h2>
          <p className="text-sm text-gray-500">
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

      <div className="grid gap-4">
        {sessions.map((session: Session) => {
          const isExpanded = expandedId === session.id;
          const isCurrent = session.id === currentSession?.id; // You might need robust matching

          return (
            <Card
              key={session.id}
              className={cn(
                "transition-all duration-200 border-l-4 cursor-pointer hover:shadow-md",
                isCurrent ? "border-l-green-500 bg-green-50/10" : "border-l-gray-300",
                isExpanded ? "ring-2 ring-blue-100" : ""
              )}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${isCurrent ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {getDeviceIcon(session.device_type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {session.os || "Unknown OS"}
                        {session.browser && <span className="text-gray-400 font-normal text-sm">• {session.browser}</span>}
                        {isCurrent && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Current Device</span>}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.latitude && session.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${session.latitude},${session.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {typeof session.location === 'object' && session.location?.city
                                ? `${session.location.city}, ${session.location.country || ''}`
                                : `${session.latitude.toFixed(4)}, ${session.longitude.toFixed(4)}`}
                            </a>
                          ) : typeof session.location === 'object' && session.location?.city ? (
                            `${session.location.city}, ${session.location.country || ''}`
                          ) : (
                            session.ip_address
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(session.last_active)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoutTarget(session);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in fade-in slide-in-from-top-1">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Device Details</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between"><dt className="text-gray-500">IP Address:</dt><dd className="font-mono text-gray-700">{session.ip_address}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">User Agent:</dt><dd className="text-gray-700 truncate max-w-[200px]" title={session.user_agent}>{session.user_agent}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Browser:</dt><dd className="text-gray-700">{session.browser || "Unknown"}</dd></div>
                      </dl>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Session Info</h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between"><dt className="text-gray-500">Logged In:</dt><dd className="text-gray-700">{new Date(session.created_at).toLocaleDateString()}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Last Active:</dt><dd className="text-gray-700">{new Date(session.last_active).toLocaleString()}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Expires:</dt><dd className="text-gray-700">{session.expires_at ? new Date(session.expires_at).toLocaleDateString() : 'Never'}</dd></div>
                      </dl>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!logoutTarget} onOpenChange={(open: boolean) => !open && setLogoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {logoutTarget === "ALL" ? "Sign out of all devices?" : "Sign out session?"}
            </DialogTitle>
            <DialogDescription>
              {logoutTarget === "ALL"
                ? "You can choose to sign out of all devices including this one, or only other devices."
                : "This will invalidate the session for this device. The user will be logged out immediately."}
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
                {actionLoading ? "Signing out..." : "Confirm Sign Out"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

