"""
In-memory provider registry.

Providers register themselves via @registry.register.
Consumers call registry.get_provider(slug) or registry.list_providers().
"""
from typing import Dict, List, Optional, Type
from .base import BasePlaybackProvider


class ProviderRegistry:
    """Thread-safe (read-only after startup) in-memory provider registry."""

    def __init__(self):
        self._providers: Dict[str, BasePlaybackProvider] = {}

    def register(self, cls: Type[BasePlaybackProvider]) -> Type[BasePlaybackProvider]:
        """Class decorator: register a provider class by its id."""
        instance = cls()
        self._providers[instance.id] = instance
        return cls

    def get_provider(self, provider_id: str) -> Optional[BasePlaybackProvider]:
        return self._providers.get(provider_id)

    def list_providers(self) -> List[BasePlaybackProvider]:
        return list(self._providers.values())

    def all_as_dicts(self) -> List[dict]:
        return [p.to_dict() for p in self._providers.values()]


registry = ProviderRegistry()


def get_provider(provider_id: str) -> Optional[BasePlaybackProvider]:
    return registry.get_provider(provider_id)


def list_providers() -> List[BasePlaybackProvider]:
    return registry.list_providers()
