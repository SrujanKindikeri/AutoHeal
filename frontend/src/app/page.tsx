"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getFriends, getIncomingRequests, acceptFriendRequest, rejectFriendRequest } from "@/lib/socialApi";
import { Friendship, FriendRequest } from "@/types/social";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Button,
  IconButton,
  MediaCard,
  SectionHeader,
  GlassPanel,
  EmptyState,
  Badge,
  Avatar,
  AvatarGroup,
  Modal,
  useToast,
} from "@/components/ui";
import {
  Film,
  Music,
  Video,
  Radio,
  Users,
  Play,
  Plus,
  Check,
  Sparkles,
  Clock,
  ChevronRight,
  ShieldCheck,
  Tv,
  Headphones,
  UserPlus,
  Copy,
} from "lucide-react";

// Curated Entertainment Catalog Data for Discovery
const POPULAR_MOVIES = [
  {
    id: "m-1",
    title: "Dune: Part Two",
    subtitle: "Denis Villeneuve",
    year: "2024",
    duration: "2h 46m",
    artworkUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
    type: "movie" as const,
    aspectRatio: "poster" as const,
    badges: ["4K HDR", "Spatial Audio"],
  },
  {
    id: "m-2",
    title: "Oppenheimer",
    subtitle: "Christopher Nolan",
    year: "2023",
    duration: "3h 00m",
    artworkUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop",
    type: "movie" as const,
    aspectRatio: "poster" as const,
    badges: ["IMAX", "Dolby Atmos"],
  },
  {
    id: "m-3",
    title: "Interstellar",
    subtitle: "Christopher Nolan",
    year: "2014",
    duration: "2h 49m",
    artworkUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    type: "movie" as const,
    aspectRatio: "poster" as const,
    badges: ["4K HDR", "Spatial Audio"],
  },
  {
    id: "m-4",
    title: "Blade Runner 2049",
    subtitle: "Denis Villeneuve",
    year: "2017",
    duration: "2h 44m",
    artworkUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    type: "movie" as const,
    aspectRatio: "poster" as const,
    badges: ["4K", "Dolby Vision"],
  },
];

const POPULAR_SHOWS = [
  {
    id: "s-1",
    title: "Severance",
    subtitle: "Season 2",
    year: "2024",
    duration: "10 Episodes",
    artworkUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop",
    type: "show" as const,
    aspectRatio: "backdrop" as const,
    badges: ["Apple Original", "4K HDR"],
  },
  {
    id: "s-2",
    title: "Foundation",
    subtitle: "Season 2",
    year: "2023",
    duration: "10 Episodes",
    artworkUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    type: "show" as const,
    aspectRatio: "backdrop" as const,
    badges: ["Sci-Fi", "Spatial Audio"],
  },
  {
    id: "s-3",
    title: "The Last of Us",
    subtitle: "Season 1",
    year: "2023",
    duration: "9 Episodes",
    artworkUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",
    type: "show" as const,
    aspectRatio: "backdrop" as const,
    badges: ["Drama", "4K"],
  },
];

