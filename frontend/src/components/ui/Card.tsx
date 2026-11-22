"use client";

import React from "react";

export type CardVariant = "default" | "flat" | "elevated";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-white border border-border-subtle shadow-glass",
  flat:
    "bg-surface-primary border border-border-subtle",
  elevated:
    "bg-white border border-border-default shadow-glass-elevated",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-3xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`flex items-center justify-between gap-4 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = "",
  ...props
}) => (
  <h3
    className={`text-heading-sm font-bold text-content-primary tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`text-body-md text-content-secondary ${className}`} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border-subtle ${className}`}
    {...props}
  >
    {children}
  </div>
);
