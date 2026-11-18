"""
Views for the personal library feature (Phase 7).
All endpoints require authentication; every query is scoped to request.user.
"""

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from library.models import (
    CollectionItem,
    UserCollection,
    UserFavorite,
    UserFollow,
    UserLibraryItem,
)
from library.serializers import (
    CollectionItemSerializer,
    ReorderItemSerializer,
    UserCollectionDetailSerializer,
    UserCollectionSerializer,
    UserFavoriteSerializer,
    UserFollowSerializer,
    UserLibraryItemSerializer,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class LibraryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _paginate(request, queryset, serializer_class):
    paginator = LibraryPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ---------------------------------------------------------------------------
# Library overview  GET /api/v1/library/
# ---------------------------------------------------------------------------

class LibraryOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        items = UserLibraryItem.objects.filter(user=user)

        movie_count = items.filter(content_type='movie').count()
        show_count = items.filter(content_type='tvshow').count()
        music_count = items.filter(content_type__in=['music_track', 'album']).count()

        recently_added = UserLibraryItemSerializer(
            items.order_by('-added_at')[:10], many=True
        ).data

        currently_watching = UserLibraryItemSerializer(
            items.filter(
                content_type__in=['movie', 'tvshow'], status='watching'
            ).order_by('-updated_at')[:10],
            many=True,
        ).data

        recently_completed = UserLibraryItemSerializer(
            items.filter(
                content_type__in=['movie', 'tvshow'],
                status__in=['watched', 'completed'],
            ).order_by('-updated_at')[:10],
            many=True,
        ).data

        collections = UserCollectionSerializer(
            UserCollection.objects.filter(owner=user).order_by('-created_at')[:6],
            many=True,
        ).data

        return Response({
            'counts': {
                'movies': movie_count,
                'shows': show_count,
                'music': music_count,
            },
            'recently_added': recently_added,
            'currently_watching': currently_watching,
            'recently_completed': recently_completed,
            'collections': collections,
        })


# ---------------------------------------------------------------------------
# Library sub-lists
# ---------------------------------------------------------------------------

class LibraryMoviesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserLibraryItem.objects.filter(user=request.user, content_type='movie')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return _paginate(request, qs, UserLibraryItemSerializer)


class LibraryShowsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserLibraryItem.objects.filter(user=request.user, content_type='tvshow')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return _paginate(request, qs, UserLibraryItemSerializer)


class LibraryMusicView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserLibraryItem.objects.filter(
            user=request.user,
            content_type__in=['music_track', 'album'],
        )
        content_type = request.query_params.get('content_type')
        if content_type:
            qs = qs.filter(content_type=content_type)
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return _paginate(request, qs, UserLibraryItemSerializer)


# ---------------------------------------------------------------------------
# Library item CRUD
# POST   /api/v1/library/items/
# PATCH  /api/v1/library/items/{item_id}/
# DELETE /api/v1/library/items/{item_id}/
# ---------------------------------------------------------------------------

class LibraryItemListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = UserLibraryItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        content_type = serializer.validated_data['content_type']
        object_id = serializer.validated_data['object_id']
        existing = UserLibraryItem.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()
        if existing:
            return Response(UserLibraryItemSerializer(existing).data, status=status.HTTP_200_OK)
        item = serializer.save(user=request.user)
        return Response(UserLibraryItemSerializer(item).data, status=status.HTTP_201_CREATED)


class LibraryItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_item(self, request, item_id):
        return get_object_or_404(UserLibraryItem, id=item_id, user=request.user)

    def patch(self, request, item_id):
        item = self._get_item(request, item_id)
        serializer = UserLibraryItemSerializer(item, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, item_id):
        item = self._get_item(request, item_id)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Collections
# GET  /api/v1/collections/
# POST /api/v1/collections/
# GET  /api/v1/collections/{collection_id}/
# PATCH /api/v1/collections/{collection_id}/
# DELETE /api/v1/collections/{collection_id}/
# ---------------------------------------------------------------------------

class CollectionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserCollection.objects.filter(owner=request.user)
        return _paginate(request, qs, UserCollectionSerializer)

    def post(self, request):
        serializer = UserCollectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        collection = serializer.save(owner=request.user)
        return Response(UserCollectionSerializer(collection).data, status=status.HTTP_201_CREATED)


class CollectionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_collection(self, request, collection_id):
        return get_object_or_404(UserCollection, id=collection_id, owner=request.user)

    def get(self, request, collection_id):
        collection = self._get_collection(request, collection_id)
        return Response(UserCollectionDetailSerializer(collection).data)

    def patch(self, request, collection_id):
        collection = self._get_collection(request, collection_id)
        serializer = UserCollectionSerializer(collection, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, collection_id):
        collection = self._get_collection(request, collection_id)
        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Collection items
# POST   /api/v1/collections/{collection_id}/items/
# DELETE /api/v1/collections/{collection_id}/items/{item_id}/
# POST   /api/v1/collections/{collection_id}/reorder/
# ---------------------------------------------------------------------------

class CollectionItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, collection_id):
        collection = get_object_or_404(UserCollection, id=collection_id, owner=request.user)
        serializer = CollectionItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        content_type = serializer.validated_data['content_type']
        object_id = serializer.validated_data['object_id']

        existing = CollectionItem.objects.filter(
            collection=collection,
            content_type=content_type,
            object_id=object_id,
        ).first()
        if existing:
            return Response(CollectionItemSerializer(existing).data, status=status.HTTP_200_OK)

        # Auto-assign next position if not provided
        if 'position' not in request.data:
            max_pos = collection.items.order_by('-position').values_list('position', flat=True).first()
            serializer.validated_data['position'] = (max_pos or 0) + 1

        item = serializer.save(collection=collection)
        return Response(CollectionItemSerializer(item).data, status=status.HTTP_201_CREATED)


class CollectionItemDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, collection_id, item_id):
        collection = get_object_or_404(UserCollection, id=collection_id, owner=request.user)
        item = get_object_or_404(CollectionItem, id=item_id, collection=collection)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollectionReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, collection_id):
        collection = get_object_or_404(UserCollection, id=collection_id, owner=request.user)
        serializer = ReorderItemSerializer(data=request.data, many=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updates = {str(entry['id']): entry['position'] for entry in serializer.validated_data}
        items = CollectionItem.objects.filter(collection=collection, id__in=updates.keys())
        for item in items:
            item.position = updates[str(item.id)]
        CollectionItem.objects.bulk_update(items, ['position'])
        return Response({'updated': len(items)})


# ---------------------------------------------------------------------------
# Favorites
# GET    /api/v1/favorites/
# POST   /api/v1/favorites/
# DELETE /api/v1/favorites/{favorite_id}/
# ---------------------------------------------------------------------------

class FavoriteListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserFavorite.objects.filter(user=request.user)
        content_type = request.query_params.get('content_type')
        if content_type:
            qs = qs.filter(content_type=content_type)
        return _paginate(request, qs, UserFavoriteSerializer)

    def post(self, request):
        serializer = UserFavoriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        content_type = serializer.validated_data['content_type']
        object_id = serializer.validated_data['object_id']
        existing = UserFavorite.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()
        if existing:
            return Response(UserFavoriteSerializer(existing).data, status=status.HTTP_200_OK)
        fav = serializer.save(user=request.user)
        return Response(UserFavoriteSerializer(fav).data, status=status.HTTP_201_CREATED)


class FavoriteDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, favorite_id):
        fav = get_object_or_404(UserFavorite, id=favorite_id, user=request.user)
        fav.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Artist follows
# GET    /api/v1/music/following/artists/
# POST   /api/v1/music/following/artists/
# DELETE /api/v1/music/following/artists/{artist_id}/
# ---------------------------------------------------------------------------

class ArtistFollowListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserFollow.objects.filter(user=request.user)
        return _paginate(request, qs, UserFollowSerializer)

    def post(self, request):
        serializer = UserFollowSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Validate artist exists in music app
        from music.models import MusicArtist
        artist_id = serializer.validated_data['artist_id']
        if not MusicArtist.objects.filter(id=artist_id).exists():
            return Response(
                {'artist_id': 'Artist not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = UserFollow.objects.filter(user=request.user, artist_id=artist_id).first()
        if existing:
            return Response(UserFollowSerializer(existing).data, status=status.HTTP_200_OK)
        follow = serializer.save(user=request.user)
        return Response(UserFollowSerializer(follow).data, status=status.HTTP_201_CREATED)

class ArtistFollowDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, artist_id):
        follow = get_object_or_404(UserFollow, user=request.user, artist_id=str(artist_id))
        follow.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
