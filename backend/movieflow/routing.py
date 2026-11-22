from django.urls import re_path
from core.consumers import HealthConsumer
from rooms.consumers import RoomPlaybackConsumer

websocket_urlpatterns = [
    re_path(r'^ws/health/$', HealthConsumer.as_asgi()),
    re_path(r'^ws/rooms/(?P<room_id>[0-9a-f-]+)/$', RoomPlaybackConsumer.as_asgi()),
]
