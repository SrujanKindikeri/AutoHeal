from django.urls import path
from rooms.views import (
    RoomListCreateView,
    RoomDiscoverView,
    RoomDetailView,
    RoomJoinView,
    RoomLeaveView,
    RoomEndView,
    RoomKickView,
    RoomInviteCreateView,
    RoomInvitationByTokenView,
    RoomInvitationAcceptView,
    RoomInvitationRejectView,
)

urlpatterns = [
    # Rooms CRUD
    path('rooms/', RoomListCreateView.as_view(), name='room-list-create'),
    path('rooms/discover/', RoomDiscoverView.as_view(), name='room-discover'),
    path('rooms/<uuid:room_id>/', RoomDetailView.as_view(), name='room-detail'),
    path('rooms/<uuid:room_id>/join/', RoomJoinView.as_view(), name='room-join'),
    path('rooms/<uuid:room_id>/leave/', RoomLeaveView.as_view(), name='room-leave'),
    path('rooms/<uuid:room_id>/end/', RoomEndView.as_view(), name='room-end'),
    path('rooms/<uuid:room_id>/kick/', RoomKickView.as_view(), name='room-kick'),
    path('rooms/<uuid:room_id>/invite/', RoomInviteCreateView.as_view(), name='room-invite-create'),
    # Invitations
    path('invitations/<str:token>/', RoomInvitationByTokenView.as_view(), name='room-invitation-by-token'),
    path('invitations/<str:token>/accept/', RoomInvitationAcceptView.as_view(), name='room-invitation-accept'),
    path('invitations/<str:token>/reject/', RoomInvitationRejectView.as_view(), name='room-invitation-reject'),
]
