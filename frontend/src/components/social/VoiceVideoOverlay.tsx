"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Settings,
} from "lucide-react";

export interface VoiceVideoOverlayProps {
  /** True when the user's microphone is active */
  micEnabled: boolean;
  /** True when the user's camera is active */
  cameraEnabled: boolean;
  /** True when room audio is muted locally */
  speakerMuted: boolean;
  /** Called when the mic toggle button is pressed */
  onToggleMic: () => void;
  /** Called when the camera toggle button is pressed */
  onToggleCamera: () => void;
  /** Called when the speaker toggle button is pressed */
  onToggleSpeaker: () => void;
  /** Called when the user wants to leave/end the call */
  onLeave: () => void;
  /** Optional settings handler */
  onOpenSettings?: () => void;
  /** Participant count displayed in the bar */
  participantCount?: number;
}

/**
 * Floating controls bar for voice/video in a watch-together room.
 * Renders a white-theme pill of icon buttons — no hardcoded dark colours.
 */
export function VoiceVideoOverlay({
  micEnabled,
  cameraEnabled,
  speakerMuted,
  onToggleMic,
  onToggleCamera,
  onToggleSpeaker,
  onLeave,
  onOpenSettings,
  participantCount,
}: VoiceVideoOverlayProps) {
  return (
    <div
      className="
        inline-flex items-center gap-1 px-3 py-2.5
        bg-white border border-border-subtle
        rounded-full shadow-glass-elevated
      "
      role="toolbar"
      aria-label="Voice and video controls"
    >
      {/* Participant count pill */}
      {participantCount !== undefined && (
        <span className="text-[11px] font-semibold text-content-secondary px-2 py-1 rounded-full bg-surface-primary border border-border-subtle mr-1">
          {participantCount} in room
        </span>
      )}

      {/* Microphone */}
      <ControlButton
        active={micEnabled}
        onClick={onToggleMic}
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        activeIcon={<Mic className="w-4 h-4" />}
        inactiveIcon={<MicOff className="w-4 h-4" />}
        inactiveClass="text-accent-coral bg-accent-coral/10 border-accent-coral/20 hover:bg-accent-coral/20"
      />

      {/* Camera */}
      <ControlButton
        active={cameraEnabled}
        onClick={onToggleCamera}
        title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
        activeIcon={<Video className="w-4 h-4" />}
        inactiveIcon={<VideoOff className="w-4 h-4" />}
        inactiveClass="text-accent-coral bg-accent-coral/10 border-accent-coral/20 hover:bg-accent-coral/20"
      />

      {/* Speaker */}
      <ControlButton
        active={!speakerMuted}
        onClick={onToggleSpeaker}
        title={speakerMuted ? "Unmute speaker" : "Mute speaker"}
        activeIcon={<Volume2 className="w-4 h-4" />}
        inactiveIcon={<VolumeX className="w-4 h-4" />}
        inactiveClass="text-content-muted bg-surface-primary border-border-subtle hover:bg-surface-primary/80"
      />

      {/* Settings (optional) */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="
            p-2 rounded-full border
            text-content-secondary bg-transparent border-transparent
            hover:bg-surface-primary hover:border-border-subtle
            transition
          "
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-border-subtle mx-1" aria-hidden />

      {/* Leave / end call */}
      <button
        onClick={onLeave}
        title="Leave room"
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          bg-accent-coral hover:bg-accent-coral-hover
          text-white text-xs font-semibold
          shadow-sm transition
        "
      >
        <PhoneOff className="w-3.5 h-3.5" />
        <span>Leave</span>
      </button>
    </div>
  );
}

// ─── Internal helper ───────────────────────────────────────────────────────

interface ControlButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  /** Tailwind classes applied when the control is in its inactive/off state */
  inactiveClass: string;
}

function ControlButton({
  active,
  onClick,
  title,
  activeIcon,
  inactiveIcon,
  inactiveClass,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-full border transition
        ${
          active
            ? "text-content-primary bg-transparent border-transparent hover:bg-surface-primary hover:border-border-subtle"
            : inactiveClass
        }
      `}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}
