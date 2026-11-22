"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "pill" | "line";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "pill",
  className = "",
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
        variant === "line"
          ? "border-b border-border-subtle pb-px"
          : "p-1 rounded-2xl bg-surface-primary/80 border border-border-glass"
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap text-body-sm font-semibold transition-all duration-200 select-none ${
              variant === "pill"
                ? isActive
                  ? "bg-accent-blue text-white shadow-md shadow-blue-500/25 px-4 py-2 rounded-xl"
                  : "text-content-secondary hover:text-content-primary hover:bg-black/[0.04] px-4 py-2 rounded-xl"
                : isActive
                ? "text-content-primary border-b-2 border-accent-blue pb-3 pt-2 px-3"
                : "text-content-muted hover:text-content-secondary border-b-2 border-transparent pb-3 pt-2 px-3"
            }`}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-black/20 text-white"
                    : "bg-black/[0.05] text-content-secondary"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
