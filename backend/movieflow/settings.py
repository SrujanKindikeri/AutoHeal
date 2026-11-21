"""
Django settings for MovieFlow project.
Phase 1: Architecture, Environment, Channels, PostgreSQL & Redis.
"""

from pathlib import Path
import os
import sys
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-movieflow-apple-inspired-secret-key-2025'
)

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

from django.core.exceptions import ImproperlyConfigured
if not DEBUG and not ('test' in sys.argv) and SECRET_KEY.startswith('django-insecure'):
    raise ImproperlyConfigured("Insecure SECRET_KEY used in production. A strong unique key must be set via environment variable.")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,backend').split(',')
    if host.strip()
]

# Application definition
SKIP_DAPHNE = os.getenv('SKIP_DAPHNE', 'False').lower() in ('true', '1', 'yes') or any(
    cmd in sys.argv for cmd in ['test', 'makemigrations', 'migrate', 'collectstatic', 'check']
)

INSTALLED_APPS = []
if not SKIP_DAPHNE:
    INSTALLED_APPS.append('daphne')

INSTALLED_APPS += [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',

    # Core & MovieFlow apps
    'core',
    'accounts.apps.AccountsConfig',
    'notifications.apps.NotificationsConfig',
    'friendships.apps.FriendshipsConfig',
    'entertainment.apps.EntertainmentConfig',
    'music.apps.MusicConfig',
    'library.apps.LibraryConfig',
    'rooms.apps.RoomsConfig',
    'playback.apps.PlaybackConfig',
    'history.apps.HistoryConfig',
    'administration.apps.AdministrationConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'movieflow.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'movieflow.wsgi.application'
ASGI_APPLICATION = 'movieflow.asgi.application'

# Database Configuration
USE_SQLITE = os.getenv('USE_SQLITE', 'False').lower() in ('true', '1', 'yes')

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # PostgreSQL Configuration
    database_url = os.getenv('DATABASE_URL', '')
    if database_url.startswith('postgresql://') or database_url.startswith('postgres://'):
        # Parse standard postgres URL
        import urllib.parse as up
        up.uses_netloc.append('postgres')
        up.uses_netloc.append('postgresql')
        url = up.urlparse(database_url)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': url.path[1:],
                'USER': url.username or 'movieflow_user',
                'PASSWORD': url.password or 'movieflow_pass',
                'HOST': url.hostname or 'localhost',
                'PORT': url.port or 5432,
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.getenv('DB_NAME', 'movieflow_db'),
                'USER': os.getenv('DB_USER', 'movieflow_user'),
                'PASSWORD': os.getenv('DB_PASSWORD', 'movieflow_pass'),
                'HOST': os.getenv('DB_HOST', 'localhost'),
                'PORT': os.getenv('DB_PORT', '5432'),
            }
        }

# Channel Layers Configuration (Redis with InMemory fallback)
TESTING = 'test' in sys.argv
USE_IN_MEMORY_CHANNELS = (os.getenv('USE_IN_MEMORY_CHANNELS', 'False').lower() in ('true', '1', 'yes')) or TESTING
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

if USE_IN_MEMORY_CHANNELS:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Email Configuration
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'MovieFlow <noreply@movieflow.app>')

if DEBUG and not EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '300/minute',
        'auth_login': '15/minute',
        'auth_register': '10/minute',
        'auth_password_reset': '5/minute',
        'auth_resend_verification': '3/hour',
        'file_upload': '20/minute',
    },
}

# SimpleJWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', '60'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '7'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = DEBUG and (os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes'))
CORS_ALLOW_CREDENTIALS = True
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

# Security Headers & Cookie Protection (Phase 22)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes')
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# TMDB
TMDB_API_KEY = os.getenv('TMDB_API_KEY', '')
TMDB_READ_ACCESS_TOKEN = os.getenv('TMDB_READ_ACCESS_TOKEN', '')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

# MusicBrainz / Music (Phase 6)
MUSICBRAINZ_USER_AGENT = 'MovieFlow/6.0 (movieflow@example.com)'
MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2'
COVER_ART_ARCHIVE_BASE_URL = 'https://coverartarchive.org'

# Real-Time Voice Communication (Phase 18)
LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'wss://movieflow-livekit.internal')
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY', 'devkey')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'secret_key_movieflow_voice_2025_secure')
VOICE_DEFAULT_PROVIDER = os.getenv('VOICE_DEFAULT_PROVIDER', 'livekit')

# STUN / TURN ICE Configuration
RTC_ICE_SERVERS = [
    {'urls': ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']},
]
TURN_SERVER_URL = os.getenv('TURN_SERVER_URL', '')
TURN_USERNAME = os.getenv('TURN_USERNAME', '')
TURN_CREDENTIAL = os.getenv('TURN_CREDENTIAL', '')
if TURN_SERVER_URL:
    RTC_ICE_SERVERS.append({
        'urls': [TURN_SERVER_URL],
        'username': TURN_USERNAME,
        'credential': TURN_CREDENTIAL,
    })


