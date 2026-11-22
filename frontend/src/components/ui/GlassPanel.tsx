"use client";

import React from "react";

export type GlassSurface = "subtle" | "card" | "elevated" | "interactive";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: GlassSurface;
  children: React.ReactNode;
  className?: string;
}

const surfaceStyles: Record<GlassSurface, string> = {
  subtle: "bg-surface-primary/70 border border-border-subtle backdrop-blur-md",
  card: "apple-glass-card border border-border-glass shadow-glass",
  elevated: "apple-glass-elevated border border-border-strong shadow-glass-elevated",
  interactive:
    "apple-glass-card border border-border-glass hover:border-border-strong transition-all duration-300 shadow-glass hover:shadow-glass-elevated",
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  surface = "card",
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-3xl ${surfaceStyles[surface]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
