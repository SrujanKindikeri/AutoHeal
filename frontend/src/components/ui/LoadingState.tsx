"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./Skeleton";

export type LoadingPattern = "spinner" | "skeleton";

export interface LoadingStateProps {
  pattern?: LoadingPattern;
  message?: string;
  /** Number of skeleton rows to show (skeleton pattern only). */
  skeletonRows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  pattern = "spinner",
  message = "Loading…",
  skeletonRows = 3,
  className = "",
}) => {
  if (pattern === "skeleton") {
    return (
      <div
        className={`w-full space-y-3 ${className}`}
        aria-busy="true"
        aria-label={message}
      >
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={i === 0 ? "w-3/5" : i === skeletonRows - 1 ? "w-2/5" : "w-full"}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
      aria-busy="true"
      aria-label={message}
    >
      <Loader2 className="w-8 h-8 text-accent-blue animate-spin" aria-hidden="true" />
      {message && (
        <p className="text-body-sm text-content-muted">{message}</p>
      )}
    </div>
  );
};
