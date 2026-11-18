"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { TMDBMovie, TMDBTVShow } from "@/types/entertainment";

interface MediaCardProps {
  item: TMDBMovie | TMDBTVShow;
  mediaType: "movie" | "tv";
  onClick?: () => void;
}

function getTitle(item: TMDBMovie | TMDBTVShow): string {
  return "title" in item ? item.title : item.name;
}

function getReleaseYear(item: TMDBMovie | TMDBTVShow): string | null {
  const raw = "release_date" in item ? item.release_date : item.first_air_date;
  if (!raw) return null;
  return raw.slice(0, 4);
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  mediaType,
  onClick,
}) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const title = getTitle(item);
  const year = getReleaseYear(item);
  const posterUrl = item.poster_url;
  const detailPath = mediaType === "movie" ? `/movies/${item.id}` : `/shows/${item.id}`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(detailPath);
    }
  };

  const showPlaceholder = !posterUrl || imageError;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label={`${title}${year ? `, ${year}` : ""}`}
      className="group relative flex flex-col cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-background rounded-2xl"
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl bg-surface-primary border border-border-glass shadow-md group-hover:shadow-glass-elevated group-hover:border-white/[0.18] transition-all duration-300">
        {showPlaceholder ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-elevated to-surface-secondary">
            <span className="text-5xl font-semibold text-content-muted select-none">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <Image
            src={posterUrl!}
            alt={title}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 180px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}

        {/* Hover overlay with overview */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          {item.overview && (
            <p className="text-body-sm text-white/85 line-clamp-3 leading-snug">
              {item.overview}
            </p>
          )}
        </div>

        {/* Rating badge */}
        {item.vote_average > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
            <Star className="w-3 h-3 text-accent-gold fill-accent-gold" />
            <span className="text-caption font-semibold text-white">
              {item.vote_average.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Title & year */}
      <div className="pt-2.5 space-y-0.5 text-left">
        <h4 className="text-body-md font-semibold text-content-primary truncate group-hover:text-accent-blue transition-colors">
          {title}
        </h4>
        {year && (
          <p className="text-body-sm text-content-muted">{year}</p>
        )}
      </div>
    </div>
  );
};
