import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class RoomInvitation(models.Model):
    """Lightweight room invitation model for the invitation authentication guard."""
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'
    STATUS_REVOKED = 'revoked'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_REVOKED, 'Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=128, unique=True, db_index=True)
    room_name = models.CharField(max_length=200, default='Movie Room')
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_room_invitations',
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_room_invitations',
        null=True,
        blank=True,
    )
    invitee_email = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_room_invitations'
        verbose_name = 'Room Invitation'
        verbose_name_plural = 'Room Invitations'

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Invitation {self.token[:12]}… by {self.inviter}"
