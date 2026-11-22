"""Quick backend smoke test — run with: python smoke_test.py"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movieflow.settings')
import django
django.setup()

# Test 1: Provider registry
from playback.providers import get_provider, list_providers
p = get_provider('youtube-embed')
assert p is not None, "YouTube provider not found"
caps = p.get_capabilities()
assert caps.supports_embedded_playback, "YouTube should support embedded playback"
print("PASS: Provider registry works")

# Test 2: Import consumer
from rooms.consumers import RoomPlaybackConsumer
print("PASS: RoomPlaybackConsumer imports OK")

# Test 3: Import middleware
from accounts.middleware import JWTQueryAuthMiddleware
print("PASS: JWTQueryAuthMiddleware imports OK")

# Test 4: Check new models exist
from library.models import UserMovie, UserTrack, UserTrackPlaylistItem
print("PASS: UserMovie, UserTrack, UserTrackPlaylistItem models OK")

# Test 5: Check rooms API views
from rooms.views import RoomListCreateView, RoomJoinView, RoomInviteCreateView, RoomInvitationByTokenView
print("PASS: Rooms views import OK")

# Test 6: Content validation
from library.content_validation import validate_video_file, validate_audio_file
import io
fake_mp4 = b'\x00\x00\x00\x20' + b'ftypisom' + b'\x00' * 20
valid, err, mime = validate_video_file(io.BytesIO(fake_mp4))
assert valid, f"Should detect MP4: {err}"
assert 'video' in mime, f"MIME should be video, got {mime}"
print(f"PASS: Content validation detects MP4 as {mime}")

fake_mp3 = b'ID3' + b'\x03\x00\x00' + b'\x00' * 20
valid, err, mime = validate_audio_file(io.BytesIO(fake_mp3))
assert valid, f"Should detect MP3: {err}"
print(f"PASS: Content validation detects MP3 as {mime}")

# Test 7: Playback urls resolve
from django.urls import reverse
url = reverse('playback:provider-list')
assert url == '/api/v1/playback/providers/', f"Wrong URL: {url}"
print(f"PASS: Playback providers URL: {url}")

# Test 8: Rooms urls resolve
url = reverse('room-list-create')
assert url == '/api/v1/rooms/', f"Wrong URL: {url}"
print(f"PASS: Rooms list URL: {url}")

# Test 9: WS routing resolves
from movieflow.routing import websocket_urlpatterns
ws_paths = [str(p.pattern) for p in websocket_urlpatterns]
assert any('rooms' in p for p in ws_paths), f"No rooms WS route: {ws_paths}"
print(f"PASS: WS routing: {ws_paths}")

# Test 10: Django system check
from django.core.management import call_command
import io as sysio
out = sysio.StringIO()
call_command('check', stdout=out, stderr=out)
result = out.getvalue()
print(f"PASS: Django check: {result.strip() or 'no issues'}")

print("\nAll smoke tests passed.")
