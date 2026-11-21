"""
Email Service for MovieFlow (Phase 12).
Handles formatted email invitations and notifications with delivery status tracking.
"""

import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from notifications.services import get_or_create_user_preferences

logger = logging.getLogger(__name__)


def _get_frontend_url() -> str:
    """Return the configured frontend base URL with no trailing slash."""
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:6060').rstrip('/')


def send_room_invitation_email(invitation) -> bool:
    """
    Sends a formatted invitation email to the recipient (user or external email address).
    Tracks delivery status on the RoomInvitation model.
    """
    recipient_email = invitation.email
    if not recipient_email and invitation.invitee:
        recipient_email = invitation.invitee.email

    if not recipient_email:
        logger.warning(f"No recipient email found for invitation {invitation.id}")
        return False

    # Check recipient user preferences if recipient is a registered user
    if invitation.invitee:
        prefs = get_or_create_user_preferences(invitation.invitee)
        if not prefs.email_invitations:
            return False

    # Prevent duplicate sending if already sent and pending
    if invitation.email_sent and invitation.email_delivery_status == 'sent':
        return True

    room = invitation.room
    inviter = invitation.inviter
    invitation_url = f"{_get_frontend_url()}/invitations/{invitation.token}"
    room_type_display = "MovieFlow Watch Party" if room.room_type == "movie" else "MovieFlow Music Lounge"

    scheduled_str = ""
    if room.scheduled_start_time:
        scheduled_str = f"Scheduled for: {room.scheduled_start_time.strftime('%B %d, %Y at %I:%M %p UTC')}\n"

    subject = f"You're invited to {room.name} on MovieFlow"

    # Plain text body
    text_content = f"""
Hello,

@{inviter.username} invited you to join a {room_type_display} on MovieFlow!

Room: {room.name}
Experience: {room.content_title or 'Custom Session'}
{scheduled_str}
Join now using your secure invitation link:
{invitation_url}

This invitation link expires on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p UTC')}.

Watch Together. Listen Together.
The MovieFlow Team
"""

    # Premium HTML body
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #08080a;
      color: #ffffff;
      margin: 0;
      padding: 40px 20px;
    }}
    .card {{
      max-width: 560px;
      margin: 0 auto;
      background: linear-gradient(145deg, #161820, #0d0f14);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 36px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }}
    .badge {{
      display: inline-block;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      background-color: rgba(0, 113, 227, 0.2);
      color: #2997ff;
      border: 1px solid rgba(0, 113, 227, 0.4);
      margin-bottom: 16px;
    }}
    h1 {{
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 8px 0;
      color: #ffffff;
    }}
    p {{
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }}
    .content-box {{
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
    }}
    .content-title {{
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }}
    .btn {{
      display: inline-block;
      background: #0071e3;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 14px;
      text-align: center;
      margin-top: 8px;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">{room_type_display}</div>
    <h1>You're Invited!</h1>
    <p><strong>@{inviter.username}</strong> invited you to experience <strong>{room.name}</strong> together on MovieFlow.</p>
    
    <div class="content-box">
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Featured Experience</div>
      <div class="content-title">{room.content_title or 'Synchronized Session'}</div>
      {f'<div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 6px;">{scheduled_str}</div>' if scheduled_str else ''}
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="{invitation_url}" class="btn">Accept &amp; Join Room</a>
    </div>

    <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); text-align: center;">
      This link is personalized and expires on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p UTC')}.
    </p>

    <div class="footer">
      Watch Together. Listen Together. &bull; MovieFlow Social Entertainment
    </div>
  </div>
</body>
</html>
"""

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'MovieFlow <noreply@movieflow.app>')
        msg = EmailMultiAlternatives(subject, text_content, from_email, [recipient_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        invitation.email_sent = True
        invitation.email_delivery_status = 'sent'
        invitation.email_sent_at = timezone.now()
        invitation.save(update_fields=['email_sent', 'email_delivery_status', 'email_sent_at', 'updated_at'])
        return True
    except Exception as e:
        logger.error(f"Failed to deliver invitation email for invitation {invitation.id}: {type(e).__name__}")
        invitation.email_delivery_status = 'failed'
        invitation.save(update_fields=['email_delivery_status', 'updated_at'])
        return False
