"""
Rooms REST API views.

Endpoints:
  POST   /api/v1/rooms/                        – create room
  GET    /api/v1/rooms/                        – list my rooms
  GET    /api/v1/rooms/discover/               – discoverable public rooms
  GET    /api/v1/rooms/<room_id>/              – room detail
  POST   /api/v1/rooms/<room_id>/join/         – join room
  POST   /api/v1/rooms/<room_id>/leave/        – leave room
  POST   /api/v1/rooms/<room_id>/end/          – end room (host only)
  POST   /api/v1/rooms/<room_id>/kick/         – kick participant (host only)
  POST   /api/v1/rooms/<room_id>/invite/       – create invitation
  GET    /api/v1/invitations/<token>/          – get invitation by token
  POST   /api/v1/invitations/<token>/accept/   – accept invitation
  POST   /api/v1/invitations/<token>/reject/   – reject invitation
"""
import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rooms.models import Room, RoomParticipant, RoomInvitation
from rooms.permissions import IsHost
from rooms.serializers import (
    RoomSerializer,
    RoomCreateSerializer,
    RoomInvitationSerializer,
    RoomInvitationCreateSerializer,
)

User = get_user_model()


def _check_password(room: Room, plain: str) -> bool:
    if not room.password_hash:
        return True
    if not plain:
        return False
    try:
        _, salt, stored_hash = room.password_hash.split(':')
        candidate = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100000).hex()
        return candidate == stored_hash
    except Exception:
        return False


class RoomListCreateView(APIView):
    """List my rooms or create a new room."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        participations = RoomParticipant.objects.filter(
            user=request.user,
            status=RoomParticipant.STATUS_JOINED,
        ).select_related('room').values_list('room_id', flat=True)
        rooms = Room.objects.filter(id__in=participations).order_by('-created_at')
        serializer = RoomSerializer(rooms, many=True, context={'request': request})
        return Response({'rooms': serializer.data})

    def post(self, request):
        serializer = RoomCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        room = serializer.save(host=request.user)
        # Add creator as host participant
        RoomParticipant.objects.create(
            room=room,
            user=request.user,
            role=RoomParticipant.ROLE_HOST,
            status=RoomParticipant.STATUS_JOINED,
            joined_at=timezone.now(),
        )
        return Response(RoomSerializer(room, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


class RoomDiscoverView(APIView):
    """List public, live/waiting rooms."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rooms = Room.objects.filter(
            visibility=Room.VISIBILITY_PUBLIC,
            status__in=[Room.STATUS_WAITING, Room.STATUS_LIVE],
        ).order_by('-created_at')[:50]
        serializer = RoomSerializer(rooms, many=True, context={'request': request})
        return Response({'rooms': serializer.data})


