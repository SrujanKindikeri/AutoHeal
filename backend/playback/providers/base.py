"""
Base class for playback providers.

A provider describes a legally-authorized playback method for external content.
Only supported methods are implemented:
  - Official embedded iframes (where ToS permits)
  - Deep links to the provider's official app / website
  - Official playback SDKs (when available)

Prohibited: stream extraction, DRM bypass, scraping private URLs,
redistribution of third-party content.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ProviderCapabilities:
    """Capability flags for a provider."""
    # Permitted in-app iframe/embed (official ToS authorisation required)
    supports_embedded_playback: bool = False
    # Synchronized multi-user group viewing permitted by provider
    supports_group_playback: bool = False
    # Provider exposes synchronization controls (play/pause/seek via SDK/API)
    supports_synchronized_controls: bool = False
    # Deep-link to provider's native app or website supported
    supports_deep_link: bool = True
    # What authentication / subscription is needed from the user
    auth_requirements: str = "none"
    # Additional notes (e.g. "sync via coordinated launch link only")
    notes: str = ""


@dataclass
class EmbedContext:
    """Data needed to render a provider embed."""
    embed_url: str
    width: int = 640
    height: int = 360
    allow_fullscreen: bool = True
    extra_params: dict = field(default_factory=dict)


@dataclass
class DeepLinkContext:
    """Data for a deep-link launch."""
    launch_url: str
    label: str = "Open in provider"


class BasePlaybackProvider(ABC):
    """
    Abstract base for all playback providers.

    Subclasses MUST define class attributes:
        id: str           – unique slug, e.g. "youtube-embed"
        name: str         – human name, e.g. "YouTube"
        provider_type: str – one of the PlaybackProvider.PROVIDER_TYPE_* values
    """

    id: str
    name: str
    provider_type: str

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """Return this provider's capability flags."""

    def get_embed_context(self, content_id: str, **kwargs) -> Optional[EmbedContext]:
        """
        Return embed context for the given content_id, or None if not supported.
        Only override if supports_embedded_playback is True.
        """
        return None

    def get_deep_link(self, content_id: str, **kwargs) -> Optional[DeepLinkContext]:
        """Return a deep-link context, or None if not supported."""
        return None

    def to_dict(self) -> dict:
        """Serialise provider info + capabilities for the API response."""
        caps = self.get_capabilities()
        return {
            "id": self.id,
            "name": self.name,
            "provider_type": self.provider_type,
            "capabilities": {
                "supports_embedded_playback": caps.supports_embedded_playback,
                "supports_group_playback": caps.supports_group_playback,
                "supports_synchronized_controls": caps.supports_synchronized_controls,
                "supports_deep_link": caps.supports_deep_link,
                "auth_requirements": caps.auth_requirements,
                "notes": caps.notes,
            },
        }
