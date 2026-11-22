"use client";

import React, { forwardRef, useId } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className = "",
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-body-sm font-medium text-content-secondary"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={`w-full rounded-2xl bg-white border text-body-md text-content-primary placeholder:text-content-muted transition-all duration-200 outline-none resize-y px-4 py-2.5 ${
            error
              ? "border-accent-coral/60 focus:border-accent-coral focus:ring-1 focus:ring-accent-coral/30"
              : "border-border-default focus:border-accent-blue/80 focus:ring-1 focus:ring-accent-blue/20"
          } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

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

Textarea.displayName = "Textarea";
