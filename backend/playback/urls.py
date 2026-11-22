from django.urls import path
from . import views

app_name = 'playback'

urlpatterns = [
    path('playback/providers/', views.ProviderListView.as_view(), name='provider-list'),
    path('playback/providers/<str:provider_id>/', views.ProviderDetailView.as_view(), name='provider-detail'),
    path('playback/providers/<str:provider_id>/availability/', views.ProviderAvailabilityView.as_view(), name='provider-availability'),
]
