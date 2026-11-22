"""
Playback provider capability API.

GET /api/v1/playback/providers/           – list all registered providers + capabilities
GET /api/v1/playback/providers/<id>/      – single provider detail
GET /api/v1/playback/providers/<id>/availability/?content_id=<id>  – availability check
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from playback.providers.registry import list_providers, get_provider


class ProviderListView(APIView):
    """List all registered playback providers with their capabilities."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        providers = [p.to_dict() for p in list_providers()]
        return Response({"providers": providers})


class ProviderDetailView(APIView):
    """Single provider detail."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, provider_id):
        provider = get_provider(provider_id)
        if provider is None:
            return Response(
                {"error": f"Provider '{provider_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(provider.to_dict())


class ProviderAvailabilityView(APIView):
    """
    Check whether a specific piece of content is available via a provider.

    GET /api/v1/playback/providers/<provider_id>/availability/?content_id=<id>
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, provider_id):
        provider = get_provider(provider_id)
        if provider is None:
            return Response(
                {"error": f"Provider '{provider_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        content_id = request.query_params.get("content_id", "")
        if not content_id:
            return Response(
                {"error": "content_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if hasattr(provider, "check_availability"):
            result = provider.check_availability(content_id)
        else:
            result = {"content_id": content_id, "provider_id": provider_id, "availability_status": "unknown"}
        return Response(result)
