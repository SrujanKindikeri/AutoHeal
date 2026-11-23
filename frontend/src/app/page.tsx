"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getFriends, getIncomingRequests, acceptFriendRequest, rejectFriendRequest } from "@/lib/socialApi";
import { getTrendingMovies, getTrendingTV } from "@/lib/entertainmentApi";
import { createRoom, inviteToRoom, getMyRooms } from "@/lib/roomApi";
import type { Room } from "@/lib/roomApi";
import { getUploadedMovies, getUploadedTracks } from "@/lib/libraryApi";
import type { UploadedMovie, UploadedTrack } from "@/lib/libraryApi";
import { Friendship, FriendRequest } from "@/types/social";
import { TMDBMovie, TMDBTVShow } from "@/types/entertainment";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Button,
  MediaCard,
  SectionHeader,
  GlassPanel,
  EmptyState,
  Badge,
  Avatar,
  Modal,
  RoomCard,
  useToast,
} from "@/components/ui";
import {
  Film,
  Music,
  Video,
  Radio,
  Users,
  Check,
  Sparkles,
  Clock,
  ChevronRight,
  ShieldCheck,
  Tv,
  Headphones,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { success, error: toastError, info } = useToast();

  // Social data
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);

  // Entertainment data from real backend APIs
  const [trendingMovies, setTrendingMovies] = useState<TMDBMovie[]>([]);
  const [trendingShows, setTrendingShows] = useState<TMDBTVShow[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [loadingShows, setLoadingShows] = useState(false);

  // Room creation modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomType, setRoomType] = useState<"watch" | "listen">("watch");
  const [roomName, setRoomName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Real media to bind the room to (the user's personal uploads). The room's
  // content_id MUST be the real media id, not the room name, so the backend can
  // authorize playback for room participants.
  const [uploadedMovies, setUploadedMovies] = useState<UploadedMovie[]>([]);
  const [uploadedTracks, setUploadedTracks] = useState<UploadedTrack[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedContent, setSelectedContent] = useState<
    | { id: string; title: string; artwork: string | null; kind: "movie" | "track" }
    | null
  >(null);

  // The user's real rooms — drives the "Upcoming Rooms" section (getMyRooms).
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Dynamic time-of-day greeting
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Fetch real friends and incoming requests
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingSocial(true);
      Promise.all([
        getFriends().catch(() => []),
        getIncomingRequests().catch(() => []),
      ])
        .then(([f, reqs]) => {
          setFriends(f);
          setIncomingRequests(reqs);
        })
        .finally(() => setLoadingSocial(false));
    }
  }, [isAuthenticated]);

  // Fetch trending movies and TV from real backend (TMDB-backed)
  useEffect(() => {
    setLoadingMovies(true);
    getTrendingMovies(1)
      .then((res) => setTrendingMovies(res.results.slice(0, 4)))
      .catch(() => setTrendingMovies([]))
      .finally(() => setLoadingMovies(false));

    setLoadingShows(true);
    getTrendingTV(1)
      .then((res) => setTrendingShows(res.results.slice(0, 3)))
      .catch(() => setTrendingShows([]))
      .finally(() => setLoadingShows(false));
  }, []);

  // Fetch the user's personal uploads (to bind real media to rooms) and the
  // rooms they belong to (drives "Upcoming Rooms"). Both degrade to empty on
  // failure so the page never crashes on a failed social/library fetch.
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingLibrary(true);
    Promise.all([
      getUploadedMovies().then((r) => r.movies).catch(() => []),
      getUploadedTracks().then((r) => r.tracks).catch(() => []),
    ])
      .then(([m, t]) => {
        setUploadedMovies(m);
        setUploadedTracks(t);
      })
      .finally(() => setLoadingLibrary(false));

    setLoadingRooms(true);
    getMyRooms()
      .then((r) => setMyRooms(r.rooms))
      .catch(() => setMyRooms([]))
      .finally(() => setLoadingRooms(false));
  }, [isAuthenticated]);

  const handleAcceptRequest = async (requestId: string, senderName: string) => {
    try {
      await acceptFriendRequest(requestId);
      success(`You are now friends with ${senderName}!`);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      const updatedFriends = await getFriends();
      setFriends(updatedFriends);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      info("Declined friend request");
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to decline request");
    }
  };

  const handleOpenRoomModal = (type: "watch" | "listen") => {
    setRoomType(type);
    setRoomName(type === "watch" ? "Friday Night Premiere" : "Late Night Listening Lounge");
    setSelectedContent(null);
    setRoomModalOpen(true);
  };

  // Create a real Watch/Listen room bound to the selected personal upload, invite
  // the selected friends, then route the host straight into the room. Replaces
  // the previous flow that set content_id to the room name (so the room could
  // never play anything) and only showed a success toast (so the host could never
  // reach the room).
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) {
      toastError("Select a movie or track for the room to play.");
      return;
    }
    try {
      const room = await createRoom({
        name: roomName,
        roomType: roomType === "watch" ? "movie" : "music",
        contentId: selectedContent.id,
        contentType: roomType === "watch" ? "personal_movie" : "personal_track",
        contentTitle: selectedContent.title,
        contentArtworkUrl: selectedContent.artwork || "",
        playbackProvider: "personal",
      });
      let invited = 0;
      for (const friendId of selectedFriends) {
        try {
          await inviteToRoom(room.id, friendId);
          invited += 1;
        } catch {
          // A single failed invitation should not block the room creation.
        }
      }
      setRoomModalOpen(false);
      setSelectedFriends([]);
      setSelectedContent(null);
      // Route the host into the room so the created room is reachable, not just
      // a toast that leaves them on Home.
      router.push(`/rooms/${room.id}`);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to create room");
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* 1. Personalized Greeting Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h1 className="text-heading-lg sm:text-heading-xl font-extrabold text-content-primary tracking-tight">
              {isAuthenticated && user
                ? `${greeting}, ${user.full_name || user.username}`
                : "Welcome to MovieFlow"}
            </h1>
            <p className="text-body-sm text-content-secondary">
              {isAuthenticated && user
                ? "Watch Together. Listen Together. Synchronized in real-time."
                : "Experience Apple-inspired cinematic movies, high-fidelity music, and synchronized rooms."}
            </p>
          </div>

          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="md">
                <span className="font-mono">{user.movieflow_id}</span>
              </Badge>
              {user.profile?.is_profile_completed ? (
                <Badge variant="success" size="md" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                  Verified Identity
                </Badge>
              ) : (
                <Link href="/complete-profile">
                  <Badge variant="warning" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    Setup Profile
                  </Badge>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 2. Quick Actions: Movies, Music, Rooms, Friends */}
        <section aria-label="Quick Actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <GlassPanel
              surface="interactive"
              onClick={() => router.push("/movies")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-blue/15 text-accent-blue flex items-center justify-center border border-accent-blue/20 shadow-md">
                  <Film className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-blue transition-colors">
                    Movies
                  </div>
                  <div className="text-caption text-content-muted">
                    Browse & discover films
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>

            <GlassPanel
              surface="interactive"
              onClick={() => router.push("/music")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-pink/15 text-accent-pink flex items-center justify-center border border-accent-pink/20 shadow-md">
                  <Music className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-pink transition-colors">
                    Music
                  </div>
                  <div className="text-caption text-content-muted">
                    Hi-fi albums & tracks
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>

            <GlassPanel
              surface="interactive"
              onClick={() => router.push("/friends")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/15 text-accent-purple flex items-center justify-center border border-accent-purple/20 shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-purple transition-colors">
                    Friends
                  </div>
                  <div className="text-caption text-content-muted">
                    Your social network
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>

            <GlassPanel
              surface="interactive"
              onClick={() => handleOpenRoomModal("watch")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-gold/15 text-accent-gold flex items-center justify-center border border-accent-gold/20 shadow-md">
                  <Tv className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-gold transition-colors">
                    Watch Room
                  </div>
                  <div className="text-caption text-content-muted">
                    Sync movies with friends
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>

            <GlassPanel
              surface="interactive"
              onClick={() => handleOpenRoomModal("listen")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center border border-accent-emerald/20 shadow-md">
                  <Headphones className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-emerald transition-colors">
                    Listen Room
                  </div>
                  <div className="text-caption text-content-muted">
                    Shared queue & voice chat
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>
          </div>
        </section>

        {/* 3. Friends & Social Activity Widget (Real Data) */}
        {isAuthenticated && (
          <section aria-label="Friends & Social Network" className="space-y-4">
            <SectionHeader
              title="Social & Friends Activity"
              subtitle="Connect and invite friends to shared entertainment sessions"
              icon={<Users className="w-5 h-5" />}
              action={{
                label: "Manage Friends",
                href: "/friends",
              }}
            />

            {/* Pending Requests Alert if any */}
            {incomingRequests.length > 0 && (
              <GlassPanel surface="card" className="p-4 border-accent-blue/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-body-sm font-bold text-accent-blue">
                    <Clock className="w-4 h-4" />
                    <span>Pending Friend Requests ({incomingRequests.length})</span>
                  </div>
                  <Link
                    href="/friends"
                    className="text-caption text-accent-blue hover:underline font-semibold"
                  >
                    View all &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incomingRequests.slice(0, 2).map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-2xl bg-surface-primary/80 border border-border-subtle flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={req.sender.full_name || req.sender.username}
                          size="sm"
                          src={req.sender.avatar_url}
                        />
                        <div className="min-w-0 text-left">
                          <div className="text-body-sm font-bold text-content-primary truncate">
                            {req.sender.full_name || req.sender.username}
                          </div>
                          <div className="text-caption text-content-muted font-mono truncate">
                            {req.sender.movieflow_id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleAcceptRequest(req.id, req.sender.username)
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => handleRejectRequest(req.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Friends List or Empty State */}
            {friends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {friends.slice(0, 4).map((f) => (
                  <GlassPanel
                    key={f.id}
                    surface="card"
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={f.friend.full_name || f.friend.username}
                        size="md"
                        src={f.friend.avatar_url}
                      />
                      <div className="min-w-0 text-left">
                        <div className="text-body-sm font-bold text-content-primary truncate">
                          {f.friend.full_name || f.friend.username}
                        </div>
                        <div className="text-caption text-content-muted font-mono truncate">
                          {f.friend.movieflow_id}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        handleOpenRoomModal("watch");
                        setSelectedFriends([f.friend.id]);
                      }}
                    >
                      Invite
                    </Button>
                  </GlassPanel>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="w-7 h-7 text-accent-blue" />}
                title="No friends added yet"
                description="Connect with other movie enthusiasts and music listeners by their MovieFlow ID or username."
                action={{
                  label: "Find Friends",
                  onClick: () => router.push("/friends?tab=search"),
                }}
              />
            )}
          </section>
        )}

        {/* 4. Trending Movies (Real TMDB data from backend) */}
        <section id="trending-movies" aria-label="Trending Movies" className="space-y-4">
          <SectionHeader
            title="Trending Movies"
            subtitle="What's popular right now — start a Watch Together party"
            icon={<Film className="w-5 h-5" />}
            action={{
              label: "See All",
              href: "/movies",
            }}
          />

          {loadingMovies ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-surface-primary/60 border border-border-subtle animate-pulse aspect-[2/3]"
                />
              ))}
            </div>
          ) : trendingMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {trendingMovies.map((movie) => (
                <MediaCard
                  key={movie.id}
                  id={String(movie.id)}
                  title={movie.title}
                  subtitle={new Date(movie.release_date || "").getFullYear().toString() || ""}
                  artworkUrl={movie.poster_url || movie.backdrop_url || ""}
                  aspectRatio="poster"
                  onPlay={() => handleOpenRoomModal("watch")}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Film className="w-7 h-7 text-accent-blue" />}
              title="No movies available"
              description="Browse or upload movies to get started."
              action={{
                label: "Browse Movies",
                onClick: () => router.push("/movies"),
              }}
            />
          )}
        </section>

        {/* 5. Trending Series (Real TMDB data from backend) */}
        <section aria-label="Trending Series" className="space-y-4">
          <SectionHeader
            title="Trending Series"
            subtitle="Binge together in synchronized group watch rooms"
            icon={<Tv className="w-5 h-5" />}
            action={{
              label: "See All",
              href: "/shows",
            }}
          />

          {loadingShows ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-surface-primary/60 border border-border-subtle animate-pulse aspect-video"
                />
              ))}
            </div>
          ) : trendingShows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {trendingShows.map((show) => (
                <MediaCard
                  key={show.id}
                  id={String(show.id)}
                  title={show.name}
                  subtitle={new Date(show.first_air_date || "").getFullYear().toString() || ""}
                  artworkUrl={show.backdrop_url || show.poster_url || ""}
                  aspectRatio="backdrop"
                  onPlay={() => handleOpenRoomModal("watch")}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Tv className="w-7 h-7 text-accent-purple" />}
              title="No shows available"
              description="TV shows from our catalog will appear here."
              action={{
                label: "Browse Shows",
                onClick: () => router.push("/shows"),
              }}
            />
          )}
        </section>

        {/* 6. Music section — link to music page */}
        <section aria-label="Music" className="space-y-4">
          <SectionHeader
            title="Music"
            subtitle="High-fidelity audio for synchronized listening rooms"
            icon={<Music className="w-5 h-5" />}
            action={{
              label: "Browse Music",
              href: "/music",
            }}
          />
          <EmptyState
            icon={<Music className="w-7 h-7 text-accent-pink" />}
            title="Discover music"
            description="Browse albums and tracks, or upload your own music to listen together with friends."
            action={{
              label: "Browse Music",
              onClick: () => router.push("/music"),
            }}
            secondaryAction={{
              label: "Create Playlist",
              onClick: () => router.push("/playlists"),
            }}
          />
        </section>

        {/* 7. Upcoming Shared Rooms — driven by the user's real rooms (getMyRooms) */}
        <section aria-label="Upcoming Rooms" className="space-y-4">
          <SectionHeader
            title="Upcoming Rooms"
            subtitle="Synchronized watch and listen parties you're hosting or in"
            icon={<Radio className="w-5 h-5" />}
            action={{
              label: "Create Room",
              onClick: () => handleOpenRoomModal("watch"),
            }}
          />
          {loadingRooms ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-surface-primary/60 border border-border-subtle animate-pulse h-32"
                />
              ))}
            </div>
          ) : myRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onOpen={(id) => router.push(`/rooms/${id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Radio className="w-7 h-7 text-accent-purple" />}
              title="No shared sessions yet"
              description="Start a Watch or Listen Together room and invite your friends to join in sync."
              action={{
                label: "Start Watching Together",
                onClick: () => handleOpenRoomModal("watch"),
              }}
              secondaryAction={{
                label: "Start Listening Together",
                onClick: () => handleOpenRoomModal("listen"),
              }}
            />
          )}
        </section>
      </div>

      {/* Room Creation Modal */}
      <Modal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title={roomType === "watch" ? "Create Watch Room" : "Create Listening Room"}
        description={
          roomType === "watch"
            ? "Launch a synchronized movie watch party with FaceTime-style video controls."
            : "Stream high-fidelity music with real-time shared queue and voice chat."
        }
        size="md"
      >
        <form onSubmit={handleCreateRoomSubmit} className="space-y-5 pt-2">
          {/* Room Name Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-body-sm font-semibold text-content-secondary">
              Room Title
            </label>
            <input
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-primary border border-border-glass text-body-md text-content-primary focus:border-accent-blue outline-none transition"
              placeholder="e.g. Friday Night Premiere"
            />
          </div>

          {/* Type Toggle */}
          <div className="space-y-1.5 text-left">
            <label className="text-body-sm font-semibold text-content-secondary">
              Room Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoomType("watch")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-body-sm font-semibold transition border ${
                  roomType === "watch"
                    ? "bg-accent-blue text-white border-transparent shadow-md shadow-blue-500/20"
                    : "bg-surface-primary text-content-secondary border-border-subtle hover:text-content-primary"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Watch Party</span>
              </button>

              <button
                type="button"
                onClick={() => setRoomType("listen")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-body-sm font-semibold transition border ${
                  roomType === "listen"
                    ? "bg-accent-pink text-white border-transparent shadow-md shadow-pink-500/20"
                    : "bg-surface-primary text-content-secondary border-border-subtle hover:text-content-primary"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Listening Room</span>
              </button>
            </div>
          </div>

          {/* Select the real media the room will play */}
          <div className="space-y-1.5 text-left">
            <label className="text-body-sm font-semibold text-content-secondary">
              {roomType === "watch" ? "Select a Movie to Watch" : "Select a Track to Play"}
            </label>
            {loadingLibrary ? (
              <div className="py-3 text-caption text-content-muted">Loading your library…</div>
            ) : roomType === "watch" ? (
              uploadedMovies.length > 0 ? (
                <div className="max-h-44 overflow-y-auto space-y-1.5 no-scrollbar p-1">
                  {uploadedMovies.map((m) => {
                    const isSelected = selectedContent?.id === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() =>
                          setSelectedContent({
                            id: m.id,
                            title: m.title,
                            artwork: m.poster_url,
                            kind: "movie",
                          })
                        }
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition select-none ${
                          isSelected
                            ? "bg-accent-blue/15 border-accent-blue/30"
                            : "bg-surface-primary border-border-subtle hover:bg-black/[0.04]"
                        }`}
                      >
                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center">
                          {m.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.poster_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-4 h-4 text-content-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-body-sm font-semibold text-content-primary truncate">
                            {m.title}
                          </div>
                          {m.release_year ? (
                            <div className="text-caption text-content-muted">{m.release_year}</div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center rounded-xl bg-surface-primary border border-border-subtle text-caption text-content-muted">
                  You have no uploaded movies.{" "}
                  <Link href="/library/movies" className="text-accent-blue font-semibold hover:underline">
                    Upload a movie
                  </Link>{" "}
                  to start a Watch Together room.
                </div>
              )
            ) : uploadedTracks.length > 0 ? (
              <div className="max-h-44 overflow-y-auto space-y-1.5 no-scrollbar p-1">
                {uploadedTracks.map((t) => {
                  const isSelected = selectedContent?.id === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() =>
                        setSelectedContent({
                          id: t.id,
                          title: t.track_name,
                          artwork: t.cover_url,
                          kind: "track",
                        })
                      }
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition select-none ${
                        isSelected
                          ? "bg-accent-pink/15 border-accent-pink/30"
                          : "bg-surface-primary border-border-subtle hover:bg-black/[0.04]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center">
                        {t.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-4 h-4 text-content-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-body-sm font-semibold text-content-primary truncate">
                          {t.track_name}
                        </div>
                        {t.artist ? (
                          <div className="text-caption text-content-muted truncate">{t.artist}</div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-surface-primary border border-border-subtle text-caption text-content-muted">
                You have no uploaded tracks.{" "}
                <Link href="/library/music" className="text-accent-pink font-semibold hover:underline">
                  Upload music
                </Link>{" "}
                to start a Listen Together room.
              </div>
            )}
          </div>

          {/* Invite Real Friends */}
          <div className="space-y-1.5 text-left">
            <label className="text-body-sm font-semibold text-content-secondary">
              Invite Friends ({friends.length} available)
            </label>
            {friends.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar p-1">
                {friends.map((f) => {
                  const isSelected = selectedFriends.includes(f.friend.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFriends((prev) =>
                            prev.filter((id) => id !== f.friend.id)
                          );
                        } else {
                          setSelectedFriends((prev) => [...prev, f.friend.id]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-accent-blue/15 border-accent-blue/30 text-content-primary"
                          : "bg-surface-primary border-border-subtle text-content-secondary hover:text-content-primary hover:bg-black/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={f.friend.full_name || f.friend.username}
                          size="xs"
                          src={f.friend.avatar_url}
                        />
                        <span className="text-body-sm font-medium truncate">
                          {f.friend.full_name || f.friend.username}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected
                            ? "bg-accent-blue border-transparent text-white"
                            : "border-border-strong text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-surface-primary border border-border-subtle text-caption text-content-muted">
                No friends added yet. You can invite friends after connecting in the Friends hub.
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="subtle"
              onClick={() => setRoomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!selectedContent}>
              Launch Room
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
