"""
DRF views for the music app.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from music.serializers import (
    MBArtistSerializer,
    MBRecordingSerializer,
    MBReleaseGroupSerializer,
    PlaylistCollaboratorSerializer,
    PlaylistDetailSerializer,
    PlaylistSerializer,
    PlaylistTrackSerializer,
)
from music.services import album_service, artist_service, search_service, track_service
from music.services import playlist_service
from music.services.musicbrainz_client import MusicBrainzError
from accounts.models import User

_PAGE_SIZE_MAX = 20


def _get_page(request):
    try:
        return max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        return 1


def _get_page_size(request):
    try:
        return min(_PAGE_SIZE_MAX, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        return 20


def _paginated_mb_response(data: dict, results_key: str, serializer_class, page: int, page_size: int) -> dict:
    """Build a response envelope from a MusicBrainz results dict."""
    results = data.get(results_key, [])
    total = data.get('count', len(results))
    serializer = serializer_class(results, many=True)
    return {
        'page': page,
        'total_results': total,
        'page_size': page_size,
        'results': serializer.data,
    }


# ---------------------------------------------------------------------------
# Throttle classes
# ---------------------------------------------------------------------------

class DiscoverThrottle(UserRateThrottle):
    scope = 'playlist_discover'
    rate = '30/min'


class ShareThrottle(UserRateThrottle):
    scope = 'playlist_share'
    rate = '20/min'


# ---------------------------------------------------------------------------
# Discovery views (public)
# ---------------------------------------------------------------------------

class MusicTrendingView(APIView):
    """GET /api/v1/music/trending/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = track_service.get_trending_tracks(page=page, page_size=page_size)
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_mb_response(data, 'recordings', MBRecordingSerializer, page, page_size))


class MusicPopularArtistsView(APIView):
    """GET /api/v1/music/popular/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = artist_service.get_popular_artists(page=page, page_size=page_size)
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_mb_response(data, 'artists', MBArtistSerializer, page, page_size))


class MusicNewReleasesView(APIView):
    """GET /api/v1/music/new-releases/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = album_service.get_new_releases(page=page, page_size=page_size)
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_mb_response(data, 'release-groups', MBReleaseGroupSerializer, page, page_size))


