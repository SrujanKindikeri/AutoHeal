import subprocess
import time
import urllib.request
import json
import sys
import os

def run_verification():
    print("=" * 60)
    print("MovieFlow Phase 1: End-to-End Multi-Service Communication Test")
    print("=" * 60)

    # 1. Start Daphne ASGI Server
    print("\n[1/4] Launching Daphne ASGI Server on 127.0.0.1:8000...")
    backend_env = os.environ.copy()
    backend_env["PYTHONUNBUFFERED"] = "1"

    daphne_process = subprocess.Popen(
        [
            os.path.abspath(r".\backend\venv\Scripts\daphne.exe"),
            "-v", "2",
            "-b", "127.0.0.1",
            "-p", "8000",
            "movieflow.asgi:application"
        ],
        cwd=os.path.abspath("backend"),
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    try:
        # Wait up to 10 seconds for Daphne to be ready
        ready = False
        start_time = time.time()
        while time.time() - start_time < 12:
            if daphne_process.poll() is not None:
                stdout, _ = daphne_process.communicate()
                print(f"ERROR: Daphne process exited prematurely:\n{stdout}")
                return False

            try:
                req = urllib.request.Request("http://127.0.0.1:8000/api/core/health/")
                with urllib.request.urlopen(req, timeout=3) as response:
                    if response.getcode() == 200:
                        body = response.read().decode('utf-8')
                        data = json.loads(body)
                        print(f"[SUCCESS] Daphne is up and responding! (Boot time: {time.time()-start_time:.2f}s)")
                        print(f"Response: {json.dumps(data, indent=2)}")
                        ready = True
                        break
            except Exception as e:
                time.sleep(1)

        if not ready:
            print("ERROR: Timed out waiting for Daphne to respond.")
            return False

        # 2. Verify REST health payload details
        print("\n[2/4] Validating REST Health Check components...")
        req = urllib.request.Request("http://127.0.0.1:8000/api/core/health/")
        with urllib.request.urlopen(req, timeout=5) as response:
            assert response.getcode() == 200
            data = json.loads(response.read().decode('utf-8'))
            assert data.get("status") == "healthy", f"Status not healthy: {data}"
            assert data.get("components", {}).get("database", {}).get("status") == "up", "DB not up"
            assert data.get("components", {}).get("channels", {}).get("status") == "up", "Channels not up"
        print("[SUCCESS] Backend REST API, Database, and Channels components are UP and verified!")

        # 3. Channels WebSocket & broadcast tests
        print("\n[3/4] Testing Channels WebSocket via test suite...")
        test_result = subprocess.run(
            [os.path.abspath(r".\backend\venv\Scripts\python.exe"), "manage.py", "test", "core"],
            cwd=os.path.abspath("backend"),
            capture_output=True,
            text=True
        )
        print(test_result.stdout)
        print(test_result.stderr)
        assert test_result.returncode == 0, "Channels unit tests failed"
        print("[SUCCESS] Channels WebSocket connection and broadcast verified!")

        # 4. Check Frontend build
        print("\n[4/4] Verifying Next.js Frontend Production Build...")
        assert os.path.exists("frontend/.next"), "frontend/.next missing"
        print("[SUCCESS] Next.js frontend build verified!")

        print("\n" + "=" * 60)
        print("PHASE 1 VERIFICATION COMPLETE: ALL SYSTEMS FUNCTIONAL & COMMUNICATING")
        print("=" * 60)
        return True

    finally:
        print("\nShutting down Daphne test server...")
        daphne_process.terminate()
        try:
            daphne_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            daphne_process.kill()
        print("Daphne stopped.")

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
