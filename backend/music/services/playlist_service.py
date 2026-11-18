"""
Playlist business logic.

Uses Django ORM only — no MusicBrainz API calls.
Raises PermissionError for ownership violations, ValueError for logic errors.

Visibility rules:
  private  — only owner and collaborators (any permission) can view; only owner/editor can edit
  unlisted — anyone with the UUID can view; only owner/editor can edit
  public   — anyone can view; only owner/editor can edit

Duplicate-track policy: one occurrence of a given track_mbid per playlist,
enforced by unique_together at the DB level.
"""

from django.db import transaction

from music.models import Playlist, PlaylistCollaborator, PlaylistTrack


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_playlist_or_404(playlist_id) -> Playlist:
    try:
        return Playlist.objects.get(id=playlist_id)
    except Playlist.DoesNotExist:
        raise ValueError(f"Playlist {playlist_id} not found.")


def _get_playlist_with_access(playlist_id, user, require_edit: bool = False) -> Playlist:
    """
    Fetch a playlist and validate the requesting user's access level.

    user may be None (anonymous request) for public/unlisted playlists.

    require_edit=False — read access:
      private:  user must be owner or any collaborator
      unlisted: anyone (including anonymous)
      public:   anyone (including anonymous)

    require_edit=True — write access:
      user must be owner OR a collaborator with permission='editor'
    """
    playlist = _get_playlist_or_404(playlist_id)
    is_authenticated = user is not None and getattr(user, 'is_authenticated', False)

    if require_edit:
        if not is_authenticated:
            raise PermissionError("Authentication required.")
        if playlist.owner == user:
            return playlist
        collab = PlaylistCollaborator.objects.filter(
            playlist=playlist, user=user, permission=PlaylistCollaborator.PERMISSION_EDITOR
        ).first()
        if collab:
            return playlist
        raise PermissionError("You do not have permission to edit this playlist.")

    # Read access
    if playlist.visibility == Playlist.VISIBILITY_PRIVATE:
        if not is_authenticated:
            raise PermissionError("This playlist is private.")
        if playlist.owner == user:
            return playlist
        if PlaylistCollaborator.objects.filter(playlist=playlist, user=user).exists():
            return playlist
        raise PermissionError("This playlist is private.")

    # unlisted and public: anyone can view
    return playlist


# ---------------------------------------------------------------------------
# Playlist CRUD
# ---------------------------------------------------------------------------

def get_user_playlists(user) -> list:
    """Return playlists owned by the user plus playlists they collaborate on."""
    owned = Playlist.objects.filter(owner=user).order_by('-updated_at')
    collaborated_ids = PlaylistCollaborator.objects.filter(user=user).values_list('playlist_id', flat=True)
    collaborated = Playlist.objects.filter(id__in=collaborated_ids).exclude(owner=user).order_by('-updated_at')
    return list(owned) + list(collaborated)


def create_playlist(
    user,
    name: str,
    description: str = '',
    visibility: str = Playlist.VISIBILITY_PRIVATE,
    artwork_url: str = '',
) -> Playlist:
    return Playlist.objects.create(
        owner=user,
        name=name,
        description=description,
        visibility=visibility,
        artwork_url=artwork_url,
    )


def get_playlist_detail(playlist_id, user) -> Playlist:
    """Return playlist if user has read access."""
    return _get_playlist_with_access(playlist_id, user, require_edit=False)


def update_playlist(playlist_id, user, **fields) -> Playlist:
    """
    Update editable playlist fields: name, description, artwork_url, visibility.
    Requires edit access (owner or editor collaborator).
    """
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=True)
    allowed = {'name', 'description', 'artwork_url', 'visibility'}
    update_fields = []
    for key, value in fields.items():
        if key in allowed:
            setattr(playlist, key, value)
            update_fields.append(key)
    if update_fields:
        playlist.save(update_fields=update_fields + ['updated_at'])
    return playlist


def rename_playlist(playlist_id, user, name: str) -> Playlist:
    """Backward-compatible alias for update_playlist(name=...)."""
    return update_playlist(playlist_id, user, name=name)


def delete_playlist(playlist_id, user) -> None:
    """Delete a playlist. Owner only."""
    playlist = _get_playlist_or_404(playlist_id)
    if playlist.owner != user:
        raise PermissionError("Only the owner can delete this playlist.")
    playlist.delete()


def duplicate_playlist(playlist_id, user) -> Playlist:
    """
    Create a copy of a playlist owned by user.
    Copies name (prefixed 'Copy of'), description, artwork_url, visibility, and all tracks.
    """
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=False)
    new_playlist = Playlist.objects.create(
        owner=user,
        name=f"Copy of {playlist.name}",
        description=playlist.description,
        artwork_url=playlist.artwork_url,
        visibility=Playlist.VISIBILITY_PRIVATE,  # copies start private
    )
    tracks = playlist.playlist_tracks.order_by('position')
    new_tracks = [
        PlaylistTrack(
            playlist=new_playlist,
            track_mbid=pt.track_mbid,
            title=pt.title,
            artist_name=pt.artist_name,
            album_name=pt.album_name,
            duration_ms=pt.duration_ms,
            artwork_url=pt.artwork_url,
            position=pt.position,
        )
        for pt in tracks
    ]
    PlaylistTrack.objects.bulk_create(new_tracks)
    return new_playlist


# ---------------------------------------------------------------------------
# Public discovery
# ---------------------------------------------------------------------------

def get_public_playlists(page: int = 1, page_size: int = 20) -> dict:
    """Return paginated public playlists ordered by most recently updated."""
    qs = Playlist.objects.filter(visibility=Playlist.VISIBILITY_PUBLIC).order_by('-updated_at')
    total = qs.count()
    offset = (page - 1) * page_size
    results = list(qs[offset:offset + page_size])
    return {
        'page': page,
        'page_size': page_size,
        'total_results': total,
        'results': results,
    }


