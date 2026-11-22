import React from "react";

export interface PageContainerProps {
  children: React.ReactNode;
  /** Override the default max-width constraint. Defaults to max-w-7xl. */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthMap: Record<NonNullable<PageContainerProps["maxWidth"]>, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-none",
};

/**
 * PageContainer — consistent max-width wrapper with responsive horizontal
 * padding. Use as the outermost wrapper inside every page's main content area.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = "2xl",
  className = "",
}) => {
  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthMap[maxWidth]} ${className}`}
    >
      {children}
    </div>
  );
};
