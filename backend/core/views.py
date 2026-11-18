import time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from channels.layers import get_channel_layer
import django

class HealthCheckView(APIView):
    """
    Comprehensive system health check API.
    Verifies Django, Database, and Channel Layer connectivity.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        health_data = {
            "status": "healthy",
            "service": "movieflow-backend",
            "timestamp": time.time(),
            "django_version": django.get_version(),
            "components": {}
        }
        overall_healthy = True

        # Check Database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if row and row[0] == 1:
                    db_name = str(connection.settings_dict.get("NAME", ""))
                    db_engine = str(connection.settings_dict.get("ENGINE", "")).split(".")[-1]
                    health_data["components"]["database"] = {
                        "status": "up",
                        "engine": db_engine,
                        "name": db_name
                    }
                else:
                    overall_healthy = False
                    health_data["components"]["database"] = {"status": "degraded"}
        except Exception as e:
            overall_healthy = False
            health_data["components"]["database"] = {
                "status": "down",
                "error": str(e)
            }

        # Check Channels / Channel Layer
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                layer_type = channel_layer.__class__.__name__
                health_data["components"]["channels"] = {
                    "status": "up",
                    "layer": layer_type
                }
            else:
                health_data["components"]["channels"] = {"status": "disabled"}
        except Exception as e:
            overall_healthy = False
            health_data["components"]["channels"] = {
                "status": "down",
                "error": str(e)
            }

        if not overall_healthy:
            health_data["status"] = "unhealthy"
            return Response(health_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(health_data, status=status.HTTP_200_OK)
