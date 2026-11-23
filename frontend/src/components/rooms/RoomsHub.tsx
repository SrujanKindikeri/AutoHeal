"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Radio } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getMyRooms, type Room } from "@/lib/roomApi";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoomCard, Button, EmptyState } from "@/components/ui";

/**
 * RoomsHub — the Watch Together / Listen Together landing page. Lists the
 * authenticated user's real rooms of the given type (from getMyRooms) and links
 * into the room player. Replaces the previous "coming soon" placeholder that
 * rendered fake demo chat/reactions.
 */
export function RoomsHub({ roomType }: { roomType: "movie" | "music" }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const isWatch = roomType === "movie";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyRooms()
      .then((r) => setRooms(r.rooms.filter((rm) => rm.room_type === roomType)))
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, roomType]);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <PageHeader
            title={isWatch ? "Watch Together" : "Listen Together"}
            icon={
              isWatch ? (
                <Video className="w-5 h-5 text-accent-blue" />
              ) : (
                <Radio className="w-5 h-5 text-accent-pink" />
              )
            }
            description={
              isWatch
                ? "Watch movies in sync with friends in real time."
                : "Listen to music in sync with friends in real time."
            }
          />
          <EmptyState
            icon={
              isWatch ? (
                <Video className="w-7 h-7 text-accent-blue" />
              ) : (
                <Radio className="w-7 h-7 text-accent-pink" />
              )
            }
            title="Sign in to join or create a room"
            description={
              isWatch
                ? "Invite friends to a synchronized watch party for any movie."
                : "Invite friends to a synchronized listening room for any track."
            }
            action={{ label: "Sign In", onClick: () => router.push("/login") }}
            secondaryAction={{
              label: "Create Account",
              onClick: () => router.push("/register"),
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <PageHeader
          title={isWatch ? "Watch Together" : "Listen Together"}
          icon={
            isWatch ? (
              <Video className="w-5 h-5 text-accent-blue" />
            ) : (
              <Radio className="w-5 h-5 text-accent-pink" />
            )
          }
          description={
            isWatch
              ? "Host or join a synchronized movie room with friends."
              : "Host or join a synchronized listening room with friends."
          }
          actions={
            <Button variant="primary" size="sm" onClick={() => router.push("/")}>
              Create Room
            </Button>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl bg-surface-primary/60 border border-border-subtle animate-pulse h-32"
              />
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onOpen={(id) => router.push(`/rooms/${id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={
              isWatch ? (
                <Video className="w-7 h-7 text-accent-blue" />
              ) : (
                <Radio className="w-7 h-7 text-accent-pink" />
              )
            }
            title={isWatch ? "No watch rooms yet" : "No listening rooms yet"}
            description={
              isWatch
                ? "From Home, create a Watch Together room with one of your uploaded movies and invite friends to join in sync."
                : "From Home, create a Listen Together room with one of your uploaded tracks and invite friends to join in sync."
            }
            action={{ label: "Go to Home", onClick: () => router.push("/") }}
          />
        )}
      </div>
    </AppShell>
  );
}