class RoomDetailView(APIView):
    """Retrieve room detail."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        try:
            room = Room.objects.prefetch_related('participants__user').get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Private rooms: only participants may view
        if room.visibility == Room.VISIBILITY_PRIVATE:
            is_participant = RoomParticipant.objects.filter(
                room=room, user=request.user,
                status=RoomParticipant.STATUS_JOINED,
            ).exists()
            if not is_participant:
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(RoomSerializer(room, context={'request': request}).data)


class RoomJoinView(APIView):
    """Join a room."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if room.status == Room.STATUS_ENDED:
            return Response({'error': 'Room has ended.'}, status=status.HTTP_410_GONE)

        # Capacity check
        current_count = RoomParticipant.objects.filter(
            room=room, status=RoomParticipant.STATUS_JOINED
        ).count()
        if current_count >= room.max_participants:
            return Response({'error': 'Room is full.'}, status=status.HTTP_409_CONFLICT)

        # Private room access: valid invite token OR matching password OR already a participant
        existing = RoomParticipant.objects.filter(room=room, user=request.user).first()
        if existing and existing.status == RoomParticipant.STATUS_JOINED:
            return Response(RoomSerializer(room, context={'request': request}).data)

        if room.visibility == Room.VISIBILITY_PRIVATE:
            invite_token = request.data.get('invite_token', '')
            password = request.data.get('password', '')
            granted = False

            if invite_token:
                try:
                    inv = RoomInvitation.objects.get(
                        token=invite_token, room=room, status=RoomInvitation.STATUS_PENDING
                    )
                    if inv.expires_at < timezone.now():
                        inv.status = RoomInvitation.STATUS_EXPIRED
                        inv.save(update_fields=['status'])
                        return Response({'error': 'Invitation has expired.'}, status=status.HTTP_403_FORBIDDEN)
                    # Must match the invitee or the email
                    if (inv.invitee and inv.invitee == request.user) or (inv.email == request.user.email):
                        granted = True
                except RoomInvitation.DoesNotExist:
                    pass

            if not granted and room.password_hash and _check_password(room, password):
                granted = True

            if not granted:
                return Response(
                    {'error': 'Private room: a valid invitation token or password is required.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Create or re-activate participant row
        if existing:
            existing.status = RoomParticipant.STATUS_JOINED
            existing.joined_at = timezone.now()
            existing.left_at = None
            existing.connection_status = RoomParticipant.CONNECTION_CONNECTED
            existing.save(update_fields=['status', 'joined_at', 'left_at', 'connection_status'])
        else:
            RoomParticipant.objects.create(
                room=room,
                user=request.user,
                role=RoomParticipant.ROLE_PARTICIPANT,
                status=RoomParticipant.STATUS_JOINED,
                joined_at=timezone.now(),
                connection_status=RoomParticipant.CONNECTION_CONNECTED,
            )

        # Move room to LIVE if it was waiting
        if room.status == Room.STATUS_WAITING:
            room.status = Room.STATUS_LIVE
            room.actual_start_time = room.actual_start_time or timezone.now()
            room.save(update_fields=['status', 'actual_start_time'])

        return Response(RoomSerializer(room, context={'request': request}).data)


class RoomLeaveView(APIView):
    """Leave a room."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            participant = RoomParticipant.objects.get(
                room=room, user=request.user, status=RoomParticipant.STATUS_JOINED
            )
        except RoomParticipant.DoesNotExist:
            return Response({'error': 'You are not in this room.'}, status=status.HTTP_400_BAD_REQUEST)

        was_host = participant.role == RoomParticipant.ROLE_HOST
        participant.status = RoomParticipant.STATUS_LEFT
        participant.left_at = timezone.now()
        participant.save(update_fields=['status', 'left_at'])

        if was_host:
            # Transfer host to next participant or end room
            next_p = RoomParticipant.objects.filter(
                room=room, status=RoomParticipant.STATUS_JOINED
            ).exclude(user=request.user).first()
            if next_p:
                next_p.role = RoomParticipant.ROLE_HOST
                next_p.save(update_fields=['role'])
            else:
                room.status = Room.STATUS_ENDED
                room.end_time = timezone.now()
                room.save(update_fields=['status', 'end_time'])

        return Response({'detail': 'Left room.'})


class RoomEndView(APIView):
    """End a room (host only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not IsHost().has_object_permission(request, self, room):
            return Response({'error': 'Only the host can end the room.'}, status=status.HTTP_403_FORBIDDEN)

        room.status = Room.STATUS_ENDED
        room.end_time = timezone.now()
        room.save(update_fields=['status', 'end_time'])
        RoomParticipant.objects.filter(room=room, status=RoomParticipant.STATUS_JOINED).update(
            status=RoomParticipant.STATUS_LEFT, left_at=timezone.now()
        )
        return Response({'detail': 'Room ended.'})


class RoomKickView(APIView):
    """Kick a participant from a room (host only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not IsHost().has_object_permission(request, self, room):
            return Response({'error': 'Only the host can kick participants.'}, status=status.HTTP_403_FORBIDDEN)

        target_id = request.data.get('user_id')
        if not target_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = RoomParticipant.objects.get(
                room=room, user_id=target_id, status=RoomParticipant.STATUS_JOINED
            )
        except RoomParticipant.DoesNotExist:
            return Response({'error': 'User is not in the room.'}, status=status.HTTP_404_NOT_FOUND)

        if participant.role == RoomParticipant.ROLE_HOST:
            return Response({'error': 'Cannot kick the host.'}, status=status.HTTP_400_BAD_REQUEST)

        participant.status = RoomParticipant.STATUS_REMOVED
        participant.left_at = timezone.now()
        participant.save(update_fields=['status', 'left_at'])
        return Response({'detail': 'Participant removed.'})


class RoomInviteCreateView(APIView):
    """Create an invitation for a room (host or participant)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Must be a participant to invite
        if not RoomParticipant.objects.filter(
            room=room, user=request.user, status=RoomParticipant.STATUS_JOINED
        ).exists():
            return Response({'error': 'You must be in the room to invite others.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RoomInvitationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        invitee = None
        email = data.get('email', '').strip()
        expires_at = timezone.now() + timedelta(hours=data['expires_in_hours'])

        if data.get('invitee_id'):
            try:
                invitee = User.objects.get(id=data['invitee_id'])
            except User.DoesNotExist:
                return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            email = invitee.email

        # Reuse an existing pending invite for the same invitee/email
        if invitee:
            existing = RoomInvitation.objects.filter(
                room=room, invitee=invitee, status=RoomInvitation.STATUS_PENDING
            ).first()
        else:
            existing = RoomInvitation.objects.filter(
                room=room, email=email, status=RoomInvitation.STATUS_PENDING
            ).first()

        if existing:
            if existing.expires_at < timezone.now():
                existing.expires_at = expires_at
                existing.token = secrets.token_urlsafe(32)
                existing.save(update_fields=['expires_at', 'token'])
            return Response(RoomInvitationSerializer(existing).data, status=status.HTTP_200_OK)

        try:
            invitation = RoomInvitation.objects.create(
                room=room,
                inviter=request.user,
                invitee=invitee,
                email=email,
                token=secrets.token_urlsafe(32),
                expires_at=expires_at,
                status=RoomInvitation.STATUS_PENDING,
            )
        except IntegrityError:
            # Race: return existing
            existing = RoomInvitation.objects.filter(
                room=room,
                invitee=invitee,
                status=RoomInvitation.STATUS_PENDING,
            ).first() or RoomInvitation.objects.filter(
                room=room, email=email, status=RoomInvitation.STATUS_PENDING
            ).first()
            if existing:
                return Response(RoomInvitationSerializer(existing).data, status=status.HTTP_200_OK)
            return Response({'error': 'Could not create invitation.'}, status=status.HTTP_409_CONFLICT)

        return Response(RoomInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Invitation views (fix field mismatch from original broken implementation)
# ---------------------------------------------------------------------------

class RoomInvitationByTokenView(APIView):
    """
    GET /api/v1/invitations/<token>/
    Returns invitation details. Returns room.name (not a nonexistent room_name field).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"code": "AUTH_REQUIRED", "next": f"/invitations/{token}"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if hasattr(request.user, 'is_email_verified') and not request.user.is_email_verified:
            return Response(
                {"code": "EMAIL_VERIFICATION_REQUIRED"},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            invitation = RoomInvitation.objects.select_related('inviter', 'room').get(token=token)
        except RoomInvitation.DoesNotExist:
            return Response({"error": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": str(invitation.id),
            "token": invitation.token,
            "room_name": invitation.room.name,          # FIXED: was invitation.room_name
            "room_id": str(invitation.room.id),
            "room_type": invitation.room.room_type,
            "inviter": {
                "id": str(invitation.inviter.id),
                "username": invitation.inviter.username,
                "full_name": (invitation.inviter.full_name
                              if hasattr(invitation.inviter, 'full_name')
                              else invitation.inviter.get_full_name()),
                "movieflow_id": (invitation.inviter.movieflow_id
                                 if hasattr(invitation.inviter, 'movieflow_id') else ''),
            },
            "status": invitation.status,
            "expires_at": invitation.expires_at.isoformat(),
            "is_expired": invitation.expires_at < timezone.now(),
        }, status=status.HTTP_200_OK)


class RoomInvitationAcceptView(APIView):
    """POST /api/v1/invitations/<token>/accept/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        try:
            invitation = RoomInvitation.objects.select_related('room').get(
                token=token, status=RoomInvitation.STATUS_PENDING
            )
        except RoomInvitation.DoesNotExist:
            return Response({"error": "Invitation not found or already used."}, status=status.HTTP_404_NOT_FOUND)

        if invitation.expires_at < timezone.now():
            invitation.status = RoomInvitation.STATUS_EXPIRED
            invitation.save(update_fields=['status'])
            return Response({"error": "Invitation has expired."}, status=status.HTTP_410_GONE)

        # Verify this invite is for this user (by user FK or by email match)
        invitee_email = invitation.email or (invitation.invitee.email if invitation.invitee else '')  # FIXED
        if invitation.invitee and invitation.invitee != request.user:
            if request.user.email != invitee_email:
                return Response({"error": "This invitation is not for you."}, status=status.HTTP_403_FORBIDDEN)

        invitation.status = RoomInvitation.STATUS_ACCEPTED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])

        return Response({
            "detail": "Invitation accepted.",
            "room_id": str(invitation.room.id),
            "room_name": invitation.room.name,
        })


class RoomInvitationRejectView(APIView):
    """POST /api/v1/invitations/<token>/reject/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        try:
            invitation = RoomInvitation.objects.select_related('room').get(
                token=token, status=RoomInvitation.STATUS_PENDING
            )
        except RoomInvitation.DoesNotExist:
            return Response({"error": "Invitation not found or already used."}, status=status.HTTP_404_NOT_FOUND)

        invitee_email = invitation.email or (invitation.invitee.email if invitation.invitee else '')  # FIXED
        if invitation.invitee and invitation.invitee != request.user:
            if request.user.email != invitee_email:
                return Response({"error": "This invitation is not for you."}, status=status.HTTP_403_FORBIDDEN)

        invitation.status = RoomInvitation.STATUS_REJECTED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])

        return Response({"detail": "Invitation rejected."})
