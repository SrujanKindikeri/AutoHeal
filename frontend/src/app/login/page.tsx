"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/authApi";
import { useAuthStore } from "@/store/authStore";
import { PublicNavbar } from "@/components/PublicNavbar";
import {
  Film,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

function isSafeRedirect(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  return true;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";
  const setAuth = useAuthStore((state) => state.setAuth);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

    if (!identifier.trim() || !password) {
      setError("Please enter your email or username and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({
        identifier: identifier.trim(),
        password,
      });

      setAuth(response.user, response.access, response.refresh);

      const destination = isSafeRedirect(nextParam) ? nextParam : "/";
      router.push(destination);
    } catch (err: any) {
      if (err.data?.code === "ACCOUNT_UNVERIFIED") {
        setUnverifiedEmail(err.data.email || identifier);
        setError("Your account is not verified yet. Please check your email.");
      } else {
        setError(err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl apple-glass-card space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15 mb-3">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Sign in to MovieFlow</h1>
          <p className="text-xs text-[#6E6E73]">
            Continue to your synchronized entertainment hub.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <Link
                href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                className="ml-6 text-xs text-[#0071E3] hover:underline font-medium"
              >
                Resend verification email &rarr;
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
              Email or Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="name@example.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-[#0071E3] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#D2D2D7]">
          <p className="text-xs text-[#6E6E73]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#0071E3] hover:underline font-medium">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-[#6E6E73]">Loading…</div>}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}
