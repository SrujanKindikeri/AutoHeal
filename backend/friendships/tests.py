from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from friendships.models import Friendship, FriendRequest, UserBlock
from notifications.models import Notification

class FriendshipSocialTests(TestCase):
    """
    Test suite for Phase 3: Friendships, Requests, Blocking, Discovery & Notifications.
    """

    def setUp(self):
        self.client_a = APIClient()
        self.client_b = APIClient()
        self.client_c = APIClient()

        # User A
        self.user_a = User.objects.create_user(
            email="usera@movieflow.app",
            username="usera",
            full_name="Alice Adams",
            password="Password123!",
            is_email_verified=True
        )
        self.client_a.force_authenticate(user=self.user_a)

        # User B
        self.user_b = User.objects.create_user(
            email="userb@movieflow.app",
            username="userb",
            full_name="Bob Baker",
            password="Password123!",
            is_email_verified=True
        )
        self.client_b.force_authenticate(user=self.user_b)

        # User C
        self.user_c = User.objects.create_user(
            email="userc@movieflow.app",
            username="userc",
            full_name="Charlie Clark",
            password="Password123!",
            is_email_verified=True
        )
        self.client_c.force_authenticate(user=self.user_c)

    # 1. Sending a friend request (by username & MovieFlow ID)
    def test_01_send_friend_request(self):
        # By MovieFlow ID
        res = self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.movieflow_id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.json()['status'], 'pending')

        req = FriendRequest.objects.get(sender=self.user_a, recipient=self.user_b)
        self.assertEqual(req.status, 'pending')

        # Check notification was created for recipient
        notif = Notification.objects.filter(recipient=self.user_b, actor=self.user_a).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.verb, 'friend_request_received')

    # 2. Duplicate requests prevented
    def test_02_duplicate_request_prevented(self):
        self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        # Try again
        res2 = self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already pending", str(res2.json()))

    # 3. Self-request prevented
    def test_03_self_request_prevented(self):
        res = self.client_a.post('/api/v1/friends/requests/', {'target': self.user_a.movieflow_id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("yourself", str(res.json()).lower())

    # 4. Accept friend request
    def test_04_accept_friend_request(self):
        self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        req = FriendRequest.objects.get(sender=self.user_a, recipient=self.user_b)

        # Recipient accepts
        res = self.client_b.post(f'/api/v1/friends/requests/{req.id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertTrue(Friendship.are_friends(self.user_a, self.user_b))
        req.refresh_from_db()
        self.assertEqual(req.status, 'accepted')

        # Check notification for original sender
        notif = Notification.objects.filter(recipient=self.user_a, actor=self.user_b).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.verb, 'friend_request_accepted')

    # 5. Reject friend request
    def test_05_reject_friend_request(self):
        self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        req = FriendRequest.objects.get(sender=self.user_a, recipient=self.user_b)

        # Non-recipient cannot reject
        unauth_reject = self.client_c.post(f'/api/v1/friends/requests/{req.id}/reject/')
        self.assertEqual(unauth_reject.status_code, status.HTTP_403_FORBIDDEN)

        # Recipient rejects
        res = self.client_b.post(f'/api/v1/friends/requests/{req.id}/reject/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        self.assertFalse(Friendship.are_friends(self.user_a, self.user_b))

    # 6. Cancel outgoing request
    def test_06_cancel_outgoing_request(self):
        self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        req = FriendRequest.objects.get(sender=self.user_a, recipient=self.user_b)

        # Non-sender cannot cancel
        res_b = self.client_b.post(f'/api/v1/friends/requests/{req.id}/cancel/')
        self.assertEqual(res_b.status_code, status.HTTP_403_FORBIDDEN)

        # Sender cancels
        res_a = self.client_a.post(f'/api/v1/friends/requests/{req.id}/cancel/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.status, 'cancelled')

    # 7. Automatically handling reciprocal requests
    def test_07_reciprocal_request_auto_accept(self):
        # A sends to B
        self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        # B sends to A (reciprocal)
        res_b = self.client_b.post('/api/v1/friends/requests/', {'target': self.user_a.username})
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.json()['status'], 'accepted_reciprocal')

        # They should now be friends
        self.assertTrue(Friendship.are_friends(self.user_a, self.user_b))

    # 8. Removing friendships
    def test_08_remove_friendship(self):
        # Establish friendship
        Friendship.objects.create(user1=self.user_a, user2=self.user_b)
        self.assertTrue(Friendship.are_friends(self.user_a, self.user_b))

        # A removes friendship by B's id
        res = self.client_a.delete(f'/api/v1/friends/{self.user_b.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Friendship.are_friends(self.user_a, self.user_b))

    # 9. Blocking user removes friendship and pending requests
    def test_09_blocking_removes_friendship_and_requests(self):
        # Establish friendship and a pending request with C
        Friendship.objects.create(user1=self.user_a, user2=self.user_b)
        FriendRequest.objects.create(sender=self.user_a, recipient=self.user_b, status='pending')
        FriendRequest.objects.create(sender=self.user_b, recipient=self.user_a, status='pending')

        # A blocks B
        res = self.client_a.post(f'/api/v1/users/{self.user_b.id}/block/', {'reason': 'spam'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertTrue(UserBlock.objects.filter(blocker=self.user_a, blocked=self.user_b).exists())
        # Friendship should be removed
        self.assertFalse(Friendship.are_friends(self.user_a, self.user_b))
        # Requests should be cancelled
        self.assertFalse(FriendRequest.objects.filter(sender=self.user_a, recipient=self.user_b, status='pending').exists())
        self.assertFalse(FriendRequest.objects.filter(sender=self.user_b, recipient=self.user_a, status='pending').exists())

    # 10. Cannot send friend request to blocked user
    def test_10_cannot_request_blocked_user(self):
        UserBlock.objects.create(blocker=self.user_a, blocked=self.user_b)

        # A cannot request B
        res_a = self.client_a.post('/api/v1/friends/requests/', {'target': self.user_b.username})
        self.assertEqual(res_a.status_code, status.HTTP_400_BAD_REQUEST)

        # B cannot request A
        res_b = self.client_b.post('/api/v1/friends/requests/', {'target': self.user_a.username})
        self.assertEqual(res_b.status_code, status.HTTP_400_BAD_REQUEST)

    # 11. Unblock user
    def test_11_unblock_user(self):
        UserBlock.objects.create(blocker=self.user_a, blocked=self.user_b)
        res = self.client_a.delete(f'/api/v1/users/{self.user_b.id}/block/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(UserBlock.objects.filter(blocker=self.user_a, blocked=self.user_b).exists())

    # 12. Search users by username, full name, and MovieFlow ID
    def test_12_user_search_and_privacy(self):
        # Search by username substring
        res = self.client_a.get('/api/v1/users/search/?q=userb')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertGreaterEqual(data['count'], 1)
        match = data['results'][0]
        self.assertEqual(match['username'], 'userb')
        self.assertEqual(match['movieflow_id'], self.user_b.movieflow_id)
        # Ensure email is NEVER exposed
        self.assertNotIn('email', match)
        self.assertEqual(match['relationship_status'], 'none')

        # Search by MovieFlow ID exact
        res_id = self.client_a.get(f'/api/v1/users/search/?q={self.user_c.movieflow_id}')
        self.assertEqual(res_id.status_code, status.HTTP_200_OK)
        self.assertEqual(res_id.json()['results'][0]['username'], 'userc')

    # 13. Search excludes blocked users
    def test_13_search_excludes_blocked_users(self):
        UserBlock.objects.create(blocker=self.user_a, blocked=self.user_b)
        res = self.client_a.get('/api/v1/users/search/?q=userb')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['count'], 0)

    # 14. Unauthenticated access rejected
    def test_14_unauthenticated_rejected(self):
        anon = APIClient()
        self.assertEqual(anon.get('/api/v1/friends/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(anon.post('/api/v1/friends/requests/', {'target': 'userb'}).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(anon.get('/api/v1/users/search/?q=user').status_code, status.HTTP_401_UNAUTHORIZED)
