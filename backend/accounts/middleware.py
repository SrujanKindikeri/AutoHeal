"""
JWT WebSocket authentication middleware for Django Channels.

Reads ?token=<jwt> from the WebSocket query string, validates it via
djangorestframework-simplejwt, and populates scope['user'].
Unauthenticated connections receive an AnonymousUser (consumers enforce their
own access control after this point).
"""
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key: str):
    """Validate a JWT access token and return the associated User, or None."""
    try:
        token = AccessToken(token_key)
        user_id = token.get("user_id")
        if user_id is None:
            return None
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, Exception):
        return None


class JWTQueryAuthMiddleware:
    """
    ASGI middleware that reads ?token=<jwt> from the WebSocket handshake
    query string and populates scope['user'] with the authenticated user.

    Wrap the websocket branch in asgi.py:
        JWTQueryAuthMiddleware(URLRouter(websocket_urlpatterns))
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            token_list = params.get("token", [])
            if token_list:
                user = await get_user_from_token(token_list[0])
                scope["user"] = user if user is not None else AnonymousUser()
            else:
                scope["user"] = AnonymousUser()
        return await self.app(scope, receive, send)
