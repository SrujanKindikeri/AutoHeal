import uuid
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import (
    User,
    UserProfile,
    EmailVerificationToken,
    PasswordResetToken,
    AuditLog,
)
from accounts.utils import generate_movieflow_id, is_safe_internal_redirect


class AuthenticationAndIdentityTests(TestCase):
    """
    Complete Phase 2 Test Suite:
    Tests Custom User Model, MovieFlow ID Generator, Registration, Email Verification,
    Login, Token Refresh, Logout, Password Reset, Profiles, Search, and Security Constraints.
    """

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register/'
        self.verify_email_url = '/api/v1/auth/verify-email/'
        self.resend_verify_url = '/api/v1/auth/resend-verification/'
        self.login_url = '/api/v1/auth/login/'
        self.refresh_url = '/api/v1/auth/refresh/'
        self.logout_url = '/api/v1/auth/logout/'
        self.forgot_password_url = '/api/v1/auth/forgot-password/'
        self.reset_password_url = '/api/v1/auth/reset-password/'
        self.profile_me_url = '/api/v1/profile/me/'
        self.users_search_url = '/api/v1/users/search/'

        # Standard test user data
        self.valid_user_data = {
            "full_name": "Alexander Hayes",
            "email": "alex@movieflow.app",
            "username": "alexhayes",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "terms_accepted": True
        }

    # 1. Successful registration
    def test_01_successful_registration(self):
        response = self.client.post(self.register_url, self.valid_user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "alex@movieflow.app")
        self.assertEqual(data["user"]["username"], "alexhayes")
        self.assertTrue(data["user"]["movieflow_id"].startswith("MF-"))
        self.assertEqual(len(data["user"]["movieflow_id"]), 11)  # MF- + 8 alphanumeric = 11 chars
        self.assertFalse(data["user"]["is_email_verified"])

        # Check DB
        user = User.objects.get(email="alex@movieflow.app")
        self.assertFalse(user.is_email_verified)
        self.assertIsNotNone(user.profile)
        self.assertTrue(EmailVerificationToken.objects.filter(user=user).exists())

    # 2. Duplicate email rejection
    def test_02_duplicate_email_rejection(self):
        self.client.post(self.register_url, self.valid_user_data)
        dup_data = self.valid_user_data.copy()
        dup_data["username"] = "alex2"
        # Test case-insensitivity as well
        dup_data["email"] = "ALEX@MOVIEFLOW.APP"

        response = self.client.post(self.register_url, dup_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.json())

    # 3. Duplicate username rejection
    def test_03_duplicate_username_rejection(self):
        self.client.post(self.register_url, self.valid_user_data)
        dup_data = self.valid_user_data.copy()
        dup_data["email"] = "different@movieflow.app"
        dup_data["username"] = "AlexHayes"  # Case-insensitive

        response = self.client.post(self.register_url, dup_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.json())

    # 4. Unique MovieFlow ID generation
    def test_04_movieflow_id_generation(self):
        user = User.objects.create_user(
            email="steve@apple.com",
            username="steve",
            password="Password123!"
        )
        self.assertTrue(user.movieflow_id.startswith("MF-"))
        self.assertEqual(len(user.movieflow_id), 11)
        # Should be alphanumeric uppercase after prefix
        suffix = user.movieflow_id.split("-")[1]
        self.assertTrue(suffix.isalnum() and suffix.isupper())

    # 5. ID collision handling
    def test_05_id_collision_handling(self):
        # Create a user with explicit ID
        u1 = User.objects.create_user(
            email="collision1@test.com",
            username="col1",
            password="Password123!",
            movieflow_id="MF-COLLIS01"
        )
        self.assertEqual(u1.movieflow_id, "MF-COLLIS01")

        # Generator retries and creates unique ID
        new_id = generate_movieflow_id(User)
        self.assertNotEqual(new_id, "MF-COLLIS01")
        self.assertTrue(new_id.startswith("MF-"))

    # 6. Email verification
    def test_06_email_verification(self):
        self.client.post(self.register_url, self.valid_user_data)
        user = User.objects.get(email="alex@movieflow.app")
        token_obj = EmailVerificationToken.objects.get(user=user, is_used=False)

        response = self.client.post(self.verify_email_url, {"token": token_obj.token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        token_obj.refresh_from_db()
        self.assertTrue(token_obj.is_used)

    # 7. Expired verification token
    def test_07_expired_verification_token(self):
        self.client.post(self.register_url, self.valid_user_data)
        user = User.objects.get(email="alex@movieflow.app")
        token_obj = EmailVerificationToken.objects.get(user=user)
        # Make token expired in the past
        token_obj.expires_at = timezone.now() - timedelta(days=2)
        token_obj.save()

        response = self.client.post(self.verify_email_url, {"token": token_obj.token})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.json()["error"].lower())

        user.refresh_from_db()
        self.assertFalse(user.is_email_verified)

    # 8. Invalid verification token
    def test_08_invalid_verification_token(self):
        response = self.client.post(self.verify_email_url, {"token": "completely-invalid-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.json())

    # 9. Successful login (both email and username)
    def test_09_successful_login(self):
        user = User.objects.create_user(
            email="clara@movieflow.app",
            username="claras",
            password="SecurePassword99!",
            is_email_verified=True
        )

        # Login with Email
        res_email = self.client.post(self.login_url, {
            "identifier": "clara@movieflow.app",
            "password": "SecurePassword99!"
        })
        self.assertEqual(res_email.status_code, status.HTTP_200_OK)
        data = res_email.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["user"]["movieflow_id"], user.movieflow_id)

        # Login with Username
        res_user = self.client.post(self.login_url, {
            "identifier": "claras",
            "password": "SecurePassword99!"
        })
        self.assertEqual(res_user.status_code, status.HTTP_200_OK)

    # 10. Invalid login
    def test_10_invalid_login(self):
        User.objects.create_user(
            email="dan@movieflow.app",
            username="dan",
            password="RealPassword123!",
            is_email_verified=True
        )

        # Wrong password
        response = self.client.post(self.login_url, {
            "identifier": "dan@movieflow.app",
            "password": "WrongPassword!"
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Nonexistent user
        response2 = self.client.post(self.login_url, {
            "identifier": "ghost@movieflow.app",
            "password": "WrongPassword!"
        })
        self.assertEqual(response2.status_code, status.HTTP_401_UNAUTHORIZED)

    # 11. Unverified login restrictions
    def test_11_unverified_login_restrictions(self):
        User.objects.create_user(
            email="unverified@movieflow.app",
            username="unverified",
            password="Password123!",
            is_email_verified=False
        )

        response = self.client.post(self.login_url, {
            "identifier": "unverified@movieflow.app",
            "password": "Password123!"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json().get("code"), "ACCOUNT_UNVERIFIED")

    # 12. Token refresh
    def test_12_token_refresh(self):
        user = User.objects.create_user(
            email="emma@movieflow.app",
            username="emma",
            password="Password123!",
            is_email_verified=True
        )
        login_res = self.client.post(self.login_url, {
            "identifier": "emma@movieflow.app",
            "password": "Password123!"
        })
        refresh_token = login_res.json()["refresh"]

        refresh_res = self.client.post(self.refresh_url, {"refresh": refresh_token})
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_res.json())

    # 13. Logout
    def test_13_logout(self):
        user = User.objects.create_user(
            email="frank@movieflow.app",
            username="frank",
            password="Password123!",
            is_email_verified=True
        )
        login_res = self.client.post(self.login_url, {
            "identifier": "frank@movieflow.app",
            "password": "Password123!"
        })
        access_token = login_res.json()["access"]
        refresh_token = login_res.json()["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_res = self.client.post(self.logout_url, {"refresh": refresh_token})
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

    # 14. Password reset (request & confirm)
    def test_14_password_reset(self):
        user = User.objects.create_user(
            email="grace@movieflow.app",
            username="grace",
            password="InitialPassword123!",
            is_email_verified=True
        )

        # Request reset
        forgot_res = self.client.post(self.forgot_password_url, {"email": "grace@movieflow.app"})
        self.assertEqual(forgot_res.status_code, status.HTTP_200_OK)

        reset_token_obj = PasswordResetToken.objects.get(user=user, is_used=False)

        # Confirm reset
        reset_res = self.client.post(self.reset_password_url, {
            "token": reset_token_obj.token,
            "new_password": "NewSecretPassword2025!",
            "confirm_password": "NewSecretPassword2025!"
        })
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # Login with old password should fail
        fail_login = self.client.post(self.login_url, {
            "identifier": "grace@movieflow.app",
            "password": "InitialPassword123!"
        })
        self.assertEqual(fail_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # Login with new password should succeed
        success_login = self.client.post(self.login_url, {
            "identifier": "grace@movieflow.app",
            "password": "NewSecretPassword2025!"
        })
        self.assertEqual(success_login.status_code, status.HTTP_200_OK)

    # 15. Profile creation
    def test_15_profile_creation(self):
        user = User.objects.create_user(
            email="hannah@movieflow.app",
            username="hannah",
            password="Password123!"
        )
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        profile = user.profile
        self.assertFalse(profile.is_profile_completed)
        self.assertEqual(profile.preferred_movie_genres, [])
        self.assertEqual(profile.preferred_music_genres, [])

    # 16. Profile update
    def test_16_profile_update(self):
        user = User.objects.create_user(
            email="ian@movieflow.app",
            username="ian",
            password="Password123!",
            is_email_verified=True
        )
        login_res = self.client.post(self.login_url, {
            "identifier": "ian@movieflow.app",
            "password": "Password123!"
        })
        access = login_res.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        update_payload = {
            "full_name": "Ian Fleming",
            "bio": "Cinema lover and jazz enthusiast.",
            "preferred_movie_genres": ["Sci-Fi", "Action", "Thriller"],
            "preferred_music_genres": ["Jazz", "Ambient"],
            "watch_history_visibility": "public"
        }
        res = self.client.patch(self.profile_me_url, update_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertEqual(user.full_name, "Ian Fleming")
        self.assertEqual(user.profile.bio, "Cinema lover and jazz enthusiast.")
        self.assertEqual(user.profile.preferred_movie_genres, ["Sci-Fi", "Action", "Thriller"])
        self.assertTrue(user.profile.is_profile_completed)

    # 17. MovieFlow ID immutability
    def test_17_movieflow_id_immutability(self):
        user = User.objects.create_user(
            email="jack@movieflow.app",
            username="jack",
            password="Password123!",
            is_email_verified=True
        )
        orig_id = user.movieflow_id

        # Attempting to change user's MovieFlow ID must fail
        user.movieflow_id = "MF-HACKED000"
        with self.assertRaises(ValueError):
            user.save()

        user.refresh_from_db()
        self.assertEqual(user.movieflow_id, orig_id)

    # 18. Protected endpoint authorization
    def test_18_protected_endpoint_authorization(self):
        # Accessing /api/v1/profile/me/ without token should return 401
        self.client.credentials()  # Clear credentials
        res = self.client.get(self.profile_me_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Accessing /api/v1/users/search/ without token should return 401
        res_search = self.client.get(self.users_search_url + "?q=alex")
        self.assertEqual(res_search.status_code, status.HTTP_401_UNAUTHORIZED)

    # Extra: User discovery by MovieFlow ID and search
    def test_19_search_and_by_movieflow_id(self):
        user = User.objects.create_user(
            email="kate@movieflow.app",
            username="kate_winslet",
            full_name="Kate Winslet",
            password="Password123!",
            is_email_verified=True
        )
        login_res = self.client.post(self.login_url, {
            "identifier": "kate@movieflow.app",
            "password": "Password123!"
        })
        access = login_res.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        # Search by username
        res = self.client.get(f"{self.users_search_url}?q=kate")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Search by MovieFlow ID
        res_id = self.client.get(f"/api/v1/users/by-movieflow-id/{user.movieflow_id}/")
        self.assertEqual(res_id.status_code, status.HTTP_200_OK)
        self.assertEqual(res_id.json()["username"], "kate_winslet")
        # Ensure email is NEVER exposed in public serializer
        self.assertNotIn("email", res_id.json())


class AuthNavigationTests(TestCase):
    """
    Phase 8 Test Suite — Authentication Navigation, Email Verification,
    Invitation Guard, and Safe Redirect Validation.
    """

    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/v1/auth/login/'
        self.verify_email_url = '/api/v1/auth/verify-email/'
        self.resend_verify_url = '/api/v1/auth/resend-verification/'
        self.profile_me_url = '/api/v1/profile/me/'
        self.invitation_url_tpl = '/api/v1/invitations/{}/'

    # Journey A — authenticated verified user can reach a protected endpoint
    def test_journey_a_authenticated_user_reaches_protected_endpoint(self):
        user = User.objects.create_user(
            email="journey_a@movieflow.app",
            username="journey_a",
            password="Password123!",
            is_email_verified=True,
        )
        login_res = self.client.post(self.login_url, {
            "identifier": "journey_a@movieflow.app",
            "password": "Password123!",
        })
        self.assertEqual(login_res.status_code, 200)
        access = login_res.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        res = self.client.get(self.profile_me_url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["username"], "journey_a")

    # Journey B — unverified user is blocked with ACCOUNT_UNVERIFIED code
    def test_journey_b_unverified_user_blocked(self):
        User.objects.create_user(
            email="journey_b@movieflow.app",
            username="journey_b",
            password="Password123!",
            is_email_verified=False,
        )
        res = self.client.post(self.login_url, {
            "identifier": "journey_b@movieflow.app",
            "password": "Password123!",
        })
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json().get("code"), "ACCOUNT_UNVERIFIED")

    # Journey C (a) — invalid email verification token returns clear error
    def test_journey_c_invalid_verification_token_returns_error(self):
        res = self.client.post(self.verify_email_url, {"token": "not-a-real-token-00000000"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    # Journey C (b) — expired token returns clear error
    def test_journey_c_expired_verification_token_returns_error(self):
        user = User.objects.create_user(
            email="journey_c@movieflow.app",
            username="journey_c",
            password="Password123!",
            is_email_verified=False,
        )
        from accounts.utils import generate_secure_token
        token_str = generate_secure_token(48)
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token=token_str,
            expires_at=timezone.now() - timedelta(hours=25),
            is_used=False,
        )

        res = self.client.post(self.verify_email_url, {"token": token_obj.token})
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json()["error"].lower())

    # Journey C (c) — resend endpoint sends a new token
    def test_journey_c_resend_sends_new_token(self):
        user = User.objects.create_user(
            email="journey_c2@movieflow.app",
            username="journey_c2",
            password="Password123!",
            is_email_verified=False,
        )
        # Ensure no unused token exists (create_user doesn't create one)
        EmailVerificationToken.objects.filter(user=user).delete()

        res = self.client.post(self.resend_verify_url, {"email": "journey_c2@movieflow.app"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", res.json())
        # A new fresh unused token was created
        self.assertTrue(
            EmailVerificationToken.objects.filter(user=user, is_used=False).exists()
        )

    # Journey D — unauthenticated request to invitation endpoint returns AUTH_REQUIRED
    def test_journey_d_unauthenticated_invitation_returns_auth_required(self):
        # Create an inviter user
        inviter = User.objects.create_user(
            email="inviter@movieflow.app",
            username="inviter",
            password="Password123!",
            is_email_verified=True,
        )
        from rooms.models import RoomInvitation
        invitation = RoomInvitation.objects.create(
            token="test-token-journey-d-12345",
            room_name="Test Room",
            inviter=inviter,
            expires_at=timezone.now() + timedelta(days=7),
        )

        # Clear auth (unauthenticated)
        self.client.credentials()
        res = self.client.get(self.invitation_url_tpl.format(invitation.token))
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json().get("code"), "AUTH_REQUIRED")

    # Safe redirect validation — is_safe_internal_redirect
    def test_safe_redirect_accepts_valid_paths(self):
        self.assertTrue(is_safe_internal_redirect('/rooms/123'))
        self.assertTrue(is_safe_internal_redirect('/'))
        self.assertTrue(is_safe_internal_redirect('/invitations/abc123'))
        self.assertTrue(is_safe_internal_redirect('/profile'))

    def test_safe_redirect_rejects_invalid_urls(self):
        self.assertFalse(is_safe_internal_redirect('//evil.com'))
        self.assertFalse(is_safe_internal_redirect('https://evil.com'))
        self.assertFalse(is_safe_internal_redirect('javascript:alert(1)'))
        self.assertFalse(is_safe_internal_redirect(''))
        self.assertFalse(is_safe_internal_redirect('http://localhost/'))
        self.assertFalse(is_safe_internal_redirect(None))


class RoomInvitationSecurityTests(TestCase):
    """
    Security tests for invitation ownership and revocation checks.
    Covers Fix 2 (ownership) and Fix 4 (revocation) from the review blockers.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # Reset DRF throttle counters between tests

        self.client = APIClient()
        self.login_url = '/api/v1/auth/login/'

        # Create the inviter
        self.inviter = User.objects.create_user(
            email='inv_owner@movieflow.app',
            username='inv_owner',
            password='Password123!',
            is_email_verified=True,
        )
        # Create the intended invitee
        self.invitee = User.objects.create_user(
            email='inv_itee@movieflow.app',
            username='inv_itee',
            password='Password123!',
            is_email_verified=True,
        )
        # Create an unrelated verified user
        self.other = User.objects.create_user(
            email='other_user@movieflow.app',
            username='other_user',
            password='Password123!',
            is_email_verified=True,
        )

        from rooms.models import RoomInvitation
        self.RoomInvitation = RoomInvitation

        # Invitation addressed to invitee by FK
        self.inv_fk = RoomInvitation.objects.create(
            token='sec-token-fk-accept',
            room_name='Test Room FK',
            inviter=self.inviter,
            invitee=self.invitee,
            expires_at=timezone.now() + timedelta(days=7),
        )
        # Separate token for reject test
        self.inv_fk_reject = RoomInvitation.objects.create(
            token='sec-token-fk-reject',
            room_name='Test Room FK Reject',
            inviter=self.inviter,
            invitee=self.invitee,
            expires_at=timezone.now() + timedelta(days=7),
        )
        # Revoked invitation
        self.inv_revoked = RoomInvitation.objects.create(
            token='sec-token-revoked',
            room_name='Test Room Revoked',
            inviter=self.inviter,
            status=RoomInvitation.STATUS_REVOKED,
            expires_at=timezone.now() + timedelta(days=7),
        )

    def _get_token(self, email, password):
        res = self.client.post(self.login_url, {'identifier': email, 'password': password})
        data = res.json()
        self.assertIn('access', data, f"Login failed for {email}: HTTP {res.status_code} — {data}")
        return data['access']

    def test_non_owner_accept_returns_403(self):
        """An authenticated verified user who is not the invitee cannot accept the invitation."""
        token = self._get_token('other_user@movieflow.app', 'Password123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.post(f'/api/v1/invitations/{self.inv_fk.token}/accept/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json().get('error'), 'Not your invitation.')

    def test_non_owner_reject_returns_403(self):
        """An authenticated verified user who is not the invitee cannot reject the invitation."""
        token = self._get_token('other_user@movieflow.app', 'Password123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.post(f'/api/v1/invitations/{self.inv_fk_reject.token}/reject/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json().get('error'), 'Not your invitation.')

    def test_accept_revoked_invitation_returns_410(self):
        """Accepting a revoked invitation returns HTTP 410."""
        token = self._get_token('other_user@movieflow.app', 'Password123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.post(f'/api/v1/invitations/{self.inv_revoked.token}/accept/')
        self.assertEqual(res.status_code, 410)
        self.assertIn('revoked', res.json().get('error', '').lower())