const MUSIC_RECOMMENDATIONS = [
  {
    id: "a-1",
    title: "After Hours",
    subtitle: "The Weeknd",
    year: "2020",
    duration: "14 Songs",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop",
    type: "music" as const,
    aspectRatio: "square" as const,
    badges: ["Lossless", "Dolby Atmos"],
  },
  {
    id: "a-2",
    title: "Random Access Memories",
    subtitle: "Daft Punk",
    year: "2013",
    duration: "13 Songs",
    artworkUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
    type: "music" as const,
    aspectRatio: "square" as const,
    badges: ["Hi-Res", "Spatial Audio"],
  },
  {
    id: "a-3",
    title: "Blonde",
    subtitle: "Frank Ocean",
    year: "2016",
    duration: "17 Songs",
    artworkUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop",
    type: "music" as const,
    aspectRatio: "square" as const,
    badges: ["Contemporary", "Lossless"],
  },
  {
    id: "a-4",
    title: "Currents",
    subtitle: "Tame Impala",
    year: "2015",
    duration: "13 Songs",
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
    type: "music" as const,
    aspectRatio: "square" as const,
    badges: ["Psychedelic", "Spatial"],
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { success, error: toastError, info } = useToast();

  // Social data from Phase 3 backend
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);

  // Room creation modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomType, setRoomType] = useState<"watch" | "listen">("watch");
  const [roomName, setRoomName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Watchlist tracker
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});

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

  const handleToggleWatchlist = (mediaId: string, title: string) => {
    const nextState = !watchlist[mediaId];
    setWatchlist((prev) => ({ ...prev, [mediaId]: nextState }));
    if (nextState) {
      success(`Added "${title}" to your Watchlist`);
    } else {
      info(`Removed "${title}" from Watchlist`);
    }
  };

  const handleAcceptRequest = async (requestId: string, senderName: string) => {
    try {
      await acceptFriendRequest(requestId);
      success(`You are now friends with ${senderName}!`);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      const updatedFriends = await getFriends();
      setFriends(updatedFriends);
    } catch (err: any) {
      toastError(err.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      info("Declined friend request");
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      toastError(err.message || "Failed to decline request");
    }
  };

  const handleOpenRoomModal = (type: "watch" | "listen") => {
    setRoomType(type);
    setRoomName(type === "watch" ? "Friday Night Premiere" : "Late Night Listening Lounge");
    setRoomModalOpen(true);
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomModalOpen(false);
    success(
      `Created ${roomType === "watch" ? "Watch Room" : "Listening Room"} "${roomName}" with ${
        selectedFriends.length
      } invited friend(s)!`
    );
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

        {/* 2. Featured Entertainment Showcase (Apple TV Style Cinematic Hero) */}
        <section aria-label="Featured Feature" className="relative">
          <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl overflow-hidden border border-border-glass shadow-glass-elevated group">
            {/* Background Artwork */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop"
              alt="Dune: Part Two Featured Spotlight"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-background via-surface-background/60 to-transparent sm:bg-gradient-to-r sm:from-surface-background sm:via-surface-background/70 sm:to-transparent" />

            {/* Content Overlay */}
            <div className="absolute inset-0 p-6 sm:p-12 flex flex-col justify-end max-w-2xl space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" size="sm">
                  Apple TV Spotlight
                </Badge>
                <Badge variant="glass" size="sm">
                  4K HDR
                </Badge>
                <Badge variant="glass" size="sm">
                  Spatial Audio
                </Badge>
              </div>

              <div className="space-y-2">
                <h2 className="text-display-lg sm:text-display-xl font-black text-white tracking-tight leading-none">
                  Dune: Part Two
                </h2>
                <p className="text-body-sm sm:text-body-md text-content-secondary line-clamp-3 leading-relaxed">
                  Paul Atreides unites with Chani and the Fremen while seeking revenge against the
                  conspirators who destroyed his family. Facing a choice between the love of his
                  life and the fate of the known universe, he endeavors to prevent a terrible
                  future.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Video className="w-5 h-5" />}
                  onClick={() => handleOpenRoomModal("watch")}
                >
                  Start Watch Party
                </Button>

                <Button
                  variant="glass"
                  size="lg"
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                  onClick={() => info("Playing trailer for Dune: Part Two")}
                >
                  Trailer
                </Button>

                <Button
                  variant="subtle"
                  size="lg"
                  leftIcon={
                    watchlist["m-1"] ? (
                      <Check className="w-4 h-4 text-accent-emerald" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )
                  }
                  onClick={() => handleToggleWatchlist("m-1", "Dune: Part Two")}
                >
                  {watchlist["m-1"] ? "In Watchlist" : "Add to Watchlist"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Quick Actions: Create Watch or Listening Rooms */}
        <section aria-label="Quick Actions">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassPanel
              surface="interactive"
              onClick={() => handleOpenRoomModal("watch")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-blue/15 text-accent-blue flex items-center justify-center border border-accent-blue/20 shadow-md">
                  <Tv className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-blue transition-colors">
                    Watch Together
                  </div>
                  <div className="text-caption text-content-muted">
                    Sync movies with friends & FaceTime video
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
                <div className="w-12 h-12 rounded-2xl bg-accent-pink/15 text-accent-pink flex items-center justify-center border border-accent-pink/20 shadow-md">
                  <Headphones className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-pink transition-colors">
                    Listen Together
                  </div>
                  <div className="text-caption text-content-muted">
                    Shared queue, lossless audio & voice chat
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>

            <GlassPanel
              surface="interactive"
              onClick={() => router.push("/friends?tab=search")}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/15 text-accent-purple flex items-center justify-center border border-accent-purple/20 shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-body-md font-bold text-content-primary group-hover:text-accent-purple transition-colors">
                    Find Friends
                  </div>
                  <div className="text-caption text-content-muted">
                    Discover people by MovieFlow ID or username
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-1" />
            </GlassPanel>
          </div>
        </section>

        {/* 4. Friends & Social Activity Widget (Real Phase 3 Data) */}
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

            {/* Friends List or Real Empty State */}
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

        {/* 5. Continue Watching Section (Real Empty State when user has no watch history) */}
        <section aria-label="Continue Watching" className="space-y-4">
          <SectionHeader
            title="Continue Watching"
            subtitle="Pick up where you left off"
            icon={<Play className="w-5 h-5 fill-current" />}
          />
          <EmptyState
            icon={<Film className="w-7 h-7 text-accent-blue" />}
            title="No in-progress movies or shows"
            description="Titles you start watching will appear here so you can easily resume playback anytime."
            action={{
              label: "Explore Popular Movies",
              onClick: () => {
                const el = document.getElementById("popular-movies");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              },
            }}
          />
        </section>

        {/* 6. Popular Movies (Curated High-Res Media Cards) */}
        <section id="popular-movies" aria-label="Popular Movies" className="space-y-4">
          <SectionHeader
            title="Popular Movies"
            subtitle="Trending cinematic features available for synchronized viewing"
            icon={<Film className="w-5 h-5" />}
            action={{
              label: "See All",
              href: "/movies",
            }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {POPULAR_MOVIES.map((movie) => (
              <MediaCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                subtitle={movie.subtitle}
                year={movie.year}
                duration={movie.duration}
                artworkUrl={movie.artworkUrl}
                aspectRatio={movie.aspectRatio}
                badges={movie.badges}
                isInWatchlist={Boolean(watchlist[movie.id])}
                onPlay={() => handleOpenRoomModal("watch")}
                onToggleWatchlist={() => handleToggleWatchlist(movie.id, movie.title)}
              />
            ))}
          </div>
        </section>

        {/* 7. Popular Shows Section */}
        <section aria-label="Popular Shows" className="space-y-4">
          <SectionHeader
            title="Trending Series"
            subtitle="Binge together in synchronized group watch rooms"
            icon={<Tv className="w-5 h-5" />}
            action={{
              label: "See All",
              href: "/shows",
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {POPULAR_SHOWS.map((show) => (
              <MediaCard
                key={show.id}
                id={show.id}
                title={show.title}
                subtitle={show.subtitle}
                year={show.year}
                duration={show.duration}
                artworkUrl={show.artworkUrl}
                aspectRatio={show.aspectRatio}
                badges={show.badges}
                isInWatchlist={Boolean(watchlist[show.id])}
                onPlay={() => handleOpenRoomModal("watch")}
                onToggleWatchlist={() => handleToggleWatchlist(show.id, show.title)}
              />
            ))}
          </div>
        </section>

        {/* 8. Recently Played (Real Empty State when user has no audio history) */}
        <section aria-label="Recently Played" className="space-y-4">
          <SectionHeader
            title="Recently Played"
            subtitle="Your recent audio listening history"
            icon={<Clock className="w-5 h-5" />}
          />
          <EmptyState
            icon={<Music className="w-7 h-7 text-accent-pink" />}
            title="No music played yet"
            description="Albums and tracks you listen to in group rooms or solo sessions will appear here."
            action={{
              label: "Explore Music Recommendations",
              onClick: () => {
                const el = document.getElementById("music-recommendations");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              },
            }}
          />
        </section>

        {/* 9. Music Recommendations Section */}
        <section id="music-recommendations" aria-label="Music Recommendations" className="space-y-4">
          <SectionHeader
            title="Music Recommendations"
            subtitle="High-fidelity audio curated for synchronized listening rooms"
            icon={<Music className="w-5 h-5" />}
            action={{
              label: "See All",
              onClick: () => info("Opening Apple Music catalog"),
            }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {MUSIC_RECOMMENDATIONS.map((album) => (
              <MediaCard
                key={album.id}
                id={album.id}
                title={album.title}
                subtitle={album.subtitle}
                year={album.year}
                duration={album.duration}
                artworkUrl={album.artworkUrl}
                aspectRatio={album.aspectRatio}
                badges={album.badges}
                type="music"
                isInWatchlist={Boolean(watchlist[album.id])}
                onPlay={() => handleOpenRoomModal("listen")}
                onToggleWatchlist={() => handleToggleWatchlist(album.id, album.title)}
              />
            ))}
          </div>
        </section>

        {/* 10. Upcoming Shared Rooms Section */}
        <section aria-label="Upcoming Rooms" className="space-y-4">
          <SectionHeader
            title="Upcoming Rooms"
            subtitle="Synchronized watch and listen parties scheduled with friends"
            icon={<Radio className="w-5 h-5" />}
            action={{
              label: "Create Room",
              onClick: () => handleOpenRoomModal("watch"),
            }}
          />
          <EmptyState
            icon={<Radio className="w-7 h-7 text-accent-purple" />}
            title="No scheduled shared sessions"
            description="You don't have any upcoming watch or listen rooms scheduled. Start a session and invite your friends!"
            action={{
              label: "Create Room",
              onClick: () => handleOpenRoomModal("watch"),
            }}
          />
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
              placeholder="e.g. Dune Premiere Night"
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
                          ? "bg-accent-blue/15 border-accent-blue/30 text-white"
                          : "bg-surface-primary border-border-subtle text-content-secondary hover:text-content-primary hover:bg-white/[0.04]"
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
            <Button type="submit" variant="primary">
              Launch Room
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
