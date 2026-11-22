import re
import uuid
import logging
from typing import Any, Dict, List, Optional

from django.conf import settings

from playback.providers.base import BasePlaybackProvider, ProviderCapabilities, EmbedContext, DeepLinkContext
from playback.providers.registry import registry

logger = logging.getLogger(__name__)

YOUTUBE_ID_REGEX = re.compile(r'^[a-zA-Z0-9_-]{11}$')


@registry.register
class YouTubeEmbedProvider(BasePlaybackProvider):
    """
    YouTube IFrame Player API – authorized public embed.

    - Uses the official YouTube IFrame Player API (no stream extraction).
    - Embeds public/unlisted videos via youtube-nocookie.com (privacy-enhanced mode).
    - Synchronized group playback: coordinated via MovieFlow room state; each
      participant's player receives the same play/pause/seek commands through
      the room WebSocket. YouTube does NOT have a cross-user sync API, so
      synchronization is achieved by MovieFlow issuing JavaScript postMessage
      commands to each embedded player independently.
    - DRM: handled entirely by YouTube; MovieFlow does not touch protected streams.
    """

    # Class attributes (not @property) so registry.get_provider('youtube-embed') resolves.
    id = "youtube-embed"
    name = "YouTube (Official IFrame API)"
    provider_type = "licensed_embed"

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_embedded_playback=True,
            supports_group_playback=True,       # via coordinated postMessage commands
            supports_synchronized_controls=True,  # via IFrame JS API postMessage
            supports_deep_link=True,
            auth_requirements="none",
            notes=(
                "Synchronized playback achieved via coordinated postMessage to each "
                "participant's embedded player. YouTube does not provide a cross-user "
                "synchronization API; each client applies the host's seek/play/pause "
                "independently through the MovieFlow room WebSocket."
            ),
        )

    def _extract_video_id(self, content_id: str) -> str:
        if YOUTUBE_ID_REGEX.match(content_id):
            return content_id
        # Fallback: Interstellar official 4K trailer (public)
        return "zSWdZVtXT7E"

    def get_embed_context(self, content_id: str, **kwargs) -> Optional[EmbedContext]:
        video_id = self._extract_video_id(content_id)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:6060').rstrip('/')
        embed_url = (
            f"https://www.youtube-nocookie.com/embed/{video_id}"
            f"?enablejsapi=1&origin={frontend_url}&modestbranding=1&rel=0"
        )
        return EmbedContext(embed_url=embed_url, width=1280, height=720)

    def get_deep_link(self, content_id: str, **kwargs) -> Optional[DeepLinkContext]:
        video_id = self._extract_video_id(content_id)
        return DeepLinkContext(
            launch_url=f"https://www.youtube.com/watch?v={video_id}",
            label="Watch on YouTube",
        )

    def check_availability(self, content_id: str, territory: str = "GLOBAL") -> Dict[str, Any]:
        video_id = self._extract_video_id(content_id)
        embed_ctx = self.get_embed_context(video_id)
        deep_ctx = self.get_deep_link(video_id)
        return {
            "content_id": content_id,
            "provider_id": self.id,
            "availability_status": "available",
            "embed_url": embed_ctx.embed_url if embed_ctx else None,
            "deep_link_web": deep_ctx.launch_url if deep_ctx else None,
            "deep_link_app": f"vnd.youtube:{video_id}",
        }

    def create_playback_session(self, user: Any, content_id: str, room=None) -> Dict[str, Any]:
        video_id = self._extract_video_id(content_id)
        embed_ctx = self.get_embed_context(video_id)
        return {
            "session_id": str(uuid.uuid4()),
            "provider_id": self.id,
            "content_id": content_id,
            "video_id": video_id,
            "embed_url": embed_ctx.embed_url if embed_ctx else None,
            "session_status": "active",
        }
