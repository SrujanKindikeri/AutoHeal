"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const DEBOUNCE_MS = 300;

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search movies and TV shows…",
  isLoading = false,
}) => {
  // Internal input state; onChange fires after debounce
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local in sync when parent resets the value externally
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocal(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setLocal("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange("");
  };

  return (
    <div className="relative flex items-center w-full">
      {/* Leading icon */}
      {isLoading ? (
        <Loader2 className="absolute left-4 w-4 h-4 text-accent-blue animate-spin pointer-events-none" />
      ) : (
        <Search className="absolute left-4 w-4 h-4 text-content-muted pointer-events-none" />
      )}

      <input
        type="search"
        value={local}
        onChange={handleInput}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-surface-primary/90 border border-border-glass focus:border-accent-blue/80 focus:ring-1 focus:ring-accent-blue/20 text-content-primary placeholder:text-content-muted rounded-2xl py-2.5 pl-11 pr-10 text-body-md transition-all duration-200 outline-none backdrop-blur-md shadow-inner"
      />

      {/* Clear button */}
      {local && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3.5 p-1 rounded-full text-content-muted hover:text-content-primary hover:bg-white/[0.08] transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
