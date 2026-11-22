"""
UUID-safe upload path callables for personal media files.
Prevents path traversal and collisions by using a UUID-based filename.
"""
import uuid
import os


def _uuid_path(prefix: str, extension: str, instance, filename: str) -> str:
    """Generate a UUID-based path under MEDIA_ROOT/<prefix>/."""
    # Sanitize extension: allow only alphanumeric + dot
    safe_ext = ''.join(c for c in extension if c.isalnum() or c == '.').lower()
    if not safe_ext.startswith('.'):
        safe_ext = '.' + safe_ext
    # Allow at most 10 chars for the extension to prevent abuse
    safe_ext = safe_ext[:10]
    new_name = f"{uuid.uuid4().hex}{safe_ext}"
    return os.path.join(prefix, new_name)


def movie_file_upload_path(instance, filename: str) -> str:
    """Upload path for UserMovie video files."""
    ext = getattr(instance, '_stored_ext', os.path.splitext(filename)[1])
    return _uuid_path('uploads/movies', ext, instance, filename)


def movie_poster_upload_path(instance, filename: str) -> str:
    """Upload path for UserMovie poster images."""
    ext = getattr(instance, '_stored_ext_poster', os.path.splitext(filename)[1])
    return _uuid_path('uploads/movie_posters', ext, instance, filename)


def track_file_upload_path(instance, filename: str) -> str:
    """Upload path for UserTrack audio files."""
    ext = getattr(instance, '_stored_ext', os.path.splitext(filename)[1])
    return _uuid_path('uploads/tracks', ext, instance, filename)


def track_cover_upload_path(instance, filename: str) -> str:
    """Upload path for UserTrack cover images."""
    ext = getattr(instance, '_stored_ext_cover', os.path.splitext(filename)[1])
    return _uuid_path('uploads/track_covers', ext, instance, filename)
