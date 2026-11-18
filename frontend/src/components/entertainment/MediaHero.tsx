"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Calendar } from "lucide-react";
import type { TMDBMovie, TMDBTVShow } from "@/types/entertainment";
import { Button } from "@/components/ui/Button";

interface MediaHeroProps {
  item: TMDBMovie | TMDBTVShow;
  mediaType: "movie" | "tv";
}

function getTitle(item: TMDBMovie | TMDBTVShow): string {
  return "title" in item ? item.title : item.name;
}

function getReleaseYear(item: TMDBMovie | TMDBTVShow): string | null {
  const raw = "release_date" in item ? item.release_date : item.first_air_date;
  if (!raw) return null;
  return raw.slice(0, 4);
}

export const MediaHero: React.FC<MediaHeroProps> = ({ item, mediaType }) => {
  const [imageError, setImageError] = useState(false);

  const title = getTitle(item);
  const year = getReleaseYear(item);
  const backdropUrl = item.backdrop_url;
  const detailPath = mediaType === "movie" ? `/movies/${item.id}` : `/shows/${item.id}`;
  const showBackdrop = !!backdropUrl && !imageError;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl" style={{ minHeight: "420px" }}>
      {/* Background */}
      {showBackdrop ? (
        <Image
          src={backdropUrl!}
          alt={`${title} backdrop`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Fallback gradient using existing color tokens */
        <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-surface-secondary to-surface-primary" />
      )}

      {/* Left-to-right gradient so text stays legible */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      {/* Bottom fade for safety on small viewports */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-10 lg:p-14" style={{ minHeight: "420px" }}>
        <div className="max-w-xl space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            {item.vote_average > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-body-sm font-semibold text-white">
                <Star className="w-3.5 h-3.5 text-accent-gold fill-accent-gold" />
                {item.vote_average.toFixed(1)}
              </span>
            )}
            {year && (
              <span className="inline-flex items-center gap-1.5 text-body-sm text-white/70">
                <Calendar className="w-3.5 h-3.5" />
                {year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-heading-xl sm:text-display-lg font-semibold text-white leading-tight">
            {title}
          </h1>

          {/* Overview */}
          {item.overview && (
            <p className="text-body-lg text-white/75 line-clamp-2 leading-relaxed">
              {item.overview}
            </p>
          )}

          {/* CTA */}
          <Link href={detailPath}>
            <Button variant="primary" size="lg">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
