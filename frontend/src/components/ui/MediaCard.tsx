"use client";

import React, { useState } from "react";
import { Play, Plus, Check, MoreVertical, Heart } from "lucide-react";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import { Skeleton } from "./Skeleton";

export type MediaAspectRatio = "poster" | "backdrop" | "square";

export interface MediaCardProps {
  id: string;
  title: string;
  subtitle?: string; // artist, director, or release year
  artworkUrl: string;
  type?: "movie" | "show" | "music" | "playlist";
  aspectRatio?: MediaAspectRatio;
  year?: string | number;
  duration?: string;
  rating?: string;
  badges?: string[]; // e.g. ["4K", "HDR", "Dolby Atmos"]
  isInWatchlist?: boolean;
  onPlay?: () => void;
  onToggleWatchlist?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const aspectStyles: Record<MediaAspectRatio, string> = {
  poster: "aspect-[2/3]",
  backdrop: "aspect-video",
  square: "aspect-square",
};

export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  title,
  subtitle,
  artworkUrl,
  type = "movie",
  aspectRatio = "poster",
  year,
  duration,
  badges,
  isInWatchlist = false,
  onPlay,
  onToggleWatchlist,
  onClick,
  isLoading = false,
  className = "",
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [inList, setInList] = useState(isInWatchlist);

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton variant="rectangular" className={`w-full ${aspectStyles[aspectRatio]}`} />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" />
      </div>
    );
  }

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInList(!inList);
    if (onToggleWatchlist) onToggleWatchlist();
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) onPlay();
  };

  return (
    <div
      onClick={onClick}
      role="group"
      aria-label={`${title} (${subtitle || year || type})`}
      className={`group relative flex flex-col cursor-pointer transition-all duration-300 ${className}`}
    >
      {/* Artwork Container */}
      <div
        className={`relative w-full ${aspectStyles[aspectRatio]} overflow-hidden rounded-2xl sm:rounded-3xl bg-surface-primary border border-border-glass shadow-md group-hover:shadow-glass-elevated group-hover:border-border-strong transition-all duration-300`}
      >
        {/* Placeholder before load */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-surface-primary animate-pulse" />
        )}

        {/* Artwork Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkUrl}
          alt={title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Ambient Gradient Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5 sm:p-4">
          {/* Top Badges */}
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-wrap gap-1">
              {badges?.slice(0, 2).map((b) => (
                <span
                  key={b}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white/90 border border-white/10"
                >
                  {b}
                </span>
              ))}
            </div>

            {/* Quick Watchlist / Favorite Button */}
            <button
              onClick={handleWatchlistClick}
              aria-label={inList ? "Remove from watchlist" : "Add to watchlist"}
              className="p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/15 transition transform active:scale-90"
            >
              {inList ? (
                <Check className="w-3.5 h-3.5 text-accent-emerald" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Center Play Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={handlePlayClick}
              aria-label={`Play ${title}`}
              className="w-12 h-12 rounded-full bg-white text-content-primary flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition duration-300 hover:bg-accent-blue hover:text-white"
            >
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </button>
          </div>

          {/* Bottom quick meta */}
          <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
            <span>{year || (type === "music" ? "Track" : "Feature")}</span>
            {duration && <span>{duration}</span>}
          </div>
        </div>
      </div>

      {/* Title & Metadata (Clean Apple typography outside artwork) */}
      <div className="pt-2.5 space-y-0.5 text-left">
        <h4 className="text-body-md font-semibold text-content-primary truncate group-hover:text-accent-blue transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-body-sm text-content-muted truncate">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {subtitle && year && <span>•</span>}
          {year && <span>{year}</span>}
        </div>
      </div>
    </div>
  );
};
