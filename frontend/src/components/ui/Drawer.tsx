"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  side?: "left" | "right" | "bottom";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className = "",
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionStyles = {
    right: "top-0 right-0 h-full w-full max-w-md animate-fade-in",
    left: "top-0 left-0 h-full w-full max-w-md animate-fade-in",
    bottom: "bottom-0 left-0 w-full max-h-[85vh] rounded-t-3xl animate-slide-up",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
      />

      {/* Surface */}
      <div
        ref={drawerRef}
        className={`fixed ${positionStyles[side]} apple-glass-elevated border border-border-strong p-6 z-10 flex flex-col justify-between shadow-glass-elevated overflow-y-auto ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          {title && (
            <h2 className="text-heading-sm font-bold text-content-primary tracking-tight">
              {title}
            </h2>
          )}
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close drawer"
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="flex-1 py-4 text-content-secondary overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
