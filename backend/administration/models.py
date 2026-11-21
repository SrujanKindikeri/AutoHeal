import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class AdminRoleAssignment(models.Model):
    """
    Granular Administrative Role Assignment for MovieFlow staff and moderators.
    Enforces role separation: Super Admin, Platform Admin, Moderator, Support Agent.
    """
    ROLE_SUPER_ADMIN = 'super_admin'
    ROLE_PLATFORM_ADMIN = 'platform_admin'
    ROLE_MODERATOR = 'moderator'
    ROLE_SUPPORT_AGENT = 'support_agent'

    ROLE_CHOICES = [
        (ROLE_SUPER_ADMIN, 'Super Administrator'),
        (ROLE_PLATFORM_ADMIN, 'Platform Administrator'),
        (ROLE_MODERATOR, 'Moderator'),
        (ROLE_SUPPORT_AGENT, 'Support Agent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_role_profile'
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_MODERATOR, db_index=True)
    custom_permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional extra granular permission strings explicitly granted."
    )
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_admin_roles'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_admin_roles'
        verbose_name = 'Admin Role Assignment'
        verbose_name_plural = 'Admin Role Assignments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()} ({'Active' if self.is_active else 'Inactive'})"


class AccountRestriction(models.Model):
    """
    Tracks administrative account status, suspensions, and feature restrictions.
    Supports temporary and permanent restrictions with reasons, expiration, and audit logs.
    """
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_RESTRICTED = 'restricted'
    STATUS_DEACTIVATED = 'deactivated'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_SUSPENDED, 'Suspended'),
        (STATUS_RESTRICTED, 'Restricted'),
        (STATUS_DEACTIVATED, 'Deactivated'),
    ]

    FEATURE_MESSAGING = 'messaging'
    FEATURE_ROOM_CREATION = 'room_creation'
    FEATURE_VOICE_VIDEO = 'voice_video'
    FEATURE_PLAYBACK_SYNC = 'playback_sync'

    FEATURE_CHOICES = [
        (FEATURE_MESSAGING, 'Chat Messaging'),
        (FEATURE_ROOM_CREATION, 'Room Creation'),
        (FEATURE_VOICE_VIDEO, 'Voice and Video Sessions'),
        (FEATURE_PLAYBACK_SYNC, 'Playback Synchronization Control'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='account_restrictions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUSPENDED, db_index=True)
    reason = models.TextField(help_text="Mandatory justification for administrative suspension or restriction.")
    restricted_features = models.JSONField(
        default=list,
        blank=True,
        help_text="List of restricted feature keys when status is 'restricted'."
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Expiration date for temporary restrictions. Null for permanent."
    )
    is_active = models.BooleanField(default=True, db_index=True)
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='applied_restrictions'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_account_restrictions'
        verbose_name = 'Account Restriction'
        verbose_name_plural = 'Account Restrictions'
        ordering = ['-created_at']

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def has_feature_restriction(self, feature: str) -> bool:
        if not self.is_active or self.is_expired():
            return False
        if self.status == self.STATUS_SUSPENDED:
            return True
        return feature in (self.restricted_features or [])

    def __str__(self):
        return f"{self.user.username}: {self.status} ({self.reason[:30]})"


class ModerationReport(models.Model):
    """
    Centralized moderation report model for MovieFlow.
    Supports reports on users, rooms, chat messages, profiles, and general abuse.
    Preserves evidentiary snapshots so bad actors cannot erase evidence.
    """
    TYPE_USER = 'user'
    TYPE_ROOM = 'room'
    TYPE_MESSAGE = 'message'
    TYPE_PROFILE = 'profile'
    TYPE_OTHER = 'other'

    TYPE_CHOICES = [
        (TYPE_USER, 'User Account'),
        (TYPE_ROOM, 'Room'),
        (TYPE_MESSAGE, 'Chat Message'),
        (TYPE_PROFILE, 'User Profile'),
        (TYPE_OTHER, 'Other'),
    ]

    CATEGORY_SPAM = 'spam'
    CATEGORY_HARASSMENT = 'harassment'
    CATEGORY_IMPERSONATION = 'impersonation'
    CATEGORY_ABUSIVE_MESSAGES = 'abusive_messages'
    CATEGORY_INAPPROPRIATE_PROFILE = 'inappropriate_profile'
    CATEGORY_ROOM_ABUSE = 'room_abuse'
    CATEGORY_SUSPICIOUS = 'suspicious'
    CATEGORY_OTHER = 'other'

    CATEGORY_CHOICES = [
        (CATEGORY_SPAM, 'Spam / Flooding'),
        (CATEGORY_HARASSMENT, 'Harassment / Bullying'),
        (CATEGORY_IMPERSONATION, 'Impersonation'),
        (CATEGORY_ABUSIVE_MESSAGES, 'Abusive Messages'),
        (CATEGORY_INAPPROPRIATE_PROFILE, 'Inappropriate Profile'),
        (CATEGORY_ROOM_ABUSE, 'Room Abuse'),
        (CATEGORY_SUSPICIOUS, 'Suspicious Activity'),
        (CATEGORY_OTHER, 'Other Violation'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_UNDER_REVIEW = 'under_review'
    STATUS_ACTION_REQUIRED = 'action_required'
    STATUS_RESOLVED = 'resolved'
    STATUS_DISMISSED = 'dismissed'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_UNDER_REVIEW, 'Under Review'),
        (STATUS_ACTION_REQUIRED, 'Action Required'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_DISMISSED, 'Dismissed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_USER, db_index=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filed_moderation_reports'
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='moderation_reports_against'
    )
    room = models.ForeignKey(
        'rooms.Room',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='admin_reports'
    )
    message_id = models.UUIDField(null=True, blank=True, help_text="ID of reported room chat message")
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER, db_index=True)
    description = models.TextField(blank=True, default='')
    evidence = models.JSONField(
        default=dict,
        blank=True,
        help_text="Immutable snapshot of message text, room name, or profile bio at report time."
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    assigned_moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_moderation_reports'
    )
    resolution = models.TextField(blank=True, default='')
    resolution_action = models.CharField(max_length=64, blank=True, default='')
    administrative_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'mf_moderation_reports'
        verbose_name = 'Moderation Report'
        verbose_name_plural = 'Moderation Reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"Report {self.id} [{self.category}] - {self.status}"


class AdminAuditLog(models.Model):
    """
    Centralized, append-only audit trail of all administrative and moderation actions.
    Provides non-repudiation, accountability, and traceability for compliance and security.
    """
    OUTCOME_SUCCESS = 'success'
    OUTCOME_FAILURE = 'failure'
    OUTCOME_REJECTED = 'rejected'

    OUTCOME_CHOICES = [
        (OUTCOME_SUCCESS, 'Success'),
        (OUTCOME_FAILURE, 'Failure'),
        (OUTCOME_REJECTED, 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='admin_audit_actions'
    )
    action = models.CharField(max_length=64, db_index=True)
    resource_type = models.CharField(max_length=32, db_index=True)
    resource_id = models.CharField(max_length=255)
    reason = models.TextField(blank=True, default='')
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default=OUTCOME_SUCCESS)
    correlation_id = models.CharField(max_length=100, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'mf_admin_audit_logs'
        verbose_name = 'Admin Audit Log'
        verbose_name_plural = 'Admin Audit Logs'
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.username if self.actor else 'SYSTEM'
        return f"[{self.created_at}] {actor_name} -> {self.action} on {self.resource_type}:{self.resource_id}"


class PlatformSetting(models.Model):
    """
    Configurable platform-wide settings managed by Super Administrators.
    """
    key = models.CharField(max_length=100, primary_key=True)
    value = models.JSONField(default=dict)
    description = models.TextField(blank=True, default='')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='updated_platform_settings'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_platform_settings'
        verbose_name = 'Platform Setting'
        verbose_name_plural = 'Platform Settings'

    def __str__(self):
        return f"{self.key}: {self.value}"
