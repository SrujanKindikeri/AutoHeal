import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer

class HealthConsumer(AsyncWebsocketConsumer):
    """
    Health and connectivity WebSocket consumer.
    Used for verifying real-time WebSocket and Channels health.
    """
    async def connect(self):
        self.room_group_name = "health_status_group"

        # Join health group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send initial connected status
        await self.send(text_data=json.dumps({
            "status": "connected",
            "service": "movieflow-channels",
            "message": "WebSocket connection established successfully",
            "timestamp": time.time()
        }))

    async def disconnect(self, close_code):
        # Leave health group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            data = {"action": text_data}

        action = data.get("action", "ping")

        if action == "ping":
            await self.send(text_data=json.dumps({
                "response": "pong",
                "client_timestamp": data.get("timestamp"),
                "server_timestamp": time.time(),
                "channel_layer": self.channel_layer.__class__.__name__
            }))
        elif action == "broadcast_test":
            # Test group broadcast
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "health_broadcast",
                    "payload": data.get("payload", "hello from channel layer")
                }
            )

    async def health_broadcast(self, event):
        await self.send(text_data=json.dumps({
            "type": "broadcast",
            "payload": event["payload"],
            "server_timestamp": time.time()
        }))
