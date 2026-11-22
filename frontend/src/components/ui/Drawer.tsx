"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  const positionStyles = {
    right: "top-0 right-0 h-full w-full max-w-md",
    left: "top-0 left-0 h-full w-full max-w-md",
    bottom: "bottom-0 left-0 w-full max-h-[85vh] rounded-t-3xl",
  };

  const motionVariants = {
    right: {
      initial: { opacity: 0, x: "100%" },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: "100%" },
    },
    left: {
      initial: { opacity: 0, x: "-100%" },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: "-100%" },
    },
    bottom: {
      initial: { opacity: 0, y: "100%" },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: "100%" },
    },
  };

  const variants = motionVariants[side];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Surface */}
          <motion.div
            ref={drawerRef}
            className={`fixed ${positionStyles[side]} apple-glass-elevated border border-border-strong p-6 z-10 flex flex-col justify-between shadow-glass-elevated overflow-y-auto ${className}`}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
