import React, { Suspense } from "react";
import { AppShell } from "@/components/navigation/AppShell";
import { SearchContent } from "./SearchContent";
import { SkeletonCard } from "@/components/entertainment/SkeletonCard";

function SearchFallback() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="h-8 w-32 rounded-xl bg-surface-elevated animate-pulse" />
        <div className="h-11 w-full rounded-2xl bg-surface-elevated animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
