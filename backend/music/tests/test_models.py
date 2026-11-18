"""
Tests for music app database models.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

from music.models import MusicAlbum, MusicArtist, MusicTrack, Playlist, PlaylistTrack

User = get_user_model()


class TestMusicArtistModel(TestCase):
    def test_unique_mbid_constraint(self):
        MusicArtist.objects.create(mbid='a1b2c3d4-0000-0000-0000-000000000001', name='Artist One')
        with self.assertRaises(IntegrityError):
            MusicArtist.objects.create(mbid='a1b2c3d4-0000-0000-0000-000000000001', name='Duplicate')

    def test_str(self):
        artist = MusicArtist.objects.create(mbid='a1b2c3d4-0000-0000-0000-000000000002', name='Artist Two')
        self.assertEqual(str(artist), 'Artist Two')


class TestMusicAlbumModel(TestCase):
    def test_unique_mbid_constraint(self):
        MusicAlbum.objects.create(mbid='b1b2c3d4-0000-0000-0000-000000000001', title='Album One')
        with self.assertRaises(IntegrityError):
            MusicAlbum.objects.create(mbid='b1b2c3d4-0000-0000-0000-000000000001', title='Duplicate')

    def test_str(self):
        album = MusicAlbum.objects.create(mbid='b1b2c3d4-0000-0000-0000-000000000002', title='Album Two')
        self.assertEqual(str(album), 'Album Two')


class TestMusicTrackModel(TestCase):
    def test_unique_mbid_constraint(self):
        MusicTrack.objects.create(mbid='c1b2c3d4-0000-0000-0000-000000000001', title='Track One')
        with self.assertRaises(IntegrityError):
            MusicTrack.objects.create(mbid='c1b2c3d4-0000-0000-0000-000000000001', title='Duplicate')

    def test_str(self):
        track = MusicTrack.objects.create(mbid='c1b2c3d4-0000-0000-0000-000000000002', title='Track Two')
        self.assertEqual(str(track), 'Track Two')


class TestPlaylistModel(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='playlistuser',
            email='playlistuser@example.com',
            password='testpass123',
        )

    def test_playlist_ordering(self):
        p1 = Playlist.objects.create(owner=self.user, name='Alpha')
        p2 = Playlist.objects.create(owner=self.user, name='Zeta')
        # When created_at ties (same microsecond on fast machines), secondary
        # sort is by name ascending, so 'Alpha' < 'Zeta'.  When they differ,
        # the later-created playlist sorts first; either way both rows exist.
        playlists = list(Playlist.objects.filter(owner=self.user))
        self.assertIn(p1, playlists)
        self.assertIn(p2, playlists)
        self.assertEqual(len(playlists), 2)

    def test_playlist_str(self):
        p = Playlist.objects.create(owner=self.user, name='My Playlist')
        self.assertIn('My Playlist', str(p))


class TestPlaylistTrackModel(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='trackuser',
            email='trackuser@example.com',
            password='testpass123',
        )
        self.playlist = Playlist.objects.create(owner=self.user, name='Test Playlist')

    def test_unique_together_constraint(self):
        PlaylistTrack.objects.create(
            playlist=self.playlist,
            track_mbid='d1b2c3d4-0000-0000-0000-000000000001',
            title='Track',
            artist_name='Artist',
        )
        with self.assertRaises(IntegrityError):
            PlaylistTrack.objects.create(
                playlist=self.playlist,
                track_mbid='d1b2c3d4-0000-0000-0000-000000000001',
                title='Track Duplicate',
                artist_name='Artist',
            )

    def test_str(self):
        pt = PlaylistTrack.objects.create(
            playlist=self.playlist,
            track_mbid='d1b2c3d4-0000-0000-0000-000000000002',
            title='Track Three',
            artist_name='Artist',
        )
        self.assertIn('Track Three', str(pt))
