"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-content-secondary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-content-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={`w-full rounded-2xl bg-surface-primary/80 border text-body-md text-content-primary placeholder:text-content-muted transition-all duration-200 outline-none ${
              error
                ? "border-accent-coral/60 focus:border-accent-coral focus:ring-1 focus:ring-accent-coral/30"
                : "border-border-glass focus:border-accent-blue/80 focus:ring-1 focus:ring-accent-blue/20"
            } ${leftIcon ? "pl-10" : "pl-4"} ${
              rightIcon ? "pr-10" : "pr-4"
            } py-2.5 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-content-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} className="text-body-sm text-accent-coral flex items-center gap-1">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-body-sm text-content-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
