"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail, resendVerification } from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";

const RESEND_COOLDOWN = 60;

function isSafeRedirect(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (url.includes("://")) return false;
  return true;
}

type VerifyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "expired"; message: string }
  | { kind: "already_used"; message: string }
  | { kind: "invalid"; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");
  const nextParam = searchParams.get("next") ?? "";

  const [verifyState, setVerifyState] = useState<VerifyState>({ kind: "idle" });
  const [resendEmail, setResendEmail] = useState(emailFromUrl || "");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) return;
    setVerifyState({ kind: "loading" });
    try {
      const res = await verifyEmail(tokenToUse.trim());
      setVerifyState({
        kind: "success",
        message: res.message || "Your email address has been verified successfully!",
      });
    } catch (err: any) {
      const msg: string = err.message || "Invalid or expired verification token.";
      const msgLower = msg.toLowerCase();
      if (msgLower.includes("expired")) {
        setVerifyState({ kind: "expired", message: msg });
      } else if (msgLower.includes("already been used") || msgLower.includes("already verified")) {
        setVerifyState({ kind: "already_used", message: msg });
      } else {
        setVerifyState({ kind: "invalid", message: msg });
      }
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || cooldown > 0) return;

    setResendLoading(true);
    setResendMsg(null);
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendMsg({
        type: "success",
        text: res.message || "A new verification link has been sent if the email exists.",
      });
      startCooldown();
    } catch (err: any) {
      setResendMsg({
        type: "error",
        text: err.message || "Failed to resend verification email.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const loginHref = isSafeRedirect(nextParam) ? `/login?next=${encodeURIComponent(nextParam)}` : "/login";

  if (verifyState.kind === "success") {
    return (
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Email Verified!</h1>
            <p className="text-xs text-[#6E6E73]">{verifyState.message}</p>
          </div>

          <div className="space-y-3">
            <Link
              href={loginHref}
              className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (verifyState.kind === "already_used") {
    return (
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Already Verified</h1>
            <p className="text-xs text-[#6E6E73]">
              Your email is already verified. You can sign in now.
            </p>
          </div>

          <Link
            href={loginHref}
            className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (verifyState.kind === "expired") {
    return (
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Link Expired</h1>
            <p className="text-xs text-[#6E6E73]">
              This verification link has expired. Enter your email below to receive a new one.
            </p>
          </div>

          {resendMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left ${
                resendMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {resendMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{resendMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleResend} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={resendLoading || cooldown > 0}
              className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 disabled:opacity-50 transition-all"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send New Link</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (verifyState.kind === "invalid") {
    return (
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Invalid Link</h1>
            <p className="text-xs text-[#6E6E73]">
              This verification link is not valid. It may have been copied incorrectly. Request a
              new one below.
            </p>
          </div>

          {resendMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left ${
                resendMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {resendMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{resendMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleResend} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={resendLoading || cooldown > 0}
              className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 disabled:opacity-50 transition-all"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send New Link</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (verifyState.kind === "loading") {
    return (
      <div className="w-full max-w-md">
        <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-[#0071E3] mx-auto flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Verifying…</h1>
            <p className="text-xs text-[#6E6E73]">Confirming your email address, please wait.</p>
          </div>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl apple-glass-card space-y-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15">
          <Mail className="w-6 h-6 text-white" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Verify Your Email</h1>
          <p className="text-xs text-[#6E6E73]">
            Confirm your email to access synchronized rooms and connect with friends.
          </p>
        </div>

        {resendMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 text-left ${
              resendMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {resendMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{resendMsg.text}</span>
          </div>
        )}

        <div className="pt-2 border-t border-[#D2D2D7] text-left space-y-3">
          <div className="text-xs font-semibold text-[#1D1D1F]">Didn&apos;t receive the email?</div>
          <form onSubmit={handleResend} className="space-y-3">
            <input
              type="email"
              placeholder="Enter your email address"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
              required
            />
            <button
              type="submit"
              disabled={resendLoading || cooldown > 0}
              className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 disabled:opacity-50 transition-all"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <span>Resend Verification Email</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-[#6E6E73]">Loading verification…</div>}>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  );
}
