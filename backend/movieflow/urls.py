from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('friendships.urls')),
    path('api/v1/', include('notifications.urls')),
    path('api/v1/', include('entertainment.urls')),
    path('api/v1/', include('rooms.urls')),
    path('api/v1/', include('music.urls')),
    path('api/v1/', include('library.urls')),
    path('api/core/', include('core.urls')),
    path('api/health/', include('core.urls')),  # convenient root health endpoint
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
