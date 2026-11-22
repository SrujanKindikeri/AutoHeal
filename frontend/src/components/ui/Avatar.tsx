"use client";

import React, { useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
  status?: "online" | "offline" | "busy" | null;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; badge: string }> = {
  xs: { container: "w-6 h-6 rounded-lg", text: "text-[10px]", badge: "w-1.5 h-1.5" },
  sm: { container: "w-8 h-8 rounded-xl", text: "text-xs", badge: "w-2 h-2" },
  md: { container: "w-10 h-10 rounded-2xl", text: "text-body-sm font-semibold", badge: "w-2.5 h-2.5" },
  lg: { container: "w-14 h-14 rounded-3xl", text: "text-heading-md font-bold", badge: "w-3 h-3" },
  xl: { container: "w-20 h-20 rounded-3xl", text: "text-display-lg font-bold", badge: "w-4 h-4" },
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
  status,
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MF";

  const { container, text, badge } = sizeStyles[size];

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${container} relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-accent-blue via-accent-purple to-accent-pink shadow-md border border-border-glass select-none`}
      >
        {src && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
            <span className={`${text} text-white font-medium relative`}>{initials}</span>
          </>
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${badge} rounded-full ring-2 ring-surface-background ${
            status === "online"
              ? "bg-accent-emerald"
              : status === "busy"
              ? "bg-accent-coral"
              : "bg-content-muted"
          }`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};
