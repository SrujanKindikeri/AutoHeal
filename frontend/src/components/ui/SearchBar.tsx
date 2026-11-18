"use client";

import React, { forwardRef, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  onClear?: () => void;
  shortcutHint?: string;
}

const sizeStyles = {
  sm: "py-2 pl-9 pr-8 text-body-sm rounded-xl",
  md: "py-2.5 pl-11 pr-10 text-body-md rounded-2xl",
  lg: "py-3.5 pl-12 pr-11 text-body-lg rounded-2xl",
};

const iconSizes = {
  sm: "w-3.5 h-3.5 left-3",
  md: "w-4 h-4 left-4",
  lg: "w-5 h-5 left-4",
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      size = "md",
      isLoading = false,
      value,
      onChange,
      onClear,
      placeholder = "Search movies, music, or MovieFlow ID...",
      shortcutHint,
      className = "",
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value);

    return (
      <div className={`relative flex items-center w-full ${className}`}>
        {isLoading ? (
          <Loader2
            className={`absolute ${iconSizes[size]} text-accent-blue animate-spin pointer-events-none`}
          />
        ) : (
          <Search
            className={`absolute ${iconSizes[size]} text-content-muted pointer-events-none`}
          />
        )}

        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-surface-primary/90 border border-border-glass focus:border-accent-blue/80 text-content-primary placeholder:text-content-muted transition-all duration-200 outline-none backdrop-blur-md shadow-inner ${sizeStyles[size]}`}
          {...props}
        />

        <div className="absolute right-3.5 flex items-center gap-1.5">
          {hasValue && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search query"
              className="p-1 rounded-full text-content-muted hover:text-content-primary hover:bg-white/[0.08] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {shortcutHint && !hasValue && (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-border-subtle text-[10px] font-mono text-content-muted">
              {shortcutHint}
            </kbd>
          )}
        </div>
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
