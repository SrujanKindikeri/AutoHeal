"use client";

import React from "react";
import Link from "next/link";
import { Clock, Film, Tv } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

/**
 * Continue Watching page — shows in-progress movies and episodes.
 * Playback progress tracking requires a backend session API not yet
 * implemented; this page renders the authenticated shell and an empty
 * state so the route resolves and the navigation link works.
 */
export default function ContinueWatchingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <PageHeader
            title="Continue Watching"
            icon={<Clock className="w-5 h-5 text-accent-blue" />}
          />
          <div
            className="rounded-3xl p-12 text-center space-y-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Clock className="w-12 h-12 text-content-muted mx-auto" />
            <h2 className="text-heading-sm font-bold text-content-primary">Sign in to track progress</h2>
            <p className="text-body-md text-content-secondary max-w-sm mx-auto">
              Your watch progress is saved automatically when you sign in.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/login"><Button variant="primary">Sign In</Button></Link>
              <Link href="/register"><Button variant="secondary">Create Account</Button></Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <PageHeader
          title="Continue Watching"
          icon={<Clock className="w-5 h-5 text-accent-blue" />}
          description="Pick up where you left off."
        />

        {/* Empty state — playback progress API not yet available */}
        <div
          className="rounded-3xl p-12 text-center space-y-4"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex justify-center gap-3">
            <Film className="w-10 h-10 text-content-muted" />
            <Tv className="w-10 h-10 text-content-muted" />
          </div>
          <h3 className="text-heading-sm font-semibold text-content-primary">Nothing in progress</h3>
          <p className="text-body-md text-content-secondary max-w-sm mx-auto">
            Start watching a movie or TV show and your progress will appear here.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/movies"><Button variant="secondary" size="sm">Browse Movies</Button></Link>
            <Link href="/shows"><Button variant="secondary" size="sm">Browse TV Shows</Button></Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
