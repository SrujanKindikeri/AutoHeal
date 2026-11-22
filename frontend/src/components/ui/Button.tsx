"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "glass"
  | "subtle"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-blue hover:bg-accent-blue-hover text-white shadow-lg shadow-blue-500/20 border border-transparent",
  secondary:
    "bg-surface-elevated hover:bg-surface-elevated/80 text-content-primary border border-border-strong",
  glass:
    "apple-button text-content-primary backdrop-blur-md shadow-glass",
  subtle:
    "bg-black/[0.04] hover:bg-black/[0.08] text-content-secondary hover:text-content-primary border border-border-subtle",
  danger:
    "bg-accent-coral hover:bg-accent-coral-hover text-white shadow-lg shadow-red-500/20 border border-transparent",
  ghost:
    "bg-transparent hover:bg-black/[0.06] text-content-secondary hover:text-content-primary border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-body-sm font-medium rounded-xl gap-1.5",
  md: "px-4 py-2 text-body-md font-semibold rounded-2xl gap-2",
  lg: "px-6 py-3 text-body-lg font-semibold rounded-2xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
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
        className={`inline-flex items-center justify-center transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
