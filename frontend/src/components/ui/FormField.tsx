"use client";

import React, { useId } from "react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

/**
 * FormField wraps any single form control (Input, Textarea, Select, etc.)
 * and renders a consistent label → control → error/helper layout.
 * It clones the child and injects matching id, aria-invalid, and
 * aria-describedby props so the DOM relationship is correct.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required = false,
  children,
  className = "",
}) => {
  const generatedId = useId();
  const childId: string =
    (children.props as { id?: string }).id || generatedId;
  const errorId = `${childId}-error`;
  const helperId = `${childId}-helper`;

  const child = React.cloneElement(children, {
    id: childId,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby":
      error ? errorId : helperText ? helperId : undefined,
  } as Partial<React.HTMLAttributes<HTMLElement>>);

  return (
    <div className={`w-full space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={childId}
          className="block text-body-sm font-medium text-content-secondary"
        >
          {label}
          {required && (
            <span className="ml-1 text-accent-coral" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {child}

      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-accent-coral">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-sm text-content-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
