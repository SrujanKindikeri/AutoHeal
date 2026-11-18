import uuid
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User
from accounts.serializers import PublicUserSerializer
from friendships.models import Friendship, FriendRequest, UserBlock
from friendships.serializers import (
    FriendRequestSerializer,
    SendFriendRequestSerializer,
    FriendshipSerializer,
    UserBlockSerializer,
    SocialUserSerializer,
)
from friendships.services import (
    send_friend_request,
    accept_friend_request,
    reject_friend_request,
    cancel_friend_request,
    remove_friendship,
    block_user,
    unblock_user,
)


class FriendRequestCreateView(APIView):
    """
    POST /api/v1/friends/requests/
    Send a friend request by MovieFlow ID, username, or UUID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SendFriendRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        target_user = serializer.validated_data['target']
        result = send_friend_request(request.user, target_user)
        return Response(result, status=status.HTTP_201_CREATED if result['status'] == 'pending' else status.HTTP_200_OK)


class IncomingFriendRequestsView(APIView):
    """
    GET /api/v1/friends/requests/incoming/
    List pending incoming friend requests for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = FriendRequest.objects.filter(
            recipient=request.user,
            status='pending'
        ).select_related('sender', 'sender__profile')

        serializer = FriendRequestSerializer(requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OutgoingFriendRequestsView(APIView):
    """
    GET /api/v1/friends/requests/outgoing/
    List pending outgoing friend requests sent by the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = FriendRequest.objects.filter(
            sender=request.user,
            status='pending'
        ).select_related('recipient', 'recipient__profile')

        serializer = FriendRequestSerializer(requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AcceptFriendRequestView(APIView):
    """
    POST /api/v1/friends/requests/{request_id}/accept/
    Accept an incoming pending friend request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id):
        friendship = accept_friend_request(request_id, request.user)
        serializer = FriendshipSerializer(friendship, context={'request': request})
        return Response({
            "message": "Friend request accepted.",
            "friendship": serializer.data
        }, status=status.HTTP_200_OK)


class RejectFriendRequestView(APIView):
    """
    POST /api/v1/friends/requests/{request_id}/reject/
    Reject an incoming pending friend request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id):
        reject_friend_request(request_id, request.user)
        return Response({"message": "Friend request rejected."}, status=status.HTTP_200_OK)


class CancelFriendRequestView(APIView):
    """
    POST /api/v1/friends/requests/{request_id}/cancel/
    Cancel an outgoing pending friend request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, request_id):
        cancel_friend_request(request_id, request.user)
        return Response({"message": "Friend request cancelled."}, status=status.HTTP_200_OK)


class FriendshipListView(APIView):
    """
    GET /api/v1/friends/
    List all active friends of the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        friendships = Friendship.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).select_related('user1', 'user1__profile', 'user2', 'user2__profile')

        serializer = FriendshipSerializer(friendships, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class FriendshipDeleteView(APIView):
    """
    DELETE /api/v1/friends/{friendship_id}/
    Remove an existing friendship.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, friendship_id):
        remove_friendship(request.user, friendship_id)
        return Response({"message": "Friend removed successfully."}, status=status.HTTP_200_OK)


class UserSearchView(APIView):
    """
    GET /api/v1/users/search/?q={query}&page={page}
    Search users by MovieFlow ID, username, or display name with pagination and relationship status.
    Respects blocking rules and excludes current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        page_num = request.query_params.get('page', 1)
        page_size = 12

        if len(q) < 2:
            return Response({"count": 0, "total_pages": 0, "results": []}, status=status.HTTP_200_OK)

        # Get blocked user IDs (either direction) to exclude
        blocked_ids = set(
            UserBlock.objects.filter(
                Q(blocker=request.user) | Q(blocked=request.user)
            ).values_list('blocker_id', 'blocked_id')
        )
        flat_blocked = {uid for pair in blocked_ids for uid in pair if uid != request.user.id}

        # Build search query
        search_filter = (
            Q(username__icontains=q) |
            Q(full_name__icontains=q) |
            Q(movieflow_id__iexact=q)
        )
        if q.upper().startswith("MF-"):
            search_filter |= Q(movieflow_id__istartswith=q)

        queryset = User.objects.filter(
            search_filter,
            is_active=True
        ).exclude(
            id=request.user.id
        ).exclude(
            id__in=flat_blocked
        ).select_related('profile').order_by('username')

        paginator = Paginator(queryset, page_size)
        try:
            page = paginator.page(page_num)
        except (EmptyPage, ValueError):
            return Response({"count": paginator.count, "total_pages": paginator.num_pages, "results": []}, status=status.HTTP_200_OK)

        serializer = SocialUserSerializer(page.object_list, many=True, context={'request': request})

        return Response({
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": int(page_num),
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class UserDetailView(APIView):
    """
    GET /api/v1/users/{user_id}/
    Public user profile lookup by user UUID or MovieFlow ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        clean_target = user_id.strip()
        target_user = None

        if clean_target.upper().startswith("MF-"):
            target_user = User.objects.filter(movieflow_id__iexact=clean_target).select_related('profile').first()
        else:
            try:
                uuid.UUID(clean_target)
                target_user = User.objects.filter(id=clean_target).select_related('profile').first()
            except ValueError:
                target_user = User.objects.filter(username__iexact=clean_target).select_related('profile').first()

        if not target_user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if UserBlock.is_blocked(request.user, target_user):
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SocialUserSerializer(target_user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserBlockView(APIView):
    """
    POST /api/v1/users/{user_id}/block/
    Block a user.
    DELETE /api/v1/users/{user_id}/block/
    Unblock a user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_user(self, user_id):
        clean = user_id.strip()
        if clean.upper().startswith("MF-"):
            return User.objects.filter(movieflow_id__iexact=clean).first()
        try:
            uuid.UUID(clean)
            return User.objects.filter(id=clean).first()
        except ValueError:
            return User.objects.filter(username__iexact=clean).first()

    def post(self, request, user_id):
        target_user = self._resolve_user(user_id)
        if not target_user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', '')
        block_user(request.user, target_user, reason=reason)
        return Response({
            "message": f"Successfully blocked {target_user.username}."
        }, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        target_user = self._resolve_user(user_id)
        if not target_user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        unblock_user(request.user, target_user)
        return Response({
            "message": f"Successfully unblocked {target_user.username}."
        }, status=status.HTTP_200_OK)


class BlockedUsersListView(APIView):
    """
    GET /api/v1/users/blocked/
    List all users blocked by the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        blocks = UserBlock.objects.filter(blocker=request.user).select_related('blocked', 'blocked__profile')
        serializer = UserBlockSerializer(blocks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
