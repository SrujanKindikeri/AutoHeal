"use client";

import React from "react";
import Link from "next/link";
import { Video, Film, Users, Share2 } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

/**
 * Watch Together hub page — /watch-together.
 * Lists active/recent rooms and lets users create a new room.
 * The WebSocket room logic lives in a separate API layer; this page
 * renders the shell and navigation so the route is reachable.
 */
export default function WatchTogetherPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <PageHeader
            title="Watch Together"
            icon={<Video className="w-5 h-5 text-accent-blue" />}
            description="Watch movies in sync with friends in real time."
          />
          <div
            className="rounded-3xl p-12 text-center space-y-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Video className="w-12 h-12 text-content-muted mx-auto" />
            <h2 className="text-heading-sm font-bold text-content-primary">Sign in to join or create a room</h2>
            <p className="text-body-md text-content-secondary max-w-sm mx-auto">
              Invite friends to a synchronized watch party for any movie.
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
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        <PageHeader
          title="Watch Together"
          icon={<Video className="w-5 h-5 text-accent-blue" />}
          description="Host or join a synchronized movie room with friends."
          actions={
            <Button variant="primary" disabled>
              <Video className="w-4 h-4 mr-2" />
              New Room
            </Button>
          }
        />

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="default" padding="md">
            <CardHeader>
              <Film className="w-8 h-8 text-accent-blue" />
            </CardHeader>
            <CardTitle>Pick a Movie</CardTitle>
            <CardBody>
              <p className="mt-1">
                Choose any movie from the MovieFlow library to watch together.
              </p>
            </CardBody>
          </Card>

          <Card variant="default" padding="md">
            <CardHeader>
              <Users className="w-8 h-8 text-accent-blue" />
            </CardHeader>
            <CardTitle>Invite Friends</CardTitle>
            <CardBody>
              <p className="mt-1">
                Share a room link or invite by MovieFlow ID. Up to 10 viewers at once.
              </p>
            </CardBody>
          </Card>

          <Card variant="default" padding="md">
            <CardHeader>
              <Share2 className="w-8 h-8 text-accent-blue" />
            </CardHeader>
            <CardTitle>Watch in Sync</CardTitle>
            <CardBody>
              <p className="mt-1">
                Playback, pause, and seek stay in sync for everyone in the room.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Coming Soon notice */}
        <div
          className="rounded-3xl p-10 text-center space-y-3"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Video className="w-10 h-10 text-content-muted mx-auto" />
          <h3 className="text-heading-sm font-semibold text-content-primary">Rooms coming soon</h3>
          <p className="text-body-md text-content-secondary max-w-md mx-auto">
            Live watch-party rooms are under development. In the meantime, browse movies and add them to your watchlist.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/movies"><Button variant="secondary" size="sm">Browse Movies</Button></Link>
            <Link href="/watchlist"><Button variant="secondary" size="sm">My Watchlist</Button></Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
