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


# ===========================================================================
# Personal media uploads — DISTINCT prefix /api/v1/library/uploads/
# No collision with existing /api/v1/library/movies|music|shows|items routes.
# ===========================================================================

import os
import mimetypes
from django.conf import settings
from django.http import StreamingHttpResponse, FileResponse, Http404
from library.models import UserMovie, UserTrack
from library.content_validation import validate_video_file, validate_audio_file, validate_image_file

# Size limits (configurable via settings, with sensible defaults)
MOVIE_MAX_SIZE = getattr(settings, 'UPLOAD_MAX_MOVIE_BYTES', 2 * 1024 ** 3)       # 2 GB
AUDIO_MAX_SIZE = getattr(settings, 'UPLOAD_MAX_AUDIO_BYTES', 200 * 1024 ** 2)     # 200 MB
IMAGE_MAX_SIZE = getattr(settings, 'UPLOAD_MAX_IMAGE_BYTES', 10 * 1024 ** 2)      # 10 MB


def _streaming_response(request, file_obj, content_type_header, file_size):
    """
    Return a 206 Partial Content (or 200) response with Range support.
    Chunk-limited generator: returns exactly (end-start+1) bytes.
    """
    range_header = request.META.get('HTTP_RANGE', '').strip()
    if range_header and range_header.startswith('bytes='):
        try:
            range_spec = range_header[6:]
            start_str, end_str = range_spec.split('-', 1)
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
        except ValueError:
            start, end = 0, file_size - 1
    else:
        start, end = 0, file_size - 1

    end = min(end, file_size - 1)
    length = end - start + 1

    def _file_iterator(f, offset, chunk_size=65536, bytes_remaining=None):
        f.seek(offset)
        sent = 0
        while bytes_remaining is None or sent < bytes_remaining:
            to_read = chunk_size if bytes_remaining is None else min(chunk_size, bytes_remaining - sent)
            data = f.read(to_read)
            if not data:
                break
            sent += len(data)
            yield data

    response = StreamingHttpResponse(
        _file_iterator(file_obj, start, bytes_remaining=length),
        status=206 if range_header else 200,
        content_type=content_type_header,
    )
    response['Content-Length'] = length
    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
    response['Accept-Ranges'] = 'bytes'
    return response


