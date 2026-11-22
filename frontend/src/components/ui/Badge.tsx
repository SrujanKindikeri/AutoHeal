"use client";

import React from "react";

export type BadgeVariant =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "glass"
  | "purple"
  | "gold";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-primary text-content-secondary border-border-subtle",
  accent: "bg-accent-blue/15 text-accent-blue border-accent-blue/25",
  success: "bg-accent-emerald/15 text-emerald-700 border-accent-emerald/25",
  warning: "bg-accent-gold/15 text-amber-700 border-accent-gold/25",
  danger: "bg-accent-coral/15 text-accent-coral border-accent-coral/25",
  glass: "apple-glass-card text-content-primary border-border-glass",
  purple: "bg-accent-purple/15 text-purple-700 border-accent-purple/25",
  gold: "bg-accent-gold/20 text-amber-700 border-accent-gold/30",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-content-muted",
  accent: "bg-accent-blue",
  success: "bg-accent-emerald",
  warning: "bg-accent-gold",
  danger: "bg-accent-coral",
  glass: "bg-content-muted",
  purple: "bg-accent-purple",
  gold: "bg-accent-gold",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className = "",
}) => {
  const sizeClass =
    size === "sm"
      ? "text-caption px-2 py-0.5 rounded-md gap-1"
      : "text-body-sm px-2.5 py-1 rounded-lg gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium border select-none ${variantStyles[variant]} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
