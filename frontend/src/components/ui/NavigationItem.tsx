"use client";

import React from "react";
import Link from "next/link";

export interface NavigationItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  href,
  label,
  icon,
  isActive = false,
  badge,
  onClick,
  className = "",
}) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-body-sm font-semibold transition-all duration-200 select-none ${
        isActive
          ? "bg-accent-blue text-white shadow-md shadow-blue-500/20"
          : "text-content-secondary hover:text-content-primary hover:bg-black/[0.04]"
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isActive ? "text-white" : "text-content-muted group-hover:text-content-primary"
          }`}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>

      {badge && (
        <span
          className={`shrink-0 ml-2 text-caption px-2 py-0.5 rounded-full font-mono ${
            isActive
              ? "bg-black/20 text-white font-bold"
              : "bg-surface-elevated text-content-secondary border border-border-glass"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
};
