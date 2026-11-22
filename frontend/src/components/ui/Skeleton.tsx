"use client";

import React from "react";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular" | "card";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
}) => {
  const variantStyles = {
    text: "h-4 rounded-md",
    rectangular: "rounded-2xl",
    circular: "rounded-full",
    card: "rounded-3xl h-64",
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      style={style}
      className={`bg-surface-primary border border-border-subtle animate-pulse ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};
