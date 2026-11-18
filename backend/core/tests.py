import json
from django.test import TestCase
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from movieflow.asgi import application

class HealthCheckAPITest(TestCase):
    """Test suite for the Backend Health Check API endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        """Verify that the health check API responds with healthy status."""
        response = self.client.get('/api/core/health/')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertEqual(data.get('service'), 'movieflow-backend')
        self.assertIn('components', data)
        self.assertEqual(data['components']['database']['status'], 'up')
        self.assertEqual(data['components']['channels']['status'], 'up')

class ChannelsWebSocketTest(TestCase):
    """Test suite for Channels WebSocket consumer and routing."""

    async def test_websocket_health_consumer(self):
        """Verify WebSocket connection, ping-pong, and channel layer broadcast."""
        communicator = WebsocketCommunicator(application, "ws/health/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected, "WebSocket should connect successfully")

        # Check initial connection message
        response = await communicator.receive_from()
        data = json.loads(response)
        self.assertEqual(data.get("status"), "connected")
        self.assertEqual(data.get("service"), "movieflow-channels")

        # Send ping
        await communicator.send_to(text_data=json.dumps({"action": "ping", "timestamp": 12345}))
        response = await communicator.receive_from()
        data = json.loads(response)
        self.assertEqual(data.get("response"), "pong")
        self.assertEqual(data.get("client_timestamp"), 12345)

        # Test broadcast
        await communicator.send_to(text_data=json.dumps({
            "action": "broadcast_test",
            "payload": "channels broadcast test"
        }))
        response = await communicator.receive_from()
        data = json.loads(response)
        self.assertEqual(data.get("type"), "broadcast")
        self.assertEqual(data.get("payload"), "channels broadcast test")

        # Close connection
        await communicator.disconnect()
