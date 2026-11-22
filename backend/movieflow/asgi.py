"""
ASGI config for MovieFlow project.

HTTP: standard Django ASGI app.
WebSocket: JWT query-param auth middleware → URL router.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movieflow.settings')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from accounts.middleware import JWTQueryAuthMiddleware       # noqa: E402
import movieflow.routing                                      # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTQueryAuthMiddleware(
        URLRouter(
            movieflow.routing.websocket_urlpatterns
        )
    ),
})
