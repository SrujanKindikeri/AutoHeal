from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from friendships.models import Friendship, FriendRequest, UserBlock
from notifications.models import Notification

def get_relationship_status(current_user, other_user) -> str:
    """
    Compute relationship status between current_user and other_user.
    Returns: 'self', 'blocked', 'friends', 'request_sent', 'request_received', 'none'
    """
    if not current_user or not other_user or not current_user.is_authenticated:
        return 'none'
    if current_user.id == other_user.id:
        return 'self'

    if UserBlock.is_blocked(current_user, other_user):
        return 'blocked'

    if Friendship.are_friends(current_user, other_user):
        return 'friends'

    # Check pending friend requests
    sent = FriendRequest.objects.filter(
        sender=current_user, recipient=other_user, status='pending'
    ).exists()
    if sent:
        return 'request_sent'

    received = FriendRequest.objects.filter(
        sender=other_user, recipient=current_user, status='pending'
    ).exists()
    if received:
        return 'request_received'

    return 'none'

@transaction.atomic
def send_friend_request(sender, recipient):
    """
    Create a friend request from sender to recipient.
    Handles reciprocal auto-acceptance, block checks, and duplicates.
    """
    if sender.id == recipient.id:
        raise ValidationError("You cannot send a friend request to yourself.")

    if UserBlock.is_blocked(sender, recipient):
        raise ValidationError("Unable to send friend request.")

    if Friendship.are_friends(sender, recipient):
        raise ValidationError("You are already friends with this user.")

    # Check if reciprocal pending request exists (recipient already sent one to sender)
    reciprocal = FriendRequest.objects.select_for_update().filter(
        sender=recipient, recipient=sender, status='pending'
    ).first()

    if reciprocal:
        # Auto-accept reciprocal request
        reciprocal.status = 'accepted'
        reciprocal.save(update_fields=['status', 'updated_at'])

        friendship = Friendship.objects.create(user1=sender, user2=recipient)

        # Notify original sender that their request was accepted
        Notification.objects.create(
            recipient=recipient,
            actor=sender,
            verb='friend_request_accepted',
            title='Friend Request Accepted',
            message=f"{sender.full_name or sender.username} accepted your friend request.",
            data={"friendship_id": str(friendship.id), "movieflow_id": sender.movieflow_id}
        )
        return {
            "status": "accepted_reciprocal",
            "message": f"You and {recipient.username} are now friends!",
            "friendship_id": str(friendship.id)
        }

    # Check for existing outgoing pending request
    existing = FriendRequest.objects.filter(
        sender=sender, recipient=recipient, status='pending'
    ).first()
    if existing:
        raise ValidationError("A friend request is already pending for this user.")

    # Create new pending request
    req = FriendRequest.objects.create(
        sender=sender,
        recipient=recipient,
        status='pending'
    )

    # Create notification for recipient
    Notification.objects.create(
        recipient=recipient,
        actor=sender,
        verb='friend_request_received',
        title='New Friend Request',
        message=f"{sender.full_name or sender.username} sent you a friend request.",
        data={"request_id": str(req.id), "movieflow_id": sender.movieflow_id}
    )

    return {
        "status": "pending",
        "message": "Friend request sent successfully.",
        "request_id": str(req.id)
    }

@transaction.atomic
def accept_friend_request(request_id, recipient):
    """
    Accept an incoming friend request and establish mutual friendship.
    """
    try:
        req = FriendRequest.objects.select_for_update().get(id=request_id)
    except FriendRequest.DoesNotExist:
        raise NotFound("Friend request not found.")

    if req.recipient_id != recipient.id:
        raise PermissionDenied("You can only accept requests sent to you.")

    if req.status != 'pending':
        raise ValidationError(f"Cannot accept request with status '{req.status}'.")

    if UserBlock.is_blocked(req.sender, recipient):
        req.status = 'rejected'
        req.save(update_fields=['status', 'updated_at'])
        raise ValidationError("Cannot accept request from a blocked user.")

    req.status = 'accepted'
    req.save(update_fields=['status', 'updated_at'])

    # Clean up any other pending requests between them
    FriendRequest.objects.filter(
        Q(sender=recipient, recipient=req.sender) | Q(sender=req.sender, recipient=recipient),
        status='pending'
    ).exclude(id=req.id).update(status='cancelled')

    friendship, _ = Friendship.objects.get_or_create(user1=req.sender, user2=recipient)

    # Notify sender
    Notification.objects.create(
        recipient=req.sender,
        actor=recipient,
        verb='friend_request_accepted',
        title='Friend Request Accepted',
        message=f"{recipient.full_name or recipient.username} accepted your friend request.",
        data={"friendship_id": str(friendship.id), "movieflow_id": recipient.movieflow_id}
    )

    return friendship

@transaction.atomic
def reject_friend_request(request_id, recipient):
    """
    Reject an incoming friend request.
    """
    try:
        req = FriendRequest.objects.select_for_update().get(id=request_id)
    except FriendRequest.DoesNotExist:
        raise NotFound("Friend request not found.")

    if req.recipient_id != recipient.id:
        raise PermissionDenied("You can only reject requests sent to you.")

    if req.status != 'pending':
        raise ValidationError(f"Cannot reject request with status '{req.status}'.")

    req.status = 'rejected'
    req.save(update_fields=['status', 'updated_at'])
    return req

@transaction.atomic
def cancel_friend_request(request_id, sender):
    """
    Cancel an outgoing friend request.
    """
    try:
        req = FriendRequest.objects.select_for_update().get(id=request_id)
    except FriendRequest.DoesNotExist:
        raise NotFound("Friend request not found.")

    if req.sender_id != sender.id:
        raise PermissionDenied("You can only cancel requests you sent.")

    if req.status != 'pending':
        raise ValidationError(f"Cannot cancel request with status '{req.status}'.")

    req.status = 'cancelled'
    req.save(update_fields=['status', 'updated_at'])
    return req

@transaction.atomic
def remove_friendship(user, target_id):
    """
    Remove friendship between user and target (by friendship_id or friend user_id).
    """
    friendship = Friendship.objects.filter(
        Q(id=target_id) | (Q(user1=user, user2_id=target_id) | Q(user2=user, user1_id=target_id))
    ).filter(Q(user1=user) | Q(user2=user)).first()

    if not friendship:
        raise NotFound("Friendship not found or you are not part of it.")

    friendship.delete()
    return True

@transaction.atomic
def block_user(blocker, blocked_user, reason=''):
    """
    Block a user. Terminate any friendship and clean up pending requests between both users.
    """
    if blocker.id == blocked_user.id:
        raise ValidationError("You cannot block yourself.")

    block, created = UserBlock.objects.get_or_create(
        blocker=blocker,
        blocked=blocked_user,
        defaults={"reason": reason}
    )

    # Remove mutual friendship if exists
    Friendship.objects.filter(
        (Q(user1=blocker, user2=blocked_user) | Q(user1=blocked_user, user2=blocker))
    ).delete()

    # Cancel any pending requests in either direction
    FriendRequest.objects.filter(
        (Q(sender=blocker, recipient=blocked_user) | Q(sender=blocked_user, recipient=blocker)),
        status='pending'
    ).update(status='cancelled')

    return block

@transaction.atomic
def unblock_user(blocker, blocked_user):
    """
    Unblock a previously blocked user.
    """
    deleted, _ = UserBlock.objects.filter(blocker=blocker, blocked=blocked_user).delete()
    if not deleted:
        raise NotFound("Block record not found.")
    return True
