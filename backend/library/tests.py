"""
Tests for Phase 7 — Personal Entertainment Library.
Covers: library items, collections, favorites, artist follows,
        ownership, duplicate prevention, and authentication.
"""

import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from entertainment.models import Movie, TVShow
from music.models import MusicArtist, MusicAlbum, MusicTrack
from library.models import (
    UserLibraryItem,
    UserCollection,
    CollectionItem,
    UserFavorite,
    UserFollow,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(username, email=None):
    return User.objects.create_user(
        username=username,
        email=email or f'{username}@example.com',
        password='testpass123',
        full_name=username.title(),
    )


def make_movie():
    return Movie.objects.create(
        tmdb_id=int(str(uuid.uuid4().int)[:8]),
        title='Test Movie',
        original_title='Test Movie',
        original_language='en',
    )


def make_tvshow():
    return TVShow.objects.create(
        tmdb_id=int(str(uuid.uuid4().int)[:8]),
        name='Test Show',
        original_name='Test Show',
        original_language='en',
    )


def make_artist():
    return MusicArtist.objects.create(
        mbid=str(uuid.uuid4()),
        name='Test Artist',
    )


def make_album(artist):
    return MusicAlbum.objects.create(
        mbid=str(uuid.uuid4()),
        title='Test Album',
        artist=artist,
    )


def make_track(album, artist):
    track = MusicTrack.objects.create(
        mbid=str(uuid.uuid4()),
        title='Test Track',
        album=album,
    )
    track.artists.add(artist)
    return track


# ---------------------------------------------------------------------------
# Library item tests
# ---------------------------------------------------------------------------

class LibraryItemTests(APITestCase):
    def setUp(self):
        self.user = make_user('alice')
        self.other = make_user('bob')
        self.client.force_authenticate(user=self.user)
        self.movie = make_movie()
        self.show = make_tvshow()
        artist = make_artist()
        album = make_album(artist)
        self.track = make_track(album, artist)
        self.album = album

    # ── add items ────────────────────────────────────────────────────────────

    def test_add_movie(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watchlist',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['content_type'], 'movie')
        self.assertEqual(r.data['status'], 'watchlist')

    def test_add_tvshow(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'tvshow',
            'object_id': str(self.show.id),
            'status': 'plan_to_watch',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_add_music_track(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'music_track',
            'object_id': str(self.track.id),
            'status': 'liked',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_add_album(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'album',
            'object_id': str(self.album.id),
            'status': 'saved',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    # ── duplicate prevention ──────────────────────────────────────────────────

    def test_duplicate_item_returns_200(self):
        self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watchlist',
        }, format='json')
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watching',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # count stays at 1
        self.assertEqual(UserLibraryItem.objects.filter(user=self.user).count(), 1)

    # ── invalid status ────────────────────────────────────────────────────────

    def test_invalid_status_for_content_type(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'plan_to_watch',   # TV-only status
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    # ── update ────────────────────────────────────────────────────────────────

    def test_update_status(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watchlist',
        }, format='json')
        item_id = r.data['id']
        r2 = self.client.patch(f'/api/v1/library/items/{item_id}/', {
            'status': 'watching',
        }, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data['status'], 'watching')

    def test_update_rating_and_notes(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'tvshow',
            'object_id': str(self.show.id),
            'status': 'watching',
        }, format='json')
        item_id = r.data['id']
        r2 = self.client.patch(f'/api/v1/library/items/{item_id}/', {
            'personal_rating': '8.5',
            'notes': 'Great writing.',
        }, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(float(r2.data['personal_rating']), 8.5)
        self.assertEqual(r2.data['notes'], 'Great writing.')

    # ── remove ────────────────────────────────────────────────────────────────

    def test_remove_item(self):
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watchlist',
        }, format='json')
        item_id = r.data['id']
        r2 = self.client.delete(f'/api/v1/library/items/{item_id}/')
        self.assertEqual(r2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserLibraryItem.objects.filter(id=item_id).exists())

    # ── ownership / privacy ───────────────────────────────────────────────────

    def test_cannot_edit_other_users_item(self):
        item = UserLibraryItem.objects.create(
            user=self.other,
            content_type='movie',
            object_id=str(self.movie.id),
            status='watched',
        )
        r = self.client.patch(f'/api/v1/library/items/{item.id}/', {
            'status': 'watchlist',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_delete_other_users_item(self):
        item = UserLibraryItem.objects.create(
            user=self.other,
            content_type='movie',
            object_id=str(self.movie.id),
            status='watched',
        )
        r = self.client.delete(f'/api/v1/library/items/{item.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    # ── authentication ────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_add(self):
        self.client.force_authenticate(user=None)
        r = self.client.post('/api/v1/library/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
            'status': 'watchlist',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_view_library(self):
        self.client.force_authenticate(user=None)
        r = self.client.get('/api/v1/library/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── sub-list filtering ────────────────────────────────────────────────────

    def test_library_movies_filtered(self):
        UserLibraryItem.objects.create(
            user=self.user, content_type='movie',
            object_id=str(self.movie.id), status='watchlist'
        )
        UserLibraryItem.objects.create(
            user=self.user, content_type='tvshow',
            object_id=str(self.show.id), status='watching'
        )
        r = self.client.get('/api/v1/library/movies/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for item in r.data['results']:
            self.assertEqual(item['content_type'], 'movie')

    def test_library_shows_filtered(self):
        UserLibraryItem.objects.create(
            user=self.user, content_type='tvshow',
            object_id=str(self.show.id), status='watching'
        )
        r = self.client.get('/api/v1/library/shows/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for item in r.data['results']:
            self.assertEqual(item['content_type'], 'tvshow')

    def test_library_music_filtered(self):
        UserLibraryItem.objects.create(
            user=self.user, content_type='music_track',
            object_id=str(self.track.id), status='liked'
        )
        r = self.client.get('/api/v1/library/music/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for item in r.data['results']:
            self.assertIn(item['content_type'], ['music_track', 'album'])

    # ── overview ─────────────────────────────────────────────────────────────

    def test_library_overview_counts(self):
        UserLibraryItem.objects.create(
            user=self.user, content_type='movie',
            object_id=str(self.movie.id), status='watchlist'
        )
        UserLibraryItem.objects.create(
            user=self.user, content_type='tvshow',
            object_id=str(self.show.id), status='watching'
        )
        r = self.client.get('/api/v1/library/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['counts']['movies'], 1)
        self.assertEqual(r.data['counts']['shows'], 1)


# ---------------------------------------------------------------------------
# Collection tests
# ---------------------------------------------------------------------------

class CollectionTests(APITestCase):
    def setUp(self):
        self.user = make_user('carol')
        self.other = make_user('dave')
        self.client.force_authenticate(user=self.user)
        self.movie = make_movie()

    def _create_collection(self, name='My List'):
        r = self.client.post('/api/v1/collections/', {'name': name}, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        return r.data

    # ── CRUD ─────────────────────────────────────────────────────────────────

    def test_create_collection(self):
        col = self._create_collection('Sci-Fi Picks')
        self.assertEqual(col['name'], 'Sci-Fi Picks')
        self.assertEqual(col['privacy'], 'private')

    def test_list_collections(self):
        self._create_collection('List A')
        self._create_collection('List B')
        r = self.client.get('/api/v1/collections/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 2)

    def test_rename_collection(self):
        col = self._create_collection('Old Name')
        r = self.client.patch(f'/api/v1/collections/{col["id"]}/', {
            'name': 'New Name'
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['name'], 'New Name')

    def test_delete_collection(self):
        col = self._create_collection()
        r = self.client.delete(f'/api/v1/collections/{col["id"]}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserCollection.objects.filter(id=col['id']).exists())

    # ── ownership ─────────────────────────────────────────────────────────────

    def test_cannot_edit_other_users_collection(self):
        col = UserCollection.objects.create(owner=self.other, name='Private')
        r = self.client.patch(f'/api/v1/collections/{col.id}/', {
            'name': 'Hacked'
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_delete_other_users_collection(self):
        col = UserCollection.objects.create(owner=self.other, name='Private')
        r = self.client.delete(f'/api/v1/collections/{col.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    # ── items ─────────────────────────────────────────────────────────────────

    def test_add_item_to_collection(self):
        col = self._create_collection()
        r = self.client.post(f'/api/v1/collections/{col["id"]}/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_duplicate_collection_item_returns_200(self):
        col = self._create_collection()
        payload = {'content_type': 'movie', 'object_id': str(self.movie.id)}
        self.client.post(f'/api/v1/collections/{col["id"]}/items/', payload, format='json')
        r = self.client.post(f'/api/v1/collections/{col["id"]}/items/', payload, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(CollectionItem.objects.filter(
            collection_id=col['id']
        ).count(), 1)

    def test_remove_item_from_collection(self):
        col = self._create_collection()
        r = self.client.post(f'/api/v1/collections/{col["id"]}/items/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
        }, format='json')
        item_id = r.data['id']
        r2 = self.client.delete(f'/api/v1/collections/{col["id"]}/items/{item_id}/')
        self.assertEqual(r2.status_code, status.HTTP_204_NO_CONTENT)

    def test_reorder_collection_items(self):
        col = self._create_collection()
        movie2 = make_movie()
        r1 = self.client.post(f'/api/v1/collections/{col["id"]}/items/', {
            'content_type': 'movie', 'object_id': str(self.movie.id),
        }, format='json')
        r2 = self.client.post(f'/api/v1/collections/{col["id"]}/items/', {
            'content_type': 'movie', 'object_id': str(movie2.id),
        }, format='json')
        id1, id2 = r1.data['id'], r2.data['id']
        r3 = self.client.post(f'/api/v1/collections/{col["id"]}/reorder/', [
            {'id': id1, 'position': 10},
            {'id': id2, 'position': 5},
        ], format='json')
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        self.assertEqual(r3.data['updated'], 2)
        item1 = CollectionItem.objects.get(id=id1)
        self.assertEqual(item1.position, 10)

    # ── cascade delete ────────────────────────────────────────────────────────

    def test_deleting_collection_removes_items(self):
        col = self._create_collection()
        self.client.post(f'/api/v1/collections/{col["id"]}/items/', {
            'content_type': 'movie', 'object_id': str(self.movie.id),
        }, format='json')
        self.client.delete(f'/api/v1/collections/{col["id"]}/')
        self.assertEqual(CollectionItem.objects.filter(
            collection_id=col['id']
        ).count(), 0)

    # ── authentication ────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_create_collection(self):
        self.client.force_authenticate(user=None)
        r = self.client.post('/api/v1/collections/', {'name': 'x'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Favorites tests
# ---------------------------------------------------------------------------

class FavoriteTests(APITestCase):
    def setUp(self):
        self.user = make_user('eve')
        self.other = make_user('frank')
        self.client.force_authenticate(user=self.user)
        self.movie = make_movie()

    def test_add_favorite(self):
        r = self.client.post('/api/v1/favorites/', {
            'content_type': 'movie',
            'object_id': str(self.movie.id),
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_duplicate_favorite_returns_200(self):
        payload = {'content_type': 'movie', 'object_id': str(self.movie.id)}
        self.client.post('/api/v1/favorites/', payload, format='json')
        r = self.client.post('/api/v1/favorites/', payload, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(UserFavorite.objects.filter(user=self.user).count(), 1)

    def test_list_favorites(self):
        self.client.post('/api/v1/favorites/', {
            'content_type': 'movie', 'object_id': str(self.movie.id),
        }, format='json')
        r = self.client.get('/api/v1/favorites/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)

    def test_remove_favorite(self):
        r = self.client.post('/api/v1/favorites/', {
            'content_type': 'movie', 'object_id': str(self.movie.id),
        }, format='json')
        fav_id = r.data['id']
        r2 = self.client.delete(f'/api/v1/favorites/{fav_id}/')
        self.assertEqual(r2.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_other_users_favorite(self):
        fav = UserFavorite.objects.create(
            user=self.other,
            content_type='movie',
            object_id=str(self.movie.id),
        )
        r = self.client.delete(f'/api/v1/favorites/{fav.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_access_favorites(self):
        self.client.force_authenticate(user=None)
        r = self.client.get('/api/v1/favorites/')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_filter_favorites_by_content_type(self):
        show = make_tvshow()
        self.client.post('/api/v1/favorites/', {
            'content_type': 'movie', 'object_id': str(self.movie.id),
        }, format='json')
        self.client.post('/api/v1/favorites/', {
            'content_type': 'tvshow', 'object_id': str(show.id),
        }, format='json')
        r = self.client.get('/api/v1/favorites/?content_type=movie')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for item in r.data['results']:
            self.assertEqual(item['content_type'], 'movie')


# ---------------------------------------------------------------------------
# Artist follow tests
# ---------------------------------------------------------------------------

class ArtistFollowTests(APITestCase):
    def setUp(self):
        self.user = make_user('grace')
        self.other = make_user('henry')
        self.client.force_authenticate(user=self.user)
        self.artist = make_artist()

    def test_follow_artist(self):
        r = self.client.post('/api/v1/music/following/artists/', {
            'artist_id': str(self.artist.id),
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_follow_nonexistent_artist_returns_404(self):
        r = self.client.post('/api/v1/music/following/artists/', {
            'artist_id': str(uuid.uuid4()),
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_follow_returns_200(self):
        payload = {'artist_id': str(self.artist.id)}
        self.client.post('/api/v1/music/following/artists/', payload, format='json')
        r = self.client.post('/api/v1/music/following/artists/', payload, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(UserFollow.objects.filter(user=self.user).count(), 1)

    def test_list_followed_artists(self):
        self.client.post('/api/v1/music/following/artists/', {
            'artist_id': str(self.artist.id),
        }, format='json')
        r = self.client.get('/api/v1/music/following/artists/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['count'], 1)

    def test_unfollow_artist(self):
        self.client.post('/api/v1/music/following/artists/', {
            'artist_id': str(self.artist.id),
        }, format='json')
        r = self.client.delete(f'/api/v1/music/following/artists/{self.artist.id}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserFollow.objects.filter(user=self.user).exists())

    def test_other_user_cannot_see_my_follows(self):
        UserFollow.objects.create(user=self.other, artist_id=str(self.artist.id))
        r = self.client.get('/api/v1/music/following/artists/')
        self.assertEqual(r.data['count'], 0)

    def test_unauthenticated_cannot_follow(self):
        self.client.force_authenticate(user=None)
        r = self.client.post('/api/v1/music/following/artists/', {
            'artist_id': str(self.artist.id),
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
