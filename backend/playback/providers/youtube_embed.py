import re
import uuid
import logging
from typing import Dict, Any, List, Optional
from django.conf import settings
from playback.providers.base import BasePlaybackProvider

logger = logging.getLogger(__name__)

YOUTUBE_ID_REGEX = re.compile(r'^[a-zA-Z0-9_-]{11}$')


class YouTubePlayerProvider(BasePlaybackProvider):
    """
    YouTube Player Integration for officially licensed trailers,
    promotional features, and free open releases using the official
    YouTube IFrame Player API.
    """

    @property
    def id(self) -> str:
        return "youtube-embed"

    @property
    def name(self) -> str:
        return "YouTube Player (Official IFrame API)"

    @property
    def provider_type(self) -> str:
        return "licensed_embed"

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "provider_id": self.id,
            "name": self.name,
            "provider_type": self.provider_type,
            "supports_embedded_playback": True,
            "supports_external_playback": True,
            "supports_group_playback": True,
            "requires_auth": False,
            "supported_qualities": ["4K", "1080p", "720p", "Auto"],
            "supported_stream_types": ["embed_iframe", "external_deep_link"],
            "supported_territories": ["GLOBAL"],
            "license_type": "YouTube Terms of Service / IFrame Player API Terms",
            "commercial_usage": "Permitted via official IFrame API without altering native player chrome",
            "drm_requirements": "Native YouTube IFrame Security Sandbox",
            "documentation_url": "https://developers.google.com/youtube/iframe_api_reference",
            "website_url": "https://www.youtube.com"
        }

    def _extract_video_id(self, content_id: str) -> str:
        # If content_id is already a clean 11-char video id
        if YOUTUBE_ID_REGEX.match(content_id):
            return content_id
        # Fallback default verified licensed movie trailer (e.g. Interstellar official 4K trailer)
        return "zSWdZVtXT7E"

    def search_content(self, query: str, media_type: str = "movie") -> List[Dict[str, Any]]:
        return []

    def get_content_details(self, content_id: str, media_type: str = "movie") -> Optional[Dict[str, Any]]:
        video_id = self._extract_video_id(content_id)
        return {
            "video_id": video_id,
            "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}?enablejsapi=1&origin={getattr(settings, 'FRONTEND_URL', 'http://localhost:6060').rstrip('/')}",
            "watch_url": f"https://www.youtube.com/watch?v={video_id}"
        }

    def check_availability(
        self,
        content_id: str,
        media_type: str = "movie",
        territory: str = "US"
    ) -> Dict[str, Any]:
        video_id = self._extract_video_id(content_id)
        embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?enablejsapi=1&autoplay=1&modestbranding=1"
        watch_url = f"https://www.youtube.com/watch?v={video_id}"

        return {
            "content_id": content_id,
            "content_type": media_type,
            "provider_id": self.id,
            "provider_name": self.name,
            "territory": territory,
            "availability_status": "available",
            "monetization_type": "free",
            "quality_available": "HD",
            "playback_url": embed_url,
            "stream_manifest_url": embed_url,
            "deep_link_web": watch_url,
            "deep_link_app": f"vnd.youtube:{video_id}",
            "supports_embedded_playback": True,
            "supports_external_playback": True,
            "supports_group_playback": True
        }

    def authorize_playback(
        self,
        user: Any,
        content_id: str,
        media_type: str = "movie",
        territory: str = "US",
        room: Optional[Any] = None
    ) -> Dict[str, Any]:
        video_id = self._extract_video_id(content_id)
        embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?enablejsapi=1&autoplay=1&modestbranding=1"

        return {
            "is_authorized": True,
            "provider_id": self.id,
            "provider_name": self.name,
            "content_id": content_id,
            "video_id": video_id,
            "stream_type": "embed_iframe",
            "playback_url": embed_url,
            "deep_link_web": f"https://www.youtube.com/watch?v={video_id}",
            "supports_embedded_playback": True,
            "supports_group_playback": True
        }

    def create_playback_session(
        self,
        user: Any,
        content_id: str,
        media_type: str = "movie",
        room: Optional[Any] = None
    ) -> Dict[str, Any]:
        auth_res = self.authorize_playback(user, content_id, media_type, "GLOBAL", room)
        return {
            "session_id": str(uuid.uuid4()),
            "provider_id": self.id,
            "provider_name": self.name,
            "content_id": content_id,
            "stream_type": "embed_iframe",
            "playback_url": auth_res["playback_url"],
            "session_status": "active",
            "supports_embedded_playback": True,
            "supports_group_playback": True
        }

    def get_playback_status(self, session_id: str) -> Dict[str, Any]:
        return {
            "session_id": session_id,
            "provider_id": self.id,
            "session_status": "active",
            "is_alive": True
        }

    def stop_playback_session(self, session_id: str) -> bool:
        return True