# ---------------------------------------------------------------------------
# Share link
# ---------------------------------------------------------------------------

def generate_share_link(playlist_id, user, base_url: str) -> dict:
    """
    Return a share URL for a playlist.
    Private playlists: only owner/editor can generate.
    Unlisted/public: anyone with view access can generate.
    The link works based on the playlist's current visibility setting.
    """
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=False)
    if playlist.visibility == Playlist.VISIBILITY_PRIVATE:
        # Only owner/editor can share private playlists
        _get_playlist_with_access(playlist_id, user, require_edit=True)
    base_url = base_url.rstrip('/')
    return {
        'share_url': f"{base_url}/playlists/{playlist.id}",
        'visibility': playlist.visibility,
    }


# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------

def add_track(
    playlist_id,
    user,
    track_mbid: str,
    title: str,
    artist_name: str,
    album_name: str = '',
    duration_ms: int = 0,
    artwork_url: str = '',
) -> PlaylistTrack:
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=True)
    if PlaylistTrack.objects.filter(playlist=playlist, track_mbid=track_mbid).exists():
        raise ValueError("Track is already in this playlist.")
    max_pos = PlaylistTrack.objects.filter(playlist=playlist).count()
    return PlaylistTrack.objects.create(
        playlist=playlist,
        track_mbid=track_mbid,
        title=title,
        artist_name=artist_name,
        album_name=album_name,
        duration_ms=duration_ms,
        artwork_url=artwork_url,
        position=max_pos,
    )


def remove_track(playlist_id, user, track_mbid: str) -> None:
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=True)
    try:
        pt = PlaylistTrack.objects.get(playlist=playlist, track_mbid=track_mbid)
    except PlaylistTrack.DoesNotExist:
        raise ValueError("Track not found in this playlist.")
    pt.delete()


def reorder_track(playlist_id, user, track_mbid: str, new_position: int) -> PlaylistTrack:
    """Single-track reorder (existing endpoint, kept for backward compat)."""
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=True)
    try:
        pt = PlaylistTrack.objects.get(playlist=playlist, track_mbid=track_mbid)
    except PlaylistTrack.DoesNotExist:
        raise ValueError("Track not found in this playlist.")
    pt.position = new_position
    pt.save(update_fields=['position'])
    return pt


def reorder_tracks_bulk(playlist_id, user, positions: list) -> None:
    """
    Bulk reorder: positions is a list of {'id': str, 'position': int}.
    All track IDs must belong to this playlist.
    Updates atomically.
    """
    playlist = _get_playlist_with_access(playlist_id, user, require_edit=True)
    track_ids = [item['id'] for item in positions]
    tracks = {
        str(pt.id): pt
        for pt in PlaylistTrack.objects.filter(playlist=playlist, id__in=track_ids)
    }
    if len(tracks) != len(track_ids):
        raise ValueError("One or more track IDs do not belong to this playlist.")
    with transaction.atomic():
        for item in positions:
            pt = tracks[str(item['id'])]
            pt.position = int(item['position'])
            pt.save(update_fields=['position'])


# ---------------------------------------------------------------------------
# Collaborators
# ---------------------------------------------------------------------------

def get_collaborators(playlist_id, user):
    """Return collaborators queryset. Owner only."""
    playlist = _get_playlist_or_404(playlist_id)
    if playlist.owner != user:
        raise PermissionError("Only the owner can view collaborators.")
    return playlist.collaborators.select_related('user').all()


def add_collaborator(playlist_id, owner, user_to_add, permission: str = 'viewer') -> PlaylistCollaborator:
    """Add a collaborator. Owner only. Owner cannot be added as collaborator."""
    playlist = _get_playlist_or_404(playlist_id)
    if playlist.owner != owner:
        raise PermissionError("Only the owner can add collaborators.")
    if user_to_add == owner:
        raise ValueError("The playlist owner cannot be added as a collaborator.")
    if permission not in (PlaylistCollaborator.PERMISSION_EDITOR, PlaylistCollaborator.PERMISSION_VIEWER):
        raise ValueError("permission must be 'editor' or 'viewer'.")
    collab, created = PlaylistCollaborator.objects.get_or_create(
        playlist=playlist,
        user=user_to_add,
        defaults={'permission': permission},
    )
    if not created:
        raise ValueError("User is already a collaborator on this playlist.")
    return collab


def update_collaborator_permission(playlist_id, owner, user_id, permission: str) -> PlaylistCollaborator:
    """Change a collaborator's permission. Owner only."""
    playlist = _get_playlist_or_404(playlist_id)
    if playlist.owner != owner:
        raise PermissionError("Only the owner can update collaborator permissions.")
    if permission not in (PlaylistCollaborator.PERMISSION_EDITOR, PlaylistCollaborator.PERMISSION_VIEWER):
        raise ValueError("permission must be 'editor' or 'viewer'.")
    try:
        collab = PlaylistCollaborator.objects.get(playlist=playlist, user_id=user_id)
    except PlaylistCollaborator.DoesNotExist:
        raise ValueError("Collaborator not found.")
    collab.permission = permission
    collab.save(update_fields=['permission'])
    return collab


def remove_collaborator(playlist_id, owner, user_id) -> None:
    """Remove a collaborator. Owner only."""
    playlist = _get_playlist_or_404(playlist_id)
    if playlist.owner != owner:
        raise PermissionError("Only the owner can remove collaborators.")
    try:
        collab = PlaylistCollaborator.objects.get(playlist=playlist, user_id=user_id)
    except PlaylistCollaborator.DoesNotExist:
        raise ValueError("Collaborator not found.")
    collab.delete()
