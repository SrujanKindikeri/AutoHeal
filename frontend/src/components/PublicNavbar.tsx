import React from "react";
import Link from "next/link";
import { Film } from "lucide-react";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#D2D2D7] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-4.5 h-4.5 text-white" style={{ width: "1.125rem", height: "1.125rem" }} />
          </div>
          <span className="font-semibold text-base tracking-tight text-[#1D1D1F]">MovieFlow</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-full text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
