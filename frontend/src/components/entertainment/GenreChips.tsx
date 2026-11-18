"use client";

import React from "react";
import type { Genre } from "@/types/entertainment";

interface GenreChipsProps {
  genres: Genre[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export const GenreChips: React.FC<GenreChipsProps> = ({
  genres,
  selected,
  onSelect,
}) => {
  return (
    <div
      role="listbox"
      aria-label="Filter by genre"
      className="flex flex-wrap gap-2"
    >
      {/* All chip */}
      <button
        role="option"
        aria-selected={selected === null}
        onClick={() => onSelect(null)}
        className={`px-4 py-1.5 rounded-2xl text-body-sm font-medium border transition-all duration-200 select-none active:scale-95 ${
          selected === null
            ? "bg-accent-blue text-white border-accent-blue shadow-glow-blue"
            : "bg-surface-elevated text-content-secondary border-border-glass hover:bg-surface-glass hover:text-content-primary hover:border-border-strong"
        }`}
      >
        All
      </button>

      {genres.map((genre) => {
        const isActive = selected === genre.id;
        return (
          <button
            key={genre.id}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(isActive ? null : genre.id)}
            className={`px-4 py-1.5 rounded-2xl text-body-sm font-medium border transition-all duration-200 select-none active:scale-95 ${
              isActive
                ? "bg-accent-blue text-white border-accent-blue shadow-glow-blue"
                : "bg-surface-elevated text-content-secondary border-border-glass hover:bg-surface-glass hover:text-content-primary hover:border-border-strong"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
};
