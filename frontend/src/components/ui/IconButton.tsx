"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type IconButtonVariant = "primary" | "secondary" | "glass" | "subtle" | "danger" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
  "aria-label": string;
  icon: React.ReactNode;
}

const variantStyles: Record<IconButtonVariant, string> = {
  primary: "bg-accent-blue hover:bg-accent-blue-hover text-white shadow-lg shadow-blue-500/20 border border-transparent",
  secondary: "bg-surface-elevated hover:bg-surface-elevated/80 text-content-primary border border-border-strong",
  glass: "apple-button text-content-primary backdrop-blur-md shadow-glass",
  subtle: "bg-black/[0.04] hover:bg-black/[0.08] text-content-secondary hover:text-content-primary border border-border-subtle",
  danger: "bg-accent-coral/15 text-accent-coral hover:bg-accent-coral/25 border border-accent-coral/30",
  ghost: "bg-transparent hover:bg-black/[0.08] text-content-secondary hover:text-content-primary border border-transparent",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "w-8 h-8 rounded-xl",
  md: "w-10 h-10 rounded-2xl",
  lg: "w-12 h-12 rounded-2xl",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "glass",
      size = "md",
      isLoading = false,
      icon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-200 select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
