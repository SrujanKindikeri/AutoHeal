"""
DeepLinkOnlyProvider – a stub for providers that do NOT support synchronized
in-app playback. The UI renders a clearly-labelled "Open in <provider>" button
instead of a synchronized player. This prevents false "it works" indicators.
"""
from typing import Optional
from .base import BasePlaybackProvider, ProviderCapabilities, DeepLinkContext
from .registry import registry


@registry.register
class DeepLinkOnlyProvider(BasePlaybackProvider):
    """
    Generic deep-link stub for providers without authorized embed or sync support.
    """

    id = "deep-link-only"
    name = "External Provider (Deep Link)"
    provider_type = "ott_aggregator"

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_embedded_playback=False,
            supports_group_playback=False,
            supports_synchronized_controls=False,
            supports_deep_link=True,
            auth_requirements="varies",
            notes=(
                "This provider does not support synchronized in-app playback. "
                "Users are directed to the provider's official app or website. "
                "Synchronized viewing is not available."
            ),
        )

    def get_deep_link(self, content_id: str, **kwargs) -> Optional[DeepLinkContext]:
        url = kwargs.get("launch_url", "")
        label = kwargs.get("label", "Open in provider")
        if not url:
            return None
        return DeepLinkContext(launch_url=url, label=label)
