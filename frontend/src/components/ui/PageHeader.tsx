import React from "react";

export interface PageHeaderProps {
  /** Primary page title. */
  title: string;
  /** Optional supporting copy displayed below the title. */
  description?: string;
  /** Icon or illustration rendered to the left of the title. */
  icon?: React.ReactNode;
  /** Action buttons / controls rendered on the trailing edge. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — full-width page title + optional action buttons row.
 * Sits at the top of a page's content area, below the AppHeader/sidebar.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6 border-b ${className}`}
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* Title block */}
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span
            className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--background-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1
            className="text-heading-lg font-bold tracking-tight truncate"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-1 text-body-md"
              style={{ color: "var(--foreground-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
