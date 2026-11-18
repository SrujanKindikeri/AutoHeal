"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail, resendVerification } from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
  RefreshCw,
  Send,
  Film,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  const [token, setToken] = useState(tokenFromUrl || "");
  const [resendEmail, setResendEmail] = useState(emailFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [verified, setVerified] = useState(false);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (tokenFromUrl && !verified) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleVerify = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) return;

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await verifyEmail(tokenToUse.trim());
      setVerified(true);
      setStatusMsg({
        type: "success",
        text: res.message || "Your email address has been verified successfully!",
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Invalid or expired verification token.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    try {
      const res = await resendVerification(resendEmail.trim());
      setStatusMsg({
        type: "success",
        text: res.message || "A new verification link has been sent if the email exists.",
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Failed to resend verification email.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl apple-glass-card border border-white/[0.1] space-y-6 shadow-2xl text-center">
        {verified ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Email Verified!</h1>
              <p className="text-xs text-white/60">
                Your MovieFlow account is fully activated. You can now set up your entertainment profile and start watch parties.
              </p>
            </div>

            <Link
              href="/complete-profile"
              className="w-full py-3 rounded-xl bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              <span>Complete Profile Setup</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2997ff] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-[#2997ff]/20">
              <Mail className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h1>
              <p className="text-xs text-white/60">
                Confirm your email to access synchronized rooms and connect with friends.
              </p>
            </div>

            {statusMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left ${
                  statusMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {statusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Manual Token Verification */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(token);
              }}
              className="space-y-3"
            >
              <div className="text-left space-y-1.5">
                <label className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
                  Verification Token
                </label>
                <input
                  type="text"
                  placeholder="Paste verification token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#2997ff] transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Resend Link Section */}
            <div className="pt-4 border-t border-white/[0.06] text-left space-y-3">
              <div className="text-xs font-semibold text-white">Didn&apos;t receive the email?</div>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="px-4 py-2 rounded-xl apple-button text-xs font-medium text-white shrink-0 disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-[#f5f5f7]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-white/50">Loading verification...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  );
}
