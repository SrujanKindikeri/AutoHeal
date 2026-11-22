from django.urls import path
from accounts.views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationView,
    LoginView,
    RefreshTokenView,
    LogoutView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    UserProfileMeView,
    UserByMovieFlowIdView,
)

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='auth-verify-email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='auth-resend-verification'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Profile endpoints
    path('profile/me/', UserProfileMeView.as_view(), name='profile-me'),
    path('users/by-movieflow-id/<str:movieflow_id>/', UserByMovieFlowIdView.as_view(), name='users-by-movieflow-id'),
]
