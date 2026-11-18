import subprocess
import time
import requests
import json
import sys
import os

def run_phase3_verification():
    print("=" * 75)
    print("MovieFlow Phase 3: Friends & Social Networking Full Verification Suite")
    print("=" * 75)

    # 1. Start Daphne ASGI Server
    print("\n[1/8] Booting Daphne ASGI Server on 127.0.0.1:8000...")
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

    def delete(url, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Connection"] = "close"
        return requests.delete(url, headers=headers, timeout=5, **kwargs)

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

        # Helper to create and activate a user
        suffix = str(int(time.time()))[-5:]
        users_data = [
            {"username": f"alex_{suffix}", "email": f"alex_{suffix}@movieflow.app", "full_name": f"Alex Miller {suffix}"},
            {"username": f"bella_{suffix}", "email": f"bella_{suffix}@movieflow.app", "full_name": f"Bella Davis {suffix}"},
            {"username": f"chris_{suffix}", "email": f"chris_{suffix}@movieflow.app", "full_name": f"Chris Nolan {suffix}"},
            {"username": f"dana_{suffix}", "email": f"dana_{suffix}@movieflow.app", "full_name": f"Dana Fox {suffix}"},
        ]
        tokens = {}
        users_info = {}

        print("\n[2/8] Creating and verifying 4 test users (Alex, Bella, Chris, Dana)...")
        for u in users_data:
            # Register
            reg_res = post("http://127.0.0.1:8000/api/v1/auth/register/", json={
                "username": u["username"],
                "email": u["email"],
                "password": "Password123!@",
                "confirm_password": "Password123!@",
                "full_name": u["full_name"],
                "terms_accepted": True,
            })
            assert reg_res.status_code == 201, f"Failed to register {u['username']}: {reg_res.text}"
            reg_json = reg_res.json()
            mf_id = reg_json["user"]["movieflow_id"]
            user_id = reg_json["user"]["id"]
            assert mf_id.startswith("MF-") and len(mf_id) == 11, f"Invalid MovieFlow ID: {mf_id}"

            # Verify email using backend direct token retrieval
            from django.core.wsgi import get_wsgi_application
            # Or login after activating user in db via python script or tokens endpoint
            # Since EmailVerificationToken is created in backend, let's activate via query
            activate_cmd = subprocess.run(
                [
                    os.path.abspath(r".\backend\venv\Scripts\python.exe"),
                    "manage.py", "shell", "-c",
                    f"from accounts.models import User; u = User.objects.get(email='{u['email']}'); u.is_email_verified = True; u.save()"
                ],
                cwd=os.path.abspath("backend"),
                capture_output=True,
                text=True
            )
            assert activate_cmd.returncode == 0, f"Activation error: {activate_cmd.stderr}"

            # Login
            login_res = post("http://127.0.0.1:8000/api/v1/auth/login/", json={
                "identifier": u["email"],
                "password": "Password123!@"
            })
            assert login_res.status_code == 200, f"Login failed: {login_res.text}"
            tokens[u["username"]] = login_res.json()["access"]
            users_info[u["username"]] = {
                "id": user_id,
                "movieflow_id": mf_id,
                "username": u["username"],
                "full_name": u["full_name"],
            }
            print(f"  + Registered & verified: @{u['username']} ({mf_id})")

        alex_auth = {"Authorization": f"Bearer {tokens[users_data[0]['username']]}"}
        bella_auth = {"Authorization": f"Bearer {tokens[users_data[1]['username']]}"}
        chris_auth = {"Authorization": f"Bearer {tokens[users_data[2]['username']]}"}
        dana_auth = {"Authorization": f"Bearer {tokens[users_data[3]['username']]}"}

        # 3. User Discovery & Search
        print("\n[3/8] Testing User Discovery & Search (MovieFlow ID, username, display name)...")
        # Search exact MovieFlow ID
        s1 = get(f"http://127.0.0.1:8000/api/v1/users/search/?q={users_info[users_data[1]['username']]['movieflow_id']}", headers=alex_auth)
        assert s1.status_code == 200, f"Search failed: {s1.text}"
        data1 = s1.json()
        assert data1["count"] >= 1
        found_bella = data1["results"][0]
        assert found_bella["username"] == users_data[1]["username"]
        assert "email" not in found_bella, "PRIVACY VIOLATION: Email exposed in search!"
        assert "password" not in found_bella, "SECURITY VIOLATION: Password hash exposed!"
        assert found_bella["relationship_status"] == "none"
        print("  + MovieFlow ID search succeeded and verified zero email leakage.")

        # Search username case-insensitive
        s2 = get(f"http://127.0.0.1:8000/api/v1/users/search/?q={users_data[2]['username'].upper()}", headers=alex_auth)
        assert s2.status_code == 200
        assert any(r["username"] == users_data[2]["username"] for r in s2.json()["results"])
        print("  + Case-insensitive username search passed.")

        # Search display name
        s3 = get(f"http://127.0.0.1:8000/api/v1/users/search/?q=Nolan", headers=alex_auth)
        assert s3.status_code == 200
        assert any(r["username"] == users_data[2]["username"] for r in s3.json()["results"])
        print("  + Display name substring search passed.")

        # 4. Friend Request Flow (Alex -> Bella)
        print("\n[4/8] Testing Friend Request Flow (Send -> Pending -> Accept)...")
        req_res = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_info[users_data[1]['username']]["movieflow_id"]
        }, headers=alex_auth)
        assert req_res.status_code == 201, f"Failed to send request: {req_res.text}"
        req_data = req_res.json()
        req_id = req_data["request_id"]
        assert req_data["status"] == "pending"

        # Check duplicate prevention
        dup_res = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[1]["username"]
        }, headers=alex_auth)
        assert dup_res.status_code == 400, "Duplicate request was not prevented!"
        print("  + Duplicate friend request prevention verified (400 Bad Request).")

        # Verify outgoing on Alex
        out_res = get("http://127.0.0.1:8000/api/v1/friends/requests/outgoing/", headers=alex_auth)
        assert out_res.status_code == 200
        assert any(r["id"] == req_id for r in out_res.json())

        # Verify incoming on Bella
        inc_res = get("http://127.0.0.1:8000/api/v1/friends/requests/incoming/", headers=bella_auth)
        assert inc_res.status_code == 200
        assert any(r["id"] == req_id for r in inc_res.json())
        print("  + Request properly visible in Alex's outgoing and Bella's incoming.")

        # Bella accepts request
        accept_res = post(f"http://127.0.0.1:8000/api/v1/friends/requests/{req_id}/accept/", headers=bella_auth)
        assert accept_res.status_code == 200, f"Accept failed: {accept_res.text}"

        # Verify mutual friendship in /api/v1/friends/
        alex_friends = get("http://127.0.0.1:8000/api/v1/friends/", headers=alex_auth).json()
        bella_friends = get("http://127.0.0.1:8000/api/v1/friends/", headers=bella_auth).json()
        assert any(f["friend"]["username"] == users_data[1]["username"] for f in alex_friends)
        assert any(f["friend"]["username"] == users_data[0]["username"] for f in bella_friends)
        print("  + Mutual friendship successfully confirmed for Alex and Bella.")

        # Check notification on Alex
        notif_res = get("http://127.0.0.1:8000/api/v1/notifications/", headers=alex_auth).json()
        assert notif_res["unread_count"] >= 1
        assert any(n["verb"] == "friend_request_accepted" for n in notif_res["results"])
        print("  + In-app notification generated for Alex upon request acceptance.")

        # 5. Reciprocal Auto-Acceptance (Alex & Chris)
        print("\n[5/8] Testing Reciprocal Friend Request Auto-Acceptance...")
        # Alex sends to Chris
        r_ac = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[2]["username"]
        }, headers=alex_auth)
        assert r_ac.status_code == 201

        # Chris sends back to Alex -> must auto-accept immediately!
        r_ca = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[0]["username"]
        }, headers=chris_auth)
        assert r_ca.status_code == 201 or r_ca.status_code == 200
        ca_data = r_ca.json()
        assert ca_data["status"] == "accepted_reciprocal", f"Unexpected status: {ca_data}"

        # Confirm they are now friends
        c_friends = get("http://127.0.0.1:8000/api/v1/friends/", headers=chris_auth).json()
        assert any(f["friend"]["username"] == users_data[0]["username"] for f in c_friends)
        print("  + Reciprocal friend request automatically converted into friendship.")

        # 6. Cancellation & Rejection
        print("\n[6/8] Testing Request Cancellation & Rejection...")
        # Dana sends to Bella
        r_db = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[1]["username"]
        }, headers=dana_auth).json()
        # Dana cancels
        c_res = post(f"http://127.0.0.1:8000/api/v1/friends/requests/{r_db['request_id']}/cancel/", headers=dana_auth)
        assert c_res.status_code == 200
        print("  + Request cancellation by sender succeeded.")

        # Dana sends to Chris
        r_dc = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[2]["username"]
        }, headers=dana_auth).json()
        # Chris rejects
        rej_res = post(f"http://127.0.0.1:8000/api/v1/friends/requests/{r_dc['request_id']}/reject/", headers=chris_auth)
        assert rej_res.status_code == 200
        print("  + Request rejection by recipient succeeded.")

        # 7. Friend Removal & Blocking
        print("\n[7/8] Testing Friend Removal & Blocking...")
        # Alex removes Chris
        alex_friends_now = get("http://127.0.0.1:8000/api/v1/friends/", headers=alex_auth).json()
        chris_friendship = next(f for f in alex_friends_now if f["friend"]["username"] == users_data[2]["username"])
        del_f = delete(f"http://127.0.0.1:8000/api/v1/friends/{chris_friendship['id']}/", headers=alex_auth)
        assert del_f.status_code == 200
        # Check no longer friends
        assert not any(f["friend"]["username"] == users_data[2]["username"] for f in get("http://127.0.0.1:8000/api/v1/friends/", headers=alex_auth).json())
        print("  + Friendship removal completed successfully.")

        # Alex blocks Bella (who was a friend)
        block_res = post(f"http://127.0.0.1:8000/api/v1/users/{users_info[users_data[1]['username']]['id']}/block/", json={
            "reason": "Testing block feature"
        }, headers=alex_auth)
        assert block_res.status_code == 200

        # Assert friendship between Alex & Bella was automatically purged
        assert not any(f["friend"]["username"] == users_data[1]["username"] for f in get("http://127.0.0.1:8000/api/v1/friends/", headers=alex_auth).json())
        assert not any(f["friend"]["username"] == users_data[0]["username"] for f in get("http://127.0.0.1:8000/api/v1/friends/", headers=bella_auth).json())
        print("  + Blocking automatically removed existing friendship on both sides.")

        # Verify Bella cannot send friend request to Alex
        blocked_req = post("http://127.0.0.1:8000/api/v1/friends/requests/", json={
            "target": users_data[0]["username"]
        }, headers=bella_auth)
        assert blocked_req.status_code == 400
        print("  + Blocked user is prevented from sending friend requests.")

        # Check blocked list
        blocked_list = get("http://127.0.0.1:8000/api/v1/users/blocked/", headers=alex_auth).json()
        assert any(b["blocked_user"]["username"] == users_data[1]["username"] for b in blocked_list)

        # Alex unblocks Bella
        unblock_res = delete(f"http://127.0.0.1:8000/api/v1/users/{users_info[users_data[1]['username']]['id']}/block/", headers=alex_auth)
        assert unblock_res.status_code == 200
        assert not any(b["blocked_user"]["username"] == users_data[1]["username"] for b in get("http://127.0.0.1:8000/api/v1/users/blocked/", headers=alex_auth).json())
        print("  + Unblocking verified and blocked list updated.")

        # 8. Notifications Cleanup
        print("\n[8/8] Testing Notification Read Status...")
        mark_all = post("http://127.0.0.1:8000/api/v1/notifications/read-all/", headers=alex_auth)
        assert mark_all.status_code == 200
        notifs_after = get("http://127.0.0.1:8000/api/v1/notifications/", headers=alex_auth).json()
        assert notifs_after["unread_count"] == 0
        print("  + Mark all notifications read verified (unread_count = 0).")

        print("\n" + "=" * 75)
        print("ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY! (8/8)")
        print("=" * 75)
        return True

    finally:
        print("\nTearing down Daphne ASGI server...")
        daphne.terminate()
        daphne.wait()
        print("Daphne server stopped.")

if __name__ == "__main__":
    success = run_phase3_verification()
    sys.exit(0 if success else 1)
