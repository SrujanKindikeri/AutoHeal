"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  AdminUserListItem,
  PaginatedAdminUsers,
} from "@/lib/adminApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Shield,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore();

  const [data, setData] = useState<PaginatedAdminUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListUsers(page, search);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleActive = async (u: AdminUserListItem) => {
    setActionLoading(u.id);
    setActionMsg(null);
    try {
      await adminUpdateUser(u.id, { is_active: !u.is_active });
      setActionMsg(
        `User ${u.username} ${u.is_active ? "deactivated" : "activated"}.`
      );
      loadUsers();
    } catch (err: any) {
      setActionMsg(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (u: AdminUserListItem) => {
    if (
      !window.confirm(
        `Permanently delete user "${u.username}" (${u.email})? This cannot be undone.`
      )
    )
      return;
    setActionLoading(u.id);
    setActionMsg(null);
    try {
      await adminDeleteUser(u.id);
      setActionMsg(`User ${u.username} deleted.`);
      loadUsers();
    } catch (err: any) {
      setActionMsg(err.message || "Delete failed.");
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
              <Users className="w-6 h-6 text-accent-blue" />
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                User Management
              </h1>
            </div>
            <p className="text-sm text-content-secondary">
              Search, review, and moderate user accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl apple-button text-content-secondary text-sm font-medium self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, or MovieFlow ID…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-sm placeholder:text-content-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold transition-colors"
          >
            Search
          </button>
        </form>

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

        {/* Table */}
        <div className="apple-glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-content-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-content-muted uppercase tracking-wider hidden sm:table-cell">
                    Joined
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-content-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-content-muted uppercase tracking-wider hidden md:table-cell">
                    Staff
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-content-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="h-4 w-40 rounded bg-surface-primary animate-pulse" />
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <div className="h-4 w-20 rounded bg-surface-primary animate-pulse" />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="h-4 w-16 rounded-full bg-surface-primary animate-pulse mx-auto" />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="h-4 w-10 rounded bg-surface-primary animate-pulse mx-auto" />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="h-7 w-20 rounded-xl bg-surface-primary animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : data?.results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-content-muted text-sm"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  data?.results.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border-subtle last:border-0 hover:bg-surface-primary/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-content-primary">
                          {u.full_name || u.username}
                        </div>
                        <div className="text-xs text-content-muted">
                          {u.email}
                        </div>
                        <div className="text-[10px] text-content-muted font-mono mt-0.5">
                          {u.movieflow_id}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-content-secondary">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-coral bg-accent-coral/10 border border-accent-coral/20 px-2 py-0.5 rounded-full font-medium">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center hidden md:table-cell">
                        {u.is_staff ? (
                          <Shield className="w-4 h-4 text-accent-blue mx-auto" />
                        ) : (
                          <span className="text-content-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => handleToggleActive(u)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                              u.is_active
                                ? "bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold border border-accent-gold/20"
                                : "bg-accent-emerald/10 hover:bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/20"
                            }`}
                          >
                            {actionLoading === u.id
                              ? "…"
                              : u.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === u.id}
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-xl bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral border border-accent-coral/20 transition-colors disabled:opacity-50"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-subtle">
              <div className="text-xs text-content-muted">
                Page {data.current_page} of {data.total_pages} &middot;{" "}
                {data.count} users
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
      </div>
    </AppShell>
  );
}
