"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 text-center ${className}`}
      role="alert"
    >
      <div className="w-14 h-14 rounded-3xl bg-accent-coral/10 border border-accent-coral/20 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-accent-coral" aria-hidden="true" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-heading-sm font-bold text-content-primary">{title}</h3>
        <p className="text-body-sm text-content-secondary leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
