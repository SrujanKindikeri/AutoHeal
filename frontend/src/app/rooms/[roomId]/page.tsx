"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  Radio,
  Users,
  ArrowLeft,
  AlertCircle,
  LogOut,
  Crown,
  Film,
  Music,
} from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, Badge, Avatar, EmptyState } from "@/components/ui";
import {
  getRoom,
  joinRoom,
  leaveRoom,
  personalStreamUrl,
  type Room,
  type RoomParticipant,
} from "@/lib/roomApi";

/**
 * Fetches an authenticated media stream as a Blob URL. <video>/<audio> elements
 * cannot send the Bearer header, so we fetch the personal-upload stream with the
 * Authorization header (the backend authorizes it via room participation) and
 * hand the resulting Blob URL to the media element.
 */
async function fetchStreamBlob(url: string): Promise<string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("mf_access_token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401)
      throw new Error("Your session may have expired — refresh and reopen the room.");
    if (res.status === 403)
      throw new Error("You must be in the room to play this content.");
    if (res.status === 404) throw new Error("The media file is not available.");
    throw new Error(`Playback not available (status ${res.status}).`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

const STATUS_LABEL: Record<Room["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  waiting: "Waiting",
  live: "Live",
  ended: "Ended",
  cancelled: "Cancelled",
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = typeof params.roomId === "string" ? params.roomId : "";

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const blobRef = useRef<string | null>(null);

  // Load the room, ensure the viewer is joined (enables stream auth), then load
  // the bound personal-upload media.
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRoom(roomId)
      .then(async (r) => {
        if (cancelled) return;
        setRoom(r);
        // Ensure joined so the backend authorizes the stream. Host is already
        // joined; for public rooms this adds the viewer as a participant.
        try {
          const joined = await joinRoom(roomId);
          if (!cancelled) setRoom(joined);
        } catch {
          // Non-participants of private rooms can't reach here (getRoom 403'd).
        }
        const streamUrl = personalStreamUrl(r.content_type, r.content_id);
        if (streamUrl) {
          setMediaLoading(true);
          setMediaError(null);
          try {
            const url = await fetchStreamBlob(streamUrl);
            if (!cancelled) {
              if (blobRef.current) URL.revokeObjectURL(blobRef.current);
              blobRef.current = url;
              setMediaUrl(url);
            }
          } catch (err) {
            if (!cancelled)
              setMediaError(
                err instanceof Error ? err.message : "Playback unavailable."
              );
          } finally {
            if (!cancelled) setMediaLoading(false);
          }
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/rooms/${roomId}`)}`);
          return;
        }
        if (err?.status === 403) setError("You don't have access to this room.");
        else if (err?.status === 404) setError("This room no longer exists.");
        else setError(err?.message || "Failed to load the room.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [roomId, router]);

  // Refresh participants periodically so invited friends appear as they join.
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => {
      getRoom(roomId)
        .then((r) => setRoom(r))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [roomId]);

  const handleLeave = async () => {
    if (!roomId) return;
    setLeaving(true);
    try {
      await leaveRoom(roomId);
    } catch {
      // Leaving is best-effort; navigate home regardless.
    } finally {
      setLeaving(false);
      router.push("/");
    }
  };

  const isWatch = room?.room_type === "movie";
  const joinedParticipants: RoomParticipant[] =
    room?.participants.filter((p) => p.status === "joined") ?? [];
  const isPersonalContent =
    room?.content_type === "personal_movie" ||
    room?.content_type === "personal_track";

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-body-sm text-content-secondary hover:text-content-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {loading ? (
          <div className="rounded-3xl apple-glass-card border border-border-subtle p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-primary border border-border-glass text-accent-blue mx-auto flex items-center justify-center">
              {isWatch ? (
                <Video className="w-6 h-6 animate-pulse" />
              ) : (
                <Radio className="w-6 h-6 animate-pulse" />
              )}
            </div>
            <p className="text-body-sm text-content-muted">Loading room…</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="w-7 h-7 text-accent-coral" />}
            title="Couldn't open the room"
            description={error}
            action={{ label: "Go to Home", onClick: () => router.push("/") }}
          />
        ) : room ? (
          <>
            <PageHeader
              title={room.name}
              icon={
                isWatch ? (
                  <Video className="w-5 h-5 text-accent-blue" />
                ) : (
                  <Radio className="w-5 h-5 text-accent-pink" />
                )
              }
              description={
                isWatch ? "Watch Together room" : "Listen Together room"
              }
              actions={
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleLeave}
                  disabled={leaving}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  {leaving ? "Leaving…" : "Leave Room"}
                </Button>
              }
            />

            {/* Bound content + player */}
            <div className="rounded-3xl apple-glass-card border border-border-subtle p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shrink-0 ${
                      isWatch
                        ? "bg-accent-blue/15 text-accent-blue border-accent-blue/20"
                        : "bg-accent-pink/15 text-accent-pink border-accent-pink/20"
                    }`}
                  >
                    {isWatch ? <Film className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-body-md font-bold text-content-primary truncate">
                      {room.content_title || "No content bound"}
                    </div>
                    <div className="text-caption text-content-muted">
                      Host {room.host_username} · {STATUS_LABEL[room.status]}
                    </div>
                  </div>
                </div>
                <Badge variant={room.status === "live" ? "success" : "accent"} size="sm">
                  {STATUS_LABEL[room.status]}
                </Badge>
              </div>

              {isPersonalContent ? (
                <div className="space-y-2">
                  {mediaLoading ? (
                    <div className="rounded-2xl bg-surface-primary border border-border-subtle p-6 text-center text-body-sm text-content-muted">
                      Loading playback…
                    </div>
                  ) : mediaError ? (
                    <div className="rounded-2xl bg-accent-coral/5 border border-accent-coral/20 p-4 text-body-sm text-accent-coral flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{mediaError}</span>
                    </div>
                  ) : mediaUrl ? (
                    isWatch ? (
                      <video
                        src={mediaUrl}
                        controls
                        autoPlay
                        playsInline
                        className="w-full rounded-2xl bg-black aspect-video"
                      />
                    ) : (
                      <audio src={mediaUrl} controls autoPlay className="w-full" />
                    )
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl bg-surface-primary border border-border-subtle p-4 text-body-sm text-content-secondary">
                  In-room playback supports your personal uploads. This room
                  references catalog content that isn&apos;t playable in-room yet.{" "}
                  <Link href="/library/movies" className="text-accent-blue font-semibold hover:underline">
                    Browse your library
                  </Link>
                  .
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="rounded-3xl apple-glass-card border border-border-subtle p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-body-md font-bold text-content-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-content-muted" />
                  Participants
                </h2>
                <span className="text-caption text-content-muted">
                  {room.participant_count} joined
                </span>
              </div>
              {joinedParticipants.length > 0 ? (
                <div className="space-y-2">
                  {joinedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-xl bg-surface-primary/60 border border-border-subtle"
                    >
                      <Avatar
                        name={p.full_name || p.username}
                        size="sm"
                        src={p.avatar_url}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-body-sm font-semibold text-content-primary truncate flex items-center gap-1.5">
                          {p.full_name || p.username}
                          {p.role === "host" && (
                            <Crown className="w-3.5 h-3.5 text-accent-gold" />
                          )}
                        </div>
                        <div className="text-caption text-content-muted font-mono truncate">
                          {p.movieflow_id}
                        </div>
                      </div>
                      <Badge
                        variant={p.role === "host" ? "gold" : "default"}
                        size="sm"
                      >
                        {p.role === "host" ? "Host" : p.role === "co_host" ? "Co-Host" : "Guest"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-content-muted">
                  No one has joined yet. Friends you invited will appear here as they join.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
