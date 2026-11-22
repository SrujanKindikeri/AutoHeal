"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { adminGetAnalytics, AdminAnalytics } from "@/lib/adminApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  LayoutDashboard,
  Users,
  Flag,
  BarChart2,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  CheckSquare,
  Clock,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="p-5 rounded-2xl apple-glass-card flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          accent ?? "bg-accent-blue/10 text-accent-blue"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-content-primary tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="text-xs text-content-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function NavCard({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-2xl apple-glass-card hover:border-accent-blue/30 hover:shadow-glass transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0 group-hover:bg-accent-blue group-hover:text-white transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-content-primary group-hover:text-accent-blue transition-colors">
          {label}
        </div>
        <div className="text-xs text-content-muted mt-0.5">{description}</div>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated, isLoading, router]);

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await adminGetAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setAnalyticsError(err.message || "Failed to load analytics.");
    } finally {
      setAnalyticsLoading(false);
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
      <div className="max-w-5xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-6 h-6 text-accent-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-content-secondary">
            Platform overview and management tools.
          </p>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NavCard
            href="/admin/users"
            label="User Management"
            description="View, search, and moderate user accounts."
            icon={<Users className="w-5 h-5" />}
          />
          <NavCard
            href="/admin/moderation"
            label="Moderation"
            description="Review and resolve content reports."
            icon={<Flag className="w-5 h-5" />}
          />
          <NavCard
            href="/admin/analytics"
            label="Analytics"
            description="Platform growth and engagement metrics."
            icon={<BarChart2 className="w-5 h-5" />}
          />
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-4">
            Platform Metrics
          </h2>

          {analyticsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-surface-primary animate-pulse"
                />
              ))}
            </div>
          ) : analyticsError ? (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{analyticsError}</span>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total users"
                value={analytics.total_users}
                icon={<Users className="w-5 h-5" />}
                accent="bg-accent-blue/10 text-accent-blue"
              />
              <StatCard
                label="Active today"
                value={analytics.active_users_today}
                icon={<UserCheck className="w-5 h-5" />}
                accent="bg-accent-emerald/10 text-accent-emerald"
              />
              <StatCard
                label="New (7 days)"
                value={analytics.new_users_last_7_days}
                icon={<TrendingUp className="w-5 h-5" />}
                accent="bg-accent-purple/10 text-accent-purple"
              />
              <StatCard
                label="New (30 days)"
                value={analytics.new_users_last_30_days}
                icon={<TrendingUp className="w-5 h-5" />}
                accent="bg-accent-gold/10 text-accent-gold"
              />
              <StatCard
                label="Total friendships"
                value={analytics.total_friendships}
                icon={<Users className="w-5 h-5" />}
                accent="bg-accent-pink/10 text-accent-pink"
              />
              <StatCard
                label="Pending requests"
                value={analytics.total_friend_requests_pending}
                icon={<Clock className="w-5 h-5" />}
                accent="bg-accent-gold/10 text-accent-gold"
              />
              <StatCard
                label="Reports pending"
                value={analytics.total_reports_pending}
                icon={<Flag className="w-5 h-5" />}
                accent="bg-accent-coral/10 text-accent-coral"
              />
              <StatCard
                label="Reports resolved"
                value={analytics.total_reports_resolved}
                icon={<CheckSquare className="w-5 h-5" />}
                accent="bg-accent-emerald/10 text-accent-emerald"
              />
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