class UploadedMovieListCreateView(APIView):
    """
    GET  /api/v1/library/uploads/movies/  – list owner's uploaded movies
    POST /api/v1/library/uploads/movies/  – upload a new movie
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes_override = None  # DRF MultiPartParser used by default for file uploads

    def get(self, request):
        movies = UserMovie.objects.filter(owner=request.user)
        data = [_movie_to_dict(m, request) for m in movies]
        return Response({'movies': data})

    def post(self, request):
        movie_file = request.FILES.get('movie_file')
        if not movie_file:
            return Response({'error': 'movie_file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if movie_file.size > MOVIE_MAX_SIZE:
            return Response({'error': f'File too large. Maximum size is {MOVIE_MAX_SIZE // (1024**2)} MB.'},
                            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        valid, err, mime = validate_video_file(movie_file)
        if not valid:
            return Response({'error': err}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        title = request.data.get('title', '').strip()
        if not title:
            return Response({'error': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        movie = UserMovie(
            owner=request.user,
            title=title,
            description=request.data.get('description', ''),
            genre=request.data.get('genre', ''),
            detected_content_type=mime or '',
            file_size=movie_file.size,
            processing_status=UserMovie.STATUS_READY,
        )
        try:
            release_year = request.data.get('release_year')
            if release_year:
                movie.release_year = int(release_year)
        except (ValueError, TypeError):
            pass

        # Store sniffed extension on instance for upload_to callable
        ext = mimetypes.guess_extension(mime) if mime else os.path.splitext(movie_file.name)[1]
        movie._stored_ext = ext or '.mp4'
        movie.movie_file.save(f"{movie.id}{movie._stored_ext}", movie_file, save=False)

        # Handle poster
        poster = request.FILES.get('poster')
        if poster:
            if poster.size > IMAGE_MAX_SIZE:
                return Response({'error': 'Poster image too large.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
            img_valid, img_err, img_mime = validate_image_file(poster)
            if not img_valid:
                return Response({'error': f'Poster: {img_err}'}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
            img_ext = mimetypes.guess_extension(img_mime) if img_mime else os.path.splitext(poster.name)[1]
            movie._stored_ext_poster = img_ext or '.jpg'
            movie.poster.save(f"{movie.id}_poster{movie._stored_ext_poster}", poster, save=False)

        movie.save()
        return Response(_movie_to_dict(movie, request), status=status.HTTP_201_CREATED)


class UploadedMovieDetailView(APIView):
    """
    GET    /api/v1/library/uploads/movies/<id>/
    PATCH  /api/v1/library/uploads/movies/<id>/
    DELETE /api/v1/library/uploads/movies/<id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, movie_id):
        return get_object_or_404(UserMovie, id=movie_id, owner=request.user)

    def get(self, request, movie_id):
        return Response(_movie_to_dict(self._get(request, movie_id), request))

    def patch(self, request, movie_id):
        movie = self._get(request, movie_id)
        for field in ('title', 'description', 'genre', 'release_year'):
            val = request.data.get(field)
            if val is not None:
                setattr(movie, field, val)
        movie.save()
        return Response(_movie_to_dict(movie, request))

    def delete(self, request, movie_id):
        movie = self._get(request, movie_id)
        # Delete actual files
        if movie.movie_file:
            try:
                movie.movie_file.delete(save=False)
            except Exception:
                pass
        if movie.poster:
            try:
                movie.poster.delete(save=False)
            except Exception:
                pass
        movie.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UploadedMovieStreamView(APIView):
    """
    GET /api/v1/library/uploads/movies/<id>/stream/
    Authenticated streaming with Range support.
    Authorizes owner OR active participant in a room referencing this movie.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, movie_id):
        try:
            movie = UserMovie.objects.get(id=movie_id)
        except UserMovie.DoesNotExist:
            raise Http404

        # Authorization: owner or room participant
        if movie.owner != request.user:
            # Check if user is in a room that references this content
            from rooms.models import RoomParticipant, Room
            authorized = RoomParticipant.objects.filter(
                user=request.user,
                status=RoomParticipant.STATUS_JOINED,
                room__content_id=str(movie_id),
                room__content_type='personal_movie',
            ).exists()
            if not authorized:
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        if not movie.movie_file:
            return Response({'error': 'File not available.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            file_obj = movie.movie_file.open('rb')
        except (FileNotFoundError, OSError):
            return Response({'error': 'File not found on server.'}, status=status.HTTP_404_NOT_FOUND)

        content_type_header = movie.detected_content_type or 'video/mp4'
        return _streaming_response(request, file_obj, content_type_header, movie.file_size or movie.movie_file.size)


class UploadedTrackListCreateView(APIView):
    """
    GET  /api/v1/library/uploads/tracks/  – list owner's uploaded tracks
    POST /api/v1/library/uploads/tracks/  – upload a new audio track
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tracks = UserTrack.objects.filter(owner=request.user)
        data = [_track_to_dict(t, request) for t in tracks]
        return Response({'tracks': data})

    def post(self, request):
        audio_file = request.FILES.get('audio_file')
        if not audio_file:
            return Response({'error': 'audio_file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if audio_file.size > AUDIO_MAX_SIZE:
            return Response({'error': f'File too large. Maximum size is {AUDIO_MAX_SIZE // (1024**2)} MB.'},
                            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        valid, err, mime = validate_audio_file(audio_file)
        if not valid:
            return Response({'error': err}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        track_name = request.data.get('track_name', '').strip()
        if not track_name:
            return Response({'error': 'track_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        track = UserTrack(
            owner=request.user,
            track_name=track_name,
            artist=request.data.get('artist', ''),
            album=request.data.get('album', ''),
            genre=request.data.get('genre', ''),
            detected_content_type=mime or '',
            file_size=audio_file.size,
        )
        ext = mimetypes.guess_extension(mime) if mime else os.path.splitext(audio_file.name)[1]
        track._stored_ext = ext or '.mp3'
        track.audio_file.save(f"{track.id}{track._stored_ext}", audio_file, save=False)

        cover = request.FILES.get('cover_image')
        if cover:
            if cover.size > IMAGE_MAX_SIZE:
                return Response({'error': 'Cover image too large.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
            img_valid, img_err, img_mime = validate_image_file(cover)
            if not img_valid:
                return Response({'error': f'Cover: {img_err}'}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
            img_ext = mimetypes.guess_extension(img_mime) if img_mime else os.path.splitext(cover.name)[1]
            track._stored_ext_cover = img_ext or '.jpg'
            track.cover_image.save(f"{track.id}_cover{track._stored_ext_cover}", cover, save=False)

        track.save()
        return Response(_track_to_dict(track, request), status=status.HTTP_201_CREATED)


class UploadedTrackDetailView(APIView):
    """
    GET    /api/v1/library/uploads/tracks/<id>/
    PATCH  /api/v1/library/uploads/tracks/<id>/
    DELETE /api/v1/library/uploads/tracks/<id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, track_id):
        return get_object_or_404(UserTrack, id=track_id, owner=request.user)

    def get(self, request, track_id):
        return Response(_track_to_dict(self._get(request, track_id), request))

    def patch(self, request, track_id):
        track = self._get(request, track_id)
        for field in ('track_name', 'artist', 'album', 'genre'):
            val = request.data.get(field)
            if val is not None:
                setattr(track, field, val)
        track.save()
        return Response(_track_to_dict(track, request))

    def delete(self, request, track_id):
        track = self._get(request, track_id)
        if track.audio_file:
            try:
                track.audio_file.delete(save=False)
            except Exception:
                pass
        if track.cover_image:
            try:
                track.cover_image.delete(save=False)
            except Exception:
                pass
        track.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UploadedTrackStreamView(APIView):
    """
    GET /api/v1/library/uploads/tracks/<id>/stream/
    Authenticated streaming with Range support.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, track_id):
        try:
            track = UserTrack.objects.get(id=track_id)
        except UserTrack.DoesNotExist:
            raise Http404

        if track.owner != request.user:
            from rooms.models import RoomParticipant
            authorized = RoomParticipant.objects.filter(
                user=request.user,
                status=RoomParticipant.STATUS_JOINED,
                room__content_id=str(track_id),
                room__content_type='personal_track',
            ).exists()
            if not authorized:
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        if not track.audio_file:
            return Response({'error': 'File not available.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            file_obj = track.audio_file.open('rb')
        except (FileNotFoundError, OSError):
            return Response({'error': 'File not found on server.'}, status=status.HTTP_404_NOT_FOUND)

        content_type_header = track.detected_content_type or 'audio/mpeg'
        return _streaming_response(request, file_obj, content_type_header, track.file_size or track.audio_file.size)


def _movie_to_dict(movie, request):
    poster_url = None
    if movie.poster:
        try:
            poster_url = request.build_absolute_uri(movie.poster.url)
        except Exception:
            pass
    return {
        'id': str(movie.id),
        'title': movie.title,
        'description': movie.description,
        'genre': movie.genre,
        'release_year': movie.release_year,
        'file_size': movie.file_size,
        'detected_content_type': movie.detected_content_type,
        'processing_status': movie.processing_status,
        'poster_url': poster_url,
        'stream_url': request.build_absolute_uri(f'/api/v1/library/uploads/movies/{movie.id}/stream/'),
        'created_at': movie.created_at.isoformat(),
        'updated_at': movie.updated_at.isoformat(),
    }


def _track_to_dict(track, request):
    cover_url = None
    if track.cover_image:
        try:
            cover_url = request.build_absolute_uri(track.cover_image.url)
        except Exception:
            pass
    return {
        'id': str(track.id),
        'track_name': track.track_name,
        'artist': track.artist,
        'album': track.album,
        'genre': track.genre,
        'file_size': track.file_size,
        'detected_content_type': track.detected_content_type,
        'duration_seconds': track.duration_seconds,
        'cover_url': cover_url,
        'stream_url': request.build_absolute_uri(f'/api/v1/library/uploads/tracks/{track.id}/stream/'),
        'created_at': track.created_at.isoformat(),
        'updated_at': track.updated_at.isoformat(),
    }

