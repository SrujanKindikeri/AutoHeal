"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppShell } from "@/components/navigation/AppShell";
import {
  getFriends,
  removeFriend,
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  searchSocialUsers,
  getUserDetail,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "@/lib/socialApi";
import {
  Friendship,
  FriendRequest,
  UserBlock,
  SocialUser,
  PaginatedUsers,
} from "@/types/social";
import { PublicUser } from "@/types/auth";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Shield,
  ShieldAlert,
  Check,
  X,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Film,
  Music,
  RefreshCw,
} from "lucide-react";

type ActiveTab = "friends" | "search" | "requests" | "blocked";

export default function FriendsPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: authLoading, initAuth } = useAuthStore();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("friends");

  // Data state
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PaginatedUsers | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  // Filter within friends list
  const [friendFilter, setFriendFilter] = useState("");

  // Modals & previews
  const [previewUser, setPreviewUser] = useState<SocialUser | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    onConfirm: async () => {},
  });

  // Action status message / Toast
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Initialize auth
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/friends");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load all social data
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const [friendsRes, incomingRes, outgoingRes, blockedRes] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
        getBlockedUsers(),
      ]);
      setFriends(friendsRes);
      setIncomingRequests(incomingRes);
      setOutgoingRequests(outgoingRes);
      setBlockedUsers(blockedRes);
    } catch (err: any) {
      showToast(err.message || "Failed to load social data", "error");
    } finally {
      setLoadingData(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setSearchPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Execute user search
  const executeSearch = useCallback(
    async (query: string, page: number) => {
      if (!query) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await searchSocialUsers(query, page);
        setSearchResults(res);
      } catch (err: any) {
        showToast(err.message || "Search failed", "error");
      } finally {
        setSearching(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (debouncedQuery) {
      executeSearch(debouncedQuery, searchPage);
    } else {
      setSearchResults(null);
    }
  }, [debouncedQuery, searchPage, executeSearch]);

  // Handle copy MovieFlow ID
  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open user profile preview
  const handleOpenPreview = async (user: PublicUser | SocialUser) => {
    setLoadingPreview(true);
    try {
      const detail = await getUserDetail(user.id);
      setPreviewUser(detail);
    } catch {
      // Fallback to basic public info if detail endpoint has issue
      setPreviewUser({
        ...user,
        relationship_status: "relationship_status" in user ? user.relationship_status : "none",
      } as SocialUser);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Actions: Send Friend Request
  const handleSendRequest = async (target: string, targetName: string) => {
    try {
      const res = await sendFriendRequest(target);
      if (res.status === "accepted_reciprocal") {
        showToast(`Mutual request! You and ${targetName} are now friends!`, "success");
        await loadAllData();
      } else {
        showToast(`Friend request sent to ${targetName}!`, "success");
        // Reload outgoing
        const out = await getOutgoingRequests();
        setOutgoingRequests(out);
      }
      // Refresh search results relationship status
      if (debouncedQuery) {
        executeSearch(debouncedQuery, searchPage);
      }
      if (previewUser) {
        const updated = await getUserDetail(previewUser.id);
        setPreviewUser(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Could not send friend request", "error");
    }
  };

  // Actions: Accept Friend Request
  const handleAcceptRequest = async (requestId: string, senderName: string) => {
    try {
      await acceptFriendRequest(requestId);
      showToast(`You are now friends with ${senderName}!`, "success");
      await loadAllData();
      if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
    } catch (err: any) {
      showToast(err.message || "Failed to accept request", "error");
    }
  };

  // Actions: Reject Friend Request
  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      showToast("Friend request declined", "info");
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
    } catch (err: any) {
      showToast(err.message || "Failed to decline request", "error");
    }
  };

  // Actions: Cancel Outgoing Request
  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelFriendRequest(requestId);
      showToast("Friend request canceled", "info");
      setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
    } catch (err: any) {
      showToast(err.message || "Failed to cancel request", "error");
    }
  };

  // Actions: Remove Friend (with confirmation)
  const promptRemoveFriend = (friendship: Friendship) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Friend",
      description: `Are you sure you want to remove ${friendship.friend.full_name || friendship.friend.username} from your friends? They will no longer see your friends-only activity.`,
      confirmLabel: "Remove Friend",
      danger: true,
      onConfirm: async () => {
        try {
          await removeFriend(friendship.id);
          showToast(`Removed ${friendship.friend.username} from friends`, "info");
          setFriends((prev) => prev.filter((f) => f.id !== friendship.id));
          if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
          if (previewUser?.id === friendship.friend.id) {
            setPreviewUser(null);
          }
        } catch (err: any) {
          showToast(err.message || "Failed to remove friend", "error");
        }
      },
    });
  };

  // Actions: Block User (with confirmation)
  const promptBlockUser = (userToBlock: PublicUser) => {
    setConfirmModal({
      isOpen: true,
      title: "Block User",
      description: `Are you sure you want to block @${userToBlock.username}? This will permanently remove any friendship or pending requests. Neither of you will be able to search or interact with each other.`,
      confirmLabel: "Block User",
      danger: true,
      onConfirm: async () => {
        try {
          await blockUser(userToBlock.id);
          showToast(`Blocked @${userToBlock.username}`, "info");
          await loadAllData();
          if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
          if (previewUser?.id === userToBlock.id) {
            setPreviewUser(null);
          }
        } catch (err: any) {
          showToast(err.message || "Failed to block user", "error");
        }
      },
    });
  };

  // Actions: Unblock User (with confirmation)
  const promptUnblockUser = (block: UserBlock) => {
    setConfirmModal({
      isOpen: true,
      title: "Unblock User",
      description: `Unblock @${block.blocked_user.username}? You will be able to search for each other and send friend requests again.`,
      confirmLabel: "Unblock",
      danger: false,
      onConfirm: async () => {
        try {
          await unblockUser(block.blocked_user.id);
          showToast(`Unblocked @${block.blocked_user.username}`, "success");
          setBlockedUsers((prev) => prev.filter((b) => b.id !== block.id));
          if (debouncedQuery) executeSearch(debouncedQuery, searchPage);
        } catch (err: any) {
          showToast(err.message || "Failed to unblock user", "error");
        }
      },
    });
  };

  // Filtered friends list
  const filteredFriends = friends.filter((f) => {
    if (!friendFilter.trim()) return true;
    const q = friendFilter.toLowerCase();
    return (
      f.friend.username.toLowerCase().includes(q) ||
      (f.friend.full_name && f.friend.full_name.toLowerCase().includes(q)) ||
      f.friend.movieflow_id.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "bg-surface-elevated border-accent-emerald/30 text-emerald-700"
              : toast.type === "error"
              ? "bg-surface-elevated border-accent-coral/30 text-accent-coral"
              : "bg-surface-elevated border-border-strong text-content-primary"
          }`}
        >
          {toast.type === "success" && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 text-purple-700 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-border-strong shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmModal.danger
                    ? "bg-accent-coral/10 text-accent-coral border border-accent-coral/20"
                    : "bg-accent-purple/10 text-accent-purple border border-accent-purple/20"
                }`}
              >
                {confirmModal.danger ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-content-primary">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-sm font-medium text-content-secondary hover:text-content-primary bg-surface-primary hover:bg-surface-primary/70 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  await action();
                }}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
                  confirmModal.danger
                    ? "bg-accent-coral hover:bg-accent-coral-hover text-white shadow-lg shadow-accent-coral/30"
                    : "bg-accent-purple hover:bg-accent-purple-hover text-white shadow-lg shadow-accent-purple/30"
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Preview Modal */}
      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white border border-border-strong shadow-2xl space-y-6">
            <button
              onClick={() => setPreviewUser(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-content-muted hover:text-content-primary hover:bg-surface-primary transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl border border-border-glass shrink-0">
                {previewUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUser.avatar_url}
                    alt={previewUser.username}
                    className="w-full h-full rounded-3xl object-cover"
                  />
                ) : (
                  (previewUser.full_name || previewUser.username).charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-xl font-bold tracking-tight truncate text-content-primary">
                  {previewUser.full_name || previewUser.username}
                </h3>
                <p className="text-sm text-accent-purple font-medium">@{previewUser.username}</p>
                <button
                  type="button"
                  onClick={() => handleCopyId(previewUser.movieflow_id)}
                  className="flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary bg-surface-primary px-2.5 py-1 rounded-full border border-border-glass transition mt-1"
                >
                  <span className="font-mono">{previewUser.movieflow_id}</span>
                  {copiedId === previewUser.movieflow_id ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Bio */}
            {previewUser.bio && (
              <div className="p-4 rounded-2xl bg-surface-primary/50 border border-border-subtle">
                <p className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">About</p>
                <p className="text-sm text-content-primary leading-relaxed">{previewUser.bio}</p>
              </div>
            )}

            {/* Movie & Music Interests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-primary/50 border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent-purple uppercase tracking-wider">
                  <Film className="w-3.5 h-3.5" />
                  <span>Favorite Movies</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {previewUser.preferred_movie_genres?.length ? (
                    previewUser.preferred_movie_genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs px-2 py-0.5 rounded-lg bg-surface-primary text-content-primary border border-border-glass"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-muted italic">None specified</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-primary/50 border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  <Music className="w-3.5 h-3.5" />
                  <span>Favorite Music</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {previewUser.preferred_music_genres?.length ? (
                    previewUser.preferred_music_genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs px-2 py-0.5 rounded-lg bg-surface-primary text-content-primary border border-border-glass"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-muted italic">None specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              {previewUser.relationship_status === "friends" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const f = friends.find((item) => item.friend.id === previewUser.id);
                      if (f) promptRemoveFriend(f);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-rose-600 hover:text-rose-700 bg-accent-coral/10 hover:bg-accent-coral/20 border border-accent-coral/20 transition"
                  >
                    Remove Friend
                  </button>
                  <button
                    onClick={() => promptBlockUser(previewUser)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-content-secondary hover:text-content-primary bg-surface-primary hover:bg-surface-primary/70 transition"
                  >
                    Block
                  </button>
                </div>
              ) : previewUser.relationship_status === "request_sent" ? (
                <span className="text-xs text-content-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Friend request pending
                </span>
              ) : previewUser.relationship_status === "request_received" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const req = incomingRequests.find((r) => r.sender.id === previewUser.id);
                      if (req) await handleAcceptRequest(req.id, previewUser.username);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-accent-purple hover:bg-accent-purple-hover text-white transition shadow-lg shadow-accent-purple/30"
                  >
                    Accept Request
                  </button>
                  <button
                    onClick={async () => {
                      const req = incomingRequests.find((r) => r.sender.id === previewUser.id);
                      if (req) await handleRejectRequest(req.id);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary transition"
                  >
                    Decline
                  </button>
                </div>
              ) : previewUser.relationship_status === "none" ? (
                <button
                  onClick={() => handleSendRequest(previewUser.movieflow_id, previewUser.username)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-accent-purple hover:bg-accent-purple-hover text-white transition shadow-lg shadow-accent-purple/30"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Send Friend Request</span>
                </button>
              ) : previewUser.relationship_status === "blocked" ? (
                <span className="text-xs text-rose-600">User is blocked</span>
              ) : (
                <span className="text-xs text-content-muted">This is your profile</span>
              )}

              <button
                type="button"
                onClick={() => setPreviewUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-content-secondary hover:text-content-primary bg-surface-primary transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border-subtle">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#1D1D1F] via-[#1D1D1F] to-[#6E6E73] bg-clip-text text-transparent">
              Friends & Community
            </h1>
            <p className="text-sm text-content-secondary">
              Synchronize watch parties, discover music, and connect seamlessly.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              title="Refresh social data"
              className="p-2.5 rounded-2xl bg-surface-primary hover:bg-surface-primary/70 border border-border-glass text-content-secondary hover:text-content-primary transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-surface-primary border border-border-glass text-xs font-medium text-content-primary">
              <Users className="w-3.5 h-3.5 text-accent-purple" />
              <span>{friends.length} Friends</span>
            </div>
            {incomingRequests.length > 0 && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 text-xs font-medium text-accent-purple">
                <Clock className="w-3.5 h-3.5" />
                <span>{incomingRequests.length} Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-6 pb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "friends"
                ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/30"
                : "bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "friends" ? "bg-black/20 text-white" : "bg-surface-primary text-content-muted"
              }`}
            >
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "search"
                ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/30"
                : "bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Find Friends</span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/30"
                : "bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-coral text-white font-bold animate-pulse">
                {incomingRequests.length}
              </span>
            )}
            {incomingRequests.length === 0 && outgoingRequests.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-primary text-content-muted">
                {outgoingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("blocked")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "blocked"
                ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/30"
                : "bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Blocked</span>
            {blockedUsers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-primary text-content-muted">
                {blockedUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Friends List */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {friends.length > 0 && (
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                <input
                  type="text"
                  placeholder="Filter your friends by name or ID..."
                  value={friendFilter}
                  onChange={(e) => setFriendFilter(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-surface-primary/50 border border-border-subtle text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-purple transition"
                />
              </div>
            )}

            {loadingData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-44 rounded-3xl bg-surface-primary/50 border border-border-subtle animate-pulse"
                  />
                ))}
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFriends.map((friendship) => {
                  const friend = friendship.friend;
                  return (
                    <div
                      key={friendship.id}
                      onClick={() => handleOpenPreview(friend)}
                      className="group cursor-pointer p-5 rounded-3xl bg-surface-primary/50 hover:bg-surface-primary border border-border-subtle hover:border-accent-purple/30 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-glass hover:shadow-glass-elevated"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md">
                            {friend.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={friend.avatar_url}
                                alt={friend.username}
                                className="w-full h-full rounded-2xl object-cover"
                              />
                            ) : (
                              (friend.full_name || friend.username).charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-content-primary group-hover:text-accent-purple transition truncate">
                              {friend.full_name || friend.username}
                            </h4>
                            <p className="text-xs text-content-muted truncate">@{friend.username}</p>
                          </div>
                        </div>

                        {/* Dropdown / Action trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            promptRemoveFriend(friendship);
                          }}
                          title="Remove Friend"
                          className="p-1.5 rounded-xl text-content-muted hover:text-accent-coral hover:bg-accent-coral/10 transition"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>

                      {/* MovieFlow ID tag */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(friend.movieflow_id, e)}
                          className="flex items-center gap-1.5 text-content-muted hover:text-content-primary font-mono bg-surface-primary px-2 py-1 rounded-lg border border-border-subtle transition"
                        >
                          <span>{friend.movieflow_id}</span>
                          {copiedId === friend.movieflow_id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-[11px] text-content-muted">
                          Friend since {new Date(friendship.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mx-auto border border-accent-purple/20">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-content-primary">No friends yet</h3>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Connect with other movie enthusiasts and music listeners. Find friends by their
                    unique MovieFlow ID or username.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("search")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-accent-purple hover:bg-accent-purple-hover text-white text-xs font-semibold shadow-lg shadow-accent-purple/30 transition"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Friends</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Find Friends (Search) */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-surface-primary/50 border border-border-subtle shadow-glass space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-content-primary">Discover People</h3>
                <p className="text-xs text-content-secondary">
                  Search by exact MovieFlow ID (e.g. MF-8K29X7P4), username, or display name.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                <input
                  type="text"
                  placeholder="Enter MovieFlow ID, username, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-surface-primary border border-border-glass text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-purple transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Results section */}
            {searching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-3xl bg-surface-primary/50 border border-border-subtle animate-pulse"
                  />
                ))}
              </div>
            ) : searchResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-content-secondary px-1">
                  <span>
                    Found {searchResults.count} {searchResults.count === 1 ? "user" : "users"}
                  </span>
                  <span>
                    Page {searchResults.current_page} of {searchResults.total_pages || 1}
                  </span>
                </div>

                {searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.results.map((resUser) => (
                      <div
                        key={resUser.id}
                        className="p-5 rounded-3xl bg-surface-primary/50 border border-border-subtle hover:border-accent-purple/30 transition-all flex items-center justify-between gap-4 shadow-glass"
                      >
                        <div
                          onClick={() => handleOpenPreview(resUser)}
                          className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md">
                            {resUser.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resUser.avatar_url}
                                alt={resUser.username}
                                className="w-full h-full rounded-2xl object-cover"
                              />
                            ) : (
                              (resUser.full_name || resUser.username).charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-content-primary hover:text-accent-purple transition truncate">
                              {resUser.full_name || resUser.username}
                            </h4>
                            <p className="text-xs text-content-muted truncate">@{resUser.username}</p>
                            <span className="inline-block mt-0.5 text-[11px] font-mono text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-md border border-accent-purple/20">
                              {resUser.movieflow_id}
                            </span>
                          </div>
                        </div>

                        {/* Relationship status action */}
                        <div className="shrink-0">
                          {resUser.relationship_status === "friends" ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-700 bg-accent-emerald/10 border border-accent-emerald/20">
                              <UserCheck className="w-3.5 h-3.5" />
                              Friends
                            </span>
                          ) : resUser.relationship_status === "request_sent" ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-700 bg-amber-500/10 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          ) : resUser.relationship_status === "request_received" ? (
                            <button
                              onClick={() => {
                                const req = incomingRequests.find((r) => r.sender.id === resUser.id);
                                if (req) handleAcceptRequest(req.id, resUser.username);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-accent-purple hover:bg-accent-purple-hover text-white transition shadow-md shadow-accent-purple/30"
                            >
                              Accept
                            </button>
                          ) : resUser.relationship_status === "none" ? (
                            <button
                              onClick={() => handleSendRequest(resUser.movieflow_id, resUser.username)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-accent-purple hover:bg-accent-purple-hover text-white transition shadow-md shadow-accent-purple/30"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Friend</span>
                            </button>
                          ) : resUser.relationship_status === "blocked" ? (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 bg-accent-coral/10 border border-accent-coral/20">
                              Blocked
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-medium text-content-muted bg-surface-primary">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle text-content-secondary text-sm">
                    No users found matching &ldquo;{debouncedQuery}&rdquo;.
                  </div>
                )}

                {/* Pagination */}
                {searchResults.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                      disabled={searchPage === 1}
                      className="p-2 rounded-xl bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-content-secondary">
                      Page {searchResults.current_page} of {searchResults.total_pages}
                    </span>
                    <button
                      onClick={() => setSearchPage((p) => Math.min(searchResults.total_pages, p + 1))}
                      disabled={searchPage >= searchResults.total_pages}
                      className="p-2 rounded-xl bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary border border-border-subtle disabled:opacity-40 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle text-content-muted text-xs">
                Start typing above to search for people by MovieFlow ID, username, or full name.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Requests (Incoming & Outgoing) */}
        {activeTab === "requests" && (
          <div className="space-y-8">
            {/* Incoming Requests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-content-primary flex items-center gap-2">
                  <span>Incoming Friend Requests</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple border border-accent-purple/25">
                    {incomingRequests.length}
                  </span>
                </h3>
              </div>

              {incomingRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-3xl bg-surface-primary/50 border border-border-subtle flex items-center justify-between gap-4 shadow-glass"
                    >
                      <div
                        onClick={() => handleOpenPreview(req.sender)}
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md">
                          {req.sender.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={req.sender.avatar_url}
                              alt={req.sender.username}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            (req.sender.full_name || req.sender.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-content-primary hover:text-accent-purple transition truncate">
                            {req.sender.full_name || req.sender.username}
                          </h4>
                          <p className="text-xs text-content-muted truncate">@{req.sender.username}</p>
                          <span className="text-[11px] font-mono text-accent-purple">
                            {req.sender.movieflow_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id, req.sender.username)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent-purple hover:bg-accent-purple-hover text-white transition shadow-md shadow-accent-purple/30"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle text-content-muted text-xs">
                  No incoming friend requests.
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-content-primary flex items-center gap-2">
                  <span>Sent Friend Requests</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-primary text-content-muted">
                    {outgoingRequests.length}
                  </span>
                </h3>
              </div>

              {outgoingRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-3xl bg-surface-primary/50 border border-border-subtle flex items-center justify-between gap-4 shadow-glass"
                    >
                      <div
                        onClick={() => handleOpenPreview(req.recipient)}
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 shadow-md">
                          {req.recipient.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={req.recipient.avatar_url}
                              alt={req.recipient.username}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            (req.recipient.full_name || req.recipient.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-content-primary hover:text-accent-purple transition truncate">
                            {req.recipient.full_name || req.recipient.username}
                          </h4>
                          <p className="text-xs text-content-muted truncate">@{req.recipient.username}</p>
                          <span className="text-[11px] font-mono text-content-muted">
                            Sent {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle text-content-muted text-xs">
                  No pending outgoing friend requests.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Blocked Users */}
        {activeTab === "blocked" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-content-primary">Blocked Users</h3>
              <p className="text-xs text-content-secondary">
                Blocked users cannot find your profile, view your activity, or send you friend requests.
              </p>
            </div>

            {blockedUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blockedUsers.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-3xl bg-surface-primary/50 border border-border-subtle flex items-center justify-between gap-4 shadow-glass"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-surface-primary border border-border-glass flex items-center justify-center font-bold text-content-muted shrink-0">
                        {b.blocked_user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.blocked_user.avatar_url}
                            alt={b.blocked_user.username}
                            className="w-full h-full rounded-2xl object-cover grayscale"
                          />
                        ) : (
                          (b.blocked_user.full_name || b.blocked_user.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-content-primary truncate">
                          {b.blocked_user.full_name || b.blocked_user.username}
                        </h4>
                        <p className="text-xs text-content-muted truncate">@{b.blocked_user.username}</p>
                        <span className="text-[11px] text-content-muted">
                          Blocked on {new Date(b.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => promptUnblockUser(b)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary transition"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-3xl bg-surface-primary/50 border border-border-subtle text-content-muted text-xs">
                You have not blocked any users.
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}
