from django.urls import path
from rooms.views import (
    RoomInvitationByTokenView,
    RoomInvitationAcceptView,
    RoomInvitationRejectView,
)

urlpatterns = [
    path('invitations/<str:token>/', RoomInvitationByTokenView.as_view(), name='room-invitation-by-token'),
    path('invitations/<str:token>/accept/', RoomInvitationAcceptView.as_view(), name='room-invitation-accept'),
    path('invitations/<str:token>/reject/', RoomInvitationRejectView.as_view(), name='room-invitation-reject'),
]
