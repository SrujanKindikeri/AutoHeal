"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Video, Film, Users, Share2 } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { ChatInterface, VoiceVideoOverlay, Reactions } from "@/components/social";
import type { ChatMessage, ReactionCount } from "@/components/social";

/**
 * Watch Together hub page — /watch-together.
 * Lists active/recent rooms and lets users create a new room.
 * The WebSocket room logic lives in a separate API layer; this page
 * renders the shell and navigation so the route is reachable.
 * Chat, voice/video controls, and reactions are wired to local demo
 * state here until the room WebSocket service is live.
 */
export default function WatchTogetherPage() {
  const { isAuthenticated, user } = useAuthStore();

  // ── Demo state for the social components preview ──────────────────────
  const [demoMessages, setDemoMessages] = useState<ChatMessage[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleSendMessage = (content: string) => {
    if (!user) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user: { id: user.id, username: user.username, avatar_url: user.profile?.avatar_url ?? null },
      content,
      timestamp: new Date().toISOString(),
    };
    setDemoMessages((prev) => [...prev, msg]);
  };

  const handleReact = (emoji: string) => {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) {
          // un-react
          return existing.count <= 1
            ? prev.filter((r) => r.emoji !== emoji)
            : prev.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r);
        }
        return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r);
      }
      return [...prev, { emoji, count: 1, reacted: true }];
    });
  };

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
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        <PageHeader
          title="Watch Together"
          icon={<Video className="w-5 h-5 text-accent-blue" />}
          description="Host or join a synchronized movie room with friends."
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPreview((s) => !s)}
              >
                {showPreview ? "Hide" : "Preview"} Room Controls
              </Button>
              <Button variant="primary" disabled>
                <Video className="w-4 h-4 mr-2" />
                New Room
              </Button>
            </div>
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

        {/* Social controls preview */}
        {showPreview && (
          <div className="space-y-6">
            <div
              className="rounded-3xl p-1.5"
              style={{ background: "var(--border-subtle)" }}
            >
              <p className="text-[10px] font-semibold text-content-muted uppercase tracking-wider text-center py-1">
                Room controls preview — connects to live room WebSocket when a room is active
              </p>
            </div>

            {/* Voice / video controls */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Voice &amp; Video Controls
              </p>
              <VoiceVideoOverlay
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                speakerMuted={speakerMuted}
                onToggleMic={() => setMicEnabled((s) => !s)}
                onToggleCamera={() => setCameraEnabled((s) => !s)}
                onToggleSpeaker={() => setSpeakerMuted((s) => !s)}
                onLeave={() => setShowPreview(false)}
                participantCount={1}
              />
            </div>

            {/* Reactions */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Reactions
              </p>
              <Reactions reactions={reactions} onReact={handleReact} />
            </div>

            {/* Chat */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                Room Chat
              </p>
              <ChatInterface
                messages={demoMessages}
                currentUserId={user?.id ?? ""}
                onSendMessage={handleSendMessage}
                className="h-72"
              />
            </div>
          </div>
        )}

        {/* Coming Soon notice */}
        {!showPreview && (
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
        )}
      </div>
    </AppShell>
  );
}
