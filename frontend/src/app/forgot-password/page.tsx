"use client";

import React, { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/authApi";
import { PublicNavbar } from "@/components/PublicNavbar";
import {
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          <div className="p-8 rounded-3xl apple-glass-card space-y-6">
            {submitted ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#0071E3] mx-auto flex items-center justify-center">
                  <Mail className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Check your Email</h1>
                  <p className="text-xs text-[#6E6E73]">
                    If an account with <strong className="text-[#1D1D1F]">{email}</strong> exists,
                    password reset instructions have been sent.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-xs text-[#6E6E73] text-left space-y-1">
                  <div>• Password reset links expire after 1 hour.</div>
                  <div>• Check your spam folder if you do not receive the email.</div>
                </div>

                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBED] border border-[#D2D2D7] text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15 mb-3">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Reset Password</h1>
                  <p className="text-xs text-[#6E6E73]">
                    Enter your email address and we&apos;ll send you a recovery link.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                      <input
                        type="email"
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2 border-t border-[#D2D2D7]">
                  <Link
                    href="/login"
                    className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