class MusicGenresView(APIView):
    """GET /api/v1/music/genres/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        genres = search_service.get_music_genres()
        return Response({'genres': genres})


class MusicSearchView(APIView):
    """GET /api/v1/music/search/?q=&type=track|artist|album|all&page="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        search_type = request.query_params.get('type', 'all').lower()
        if search_type not in ('track', 'artist', 'album', 'all'):
            return Response(
                {'error': "type must be 'track', 'artist', 'album', or 'all'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            if search_type == 'track':
                data = search_service.search_tracks(q, page=page, page_size=page_size)
                return Response(_paginated_mb_response(data, 'recordings', MBRecordingSerializer, page, page_size))
            elif search_type == 'artist':
                data = search_service.search_artists(q, page=page, page_size=page_size)
                return Response(_paginated_mb_response(data, 'artists', MBArtistSerializer, page, page_size))
            elif search_type == 'album':
                data = search_service.search_albums(q, page=page, page_size=page_size)
                return Response(_paginated_mb_response(data, 'release-groups', MBReleaseGroupSerializer, page, page_size))
            else:
                data = search_service.search_all(q, page=page, page_size=10)
                return Response({
                    'artists': MBArtistSerializer(data.get('artists', []), many=True).data,
                    'albums': MBReleaseGroupSerializer(data.get('albums', []), many=True).data,
                    'tracks': MBRecordingSerializer(data.get('tracks', []), many=True).data,
                })
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class MusicTrackDetailView(APIView):
    """GET /api/v1/music/tracks/<str:track_id>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, track_id):
        try:
            data = track_service.get_track_detail(track_id)
        except MusicBrainzError as exc:
            if exc.status_code == 404:
                return Response({'error': 'Track not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(MBRecordingSerializer(data).data)


class MusicAlbumDetailView(APIView):
    """GET /api/v1/music/albums/<str:album_id>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, album_id):
        try:
            data = album_service.get_album_detail(album_id)
            tracks_data = album_service.get_album_tracks(album_id)
        except MusicBrainzError as exc:
            if exc.status_code == 404:
                return Response({'error': 'Album not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        # Build track list from media/tracks
        tracks = []
        for medium in tracks_data.get('media', []):
            for track in medium.get('tracks', []):
                recording = track.get('recording', {})
                tracks.append({
                    'id': track.get('id', ''),
                    'mbid': recording.get('id', track.get('id', '')),
                    'title': track.get('title') or recording.get('title', ''),
                    'track_number': track.get('number', ''),
                    'duration_ms': track.get('length') or recording.get('length') or 0,
                    'artist-credit': track.get('artist-credit', recording.get('artist-credit', [])),
                })
        result = MBReleaseGroupSerializer(data).data
        result['tracks'] = tracks
        return Response(result)


class MusicArtistDetailView(APIView):
    """GET /api/v1/music/artists/<str:artist_id>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, artist_id):
        try:
            data = artist_service.get_artist_detail(artist_id)
        except MusicBrainzError as exc:
            if exc.status_code == 404:
                return Response({'error': 'Artist not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(MBArtistSerializer(data).data)


class MusicArtistAlbumsView(APIView):
    """GET /api/v1/music/artists/<str:artist_id>/albums/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, artist_id):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = artist_service.get_artist_albums(artist_id, page=page, page_size=page_size)
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_mb_response(data, 'release-groups', MBReleaseGroupSerializer, page, page_size))


class MusicArtistTopTracksView(APIView):
    """GET /api/v1/music/artists/<str:artist_id>/top-tracks/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, artist_id):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = artist_service.get_artist_top_tracks(artist_id, page=page, page_size=page_size)
        except MusicBrainzError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_mb_response(data, 'recordings', MBRecordingSerializer, page, page_size))


# ---------------------------------------------------------------------------
# Playlist views (authentication required unless noted)
# ---------------------------------------------------------------------------

class PlaylistListCreateView(APIView):
    """
    GET  /api/v1/music/playlists/  — list user's playlists (owned + collaborated)
    POST /api/v1/music/playlists/  — create new playlist
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        playlists = playlist_service.get_user_playlists(request.user)
        serializer = PlaylistSerializer(playlists, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        description = request.data.get('description', '')
        visibility = request.data.get('visibility', 'private')
        if visibility not in ('private', 'unlisted', 'public'):
            return Response({'error': "visibility must be 'private', 'unlisted', or 'public'."}, status=status.HTTP_400_BAD_REQUEST)
        artwork_url = request.data.get('artwork_url', '')
        playlist = playlist_service.create_playlist(
            request.user, name, description, visibility=visibility, artwork_url=artwork_url
        )
        return Response(PlaylistSerializer(playlist).data, status=status.HTTP_201_CREATED)


class PlaylistDetailView(APIView):
    """
    GET    /api/v1/music/playlists/<uuid>/  — get detail (visibility-controlled)
    PATCH  /api/v1/music/playlists/<uuid>/  — update metadata (edit access required)
    DELETE /api/v1/music/playlists/<uuid>/  — delete (owner only)
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, playlist_id):
        user = request.user if request.user.is_authenticated else None
        try:
            playlist = playlist_service.get_playlist_detail(playlist_id, user)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlaylistDetailSerializer(playlist).data)

    def patch(self, request, playlist_id):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        fields = {}
        for field in ('name', 'description', 'artwork_url', 'visibility'):
            if field in request.data:
                fields[field] = request.data[field]
        if 'visibility' in fields and fields['visibility'] not in ('private', 'unlisted', 'public'):
            return Response({'error': "visibility must be 'private', 'unlisted', or 'public'."}, status=status.HTTP_400_BAD_REQUEST)
        if 'name' in fields and not fields['name'].strip():
            return Response({'error': 'name cannot be blank.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            playlist = playlist_service.update_playlist(playlist_id, request.user, **fields)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlaylistSerializer(playlist).data)

    def delete(self, request, playlist_id):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            playlist_service.delete_playlist(playlist_id, request.user)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlaylistTrackView(APIView):
    """
    POST   /api/v1/music/playlists/<uuid>/tracks/              — add track
    DELETE /api/v1/music/playlists/<uuid>/tracks/<track_mbid>/ — remove track
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, playlist_id):
        track_mbid = request.data.get('track_mbid', '').strip()
        title = request.data.get('title', '').strip()
        artist_name = request.data.get('artist_name', '').strip()
        if not track_mbid or not title or not artist_name:
            return Response(
                {'error': 'track_mbid, title, and artist_name are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            pt = playlist_service.add_track(
                playlist_id=playlist_id,
                user=request.user,
                track_mbid=track_mbid,
                title=title,
                artist_name=artist_name,
                album_name=request.data.get('album_name', ''),
                duration_ms=int(request.data.get('duration_ms', 0) or 0),
                artwork_url=request.data.get('artwork_url', ''),
            )
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlaylistTrackSerializer(pt).data, status=status.HTTP_201_CREATED)

    def delete(self, request, playlist_id, track_mbid):
        try:
            playlist_service.remove_track(playlist_id, request.user, track_mbid)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlaylistTrackReorderView(APIView):
    """PATCH /api/v1/music/playlists/<uuid>/tracks/<track_mbid>/reorder/"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, playlist_id, track_mbid):
        try:
            new_position = int(request.data.get('position', 0))
        except (ValueError, TypeError):
            return Response({'error': 'position must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pt = playlist_service.reorder_track(playlist_id, request.user, track_mbid, new_position)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlaylistTrackSerializer(pt).data)


class PlaylistReorderView(APIView):
    """
    POST /api/v1/music/playlists/<uuid>/reorder/
    Body: [{"id": "<track_uuid>", "position": 0}, ...]
    Bulk reorder all tracks in a playlist atomically.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, playlist_id):
        positions = request.data
        if not isinstance(positions, list):
            return Response({'error': 'Request body must be a list of {id, position} objects.'}, status=status.HTTP_400_BAD_REQUEST)
        for item in positions:
            if 'id' not in item or 'position' not in item:
                return Response({'error': 'Each item must have id and position.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            playlist_service.reorder_tracks_bulk(playlist_id, request.user, positions)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'reordered'})


class PlaylistDuplicateView(APIView):
    """POST /api/v1/music/playlists/<uuid>/duplicate/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, playlist_id):
        try:
            new_playlist = playlist_service.duplicate_playlist(playlist_id, request.user)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlaylistSerializer(new_playlist).data, status=status.HTTP_201_CREATED)


class PlaylistShareView(APIView):
    """POST /api/v1/music/playlists/<uuid>/share/"""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ShareThrottle]

    def post(self, request, playlist_id):
        base_url = request.build_absolute_uri('/').rstrip('/')
        # Use frontend origin if provided in header or fallback
        frontend_origin = request.data.get('frontend_base_url', base_url)
        try:
            result = playlist_service.generate_share_link(playlist_id, request.user, frontend_origin)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)


class PlaylistDiscoverView(APIView):
    """GET /api/v1/music/playlists/discover/ — public playlists, paginated"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [DiscoverThrottle]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        data = playlist_service.get_public_playlists(page=page, page_size=page_size)
        serialized = PlaylistSerializer(data['results'], many=True)
        return Response({
            'page': data['page'],
            'page_size': data['page_size'],
            'total_results': data['total_results'],
            'results': serialized.data,
        })


class PlaylistCollaboratorListCreateView(APIView):
    """
    GET  /api/v1/music/playlists/<uuid>/collaborators/ — list collaborators (owner only)
    POST /api/v1/music/playlists/<uuid>/collaborators/ — add collaborator (owner only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, playlist_id):
        try:
            collaborators = playlist_service.get_collaborators(playlist_id, request.user)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlaylistCollaboratorSerializer(collaborators, many=True).data)

    def post(self, request, playlist_id):
        user_id = request.data.get('user_id', '').strip()
        permission = request.data.get('permission', 'viewer')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user_to_add = User.objects.get(id=user_id)
        except (User.DoesNotExist, Exception):
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            collab = playlist_service.add_collaborator(playlist_id, request.user, user_to_add, permission)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlaylistCollaboratorSerializer(collab).data, status=status.HTTP_201_CREATED)


class PlaylistCollaboratorDetailView(APIView):
    """
    PATCH  /api/v1/music/playlists/<uuid>/collaborators/<uuid:user_id>/ — change permission
    DELETE /api/v1/music/playlists/<uuid>/collaborators/<uuid:user_id>/ — remove collaborator
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, playlist_id, user_id):
        permission = request.data.get('permission', '')
        if not permission:
            return Response({'error': 'permission is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            collab = playlist_service.update_collaborator_permission(playlist_id, request.user, user_id, permission)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PlaylistCollaboratorSerializer(collab).data)

    def delete(self, request, playlist_id, user_id):
        try:
            playlist_service.remove_collaborator(playlist_id, request.user, user_id)
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
