"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { updateProfileMe, getProfileMe } from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
import {
  Film,
  Music,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Camera,
  Calendar,
} from "lucide-react";

const MOVIE_GENRES = [
  "Action",
  "Sci-Fi",
  "Drama",
  "Comedy",
  "Thriller",
  "Animation",
  "Horror",
  "Romance",
  "Documentary",
  "Mystery",
  "Adventure",
  "Fantasy",
];

const MUSIC_GENRES = [
  "Electronic",
  "Hip-Hop",
  "Pop",
  "Rock",
  "R&B",
  "Jazz",
  "Classical",
  "Ambient",
  "Indie",
  "Alternative",
  "House",
  "Soul",
];

const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, initAuth } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [selectedMovieGenres, setSelectedMovieGenres] = useState<string[]>([]);
  const [selectedMusicGenres, setSelectedMusicGenres] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user) {
      setFullName(user.full_name || "");
      if (user.profile) {
        setBio(user.profile.bio || "");
        setSelectedAvatar(user.profile.avatar_url || AVATAR_OPTIONS[0]);
        setSelectedMovieGenres(user.profile.preferred_movie_genres || []);
        setSelectedMusicGenres(user.profile.preferred_music_genres || []);
        setDateOfBirth(user.profile.date_of_birth || "");
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  const toggleMovieGenre = (genre: string) => {
    setSelectedMovieGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleMusicGenre = (genre: string) => {
    setSelectedMusicGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedMovieGenres.length === 0 && selectedMusicGenres.length === 0) {
      setError("Please select at least one movie or music genre to personalize your feed.");
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await updateProfileMe({
        full_name: fullName,
        bio: bio.trim(),
        avatar_url: selectedAvatar,
        preferred_movie_genres: selectedMovieGenres,
        preferred_music_genres: selectedMusicGenres,
        date_of_birth: dateOfBirth || null,
      });

      updateUser(updatedUser);
      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-content-primary">
        <div className="text-xs text-content-muted">Loading profile setup...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-content-primary">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-purple-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 2 of Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-content-primary">
            Personalize Your Entertainment
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary max-w-lg mx-auto">
            Choose your avatar, entertainment tastes, and preferences. Complete this step to unlock MovieFlow rooms.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Identity & Avatar */}
          <div className="p-6 rounded-3xl apple-glass-card space-y-6">
            <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider font-mono">
              1. Choose an Avatar & Bio
            </h2>

            {/* Avatar picker */}
            <div className="space-y-2">
              <label className="text-xs text-content-secondary">Select Avatar</label>
              <div className="flex flex-wrap items-center gap-3">
                {AVATAR_OPTIONS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                      selectedAvatar === url
                        ? "border-accent-blue ring-4 ring-accent-blue/20 scale-105"
                        : "border-border-glass hover:border-border-strong"
                    }`}
                  >
                    <img src={url} alt={`Avatar option ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-content-secondary">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-xs focus:outline-none focus:border-accent-blue transition-colors"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-secondary">Date of Birth (Optional)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-content-muted absolute left-3.5 top-3" />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-xs focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-content-secondary">Bio</label>
                <span className="text-[10px] text-content-muted font-mono">{bio.length}/500</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Tell friends what movies, directors, or artists you love..."
                className="w-full px-4 py-2.5 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-xs focus:outline-none focus:border-accent-blue transition-colors resize-none"
              />
            </div>
          </div>

          {/* Movie Genres */}
          <div className="p-6 rounded-3xl apple-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-accent-blue" />
                <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider font-mono">
                  2. Preferred Movie Genres
                </h2>
              </div>
              <span className="text-xs text-accent-blue font-medium font-mono">
                {selectedMovieGenres.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MOVIE_GENRES.map((genre) => {
                const selected = selectedMovieGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleMovieGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selected
                        ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20 scale-105"
                        : "bg-surface-primary border border-border-glass text-content-secondary hover:text-content-primary hover:bg-surface-primary/70"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music Genres */}
          <div className="p-6 rounded-3xl apple-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-600" />
                <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider font-mono">
                  3. Preferred Music Genres
                </h2>
              </div>
              <span className="text-xs text-pink-600 font-medium font-mono">
                {selectedMusicGenres.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MUSIC_GENRES.map((genre) => {
                const selected = selectedMusicGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleMusicGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selected
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105"
                        : "bg-surface-primary border border-border-glass text-content-secondary hover:text-content-primary hover:bg-surface-primary/70"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-accent-blue/20 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save & Continue to Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
