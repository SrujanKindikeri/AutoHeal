"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  getInvitationByToken,
  acceptInvitation,
  rejectInvitation,
  RoomInvitationData,
} from "@/lib/authApi";
import { Navbar } from "@/components/navbar";
import {
  Film,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  Mail,
} from "lucide-react";

type PageState =
  | { kind: "loading" }
  | { kind: "invitation"; data: RoomInvitationData }
  | { kind: "accepted" }
  | { kind: "rejected" }
  | { kind: "unverified" }
  | { kind: "error"; message: string };

export default function InvitationTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "No invitation token provided." });
      return;
    }
    loadInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadInvitation = async () => {
    setState({ kind: "loading" });
    try {
      const data = await getInvitationByToken(token);
      setState({ kind: "invitation", data });
    } catch (err: any) {
      if (err.status === 401 && err.data?.code === "AUTH_REQUIRED") {
        // Redirect to login with next param
        router.push(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
        return;
      }
      if (err.status === 403 && err.data?.code === "EMAIL_VERIFICATION_REQUIRED") {
        setState({ kind: "unverified" });
        return;
      }
      setState({ kind: "error", message: err.message || "Failed to load invitation." });
    }
  };

  const handleAccept = async () => {
    if (state.kind !== "invitation") return;
    setActionError(null);
    setActionLoading(true);
    try {
      await acceptInvitation(token);
      setState({ kind: "accepted" });
    } catch (err: any) {
      setActionError(err.message || "Failed to accept invitation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (state.kind !== "invitation") return;
    setActionError(null);
    setActionLoading(true);
    try {
      await rejectInvitation(token);
      setState({ kind: "rejected" });
    } catch (err: any) {
      setActionError(err.message || "Failed to reject invitation.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderContent = () => {
    switch (state.kind) {
      case "loading":
        return (
          <div className="p-8 rounded-3xl apple-glass-card text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#0071E3] mx-auto flex items-center justify-center">
              <Film className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs text-[#6E6E73]">Loading invitation…</p>
          </div>
        );

      case "unverified":
        return (
          <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
              <Mail className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Email Verification Required
              </h1>
              <p className="text-xs text-[#6E6E73]">
                You need to verify your email address before accepting or rejecting invitations.
              </p>
            </div>
            <Link
              href="/verify-email"
              className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
            >
              <span>Verify Email</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        );

      case "error":
        return (
          <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Invitation Not Found
              </h1>
              <p className="text-xs text-[#6E6E73]">{state.message}</p>
            </div>
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Go to Home</span>
            </Link>
          </div>
        );

      case "accepted":
        return (
          <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Invitation Accepted!
              </h1>
              <p className="text-xs text-[#6E6E73]">
                You have joined the room. Enjoy watching together.
              </p>
            </div>
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all"
            >
              <span>Go to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        );

      case "rejected":
        return (
          <div className="p-8 rounded-3xl apple-glass-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#6E6E73] mx-auto flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Invitation Declined
              </h1>
              <p className="text-xs text-[#6E6E73]">
                You have declined this invitation.
              </p>
            </div>
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Go to Home</span>
            </Link>
          </div>
        );

      case "invitation": {
        const inv = state.data;
        const expiresAt = new Date(inv.expires_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isExpired = inv.is_expired || inv.status === "expired";
        const isPending = inv.status === "pending" && !isExpired;

        return (
          <div className="p-8 rounded-3xl apple-glass-card space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#bf5af2] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/15 mb-3">
                <Film className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
                Room Invitation
              </h1>
              <p className="text-xs text-[#6E6E73]">
                You have been invited to join a movie room.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#D2D2D7] space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
                  <Film className="w-3.5 h-3.5" />
                  <span className="font-medium text-[#1D1D1F]">{inv.room_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
                  <User className="w-3.5 h-3.5" />
                  <span>
                    Invited by{" "}
                    <span className="font-medium text-[#1D1D1F]">
                      {inv.inviter.full_name || inv.inviter.username}
                    </span>
                    {" "}
                    <span className="font-mono text-[#0071E3]">
                      ({inv.inviter.movieflow_id})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isExpired ? (
                      <span className="text-red-500">Expired {expiresAt}</span>
                    ) : (
                      <>Expires {expiresAt}</>
                    )}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              {!isPending && (
                <div
                  className={`p-3 rounded-xl border text-xs text-center font-medium ${
                    isExpired || inv.status === "expired"
                      ? "bg-red-50 border-red-200 text-red-600"
                      : inv.status === "accepted"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : inv.status === "rejected"
                      ? "bg-[#F5F5F7] border-[#D2D2D7] text-[#6E6E73]"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  {isExpired ? "This invitation has expired" : `Invitation is ${inv.status}`}
                </div>
              )}

              {actionError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>

            {isPending && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="py-3 rounded-xl border border-[#D2D2D7] hover:border-red-300 text-[#1D1D1F] hover:text-red-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="py-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1D1D1F]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">{renderContent()}</div>
      </main>
    </div>
  );
}
