"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex items-end justify-between gap-4 pb-4 border-b border-border-subtle ${className}`}
    >
      <div className="space-y-1 text-left min-w-0">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-accent-blue">{icon}</span>}
          <h2 className="text-heading-md sm:text-heading-lg font-bold text-content-primary tracking-tight truncate">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-body-sm text-content-secondary line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action.href ? (
            <Link
              href={action.href}
              className="group inline-flex items-center gap-1 text-body-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition"
            >
              <span>{action.label}</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="group inline-flex items-center gap-1 text-body-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition"
            >
              <span>{action.label}</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
