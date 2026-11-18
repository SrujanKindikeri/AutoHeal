import uuid
from django.db import models
from django.conf import settings
from django.db.models import Q, F

class Friendship(models.Model):
    """
    Canonical mutual friendship model.
    Enforces user1.id < user2.id so (A, B) and (B, A) are impossible duplicates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friendships_user1',
        db_index=True
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friendships_user2',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mf_friendships'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user1', 'user2'], name='unique_canonical_friendship'),
            models.CheckConstraint(check=~Q(user1=F('user2')), name='prevent_self_friendship'),
        ]
        indexes = [
            models.Index(fields=['user1', 'user2']),
            models.Index(fields=['user2', 'user1']),
        ]

    def __str__(self):
        return f"Friendship({self.user1.username} <-> {self.user2.username})"

    def clean(self):
        super().clean()
        # Enforce canonical ordering (user1.id < user2.id)
        if self.user1_id and self.user2_id:
            if str(self.user1_id) > str(self.user2_id):
                self.user1, self.user2 = self.user2, self.user1

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def get_friend(self, user):
        """Return the other participant in this friendship."""
        return self.user2 if self.user1_id == user.id else self.user1

    @classmethod
    def are_friends(cls, user_a, user_b) -> bool:
        """Check if user_a and user_b are friends."""
        if not user_a or not user_b or user_a.id == user_b.id:
            return False
        u1_id, u2_id = sorted([user_a.id, user_b.id], key=str)
        return cls.objects.filter(user1_id=u1_id, user2_id=u2_id).exists()

    @classmethod
    def get_friendship(cls, user_a, user_b):
        """Retrieve canonical friendship instance if exists."""
        if not user_a or not user_b or user_a.id == user_b.id:
            return None
        u1_id, u2_id = sorted([user_a.id, user_b.id], key=str)
        return cls.objects.filter(user1_id=u1_id, user2_id=u2_id).first()


class FriendRequest(models.Model):
    """
    Directional friend request between two users.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_friend_requests',
        db_index=True
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_friend_requests',
        db_index=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_friend_requests'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['sender', 'recipient'],
                condition=Q(status='pending'),
                name='unique_pending_request'
            ),
            models.CheckConstraint(check=~Q(sender=F('recipient')), name='prevent_self_request'),
        ]
        indexes = [
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['sender', 'status']),
        ]

    def __str__(self):
        return f"FriendRequest({self.sender.username} -> {self.recipient.username} [{self.status}])"


class UserBlock(models.Model):
    """
    Block relationships preventing communication, visibility, and friendship.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_records',
        db_index=True
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_by_records',
        db_index=True
    )
    reason = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mf_user_blocks'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['blocker', 'blocked'], name='unique_user_block'),
            models.CheckConstraint(check=~Q(blocker=F('blocked')), name='prevent_self_block'),
        ]

    def __str__(self):
        return f"UserBlock({self.blocker.username} blocked {self.blocked.username})"

    @classmethod
    def is_blocked(cls, user_a, user_b) -> bool:
        """Returns True if either user has blocked the other."""
        if not user_a or not user_b or user_a.id == user_b.id:
            return False
        return cls.objects.filter(
            Q(blocker=user_a, blocked=user_b) | Q(blocker=user_b, blocked=user_a)
        ).exists()
