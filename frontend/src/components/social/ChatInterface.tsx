"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, MessageCircle, Smile } from "lucide-react";

export interface ChatMessage {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  content: string;
  timestamp: string;
}

export interface ChatInterfaceProps {
  /** Messages to display */
  messages: ChatMessage[];
  /** Current user ID — used to distinguish own vs others' messages */
  currentUserId: string;
  /** Called when the user submits a new message */
  onSendMessage: (content: string) => void;
  /** Optional: loading/connecting state */
  isConnecting?: boolean;
  /** Optional: allow collapsing the panel */
  onClose?: () => void;
  /** Optional class override for the outer container */
  className?: string;
}

const EMOJI_SHORTCUTS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

/** White-theme chat panel used inside a room or watch-together session. */
export function ChatInterface({
  messages,
  currentUserId,
  onSendMessage,
  isConnecting = false,
  onClose,
  className = "",
}: ChatInterfaceProps) {
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;
      onSendMessage(text);
      setDraft("");
      setShowEmoji(false);
      inputRef.current?.focus();
    },
    [draft, onSendMessage]
  );

  const handleEmojiPick = useCallback(
    (emoji: string) => {
      setDraft((prev) => prev + emoji);
      setShowEmoji(false);
      inputRef.current?.focus();
    },
    []
  );

  return (
    <div
      className={`flex flex-col bg-white border border-border-subtle rounded-3xl shadow-glass overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-primary/60">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-semibold text-content-primary">Room Chat</span>
          {isConnecting && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Connecting…
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-content-muted hover:text-content-primary hover:bg-surface-primary transition"
            title="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-2">
            <MessageCircle className="w-8 h-8 text-content-muted/50" />
            <p className="text-xs text-content-muted">
              {isConnecting ? "Connecting to chat…" : "No messages yet. Say hello!"}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.user.id === currentUserId;
            const initials = msg.user.username.slice(0, 1).toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-purple to-accent-blue flex items-center justify-center text-[11px] font-bold text-white shrink-0 self-end">
                  {msg.user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.user.avatar_url}
                      alt={msg.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] space-y-1 ${isSelf ? "items-end" : "items-start"} flex flex-col`}>
                  {!isSelf && (
                    <span className="text-[10px] font-medium text-content-muted px-1">
                      {msg.user.username}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                      isSelf
                        ? "bg-accent-blue text-white rounded-br-sm"
                        : "bg-surface-primary border border-border-subtle text-content-primary rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-content-muted px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border-subtle bg-surface-primary/40">
        {/* Emoji picker */}
        {showEmoji && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            {EMOJI_SHORTCUTS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiPick(emoji)}
                className="text-lg hover:scale-125 transition-transform"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="p-2 rounded-xl text-content-muted hover:text-content-primary hover:bg-surface-primary transition shrink-0"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isConnecting ? "Connecting…" : "Type a message…"}
            disabled={isConnecting}
            className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white border border-border-glass text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-blue transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!draft.trim() || isConnecting}
            className="p-2 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white shrink-0 transition disabled:opacity-40 shadow-sm"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
