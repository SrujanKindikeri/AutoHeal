"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export const SkeletonCard: React.FC = () => (
  <div className="flex flex-col space-y-3">
    <Skeleton variant="rectangular" className="w-full aspect-[2/3]" />
    <Skeleton variant="text" width="72%" />
    <Skeleton variant="text" width="40%" />
  </div>
);
