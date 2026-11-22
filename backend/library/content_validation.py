"""
In-house file content validation using magic byte sniffing.
No python-magic dependency required.

Validates that an uploaded file's actual content matches the expected media type
(movie or audio) rather than trusting the file extension.
"""
import io
import struct
from typing import Tuple, Optional


# ---------------------------------------------------------------------------
# Magic byte signatures
# ---------------------------------------------------------------------------

# (offset, bytes_to_match, mime_type)
_VIDEO_SIGNATURES = [
    # MP4 / M4V / MOV  – ftyp box at offset 4
    (4, b'ftyp', 'video/mp4'),
    (4, b'ftypisom', 'video/mp4'),
    (4, b'ftypmp42', 'video/mp4'),
    (4, b'ftypM4V ', 'video/mp4'),
    (4, b'ftypqt  ', 'video/quicktime'),
    # AVI
    (0, b'RIFF', None),  # second check at offset 8 needed
    # MKV / WebM
    (0, b'\x1a\x45\xdf\xa3', 'video/x-matroska'),
    # MPEG-2 TS
    (0, b'\x47', None),  # single sync byte — too ambiguous alone, skip
    # FLV
    (0, b'FLV\x01', 'video/x-flv'),
    # WMV / ASF
    (0, b'\x30\x26\xb2\x75\x8e\x66\xcf\x11', 'video/x-ms-wmv'),
    # OGV
    (0, b'OggS', 'video/ogg'),
]

_AUDIO_SIGNATURES = [
    # MP3 (ID3v2)
    (0, b'ID3', 'audio/mpeg'),
    # MP3 (no ID3 — sync word 0xFF 0xFB / 0xFF 0xFA / 0xFF 0xF3 / 0xFF 0xF2)
    (0, b'\xff\xfb', 'audio/mpeg'),
    (0, b'\xff\xfa', 'audio/mpeg'),
    (0, b'\xff\xf3', 'audio/mpeg'),
    (0, b'\xff\xf2', 'audio/mpeg'),
    # AAC ADTS
    (0, b'\xff\xf1', 'audio/aac'),
    (0, b'\xff\xf9', 'audio/aac'),
    # M4A (MP4 audio) – ftyp box at offset 4
    (4, b'ftypM4A ', 'audio/mp4'),
    (4, b'ftypmp42', 'audio/mp4'),
    (4, b'ftypisom', 'audio/mp4'),
    # FLAC
    (0, b'fLaC', 'audio/flac'),
    # OGG/Opus/Vorbis
    (0, b'OggS', 'audio/ogg'),
    # WAV
    (0, b'RIFF', None),  # second check at offset 8 (WAVE)
    # AIFF
    (0, b'FORM', None),  # second check at offset 8 (AIFF)
    # WMA / ASF
    (0, b'\x30\x26\xb2\x75\x8e\x66\xcf\x11', 'audio/x-ms-wma'),
    # OPUS (bare, no Ogg container) – rare, skip
]

ALLOWED_VIDEO_TYPES = {
    'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm',
    'video/x-flv', 'video/x-ms-wmv', 'video/ogg', 'video/avi',
}

ALLOWED_AUDIO_TYPES = {
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/flac',
    'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/x-ms-wma', 'audio/aiff',
}


def _sniff_header(data: bytes) -> Optional[str]:
    """Return a detected MIME type from magic bytes, or None."""
    n = len(data)

    # RIFF container: AVI or WAV
    if n >= 12 and data[:4] == b'RIFF':
        subtype = data[8:12]
        if subtype == b'AVI ':
            return 'video/avi'
        if subtype == b'WAVE':
            return 'audio/wav'

    # FORM container: AIFF
    if n >= 12 and data[:4] == b'FORM':
        if data[8:12] == b'AIFF':
            return 'audio/aiff'

    # Check explicit video signatures
    for offset, sig, mime in _VIDEO_SIGNATURES:
        if sig is None:
            continue
        end = offset + len(sig)
        if n >= end and data[offset:end] == sig:
            return mime

    # Check explicit audio signatures
    for offset, sig, mime in _AUDIO_SIGNATURES:
        if sig is None:
            continue
        end = offset + len(sig)
        if n >= end and data[offset:end] == sig:
            return mime

    return None


def validate_video_file(file_obj) -> Tuple[bool, str, Optional[str]]:
    """
    Validate that file_obj contains actual video data.

    Reads the first 16 bytes, sniffs the magic bytes, then seeks back to 0.

    Returns:
        (is_valid: bool, error_message: str, detected_mime: Optional[str])
    """
    try:
        header = file_obj.read(16)
        file_obj.seek(0)
    except Exception as exc:
        return False, f"Cannot read file: {exc}", None

    mime = _sniff_header(header)
    if mime is None:
        return False, "File content does not match a recognised video format.", None
    if mime not in ALLOWED_VIDEO_TYPES:
        return False, f"File type '{mime}' is not an allowed video format.", mime
    return True, "", mime


def validate_audio_file(file_obj) -> Tuple[bool, str, Optional[str]]:
    """
    Validate that file_obj contains actual audio data.

    Returns:
        (is_valid: bool, error_message: str, detected_mime: Optional[str])
    """
    try:
        header = file_obj.read(16)
        file_obj.seek(0)
    except Exception as exc:
        return False, f"Cannot read file: {exc}", None

    mime = _sniff_header(header)
    if mime is None:
        return False, "File content does not match a recognised audio format.", None
    if mime not in ALLOWED_AUDIO_TYPES:
        return False, f"File type '{mime}' is not an allowed audio format.", mime
    return True, "", mime


def validate_image_file(file_obj) -> Tuple[bool, str, Optional[str]]:
    """Validate that file_obj is a JPEG, PNG, GIF, or WebP image."""
    _IMAGE_SIGS = [
        (0, b'\xff\xd8\xff', 'image/jpeg'),
        (0, b'\x89PNG\r\n\x1a\n', 'image/png'),
        (0, b'GIF87a', 'image/gif'),
        (0, b'GIF89a', 'image/gif'),
        (0, b'RIFF', None),  # WebP: RIFF....WEBP
        (0, b'\x00\x00\x00', None),  # could be WebP in ISOBMFF
    ]
    try:
        header = file_obj.read(16)
        file_obj.seek(0)
    except Exception as exc:
        return False, f"Cannot read file: {exc}", None

    for offset, sig, mime in _IMAGE_SIGS:
        if sig is None:
            continue
        end = offset + len(sig)
        if len(header) >= end and header[offset:end] == sig:
            # WebP special case
            if sig == b'RIFF' and len(header) >= 12 and header[8:12] == b'WEBP':
                return True, "", 'image/webp'
            if mime:
                return True, "", mime

    return False, "File content does not match a recognised image format (JPEG, PNG, GIF, WebP).", None
