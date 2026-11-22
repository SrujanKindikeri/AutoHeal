"""
DRF permission classes for the rooms API.
"""
from rest_framework import permissions
from rooms.models import RoomParticipant


class IsHost(permissions.BasePermission):
    """
    Object-level permission: request.user is the host or co-host of the room.
    The view must pass the Room instance as the obj.
    """
    message = "Only the room host can perform this action."

    def has_object_permission(self, request, view, obj):
        # obj is a Room
        return RoomParticipant.objects.filter(
            room=obj,
            user=request.user,
            role__in=[RoomParticipant.ROLE_HOST, RoomParticipant.ROLE_CO_HOST],
            status=RoomParticipant.STATUS_JOINED,
        ).exists()


class IsRoomParticipant(permissions.BasePermission):
    """
    Object-level permission: request.user is an active participant of the room.
    """
    message = "You are not a participant in this room."

    def has_object_permission(self, request, view, obj):
        # obj is a Room
        return RoomParticipant.objects.filter(
            room=obj,
            user=request.user,
            status=RoomParticipant.STATUS_JOINED,
        ).exists()
