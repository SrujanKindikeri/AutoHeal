from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.utils import timezone
from django.db.models import Q

from accounts.models import User, UserProfile, PasswordResetToken
from accounts.serializers import (
    RegisterSerializer,
    LoginSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    UserSerializer,
    UserProfileSerializer,
    PublicUserSerializer,
)
from accounts.services import (
    authenticate_by_email_or_username,
    verify_email_token,
    create_verification_token,
    create_password_reset_token,
    log_audit_event,
)


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Registers a new user, generates a unique MovieFlow ID, and sends verification email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        log_audit_event(request, 'register', user=user, details={"movieflow_id": user.movieflow_id})

        return Response({
            "message": "Registration successful. Please check your email to verify your account.",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "movieflow_id": user.movieflow_id,
                "is_email_verified": user.is_email_verified,
            }
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    """
    POST /api/v1/auth/verify-email/
    Validates token, activates verification status on user.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        success, message, user = verify_email_token(token)

        if not success:
            log_audit_event(request, 'verify_email_failed', details={"token": token, "reason": message})
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        log_audit_event(request, 'verify_email_success', user=user)
        return Response({
            "message": message,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    """
    POST /api/v1/auth/resend-verification/
    Issues a fresh verification token and dispatches email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        # Always return generic message to prevent account enumeration
        generic_msg = "If your account exists and is unverified, a new verification link has been sent."

        if user and not user.is_email_verified:
            create_verification_token(user)
            log_audit_event(request, 'resend_verification', user=user)

        return Response({"message": generic_msg}, status=status.HTTP_200_OK)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Supports email or username login.
    Enforces email verification requirement and issues JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']

        user = authenticate_by_email_or_username(identifier, password)

        if user is None:
            log_audit_event(request, 'login_failed', details={"identifier": identifier})
            return Response(
                {"error": "Invalid email/username or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            log_audit_event(request, 'login_inactive', user=user)
            return Response(
                {"error": "This account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.is_email_verified:
            log_audit_event(request, 'login_unverified', user=user)
            return Response({
                "error": "Please verify your email address before logging in.",
                "code": "ACCOUNT_UNVERIFIED",
                "email": user.email
            }, status=status.HTTP_403_FORBIDDEN)

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        log_audit_event(request, 'login_success', user=user)

        response = Response({
            "message": "Login successful.",
            "access": access_token,
            "refresh": refresh_token,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

        # Optionally set secure HttpOnly cookie for refresh token
        response.set_cookie(
            key='mf_refresh',
            value=refresh_token,
            httponly=True,
            secure=not request.META.get('HTTP_HOST', '').startswith('localhost'),
            samesite='Lax',
            max_age=7 * 24 * 3600
        )
        return response


class RefreshTokenView(APIView):
    """
    POST /api/v1/auth/refresh/
    Refreshes access token from body or cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh') or request.COOKIES.get('mf_refresh')
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            data = {
                "access": str(refresh.access_token),
            }
            return Response(data, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token and clears session cookies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh') or request.COOKIES.get('mf_refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        log_audit_event(request, 'logout', user=request.user)

        response = Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        response.delete_cookie('mf_refresh')
        return response


class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/
    Initiates password reset process without disclosing user existence.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        if user and user.is_active:
            create_password_reset_token(user)
            log_audit_event(request, 'forgot_password_request', user=user)

        # Protected against user enumeration
        return Response({
            "message": "If an account with that email exists, password reset instructions have been sent."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/
    Validates token and sets a new password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({"error": "Invalid or expired password reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not reset_token.is_valid():
            return Response({"error": "This password reset link has expired or has already been used."}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])

        # Mark token used
        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        # Invalidate all remaining reset tokens for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        log_audit_event(request, 'reset_password_success', user=user)

        return Response({
            "message": "Your password has been successfully reset. You can now log in."
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows authenticated users to change their password.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({"current_password": ["Current password does not match."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password', 'updated_at'])
        log_audit_event(request, 'change_password_success', user=user)

        return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)


class UserProfileMeView(APIView):
    """
    GET /api/v1/profile/me/
    PATCH /api/v1/profile/me/
    Retrieves or updates the current authenticated user's profile.
    MovieFlow ID is strictly immutable and read-only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Update user fields if provided (full_name)
        if 'full_name' in request.data:
            user.full_name = request.data['full_name'].strip()
            user.save(update_fields=['full_name', 'updated_at'])

        profile_serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if not profile_serializer.is_valid():
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile_serializer.save()

        # Check if profile is complete
        has_genres = bool(profile.preferred_movie_genres or profile.preferred_music_genres)
        if has_genres or profile.bio:
            if not profile.is_profile_completed:
                profile.is_profile_completed = True
                profile.save(update_fields=['is_profile_completed'])

        log_audit_event(request, 'profile_update', user=user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class UserSearchView(APIView):
    """
    GET /api/v1/users/search/?q={query}
    Search users by username, MovieFlow ID, or full name.
    Excludes emails for privacy.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([], status=status.HTTP_200_OK)

        users = User.objects.filter(
            Q(username__icontains=q) |
            Q(movieflow_id__iexact=q) |
            Q(full_name__icontains=q)
        ).exclude(id=request.user.id).select_related('profile')[:20]

        serializer = PublicUserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserByMovieFlowIdView(APIView):
    """
    GET /api/v1/users/by-movieflow-id/{movieflow_id}/
    Retrieve public profile by MovieFlow ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, movieflow_id):
        clean_id = movieflow_id.strip().upper()
        try:
            target_user = User.objects.select_related('profile').get(movieflow_id__iexact=clean_id)
        except User.DoesNotExist:
            return Response({"error": "User with this MovieFlow ID not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PublicUserSerializer(target_user)
        return Response(serializer.data, status=status.HTTP_200_OK)
