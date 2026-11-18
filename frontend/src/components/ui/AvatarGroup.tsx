"use client";

import React from "react";
import { Avatar, AvatarProps, AvatarSize } from "./Avatar";

export interface AvatarGroupProps {
  users: Array<{ src?: string | null; name: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 4,
  size = "sm",
  className = "",
}) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={`flex items-center -space-x-2.5 overflow-hidden ${className}`}>
      {visibleUsers.map((u, i) => (
        <Avatar
          key={`${u.name}-${i}`}
          src={u.src}
          name={u.name}
          size={size}
          className="ring-2 ring-surface-background hover:z-10 transition-transform duration-200 hover:scale-105"
        />
      ))}

      {remainingCount > 0 && (
        <div
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-elevated border border-border-glass text-body-sm font-semibold text-content-secondary ring-2 ring-surface-background select-none"
          title={`${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
