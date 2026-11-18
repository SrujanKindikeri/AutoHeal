"""
DRF views for the entertainment app.
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from entertainment.models import WatchlistItem
from entertainment.serializers import (
    TMDBMovieSerializer,
    TMDBTVSerializer,
    WatchlistItemSerializer,
)
from entertainment.services import movie_service, search_service, tv_service
from entertainment.services.tmdb_client import TMDBError

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


def _paginated_tmdb_response(data: dict, serializer_class, page: int, page_size: int) -> dict:
    """
    Build a response envelope from a TMDB results dict.

    For discovery/listing endpoints TMDB controls pagination, so page /
    total_pages / total_results are passed through as-is from the TMDB
    response.  page_size is included for client convenience.
    """
    results = data.get('results', [])
    serializer = serializer_class(results, many=True)
    return {
        'page': data.get('page', page),
        'total_pages': data.get('total_pages', 1),
        'total_results': data.get('total_results', len(results)),
        'page_size': page_size,
        'results': serializer.data,
    }


# ---------------------------------------------------------------------------
# Movie views (public)
# ---------------------------------------------------------------------------

class MovieTrendingView(APIView):
    """GET /api/v1/movies/trending/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = movie_service.get_trending_movies(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBMovieSerializer, page, page_size))


class MoviePopularView(APIView):
    """GET /api/v1/movies/popular/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = movie_service.get_popular_movies(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBMovieSerializer, page, page_size))


class MovieTopRatedView(APIView):
    """GET /api/v1/movies/top-rated/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = movie_service.get_top_rated_movies(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBMovieSerializer, page, page_size))


class MovieNowPlayingView(APIView):
    """GET /api/v1/movies/now-playing/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = movie_service.get_now_playing_movies(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBMovieSerializer, page, page_size))


class MovieUpcomingView(APIView):
    """GET /api/v1/movies/upcoming/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = movie_service.get_upcoming_movies(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBMovieSerializer, page, page_size))


class MovieDetailView(APIView):
    """GET /api/v1/movies/<int:movie_id>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, movie_id):
        try:
            data = movie_service.get_movie_detail(movie_id)
        except TMDBError as exc:
            if exc.status_code == 404:
                return Response({'error': 'Movie not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(data)


# ---------------------------------------------------------------------------
# TV views (public)
# ---------------------------------------------------------------------------

class TVTrendingView(APIView):
    """GET /api/v1/tv/trending/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = tv_service.get_trending_tv(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBTVSerializer, page, page_size))


class TVPopularView(APIView):
    """GET /api/v1/tv/popular/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = tv_service.get_popular_tv(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBTVSerializer, page, page_size))


class TVTopRatedView(APIView):
    """GET /api/v1/tv/top-rated/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = tv_service.get_top_rated_tv(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBTVSerializer, page, page_size))


class TVOnTheAirView(APIView):
    """GET /api/v1/tv/on-the-air/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = _get_page(request)
        page_size = _get_page_size(request)
        try:
            data = tv_service.get_on_the_air_tv(page=page)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_paginated_tmdb_response(data, TMDBTVSerializer, page, page_size))


class TVDetailView(APIView):
    """GET /api/v1/tv/<int:show_id>/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, show_id):
        try:
            data = tv_service.get_tv_detail(show_id)
        except TMDBError as exc:
            if exc.status_code == 404:
                return Response({'error': 'TV show not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(data)


# ---------------------------------------------------------------------------
# Entertainment views
# ---------------------------------------------------------------------------

class SearchView(APIView):
    """GET /api/v1/entertainment/search/?q=&type=movie|tv|all&page="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        media_type = request.query_params.get('type', 'all').lower()
        if media_type not in ('movie', 'tv', 'all'):
            return Response(
                {'error': "type must be 'movie', 'tv', or 'all'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page = _get_page(request)
        page_size = _get_page_size(request)

        try:
            if media_type == 'movie':
                data = search_service.search_movies(q, page=page)
                serializer_class = TMDBMovieSerializer
            elif media_type == 'tv':
                data = search_service.search_tv(q, page=page)
                serializer_class = TMDBTVSerializer
            else:
                data = search_service.search_multi(q, page=page)
                # Multi-search returns mixed media_type items; pass them through raw.
                return Response({
                    'page': data.get('page', page),
                    'total_pages': data.get('total_pages', 1),
                    'total_results': data.get('total_results', 0),
                    'page_size': page_size,
                    'results': data.get('results', []),
                })
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(_paginated_tmdb_response(data, serializer_class, page, page_size))


class GenreListView(APIView):
    """GET /api/v1/entertainment/genres/?type=movie|tv"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        media_type = request.query_params.get('type', '').lower()
        if media_type not in ('movie', 'tv'):
            return Response(
                {'error': "type must be 'movie' or 'tv'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = search_service.get_genres(media_type)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(data)


class DiscoverView(APIView):
    """GET /api/v1/entertainment/discover/?type=movie|tv&genre=&sort_by=&page="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        media_type = request.query_params.get('type', 'movie').lower()
        if media_type not in ('movie', 'tv'):
            return Response(
                {'error': "type must be 'movie' or 'tv'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        genre_raw = request.query_params.get('genre', None)
        genre_id = None
        if genre_raw:
            try:
                genre_id = int(genre_raw)
            except ValueError:
                return Response({'error': 'genre must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        sort_by = request.query_params.get('sort_by', 'popularity.desc')
        page = _get_page(request)
        page_size = _get_page_size(request)

        try:
            data = search_service.discover_media(
                media_type=media_type,
                genre_id=genre_id,
                sort_by=sort_by,
                page=page,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except TMDBError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        serializer_class = TMDBMovieSerializer if media_type == 'movie' else TMDBTVSerializer
        return Response(_paginated_tmdb_response(data, serializer_class, page, page_size))


# ---------------------------------------------------------------------------
# Watchlist views (authentication required)
# ---------------------------------------------------------------------------

class WatchlistListCreateView(APIView):
    """
    GET  /api/v1/entertainment/watchlist/   — list the user's watchlist
    POST /api/v1/entertainment/watchlist/   — add an item (idempotent: 200 if duplicate)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = WatchlistItem.objects.filter(user=request.user)
        serializer = WatchlistItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = WatchlistItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        media_type = serializer.validated_data['media_type']
        tmdb_id = serializer.validated_data['tmdb_id']

        existing = WatchlistItem.objects.filter(
            user=request.user,
            media_type=media_type,
            tmdb_id=tmdb_id,
        ).first()

        if existing:
            return Response(
                WatchlistItemSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        item = serializer.save(user=request.user)
        return Response(WatchlistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WatchlistDeleteView(APIView):
    """DELETE /api/v1/entertainment/watchlist/<uuid:id>/"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, id):
        try:
            item = WatchlistItem.objects.get(id=id, user=request.user)
        except WatchlistItem.DoesNotExist:
            return Response({'error': 'Watchlist item not found.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
