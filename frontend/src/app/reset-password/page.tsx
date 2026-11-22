"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/authApi";
import { PublicNavbar } from "@/components/PublicNavbar";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Reset token is missing. Please check your reset link.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl apple-glass-card space-y-6">
        {success ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Password Reset Successfully
              </h1>
              <p className="text-xs text-[#6E6E73]">
                You can now sign in to your MovieFlow account using your new password.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15 mb-3">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Set New Password</h1>
              <p className="text-xs text-[#6E6E73]">
                Choose a strong, unique password for your MovieFlow identity.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenFromUrl && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reset token from email"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs font-mono focus:outline-none focus:border-[#0071E3] transition-colors"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                    required
                  />
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
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-[#6E6E73]">Loading reset password…</div>}>
          <ResetPasswordContent />
        </Suspense>
      </main>
    </div>
  );
}
