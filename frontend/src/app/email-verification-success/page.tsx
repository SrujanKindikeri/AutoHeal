"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { CheckCircle2, ArrowRight } from "lucide-react";

function isSafeRedirect(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  return true;
}

function EmailVerificationSuccessContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";

  const loginHref = isSafeRedirect(nextParam)
    ? `/login?next=${encodeURIComponent(nextParam)}`
    : "/login";

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Email Verified!</h1>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            Your email address has been confirmed. Your MovieFlow account is now active and
            ready to use.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7] text-sm text-[#6E6E73] space-y-1 text-left">
          <div className="flex items-center gap-2 text-emerald-600 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Email verified</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Account activated</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready to watch together</span>
          </div>
        </div>

        <Link
          href={loginHref}
          className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
        >
          <span>Continue to Login</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function EmailVerificationSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-[#6E6E73]">Loading…</div>}>
          <EmailVerificationSuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
