import secrets
import string
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

MOVIEFLOW_ID_ALPHABET = string.ascii_uppercase + string.digits

def generate_random_movieflow_code(length=8) -> str:
    """Generate 8 random uppercase alphanumeric characters."""
    return ''.join(secrets.choice(MOVIEFLOW_ID_ALPHABET) for _ in range(length))

def generate_movieflow_id(user_model=None, max_retries=15) -> str:
    """
    Generate a unique MovieFlow ID with format MF-XXXXXXXX.
    Ensures uniqueness against existing records with collision retry logic.
    """
    if user_model is None:
        from django.contrib.auth import get_user_model
        user_model = get_user_model()

    for attempt in range(max_retries):
        code = generate_random_movieflow_code(8)
        candidate = f"MF-{code}"
        if not user_model.objects.filter(movieflow_id=candidate).exists():
            return candidate

    raise RuntimeError("Failed to generate a unique MovieFlow ID after maximum retries.")

def generate_secure_token(nbytes=48) -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(nbytes)

def send_verification_email(user, token_str: str) -> bool:
    """Send an Apple-styled email verification link."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    verify_link = f"{frontend_url}/verify-email?token={token_str}"

    subject = "Verify your MovieFlow Account"
    message = (
        f"Hello {user.full_name or user.username},\n\n"
        f"Welcome to MovieFlow. Please confirm your email address by clicking the link below:\n\n"
        f"{verify_link}\n\n"
        f"Your MovieFlow ID: {user.movieflow_id}\n\n"
        "This link will expire in 24 hours.\n\n"
        "— The MovieFlow Team\nWatch Together. Listen Together."
    )
    html_message = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; background-color: #08080a; color: #f5f5f7; padding: 40px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 32px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #2997ff, #bf5af2); border-radius: 12px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">🎬</div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Welcome to MovieFlow</h1>
            <p style="color: #86868b; font-size: 14px; margin-bottom: 24px;">Watch Together. Listen Together.</p>
            <p style="color: #d2d2d7; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                Hello <strong>{user.full_name or user.username}</strong>, your permanent MovieFlow ID is <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; color: #2997ff;">{user.movieflow_id}</code>. Please confirm your email address to complete your registration.
            </p>
            <a href="{verify_link}" style="display: inline-block; background: #2997ff; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; margin-bottom: 24px;">Verify Email Address</a>
            <p style="color: #6e6e73; font-size: 12px;">This link expires in 24 hours. If you did not create a MovieFlow account, please ignore this email.</p>
        </div>
    </div>
    """

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'MovieFlow <noreply@movieflow.app>')
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info("Verification email sent to %s", user.email)
        return True
    except Exception as e:
        logger.error("Verification email delivery failed for %s: %s", user.email, type(e).__name__)
        return False

def send_password_reset_email(user, token_str: str) -> bool:
    """Send an Apple-styled password reset link."""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    reset_link = f"{frontend_url}/reset-password?token={token_str}"

    subject = "Reset your MovieFlow Password"
    message = (
        f"Hello {user.full_name or user.username},\n\n"
        f"A password reset request was made for your MovieFlow account.\n"
        f"You can reset your password using the link below:\n\n"
        f"{reset_link}\n\n"
        "This link will expire in 1 hour.\n\n"
        "If you did not request this reset, your account is safe and you can ignore this email.\n\n"
        "— The MovieFlow Team"
    )
    html_message = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; background-color: #08080a; color: #f5f5f7; padding: 40px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 32px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #2997ff, #bf5af2); border-radius: 12px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">🔒</div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 8px;">Password Reset Request</h1>
            <p style="color: #86868b; font-size: 14px; margin-bottom: 24px;">MovieFlow Security</p>
            <p style="color: #d2d2d7; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                Hello <strong>{user.full_name or user.username}</strong>, click the button below to choose a new password for your account.
            </p>
            <a href="{reset_link}" style="display: inline-block; background: #2997ff; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; margin-bottom: 24px;">Reset Password</a>
            <p style="color: #6e6e73; font-size: 12px;">This link will expire in 1 hour. If you didn't request a password reset, no action is needed.</p>
        </div>
    </div>
    """

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'MovieFlow <noreply@movieflow.app>')
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info("Password reset email sent to %s", user.email)
        return True
    except Exception as e:
        logger.error("Password reset email delivery failed for %s: %s", user.email, type(e).__name__)
        return False
