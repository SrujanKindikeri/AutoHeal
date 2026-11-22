"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getIncomingRequests, getNotifications, markAllNotificationsRead } from "@/lib/socialApi";
import { NotificationItem, FriendRequest } from "@/types/social";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { AppHeader } from "./AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { fetchBackendHealth, SystemHealthResponse } from "@/lib/api";
import { Activity, Server, Database, Radio, CheckCircle2, AlertCircle } from "lucide-react";

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Load social counters
  const fetchSocialCounts = async () => {
    if (!isAuthenticated) return;
    try {
      const [notifs, incoming] = await Promise.all([
        getNotifications().catch(() => ({ unread_count: 0, results: [] })),
        getIncomingRequests().catch(() => []),
      ]);
      setNotifications(notifs.results || []);
      setUnreadCount(notifs.unread_count || 0);
      setIncomingRequests(incoming || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSocialCounts();
      const interval = setInterval(fetchSocialCounts, 20000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const handleOpenDiagnostics = async () => {
    setDiagnosticsOpen(true);
    setHealthLoading(true);
    try {
      const data = await fetchBackendHealth();
      setSystemHealth(data);
    } catch {
      // Ignore
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
        {/* Desktop Sidebar */}
        <DesktopSidebar
          pendingRequestCount={incomingRequests.length}
          unreadNotificationCount={unreadCount}
          onOpenNotifications={() => {}}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          <AppHeader
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onOpenDiagnostics={handleOpenDiagnostics}
          />

          <main className="flex-1 pb-24 md:pb-12 min-w-0">
            {children}
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation
          pendingRequestCount={incomingRequests.length}
          unreadNotificationCount={unreadCount}
        />

        {/* System Diagnostics Modal */}
        <Modal
          isOpen={diagnosticsOpen}
          onClose={() => setDiagnosticsOpen(false)}
          title="System Architecture & Diagnostics"
          description="Live operational telemetry of MovieFlow ASGI, database, and channel layers."
          size="md"
        >
          <div className="space-y-4 pt-2">
            {healthLoading ? (
              <div className="p-8 text-center text-body-sm text-content-muted animate-pulse">
                Probing system endpoints...
              </div>
            ) : systemHealth ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-primary/80 border border-border-glass">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-accent-blue" />
                    <div>
                      <div className="text-body-sm font-semibold text-content-primary">
                        Daphne ASGI Server
                      </div>
                      <div className="text-caption text-content-muted">
                        Django v{systemHealth.django_version} • Service: {systemHealth.service}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-caption font-semibold text-emerald-700 bg-accent-emerald/10 px-2.5 py-1 rounded-full border border-accent-emerald/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {systemHealth.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-primary/80 border border-border-glass">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-accent-purple" />
                    <div>
                      <div className="text-body-sm font-semibold text-content-primary">
                        Database Engine
                      </div>
                      <div className="text-caption text-content-muted">
                        Engine: {systemHealth.components?.database?.engine || "PostgreSQL/SQLite"}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-caption font-semibold text-emerald-700 bg-accent-emerald/10 px-2.5 py-1 rounded-full border border-accent-emerald/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {systemHealth.components?.database?.status.toUpperCase() || "UP"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-primary/80 border border-border-glass">
                  <div className="flex items-center gap-3">
                    <Radio className="w-5 h-5 text-accent-pink" />
                    <div>
                      <div className="text-body-sm font-semibold text-content-primary">
                        Channel Layer
                      </div>
                      <div className="text-caption text-content-muted">
                        Layer: {systemHealth.components?.channels?.layer || "InMemory / Redis"}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-caption font-semibold text-emerald-700 bg-accent-emerald/10 px-2.5 py-1 rounded-full border border-accent-emerald/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {systemHealth.components?.channels?.status.toUpperCase() || "UP"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-body-sm text-accent-coral flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to query backend health</span>
              </div>
            )}
          </div>
        </Modal>
      </div>
  );
};
