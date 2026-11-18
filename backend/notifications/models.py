import uuid
from django.db import models
from django.conf import settings

class Notification(models.Model):
    """
    Centralized notifications for social and entertainment activities.
    """
    VERB_CHOICES = (
        ('friend_request_received', 'Friend Request Received'),
        ('friend_request_accepted', 'Friend Request Accepted'),
        ('room_invitation', 'Room Invitation'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='triggered_notifications',
        null=True,
        blank=True
    )
    verb = models.CharField(max_length=50, choices=VERB_CHOICES)
    title = models.CharField(max_length=150)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'mf_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at']),
        ]

    def __str__(self):
        return f"Notification({self.recipient.username}: {self.title})"
