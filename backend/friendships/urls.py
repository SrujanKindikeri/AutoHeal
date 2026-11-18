from django.urls import path
from friendships.views import (
    FriendRequestCreateView,
    IncomingFriendRequestsView,
    OutgoingFriendRequestsView,
    AcceptFriendRequestView,
    RejectFriendRequestView,
    CancelFriendRequestView,
    FriendshipListView,
    FriendshipDeleteView,
    UserSearchView,
    UserDetailView,
    UserBlockView,
    BlockedUsersListView,
)

urlpatterns = [
    # Friend Requests
    path('friends/requests/', FriendRequestCreateView.as_view(), name='friend-request-create'),
    path('friends/requests/incoming/', IncomingFriendRequestsView.as_view(), name='friend-requests-incoming'),
    path('friends/requests/outgoing/', OutgoingFriendRequestsView.as_view(), name='friend-requests-outgoing'),
    path('friends/requests/<uuid:request_id>/accept/', AcceptFriendRequestView.as_view(), name='friend-request-accept'),
    path('friends/requests/<uuid:request_id>/reject/', RejectFriendRequestView.as_view(), name='friend-request-reject'),
    path('friends/requests/<uuid:request_id>/cancel/', CancelFriendRequestView.as_view(), name='friend-request-cancel'),

    # Friendships
    path('friends/', FriendshipListView.as_view(), name='friendship-list'),
    path('friends/<uuid:friendship_id>/', FriendshipDeleteView.as_view(), name='friendship-delete'),

    # User Discovery & Profiles
    path('users/search/', UserSearchView.as_view(), name='users-search'),
    path('users/blocked/', BlockedUsersListView.as_view(), name='users-blocked-list'),
    path('users/<str:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<str:user_id>/block/', UserBlockView.as_view(), name='user-block'),
]
