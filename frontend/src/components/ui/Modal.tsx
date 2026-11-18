"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className = "",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
      />

      {/* Modal Surface */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeStyles[size]} rounded-3xl apple-glass-elevated border border-border-strong p-6 sm:p-8 z-10 shadow-glass-elevated animate-scale-in space-y-6 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {title && (
              <h2 className="text-heading-md font-bold text-content-primary tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-body-sm text-content-secondary leading-relaxed">
                {description}
              </p>
            )}
          </div>

          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close dialog"
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="text-content-secondary text-body-md">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
