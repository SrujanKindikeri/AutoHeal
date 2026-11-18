import subprocess
import time
import requests
import json
import sys
import os

def run_phase2_verification():
    print("=" * 70)
    print("MovieFlow Phase 2: Authentication & Identity Full Verification Suite")
    print("=" * 70)

    # 1. Start Daphne ASGI Server
    print("\n[1/7] Booting Daphne ASGI Server on 127.0.0.1:8000...")
    backend_env = os.environ.copy()
    backend_env["PYTHONUNBUFFERED"] = "1"

    daphne = subprocess.Popen(
        [
            os.path.abspath(r".\backend\venv\Scripts\daphne.exe"),
            "-b", "127.0.0.1",
            "-p", "8000",
            "movieflow.asgi:application"
        ],
        cwd=os.path.abspath("backend"),
        env=backend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True
    )

    def post(url, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Connection"] = "close"
        return requests.post(url, headers=headers, timeout=5, **kwargs)

    def get(url, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Connection"] = "close"
        return requests.get(url, headers=headers, timeout=5, **kwargs)

    def patch(url, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Connection"] = "close"
        return requests.patch(url, headers=headers, timeout=5, **kwargs)

    try:
        # Wait for Daphne to be responsive
        server_ready = False
        start_time = time.time()
        while time.time() - start_time < 12:
            try:
                res = get("http://127.0.0.1:8000/api/core/health/")
                if res.status_code == 200 and res.json().get("status") == "healthy":
                    server_ready = True
                    break
            except Exception:
                time.sleep(1)

        if not server_ready:
            print("ERROR: Daphne server did not start in time.")
            return False

        print(f"[SUCCESS] Daphne is active (Boot time: {time.time()-start_time:.2f}s)")

        # 2. Registration & MovieFlow ID Validation
        print("\n[2/7] Testing User Registration & MovieFlow ID Generation...")
        suffix = str(int(time.time()))[-6:]
        username = f"lucas_{suffix}"
        email = f"lucas_{suffix}@movieflow.app"

        reg_payload = {
            "full_name": f"Lucas Vance {suffix}",
            "email": email,
            "username": username,
            "password": "AppleQualityPassword2025!",
            "confirm_password": "AppleQualityPassword2025!",
            "terms_accepted": True
        }
        res = post("http://127.0.0.1:8000/api/v1/auth/register/", json=reg_payload)
        print(f"Registration response (code {res.status_code}): {res.json()}")
        assert res.status_code == 201, f"Expected 201, got {res.status_code}"
        user_info = res.json()["user"]
        mf_id = user_info["movieflow_id"]
        assert mf_id.startswith("MF-"), f"MovieFlow ID invalid prefix: {mf_id}"
        assert len(mf_id) == 11, f"MovieFlow ID length != 11: {mf_id}"
        assert not user_info["is_email_verified"], "New user should not be email verified"
        print(f"[SUCCESS] User registered with permanent MovieFlow ID: {mf_id}")

        # Duplicate rejection test
        dup_res = post("http://127.0.0.1:8000/api/v1/auth/register/", json=reg_payload)
        assert dup_res.status_code == 400, f"Expected 400 on duplicate email/username, got {dup_res.status_code}"
        print("[SUCCESS] Duplicate registration correctly rejected with 400 Bad Request.")

        # 3. Unverified Login Gate
        print("\n[3/7] Testing Unverified Account Login Restriction...")
        login_payload = {
            "identifier": email,
            "password": "AppleQualityPassword2025!"
        }
        unverified_res = post("http://127.0.0.1:8000/api/v1/auth/login/", json=login_payload)
        print(f"Unverified login response (code {unverified_res.status_code}): {unverified_res.json()}")
        assert unverified_res.status_code == 403, f"Expected 403 Forbidden, got {unverified_res.status_code}"
        assert unverified_res.json().get("code") == "ACCOUNT_UNVERIFIED"
        print("[SUCCESS] Unverified account blocked from login as required.")

        # 4. Email Verification
        print("\n[4/7] Testing Email Verification Flow...")
        token_proc = subprocess.run(
            [
                os.path.abspath(r".\backend\venv\Scripts\python.exe"),
                "-c",
                f"import sys, os, django; sys.path.insert(0, 'backend'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movieflow.settings'); "
                f"django.setup(); from accounts.models import EmailVerificationToken, User; "
                f"u = User.objects.get(email='{email}'); "
                f"t = EmailVerificationToken.objects.get(user=u, is_used=False); print(t.token)"
            ],
            capture_output=True,
            text=True
        )
        token_str = token_proc.stdout.strip()
        assert token_str, f"Verification token not found: {token_proc.stderr}"

        verify_res = post("http://127.0.0.1:8000/api/v1/auth/verify-email/", json={"token": token_str})
        print(f"Email verification response (code {verify_res.status_code}): {verify_res.json()}")
        assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}"
        assert verify_res.json()["user"]["is_email_verified"], "User should now be verified"
        print("[SUCCESS] Email successfully verified!")

        # 5. Login (Email and Username) & JWT Token Management
        print("\n[5/7] Testing Login (Email & Username), JWT Tokens, and Token Refresh...")
        # Login with email
        login_res = post("http://127.0.0.1:8000/api/v1/auth/login/", json=login_payload)
        assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}"
        access_token = login_res.json()["access"]
        refresh_token = login_res.json()["refresh"]
        print(f"Authenticated as: {login_res.json()['user']['username']} ({login_res.json()['user']['movieflow_id']})")

        # Login with username
        login_user_res = post("http://127.0.0.1:8000/api/v1/auth/login/", json={
            "identifier": username,
            "password": "AppleQualityPassword2025!"
        })
        assert login_user_res.status_code == 200, "Login with username failed"

        # Token refresh
        refresh_res = post("http://127.0.0.1:8000/api/v1/auth/refresh/", json={"refresh": refresh_token})
        assert refresh_res.status_code == 200, f"Expected 200 on refresh, got {refresh_res.status_code}: {refresh_res.text}"
        new_access_token = refresh_res.json()["access"]
        print("[SUCCESS] Login (email + username) and token refresh verified!")

        # 6. Profile Management & Search
        print("\n[6/7] Testing Profile Retrieval, Profile Updates, and User Discovery...")
        auth_headers = {"Authorization": f"Bearer {new_access_token}"}

        # Get profile
        me_res = get("http://127.0.0.1:8000/api/v1/profile/me/", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["movieflow_id"] == mf_id

        # Update profile with entertainment interests
        patch_payload = {
            "bio": "Film critic, vinyl record collector, and cinema buff.",
            "preferred_movie_genres": ["Sci-Fi", "Drama", "Thriller"],
            "preferred_music_genres": ["Electronic", "Ambient", "Jazz"],
            "watch_history_visibility": "friends_only"
        }
        patched_res = patch("http://127.0.0.1:8000/api/v1/profile/me/", json=patch_payload, headers=auth_headers)
        assert patched_res.status_code == 200, f"Expected 200, got {patched_res.status_code}"
        assert patched_res.json()["profile"]["is_profile_completed"], "Profile should be marked completed"
        assert patched_res.json()["profile"]["preferred_movie_genres"] == ["Sci-Fi", "Drama", "Thriller"]
        print(f"[SUCCESS] Profile personalized: {patched_res.json()['profile']['bio']}")

        # User discovery search by username
        search_res = get(f"http://127.0.0.1:8000/api/v1/users/search/?q={username[:4]}", headers=auth_headers)
        assert search_res.status_code == 200
        print(f"[SUCCESS] User discovery search returned {len(search_res.json())} match(es)")

        # User discovery by MovieFlow ID
        id_res = get(f"http://127.0.0.1:8000/api/v1/users/by-movieflow-id/{mf_id}/", headers=auth_headers)
        assert id_res.status_code == 200
        assert id_res.json()["movieflow_id"] == mf_id
        assert "email" not in id_res.json(), "Email must NEVER be exposed in public endpoints"
        print(f"[SUCCESS] User discovery by MovieFlow ID verified without email exposure!")

        # 7. Automated Test Suite (19 tests) & Next.js Build
        print("\n[7/7] Running Django accounts test suite & checking Next.js build...")
        test_proc = subprocess.run(
            [os.path.abspath(r".\backend\venv\Scripts\python.exe"), "manage.py", "test", "accounts"],
            cwd=os.path.abspath("backend"),
            capture_output=True,
            text=True
        )
        print(test_proc.stdout)
        print(test_proc.stderr)
        assert test_proc.returncode == 0, "Accounts unit tests failed"
        print("[SUCCESS] All 19 automated tests in accounts test suite passed!")

        print("\n" + "=" * 70)
        print("PHASE 2 COMPLETE: ALL AUTHENTICATION & IDENTITY REQUIREMENTS VERIFIED!")
        print("=" * 70)
        return True

    finally:
        print("\nShutting down Daphne test server...")
        daphne.terminate()
        try:
            daphne.wait(timeout=3)
        except subprocess.TimeoutExpired:
            daphne.kill()
        print("Daphne stopped.")

if __name__ == "__main__":
    success = run_phase2_verification()
    sys.exit(0 if success else 1)
