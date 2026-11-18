"""
Tests for watchlist endpoints.
Uses the project's custom User model and DRF APIClient.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from entertainment.models import WatchlistItem

User = get_user_model()


def _create_user(email='testuser@example.com', username='testuser', password='Passw0rd!'):
    return User.objects.create_user(
        email=email,
        username=username,
        password=password,
        full_name='Test User',
    )


def _auth_client(client, user):
    """Attach a JWT Bearer token to the APIClient for *user*."""
    token = AccessToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


ITEM_DATA = {
    'media_type': 'movie',
    'tmdb_id': 123,
    'title': 'The Matrix',
    'poster_path': '/matrix.jpg',
}


class WatchlistUnauthenticatedTests(APITestCase):
    def test_unauthenticated_get_returns_401(self):
        url = reverse('watchlist-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_post_returns_401(self):
        url = reverse('watchlist-list-create')
        response = self.client.post(url, ITEM_DATA, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WatchlistAuthenticatedTests(APITestCase):
    def setUp(self):
        self.user = _create_user()
        _auth_client(self.client, self.user)
        self.url = reverse('watchlist-list-create')

    def test_authenticated_get_returns_200_empty_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_post_add_item_returns_201(self):
        response = self.client.post(self.url, ITEM_DATA, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tmdb_id'], 123)
        self.assertEqual(response.data['media_type'], 'movie')

    def test_post_duplicate_returns_200_with_existing_item(self):
        # First add
        self.client.post(self.url, ITEM_DATA, format='json')
        # Duplicate add
        response = self.client.post(self.url, ITEM_DATA, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tmdb_id'], 123)

    def test_delete_own_item_returns_204(self):
        post_response = self.client.post(self.url, ITEM_DATA, format='json')
        item_id = post_response.data['id']
        delete_url = reverse('watchlist-delete', kwargs={'id': item_id})
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexistent_item_returns_404(self):
        import uuid
        delete_url = reverse('watchlist-delete', kwargs={'id': str(uuid.uuid4())})
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WatchlistOtherUserTests(APITestCase):
    def setUp(self):
        self.owner = _create_user('owner@example.com', 'owner')
        self.other = _create_user('other@example.com', 'other')
        # Create an item owned by self.owner
        self.item = WatchlistItem.objects.create(
            user=self.owner,
            media_type='movie',
            tmdb_id=456,
            title='Owner Movie',
            poster_path='/owner.jpg',
        )
        # Authenticate as the other user
        _auth_client(self.client, self.other)

    def test_delete_other_users_item_returns_404(self):
        delete_url = reverse('watchlist-delete', kwargs={'id': str(self.item.id)})
        response = self.client.delete(delete_url)
        # WatchlistDeleteView filters by user, so the item simply does not exist
        # from the other user's perspective → 404
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


class WatchlistPosterPathTests(APITestCase):
    def setUp(self):
        self.user = _create_user('poster@example.com', 'posteruser')
        _auth_client(self.client, self.user)
        self.url = reverse('watchlist-list-create')

    def test_empty_poster_path_gives_null_poster_url(self):
        data = {
            'media_type': 'movie',
            'tmdb_id': 789,
            'title': 'No Poster Movie',
            'poster_path': '',
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['poster_url'])
