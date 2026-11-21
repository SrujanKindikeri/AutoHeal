from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from rooms.models import RoomInvitation


class RoomInvitationByTokenView(APIView):
    """
    GET /api/v1/invitations/<token>/
    Returns invitation details if the user is authenticated and verified.
    - 401 AUTH_REQUIRED      — not authenticated
    - 403 EMAIL_VERIFICATION_REQUIRED — authenticated but unverified
    - 404                    — token not found
    - 200                    — invitation details
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        # Authentication guard
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"code": "AUTH_REQUIRED", "next": f"/invitations/{token}"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Email verification guard
        if not request.user.is_email_verified:
            return Response(
                {"code": "EMAIL_VERIFICATION_REQUIRED"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = RoomInvitation.objects.select_related('inviter').get(token=token)
        except RoomInvitation.DoesNotExist:
            return Response({"error": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": str(invitation.id),
            "token": invitation.token,
            "room_name": invitation.room_name,
            "inviter": {
                "id": str(invitation.inviter.id),
                "username": invitation.inviter.username,
                "full_name": invitation.inviter.full_name,
                "movieflow_id": invitation.inviter.movieflow_id,
            },
            "status": invitation.status,
            "expires_at": invitation.expires_at.isoformat(),
            "is_expired": invitation.is_expired(),
        }, status=status.HTTP_200_OK)


class RoomInvitationAcceptView(APIView):
    """
    POST /api/v1/invitations/<token>/accept/
    Accept a room invitation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        if not request.user.is_email_verified:
            return Response(
                {"error": "EMAIL_VERIFICATION_REQUIRED"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = RoomInvitation.objects.get(token=token, status=RoomInvitation.STATUS_PENDING)
        except RoomInvitation.DoesNotExist:
            # Also surface a revoked invitation so the caller gets 410, not 404
            try:
                revoked = RoomInvitation.objects.get(token=token, status=RoomInvitation.STATUS_REVOKED)
                return Response({"error": "Invitation has been revoked."}, status=status.HTTP_410_GONE)
            except RoomInvitation.DoesNotExist:
                pass
            return Response(
                {"error": "Invitation not found or no longer pending."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Revocation check (belt-and-suspenders; status filter above already excludes revoked)
        if invitation.status == RoomInvitation.STATUS_REVOKED:
            return Response({"error": "Invitation has been revoked."}, status=status.HTTP_410_GONE)

        # TODO: check room capacity once Room model is complete

        if invitation.is_expired():
            return Response({"error": "This invitation has expired."}, status=status.HTTP_410_GONE)

        # Ownership check
        if invitation.invitee is not None and invitation.invitee != request.user:
            return Response({"error": "Not your invitation."}, status=status.HTTP_403_FORBIDDEN)
        elif (
            invitation.invitee is None
            and invitation.invitee_email
            and invitation.invitee_email != request.user.email
        ):
            return Response({"error": "Not your invitation."}, status=status.HTTP_403_FORBIDDEN)
        # Open invitation: no specific invitee

        invitation.status = RoomInvitation.STATUS_ACCEPTED
        invitation.invitee = request.user
        invitation.save(update_fields=['status', 'invitee', 'updated_at'])

        return Response({"message": "Invitation accepted."}, status=status.HTTP_200_OK)


class RoomInvitationRejectView(APIView):
    """
    POST /api/v1/invitations/<token>/reject/
    Reject a room invitation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        if not request.user.is_email_verified:
            return Response(
                {"error": "EMAIL_VERIFICATION_REQUIRED"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = RoomInvitation.objects.get(token=token, status=RoomInvitation.STATUS_PENDING)
        except RoomInvitation.DoesNotExist:
            return Response(
                {"error": "Invitation not found or no longer pending."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ownership check
        if invitation.invitee is not None and invitation.invitee != request.user:
            return Response({"error": "Not your invitation."}, status=status.HTTP_403_FORBIDDEN)
        elif (
            invitation.invitee is None
            and invitation.invitee_email
            and invitation.invitee_email != request.user.email
        ):
            return Response({"error": "Not your invitation."}, status=status.HTTP_403_FORBIDDEN)
        # Open invitation: no specific invitee

        invitation.status = RoomInvitation.STATUS_REJECTED
        invitation.invitee = request.user
        invitation.save(update_fields=['status', 'invitee', 'updated_at'])

        return Response({"message": "Invitation rejected."}, status=status.HTTP_200_OK)
