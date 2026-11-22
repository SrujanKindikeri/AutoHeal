"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { SmilePlus } from "lucide-react";

export interface ReactionCount {
  emoji: string;
  count: number;
  /** Whether the current user has reacted with this emoji */
  reacted: boolean;
}

export interface ReactionsProps {
  /** Current reaction tally */
  reactions: ReactionCount[];
  /** Called when user picks an emoji to react with */
  onReact: (emoji: string) => void;
  /** Optional: disable interaction (e.g. not logged in) */
  disabled?: boolean;
}

const AVAILABLE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "🎬"];

/**
 * Emoji reaction bar for watch-together rooms.
 * Displays an overflow button that reveals the full emoji picker.
 * No hardcoded dark colours — uses CSS token classes throughout.
 */
export function Reactions({ reactions, onReact, disabled = false }: ReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const handleReact = useCallback(
    (emoji: string) => {
      if (disabled) return;
      onReact(emoji);
      setPickerOpen(false);
    },
    [disabled, onReact]
  );

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 flex-wrap">
      {/* Existing reaction counters */}
      {reactions.map(({ emoji, count, reacted }) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={disabled}
          title={reacted ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition
            ${
              reacted
                ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/20"
                : "bg-surface-primary border-border-subtle text-content-secondary hover:bg-surface-primary/70 hover:border-border-glass"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}

      {/* Add reaction */}
      <div className="relative">
        <button
          onClick={() => !disabled && setPickerOpen((s) => !s)}
          disabled={disabled}
          title="Add reaction"
          className="
            flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
            bg-surface-primary border border-border-subtle text-content-muted
            hover:bg-surface-primary/70 hover:text-content-secondary
            transition disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <SmilePlus className="w-3.5 h-3.5" />
          <span>React</span>
        </button>

        {pickerOpen && (
          <div
            className="
              absolute bottom-full mb-2 left-0 z-50
              flex items-center gap-1 p-2 rounded-2xl
              bg-white border border-border-subtle shadow-glass-elevated
              animate-scale-in
            "
          >
            {AVAILABLE_REACTIONS.map((emoji) => {
              const isActive = reactions.find((r) => r.emoji === emoji)?.reacted ?? false;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  title={`React with ${emoji}`}
                  className={`
                    text-xl p-1.5 rounded-xl transition hover:scale-125
                    ${isActive ? "bg-accent-blue/10 ring-1 ring-accent-blue/30" : "hover:bg-surface-primary"}
                  `}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
