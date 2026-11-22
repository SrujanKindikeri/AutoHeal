"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminGetAnalytics, AdminAnalytics } from "@/lib/adminApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  BarChart2,
  Users,
  UserCheck,
  TrendingUp,
  Heart,
  Clock,
  Flag,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface MetricGroupProps {
  title: string;
  items: { label: string; value: number; icon: React.ReactNode; accent: string }[];
}

function MetricGroup({ title, items }: MetricGroupProps) {
  return (
    <div className="p-6 rounded-3xl apple-glass-card space-y-4">
      <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface-primary/60 border border-border-subtle"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}
            >
              {item.icon}
            </div>
            <div>
              <div className="text-xl font-bold text-content-primary tabular-nums">
                {item.value.toLocaleString()}
              </div>
              <div className="text-xs text-content-muted mt-0.5">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
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
      <div className="max-w-4xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-6 h-6 text-accent-blue" />
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                Analytics
              </h1>
            </div>
            <p className="text-sm text-content-secondary">
              Platform growth, engagement, and moderation metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl apple-button text-content-secondary text-sm font-medium self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-3xl bg-surface-primary animate-pulse"
              />
            ))}
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            <MetricGroup
              title="User Base"
              items={[
                {
                  label: "Total registered users",
                  value: analytics.total_users,
                  icon: <Users className="w-4 h-4" />,
                  accent: "bg-accent-blue/10 text-accent-blue",
                },
                {
                  label: "Active users today",
                  value: analytics.active_users_today,
                  icon: <UserCheck className="w-4 h-4" />,
                  accent: "bg-accent-emerald/10 text-accent-emerald",
                },
                {
                  label: "New users (7 days)",
                  value: analytics.new_users_last_7_days,
                  icon: <TrendingUp className="w-4 h-4" />,
                  accent: "bg-accent-purple/10 text-accent-purple",
                },
                {
                  label: "New users (30 days)",
                  value: analytics.new_users_last_30_days,
                  icon: <TrendingUp className="w-4 h-4" />,
                  accent: "bg-accent-gold/10 text-accent-gold",
                },
              ]}
            />

            <MetricGroup
              title="Social Activity"
              items={[
                {
                  label: "Total friendships",
                  value: analytics.total_friendships,
                  icon: <Heart className="w-4 h-4" />,
                  accent: "bg-accent-pink/10 text-accent-pink",
                },
                {
                  label: "Pending friend requests",
                  value: analytics.total_friend_requests_pending,
                  icon: <Clock className="w-4 h-4" />,
                  accent: "bg-accent-gold/10 text-accent-gold",
                },
              ]}
            />

            <MetricGroup
              title="Moderation"
              items={[
                {
                  label: "Reports pending review",
                  value: analytics.total_reports_pending,
                  icon: <Flag className="w-4 h-4" />,
                  accent: "bg-accent-coral/10 text-accent-coral",
                },
                {
                  label: "Reports resolved",
                  value: analytics.total_reports_resolved,
                  icon: <CheckSquare className="w-4 h-4" />,
                  accent: "bg-accent-emerald/10 text-accent-emerald",
                },
              ]}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
