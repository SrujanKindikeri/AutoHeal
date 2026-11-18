from django.contrib.auth.base_user import BaseUserManager
from accounts.utils import generate_movieflow_id

class UserManager(BaseUserManager):
    """
    Custom user manager for MovieFlow.
    Uses email as the primary identifier and auto-generates unique MovieFlow IDs.
    """

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set.")
        if not username:
            raise ValueError("The Username field must be set.")

        email = self.normalize_email(email)
        username = username.strip()

        # Generate MovieFlow ID if not explicitly passed
        if not extra_fields.get("movieflow_id"):
            extra_fields["movieflow_id"] = generate_movieflow_id(self.model)

        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", False)

        user = self.model(email=email, username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, username, password, **extra_fields)
