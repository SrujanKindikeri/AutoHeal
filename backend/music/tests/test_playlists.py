"""
Phase 8 playlist tests.

Covers:
- Playlist CRUD
- Visibility access control (private / unlisted / public)
- Add / remove tracks
- Duplicate track rejection
- Bulk reorder
- Playlist duplication
- Collaborator management (add, change permission, remove)
- Viewer cannot edit
- Editor can edit but not delete or manage collaborators
- Owner cannot be added as collaborator
- Share link generation
- Discover endpoint (public only)
- Unauthenticated access control
- Large playlist (100 tracks)
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from music.models import Playlist, PlaylistCollaborator, PlaylistTrack

User = get_user_model()

BASE = '/api/v1/music/playlists'


def _tok(user):
    return str(RefreshToken.for_user(user).access_token)


def _client(user=None):
    c = APIClient()
    if user:
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {_tok(user)}')
    return c


def _make_user(username, email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@test.com',
        password='testpass123',
    )


TRACK = {
    'track_mbid': 'aaaa-1111-bbbb-2222',
    'title': 'Test Track',
    'artist_name': 'Test Artist',
    'album_name': 'Test Album',
    'duration_ms': 210000,
    'artwork_url': '',
}


# ---------------------------------------------------------------------------
# 1. Playlist CRUD
# ---------------------------------------------------------------------------

class PlaylistCRUDTests(APITestCase):
    def setUp(self):
        self.user = _make_user('owner')
        self.c = _client(self.user)

    def test_create_playlist(self):
        r = self.c.post(f'{BASE}/', {'name': 'My Playlist', 'description': 'desc', 'visibility': 'private'})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['name'], 'My Playlist')
        self.assertEqual(r.data['visibility'], 'private')
        self.assertIn('artwork_url', r.data)
        self.assertIn('total_duration_seconds', r.data)
        self.assertEqual(r.data['owner_username'], self.user.username)

    def test_create_requires_name(self):
        r = self.c.post(f'{BASE}/', {'name': ''})
        self.assertEqual(r.status_code, 400)

    def test_create_invalid_visibility(self):
        r = self.c.post(f'{BASE}/', {'name': 'x', 'visibility': 'secret'})
        self.assertEqual(r.status_code, 400)

    def test_list_playlists(self):
        self.c.post(f'{BASE}/', {'name': 'A'})
        self.c.post(f'{BASE}/', {'name': 'B'})
        r = self.c.get(f'{BASE}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)

    def test_get_detail(self):
        create = self.c.post(f'{BASE}/', {'name': 'Detail Test'})
        pid = create.data['id']
        r = self.c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('tracks', r.data)

    def test_patch_name(self):
        pid = self.c.post(f'{BASE}/', {'name': 'Old'}).data['id']
        r = self.c.patch(f'{BASE}/{pid}/', {'name': 'New'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['name'], 'New')

    def test_patch_visibility(self):
        pid = self.c.post(f'{BASE}/', {'name': 'x'}).data['id']
        r = self.c.patch(f'{BASE}/{pid}/', {'visibility': 'public'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['visibility'], 'public')

    def test_patch_artwork_url(self):
        pid = self.c.post(f'{BASE}/', {'name': 'x'}).data['id']
        r = self.c.patch(f'{BASE}/{pid}/', {'artwork_url': 'https://example.com/art.jpg'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['artwork_url'], 'https://example.com/art.jpg')

    def test_delete_playlist(self):
        pid = self.c.post(f'{BASE}/', {'name': 'Del'}).data['id']
        r = self.c.delete(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(Playlist.objects.filter(id=pid).exists())

    def test_get_nonexistent(self):
        r = self.c.get(f'{BASE}/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(r.status_code, 404)

    def test_create_requires_auth(self):
        r = APIClient().post(f'{BASE}/', {'name': 'x'})
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# 2. Visibility access control
# ---------------------------------------------------------------------------

class PlaylistVisibilityTests(APITestCase):
    def setUp(self):
        self.owner = _make_user('vis_owner')
        self.stranger = _make_user('vis_stranger')
        self.owner_c = _client(self.owner)
        self.stranger_c = _client(self.stranger)
        self.anon_c = APIClient()

    def _create(self, visibility):
        return self.owner_c.post(f'{BASE}/', {'name': f'{visibility} pl', 'visibility': visibility}).data['id']

    def test_private_blocked_stranger(self):
        pid = self._create('private')
        r = self.stranger_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 403)

    def test_private_blocked_anon(self):
        pid = self._create('private')
        r = self.anon_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 403)

    def test_unlisted_accessible_by_uuid(self):
        pid = self._create('unlisted')
        r = self.stranger_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)

    def test_unlisted_accessible_anon(self):
        pid = self._create('unlisted')
        r = self.anon_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)

    def test_public_accessible_stranger(self):
        pid = self._create('public')
        r = self.stranger_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)

    def test_public_accessible_anon(self):
        pid = self._create('public')
        r = self.anon_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)

    def test_private_edit_blocked_stranger(self):
        pid = self._create('private')
        r = self.stranger_c.patch(f'{BASE}/{pid}/', {'name': 'hack'})
        self.assertIn(r.status_code, (403, 404))

    def test_unlisted_edit_blocked_stranger(self):
        pid = self._create('unlisted')
        r = self.stranger_c.patch(f'{BASE}/{pid}/', {'name': 'hack'})
        self.assertEqual(r.status_code, 403)

    def test_owner_can_access_own_private(self):
        pid = self._create('private')
        r = self.owner_c.get(f'{BASE}/{pid}/')
        self.assertEqual(r.status_code, 200)


# ---------------------------------------------------------------------------
# 3. Track add / remove
# ---------------------------------------------------------------------------

class PlaylistTrackTests(APITestCase):
    def setUp(self):
        self.user = _make_user('track_owner')
        self.c = _client(self.user)
        self.pid = self.c.post(f'{BASE}/', {'name': 'Track Test'}).data['id']

    def test_add_track(self):
        r = self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['track_mbid'], TRACK['track_mbid'])

    def test_remove_track(self):
        self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        r = self.c.delete(f'{BASE}/{self.pid}/tracks/{TRACK["track_mbid"]}/')
        self.assertEqual(r.status_code, 204)
        self.assertEqual(PlaylistTrack.objects.filter(playlist_id=self.pid).count(), 0)

    def test_add_track_missing_fields(self):
        r = self.c.post(f'{BASE}/{self.pid}/tracks/', {'track_mbid': 'x'})
        self.assertEqual(r.status_code, 400)

    def test_remove_nonexistent_track(self):
        r = self.c.delete(f'{BASE}/{self.pid}/tracks/nonexistent-mbid/')
        self.assertEqual(r.status_code, 400)

    def test_track_count_in_playlist(self):
        self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        r = self.c.get(f'{BASE}/{self.pid}/')
        self.assertEqual(r.data['track_count'], 1)

    def test_total_duration(self):
        self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        r = self.c.get(f'{BASE}/{self.pid}/')
        self.assertEqual(r.data['total_duration_seconds'], 210)


# ---------------------------------------------------------------------------
# 4. Duplicate track rejection
# ---------------------------------------------------------------------------

class DuplicateTrackTests(APITestCase):
    def setUp(self):
        self.user = _make_user('dup_owner')
        self.c = _client(self.user)
        self.pid = self.c.post(f'{BASE}/', {'name': 'Dup Test'}).data['id']

    def test_duplicate_track_rejected(self):
        self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        r = self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        self.assertEqual(r.status_code, 400)
        self.assertIn('already', r.data.get('error', '').lower())

    def test_same_track_different_playlists_allowed(self):
        pid2 = self.c.post(f'{BASE}/', {'name': 'Other'}).data['id']
        r1 = self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        r2 = self.c.post(f'{BASE}/{pid2}/tracks/', TRACK)
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)


# ---------------------------------------------------------------------------
# 5. Bulk reorder
# ---------------------------------------------------------------------------

class PlaylistReorderTests(APITestCase):
    def setUp(self):
        self.user = _make_user('reorder_owner')
        self.c = _client(self.user)
        self.pid = self.c.post(f'{BASE}/', {'name': 'Reorder'}).data['id']
        t1 = dict(TRACK, track_mbid='reorder-mbid-1', title='T1')
        t2 = dict(TRACK, track_mbid='reorder-mbid-2', title='T2')
        self.id1 = self.c.post(f'{BASE}/{self.pid}/tracks/', t1).data['id']
        self.id2 = self.c.post(f'{BASE}/{self.pid}/tracks/', t2).data['id']

    def test_bulk_reorder(self):
        r = self.c.post(f'{BASE}/{self.pid}/reorder/', [
            {'id': self.id1, 'position': 1},
            {'id': self.id2, 'position': 0},
        ], format='json')
        self.assertEqual(r.status_code, 200)
        pt1 = PlaylistTrack.objects.get(id=self.id1)
        pt2 = PlaylistTrack.objects.get(id=self.id2)
        self.assertEqual(pt1.position, 1)
        self.assertEqual(pt2.position, 0)

    def test_reorder_invalid_id(self):
        r = self.c.post(f'{BASE}/{self.pid}/reorder/', [
            {'id': '00000000-0000-0000-0000-000000000000', 'position': 0}
        ], format='json')
        self.assertEqual(r.status_code, 400)

    def test_reorder_requires_list(self):
        r = self.c.post(f'{BASE}/{self.pid}/reorder/', {'id': self.id1, 'position': 0}, format='json')
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# 6. Playlist duplication
# ---------------------------------------------------------------------------

class PlaylistDuplicateTests(APITestCase):
    def setUp(self):
        self.user = _make_user('dupe_owner')
        self.c = _client(self.user)
        self.pid = self.c.post(f'{BASE}/', {'name': 'Original', 'visibility': 'public'}).data['id']
        self.c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        t2 = dict(TRACK, track_mbid='dupe-track-2', title='T2')
        self.c.post(f'{BASE}/{self.pid}/tracks/', t2)

    def test_duplicate_creates_copy(self):
        r = self.c.post(f'{BASE}/{self.pid}/duplicate/')
        self.assertEqual(r.status_code, 201)
        self.assertIn('Copy of Original', r.data['name'])

    def test_duplicate_copies_tracks(self):
        r = self.c.post(f'{BASE}/{self.pid}/duplicate/')
        new_pid = r.data['id']
        detail = self.c.get(f'{BASE}/{new_pid}/')
        self.assertEqual(detail.data['track_count'], 2)

    def test_duplicate_starts_private(self):
        r = self.c.post(f'{BASE}/{self.pid}/duplicate/')
        self.assertEqual(r.data['visibility'], 'private')

    def test_duplicate_owned_by_requester(self):
        other = _make_user('dupe_other')
        other_c = _client(other)
        # other can duplicate a public playlist
        r = other_c.post(f'{BASE}/{self.pid}/duplicate/')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['owner_username'], other.username)


# ---------------------------------------------------------------------------
# 7. Collaborator management
# ---------------------------------------------------------------------------

class CollaboratorTests(APITestCase):
    def setUp(self):
        self.owner = _make_user('collab_owner')
        self.editor = _make_user('collab_editor')
        self.viewer = _make_user('collab_viewer')
        self.stranger = _make_user('collab_stranger')
        self.owner_c = _client(self.owner)
        self.editor_c = _client(self.editor)
        self.viewer_c = _client(self.viewer)
        self.stranger_c = _client(self.stranger)
        self.pid = self.owner_c.post(f'{BASE}/', {'name': 'Collab Pl'}).data['id']
        # Add editor and viewer
        self.owner_c.post(
            f'{BASE}/{self.pid}/collaborators/',
            {'user_id': str(self.editor.id), 'permission': 'editor'},
        )
        self.owner_c.post(
            f'{BASE}/{self.pid}/collaborators/',
            {'user_id': str(self.viewer.id), 'permission': 'viewer'},
        )

    def test_list_collaborators_owner(self):
        r = self.owner_c.get(f'{BASE}/{self.pid}/collaborators/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)

    def test_list_collaborators_non_owner_blocked(self):
        r = self.editor_c.get(f'{BASE}/{self.pid}/collaborators/')
        self.assertEqual(r.status_code, 403)

    def test_viewer_cannot_edit_playlist(self):
        r = self.viewer_c.patch(f'{BASE}/{self.pid}/', {'name': 'hack'})
        self.assertEqual(r.status_code, 403)

    def test_viewer_cannot_add_track(self):
        r = self.viewer_c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        self.assertEqual(r.status_code, 403)

    def test_editor_can_edit_metadata(self):
        r = self.editor_c.patch(f'{BASE}/{self.pid}/', {'name': 'Editor Rename'})
        self.assertEqual(r.status_code, 200)

    def test_editor_can_add_track(self):
        r = self.editor_c.post(f'{BASE}/{self.pid}/tracks/', TRACK)
        self.assertEqual(r.status_code, 201)

    def test_editor_cannot_delete_playlist(self):
        r = self.editor_c.delete(f'{BASE}/{self.pid}/')
        self.assertEqual(r.status_code, 403)

    def test_editor_cannot_manage_collaborators(self):
        r = self.editor_c.get(f'{BASE}/{self.pid}/collaborators/')
        self.assertEqual(r.status_code, 403)

    def test_stranger_cannot_edit_private(self):
        r = self.stranger_c.patch(f'{BASE}/{self.pid}/', {'name': 'hack'})
        self.assertIn(r.status_code, (403, 404))

    def test_change_permission(self):
        r = self.owner_c.patch(
            f'{BASE}/{self.pid}/collaborators/{self.viewer.id}/',
            {'permission': 'editor'},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['permission'], 'editor')

    def test_remove_collaborator(self):
        r = self.owner_c.delete(f'{BASE}/{self.pid}/collaborators/{self.editor.id}/')
        self.assertEqual(r.status_code, 204)
        remaining = self.owner_c.get(f'{BASE}/{self.pid}/collaborators/')
        self.assertEqual(len(remaining.data), 1)

    def test_owner_cannot_be_added_as_collaborator(self):
        r = self.owner_c.post(
            f'{BASE}/{self.pid}/collaborators/',
            {'user_id': str(self.owner.id), 'permission': 'editor'},
        )
        self.assertEqual(r.status_code, 400)

    def test_duplicate_collaborator_rejected(self):
        r = self.owner_c.post(
            f'{BASE}/{self.pid}/collaborators/',
            {'user_id': str(self.editor.id), 'permission': 'viewer'},
        )
        self.assertEqual(r.status_code, 400)

    def test_collaborator_viewer_can_see_private_playlist(self):
        r = self.viewer_c.get(f'{BASE}/{self.pid}/')
        self.assertEqual(r.status_code, 200)


# ---------------------------------------------------------------------------
# 8. Share link
# ---------------------------------------------------------------------------

class ShareLinkTests(APITestCase):
    def setUp(self):
        self.owner = _make_user('share_owner')
        self.stranger = _make_user('share_stranger')
        self.owner_c = _client(self.owner)
        self.stranger_c = _client(self.stranger)

    def test_share_public_playlist(self):
        pid = self.owner_c.post(f'{BASE}/', {'name': 'x', 'visibility': 'public'}).data['id']
        r = self.owner_c.post(f'{BASE}/{pid}/share/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('share_url', r.data)
        self.assertIn(str(pid), r.data['share_url'])

    def test_share_private_requires_owner_or_editor(self):
        pid = self.owner_c.post(f'{BASE}/', {'name': 'priv', 'visibility': 'private'}).data['id']
        r = self.stranger_c.post(f'{BASE}/{pid}/share/')
        self.assertIn(r.status_code, (403, 404))

    def test_share_unlisted_by_stranger(self):
        pid = self.owner_c.post(f'{BASE}/', {'name': 'unl', 'visibility': 'unlisted'}).data['id']
        r = self.stranger_c.post(f'{BASE}/{pid}/share/')
        self.assertEqual(r.status_code, 200)


# ---------------------------------------------------------------------------
# 9. Discover endpoint
# ---------------------------------------------------------------------------

class DiscoverTests(APITestCase):
    def setUp(self):
        self.user = _make_user('disc_user')
        self.c = _client(self.user)
        self.c.post(f'{BASE}/', {'name': 'Private Pl', 'visibility': 'private'})
        self.c.post(f'{BASE}/', {'name': 'Unlisted Pl', 'visibility': 'unlisted'})
        self.c.post(f'{BASE}/', {'name': 'Public Pl', 'visibility': 'public'})

    def test_discover_returns_only_public(self):
        r = APIClient().get(f'{BASE}/discover/')
        self.assertEqual(r.status_code, 200)
        names = [pl['name'] for pl in r.data['results']]
        self.assertIn('Public Pl', names)
        self.assertNotIn('Private Pl', names)
        self.assertNotIn('Unlisted Pl', names)

    def test_discover_paginated(self):
        r = APIClient().get(f'{BASE}/discover/?page=1&page_size=10')
        self.assertEqual(r.status_code, 200)
        self.assertIn('total_results', r.data)
        self.assertIn('page', r.data)


# ---------------------------------------------------------------------------
# 10. Auth required
# ---------------------------------------------------------------------------

class AuthTests(APITestCase):
    def test_list_requires_auth(self):
        r = APIClient().get(f'{BASE}/')
        self.assertEqual(r.status_code, 401)

    def test_create_requires_auth(self):
        r = APIClient().post(f'{BASE}/', {'name': 'x'})
        self.assertEqual(r.status_code, 401)

    def test_delete_requires_auth(self):
        user = _make_user('auth_del')
        c = _client(user)
        pid = c.post(f'{BASE}/', {'name': 'x'}).data['id']
        r = APIClient().delete(f'{BASE}/{pid}/')
        self.assertIn(r.status_code, (401, 403))

    def test_add_track_requires_auth(self):
        user = _make_user('auth_track')
        c = _client(user)
        pid = c.post(f'{BASE}/', {'name': 'x'}).data['id']
        r = APIClient().post(f'{BASE}/{pid}/tracks/', TRACK)
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# 11. Large playlist
# ---------------------------------------------------------------------------

class LargePlaylistTests(APITestCase):
    def setUp(self):
        self.user = _make_user('large_user')
        self.c = _client(self.user)
        self.pid = self.c.post(f'{BASE}/', {'name': 'Big Playlist'}).data['id']

    def test_100_tracks(self):
        from music.services.playlist_service import add_track
        playlist = Playlist.objects.get(id=self.pid)
        tracks = [
            PlaylistTrack(
                playlist=playlist,
                track_mbid=f'large-mbid-{i:04d}',
                title=f'Track {i}',
                artist_name='Artist',
                duration_ms=180000,
                position=i,
            )
            for i in range(100)
        ]
        PlaylistTrack.objects.bulk_create(tracks)
        r = self.c.get(f'{BASE}/{self.pid}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['track_count'], 100)
        self.assertEqual(r.data['total_duration_seconds'], 18000)
        self.assertEqual(len(r.data['tracks']), 100)
