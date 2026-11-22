"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiRequest } from "@/lib/authApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Link2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Unlink,
} from "lucide-react";

interface OAuthConnection {
  provider: string;
  connected: boolean;
  account_name?: string;
  connected_at?: string;
}

export default function ConnectionsSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore();

  const [connections, setConnections] = useState<OAuthConnection[]>([
    { provider: "google", connected: false },
    { provider: "discord", connected: false },
    { provider: "github", connected: false },
  ]);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchConnections();
  }, [isAuthenticated, isLoading, router]);

  const fetchConnections = async () => {
    try {
      const data = await apiRequest<OAuthConnection[]>(
        "/api/v1/auth/connections/"
      );
      setConnections(data);
    } catch {
      // If endpoint doesn't exist yet, keep defaults
    }
  };

  const handleConnect = async (provider: string) => {
    setLoadingProvider(provider);
    setMsg(null);
    try {
      const data = await apiRequest<{ url: string }>(
        `/api/v1/auth/oauth/${provider}/connect/`,
        { method: "POST" }
      );
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.message || `Failed to connect ${provider}.`,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setLoadingProvider(provider);
    setMsg(null);
    try {
      await apiRequest(`/api/v1/auth/oauth/${provider}/disconnect/`, {
        method: "DELETE",
      });
      setConnections((prev) =>
        prev.map((c) =>
          c.provider === provider
            ? { provider, connected: false }
            : c
        )
      );
      setMsg({ type: "success", text: `${provider} disconnected.` });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.message || `Failed to disconnect ${provider}.`,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const providerMeta: Record<
    string,
    { label: string; icon: string; color: string }
  > = {
    google: {
      label: "Google",
      icon: "G",
      color: "text-red-500 bg-red-50 border-red-100",
    },
    discord: {
      label: "Discord",
      icon: "D",
      color: "text-indigo-500 bg-indigo-50 border-indigo-100",
    },
    github: {
      label: "GitHub",
      icon: "GH",
      color: "text-content-primary bg-surface-primary border-border-subtle",
    },
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xs text-content-muted">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-6 h-6 text-accent-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Connected Accounts
            </h1>
          </div>
          <p className="text-sm text-content-secondary">
            Link external accounts for single sign-on and third-party
            integrations.
          </p>
        </div>

        {msg && (
          <div
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
              msg.type === "success"
                ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald"
                : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="p-6 rounded-3xl apple-glass-card space-y-3">
          {connections.map((conn) => {
            const meta = providerMeta[conn.provider] ?? {
              label: conn.provider,
              icon: conn.provider[0].toUpperCase(),
              color: "text-content-primary bg-surface-primary border-border-subtle",
            };
            const isLoading = loadingProvider === conn.provider;

            return (
              <div
                key={conn.provider}
                className="flex items-center justify-between p-4 rounded-2xl bg-surface-primary/60 border border-border-subtle"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${meta.color}`}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-content-primary">
                      {meta.label}
                    </div>
                    {conn.connected && conn.account_name ? (
                      <div className="text-xs text-content-muted mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-accent-emerald" />
                        <span>{conn.account_name}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-content-muted mt-0.5">
                        Not connected
                      </div>
                    )}
                  </div>
                </div>

                {conn.connected ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDisconnect(conn.provider)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral border border-accent-coral/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>{isLoading ? "…" : "Disconnect"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleConnect(conn.provider)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/20 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isLoading ? "…" : "Connect"}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-surface-primary border border-border-subtle">
          <p className="text-xs text-content-muted leading-relaxed">
            Connected accounts can be used for sign-in. Disconnecting an account
            does not delete your MovieFlow data. You must have a password set
            before disconnecting all external accounts.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
