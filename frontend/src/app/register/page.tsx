"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerUser } from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
import {
  Film,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<{
    email: string;
    username: string;
    movieflow_id: string;
  } | null>(null);

  const hasMinLength = formData.password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(formData.password);
  const hasNumbers = /[0-9]/.test(formData.password);
  const passwordsMatch =
    formData.password.length > 0 && formData.password === formData.confirmPassword;
  const isStrong = hasMinLength && hasLetters && hasNumbers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!formData.username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (!isStrong) {
      setError("Password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.termsAccepted) {
      setError("You must accept the terms and privacy conditions.");
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser({
        full_name: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        terms_accepted: formData.termsAccepted,
      });

      setRegisteredUser({
        email: response.user.email,
        username: response.user.username,
        movieflow_id: response.user.movieflow_id,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const verifyHref = (() => {
    const base = `/verify-email?email=${encodeURIComponent(registeredUser?.email ?? "")}`;
    if (nextParam) return `${base}&next=${encodeURIComponent(nextParam)}`;
    return base;
  })();

  return (
    <div className="w-full max-w-md">
      {registeredUser ? (
        <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
              Welcome to MovieFlow
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Your account has been created. A verification link was sent to:
            </p>
            <div className="text-sm font-semibold text-[#1D1D1F] bg-[#F5F5F7] py-2 px-3 rounded-xl border border-[#D2D2D7] inline-block font-mono">
              {registeredUser.email}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7] text-left space-y-1">
            <div className="text-[11px] font-mono uppercase text-[#6E6E73] tracking-wider">
              Permanent MovieFlow ID
            </div>
            <div className="text-xl font-bold text-[#0071E3] font-mono tracking-wider">
              {registeredUser.movieflow_id}
            </div>
            <div className="text-[11px] text-[#6E6E73]">
              Friends can find and invite you using this unique identifier.
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href={verifyHref}
              className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
            >
              <span>Verify Email Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl border border-[#D2D2D7] hover:border-[#B0B0B5] text-[#1D1D1F] hover:text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Go to Sign In</span>
            </Link>

            <p className="text-[11px] text-[#6E6E73]">
              Please verify your email address to unlock synchronized rooms.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl apple-glass-card space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15 mb-3">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Create your Account</h1>
            <p className="text-xs text-[#6E6E73]">
              Watch movies together. Listen to music together.
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
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="text-[#6E6E73] absolute left-3.5 top-2.5 text-xs font-mono">@</span>
                <input
                  type="text"
                  placeholder="janedoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              {formData.password.length > 0 && (
                <div className="pt-1 flex items-center gap-3 text-[10px] text-[#6E6E73] font-mono">
                  <span className={hasMinLength ? "text-emerald-600" : ""}>• 8+ chars</span>
                  <span className={hasLetters ? "text-emerald-600" : ""}>• Letters</span>
                  <span className={hasNumbers ? "text-emerald-600" : ""}>• Numbers</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs focus:outline-none focus:border-[#0071E3] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={formData.termsAccepted}
                onChange={(e) =>
                  setFormData({ ...formData, termsAccepted: e.target.checked })
                }
                className="mt-0.5 rounded border-[#D2D2D7] bg-[#F5F5F7] text-[#0071E3] focus:ring-0"
                required
              />
              <label htmlFor="terms" className="text-[11px] text-[#6E6E73] leading-tight">
                I agree to the MovieFlow Terms of Service and Privacy Policy.
              </label>
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
                  <span>Create MovieFlow Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#D2D2D7]">
            <p className="text-xs text-[#6E6E73]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#0071E3] hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <Suspense fallback={<div className="text-xs text-[#6E6E73]">Loading…</div>}>
          <RegisterContent />
        </Suspense>
      </main>
    </div>
  );
}
