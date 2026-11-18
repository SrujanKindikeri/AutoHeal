"use client";

import React from "react";
import { Button, ButtonProps } from "./Button";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: ButtonProps["variant"];
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = "",
}) => {
  return (
    <div
      className={`p-10 sm:p-14 text-center rounded-3xl apple-glass-card border border-border-subtle flex flex-col items-center justify-center space-y-4 max-w-md mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-3xl bg-surface-elevated/80 border border-border-glass flex items-center justify-center text-accent-blue shadow-inner">
        {icon}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-heading-sm font-bold text-content-primary">
          {title}
        </h3>
        <p className="text-body-sm text-content-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            <Button
              variant={action.variant || "primary"}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="subtle"
              size="md"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
