"use client";

import React, { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
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
    <div className="min-h-screen flex flex-col bg-[#08080a] text-[#f5f5f7]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          <div className="p-8 rounded-3xl apple-glass-card border border-white/[0.1] space-y-6 shadow-2xl">
            {submitted ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#2997ff] mx-auto flex items-center justify-center">
                  <Mail className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Check your Email</h1>
                  <p className="text-xs text-white/60">
                    If an account with <strong className="text-white">{email}</strong> exists,
                    password reset instructions have been sent.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 text-left space-y-1">
                  <div>• Password reset links expire after 1 hour.</div>
                  <div>• Check your spam folder if you do not receive the email.</div>
                </div>

                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2997ff] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-[#2997ff]/20 mb-3">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
                  <p className="text-xs text-white/60">
                    Enter your email address and we&apos;ll send you a recovery link.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all mt-2"
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

                <div className="text-center pt-2 border-t border-white/[0.06]">
                  <Link
                    href="/login"
                    className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5 transition-colors"
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
