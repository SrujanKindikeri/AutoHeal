"use client";

import React, { useEffect, useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getShareLink } from "@/lib/musicApi";
import type { PlaylistVisibility } from "@/types/music";

interface PlaylistShareModalProps {
  playlistId: string;
  visibility: PlaylistVisibility;
  isOpen: boolean;
  onClose: () => void;
}

export const PlaylistShareModal: React.FC<PlaylistShareModalProps> = ({
  playlistId,
  visibility,
  isOpen,
  onClose,
}) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getShareLink(playlistId)
      .then((data) => setShareUrl(data.share_url))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to get share link")
      )
      .finally(() => setLoading(false));
  }, [isOpen, playlistId]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input text
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share Playlist" size="sm">
      <div className="space-y-4">
        {visibility === "private" && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This playlist is private. Only collaborators can access it via
              this link. Change visibility to &ldquo;Unlisted&rdquo; or
              &ldquo;Public&rdquo; to share broadly.
            </span>
          </div>
        )}

        {loading && (
          <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {shareUrl && !loading && (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="sm"
              variant={copied ? "secondary" : "glass"}
              leftIcon={
                copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}

        <p className="text-xs text-white/30">
          MovieFlow does not own or control playback of these tracks. Playback
          depends on an authorized provider.
        </p>
      </div>
    </Modal>
  );
};

export default PlaylistShareModal;
