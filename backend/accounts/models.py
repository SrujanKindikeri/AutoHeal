import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from accounts.managers import UserManager
from accounts.utils import generate_movieflow_id

class User(AbstractBaseUser, PermissionsMixin):
    """
    Primary User model for MovieFlow.
    Features UUID primary key, unique email, username, and permanent MovieFlow ID.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True, max_length=255)
    username = models.CharField(unique=True, db_index=True, max_length=50)
    full_name = models.CharField(max_length=150, blank=True, default='')

    # Permanent Unique MovieFlow Identity (e.g. MF-8K29X7P4)
    movieflow_id = models.CharField(
        max_length=12,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Permanent unique identity in format MF-XXXXXXXX"
    )

    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    class Meta:
        db_table = 'mf_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.movieflow_id})"

    def clean(self):
        super().clean()
        if self.email:
            self.email = self.email.strip().lower()
        if self.username:
            self.username = self.username.strip()

    def save(self, *args, **kwargs):
        # Auto-generate unique MovieFlow ID if not present
        if not self.movieflow_id:
            self.movieflow_id = generate_movieflow_id(self.__class__)
        else:
            # Enforce immutability if the user already exists in the database
            if self.pk:
                orig = User.objects.filter(pk=self.pk).values('movieflow_id').first()
                if orig and orig['movieflow_id'] != self.movieflow_id:
                    raise ValueError("MovieFlow ID is permanent and cannot be modified.")

        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """
    Extended profile for MovieFlow users with entertainment interests and privacy settings.
    """
    PRIVACY_CHOICES = (
        ('public', 'Public'),
        ('friends_only', 'Friends Only'),
        ('private', 'Private'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    bio = models.TextField(max_length=500, blank=True, default='')

    # Entertainment interests
    preferred_movie_genres = models.JSONField(default=list, blank=True)
    preferred_music_genres = models.JSONField(default=list, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    # Onboarding status
    is_profile_completed = models.BooleanField(default=False)

    # Privacy controls
    watch_history_visibility = models.CharField(
        max_length=20,
        choices=PRIVACY_CHOICES,
        default='friends_only'
    )
    listening_history_visibility = models.CharField(
        max_length=20,
        choices=PRIVACY_CHOICES,
        default='friends_only'
    )
    show_activity_status = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profile of {self.user.username}"


class EmailVerificationToken(models.Model):
    """
    Secure expiring token for validating user email addresses.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'mf_email_verification_tokens'
        verbose_name = 'Email Verification Token'
        verbose_name_plural = 'Email Verification Tokens'
        indexes = [
            models.Index(fields=['token', 'is_used']),
        ]

    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() <= self.expires_at


class PasswordResetToken(models.Model):
    """
    Secure expiring token for password resets.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'mf_password_reset_tokens'
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        indexes = [
            models.Index(fields=['token', 'is_used']),
        ]

    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() <= self.expires_at


class AuditLog(models.Model):
    """
    Audit logging for important account and security events.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    event_type = models.CharField(max_length=50, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'mf_audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.event_type}] {self.user} at {self.created_at}"
