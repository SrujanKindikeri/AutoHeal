"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  adminListReports,
  adminResolveReport,
  ModerationReport,
  PaginatedReports,
} from "@/lib/adminApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Flag,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function statusBadge(status: ModerationReport["status"]) {
  const map: Record<
    ModerationReport["status"],
    { label: string; cls: string }
  > = {
    pending: {
      label: "Pending",
      cls: "bg-accent-gold/10 text-accent-gold border-accent-gold/20",
    },
    reviewed: {
      label: "Reviewed",
      cls: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    },
    resolved: {
      label: "Resolved",
      cls: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
    },
    dismissed: {
      label: "Dismissed",
      cls: "bg-surface-primary text-content-muted border-border-subtle",
    },
  };
  const s = map[status] ?? map.dismissed;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export default function AdminModerationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore();

  const [data, setData] = useState<PaginatedReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListReports(page, statusFilter);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadReports();
    }
  }, [isAuthenticated, loadReports]);

  const handleAction = async (
    report: ModerationReport,
    action: "resolve" | "dismiss"
  ) => {
    setActionLoading(report.id);
    setActionMsg(null);
    try {
      await adminResolveReport(report.id, action);
      setActionMsg(
        `Report #${report.id.slice(0, 8)} ${
          action === "resolve" ? "resolved" : "dismissed"
        }.`
      );
      loadReports();
    } catch (err: any) {
      setActionMsg(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xs text-content-muted">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-6 h-6 text-accent-blue" />
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                Moderation
              </h1>
            </div>
            <p className="text-sm text-content-secondary">
              Review and act on content and user reports.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReports}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl apple-button text-content-secondary text-sm font-medium self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                statusFilter === f.value
                  ? "bg-accent-blue text-white border-accent-blue"
                  : "bg-surface-primary text-content-secondary border-border-subtle hover:border-border-glass"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Reports */}
        <div className="space-y-3">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-surface-primary animate-pulse"
              />
            ))
          ) : data?.results.length === 0 ? (
            <div className="p-12 rounded-3xl apple-glass-card text-center text-content-muted text-sm">
              No reports found.
            </div>
          ) : (
            data?.results.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl apple-glass-card space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(report.status)}
                      <span className="text-xs text-content-muted font-mono">
                        #{report.id.slice(0, 8)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-content-muted">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.created_at)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-content-primary">
                      {report.reason}
                    </div>
                    <div className="text-xs text-content-secondary line-clamp-2">
                      {report.details}
                    </div>
                    <div className="flex gap-3 text-xs text-content-muted mt-1">
                      <span>
                        Reporter:{" "}
                        <span className="text-content-secondary font-medium">
                          @{report.reporter.username}
                        </span>
                      </span>
                      <span>
                        Reported:{" "}
                        <span className="text-content-secondary font-medium">
                          @{report.reported_user.username}
                        </span>
                      </span>
                    </div>
                  </div>

                  {report.status === "pending" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={actionLoading === report.id}
                        onClick={() => handleAction(report, "resolve")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-emerald/10 hover:bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/20 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {actionLoading === report.id ? "…" : "Resolve"}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === report.id}
                        onClick={() => handleAction(report, "dismiss")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-primary hover:bg-surface-elevated text-content-muted border border-border-subtle text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>
                          {actionLoading === report.id ? "…" : "Dismiss"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-content-muted">
              Page {data.current_page} of {data.total_pages} &middot;{" "}
              {data.count} reports
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-xl apple-button text-content-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-xl apple-button text-content-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
