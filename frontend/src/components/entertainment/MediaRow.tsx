"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TMDBMovie, TMDBTVShow } from "@/types/entertainment";
import { MediaCard } from "./MediaCard";
import { SkeletonCard } from "./SkeletonCard";

interface MediaRowProps {
  title: string;
  items: Array<TMDBMovie | TMDBTVShow>;
  mediaType: "movie" | "tv";
  loading?: boolean;
  viewAllHref?: string;
}

const SCROLL_AMOUNT = 320;
const SKELETON_COUNT = 6;

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  mediaType,
  loading = false,
  viewAllHref,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-4">
      {/* Row header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-heading-sm font-semibold text-content-primary">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-body-sm font-medium text-accent-blue hover:text-accent-blue-hover transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scroll container wrapper */}
      <div className="relative group/row">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-surface-elevated border border-border-strong text-content-secondary hover:text-content-primary hover:bg-surface-glass shadow-glass opacity-0 group-hover/row:opacity-100 transition-all duration-200 disabled:opacity-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="shrink-0 w-36 sm:w-44">
                  <SkeletonCard />
                </div>
              ))
            : items.length === 0
            ? (
                <p className="text-body-sm text-content-muted py-6 px-1">
                  Nothing here yet.
                </p>
              )
            : items.map((item) => (
                <div key={item.id} className="shrink-0 w-36 sm:w-44">
                  <MediaCard item={item} mediaType={mediaType} />
                </div>
              ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-surface-elevated border border-border-strong text-content-secondary hover:text-content-primary hover:bg-surface-glass shadow-glass opacity-0 group-hover/row:opacity-100 transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
