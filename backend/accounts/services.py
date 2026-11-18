from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from accounts.models import (
    User,
    EmailVerificationToken,
    PasswordResetToken,
    AuditLog,
)
from accounts.utils import (
    generate_secure_token,
    send_verification_email,
    send_password_reset_email,
)

def get_client_ip(request) -> str:
    """Extract real client IP considering forward headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

def log_audit_event(request, event_type: str, user=None, details=None):
    """Safely log security and account activity audit records."""
    try:
        ip = get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        AuditLog.objects.create(
            user=user if (user and user.is_authenticated) else None,
            event_type=event_type,
            ip_address=ip,
            user_agent=user_agent,
            details=details or {}
        )
    except Exception:
        pass

def create_verification_token(user, hours_valid=24) -> EmailVerificationToken:
    """Create an expiring email verification token and send the email."""
    # Invalidate previous unused verification tokens for this user
    EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)

    token_str = generate_secure_token(48)
    expires_at = timezone.now() + timedelta(hours=hours_valid)
    token_obj = EmailVerificationToken.objects.create(
        user=user,
        token=token_str,
        expires_at=expires_at,
        is_used=False
    )
    send_verification_email(user, token_str)
    return token_obj

def create_password_reset_token(user, hours_valid=1) -> PasswordResetToken:
    """Create an expiring password reset token and send the reset email."""
    # Invalidate previous unused reset tokens
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    token_str = generate_secure_token(48)
    expires_at = timezone.now() + timedelta(hours=hours_valid)
    token_obj = PasswordResetToken.objects.create(
        user=user,
        token=token_str,
        expires_at=expires_at,
        is_used=False
    )
    send_password_reset_email(user, token_str)
    return token_obj

def verify_email_token(token_str: str) -> tuple[bool, str, User | None]:
    """
    Validate email verification token.
    Returns (success, message, user).
    """
    try:
        token_obj = EmailVerificationToken.objects.select_related('user').get(token=token_str)
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification token.", None

    if token_obj.is_used:
        return False, "This verification link has already been used.", None

    if timezone.now() > token_obj.expires_at:
        return False, "This verification link has expired. Please request a new one.", None

    # Mark token used & mark user verified
    token_obj.is_used = True
    token_obj.save(update_fields=['is_used'])

    user = token_obj.user
    user.is_email_verified = True
    user.save(update_fields=['is_email_verified', 'updated_at'])

    return True, "Email verified successfully.", user

def authenticate_by_email_or_username(identifier: str, password: str) -> User | None:
    """
    Authenticate a user by matching either their email address or username.
    """
    if not identifier or not password:
        return None

    identifier_clean = identifier.strip()
    try:
        # Match case-insensitively for email or exact/case-insensitive for username
        user = User.objects.get(
            Q(email__iexact=identifier_clean) | Q(username__iexact=identifier_clean)
        )
    except User.DoesNotExist:
        return None
    except User.MultipleObjectsReturned:
        # If collision in case sensitivity, fallback to exact email
        user = User.objects.filter(email=identifier_clean).first()

    if user and user.check_password(password):
        return user
    return None
