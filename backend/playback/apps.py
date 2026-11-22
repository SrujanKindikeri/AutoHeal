from django.apps import AppConfig


class PlaybackConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'playback'

    def ready(self):
        # Import all provider modules so their @registry.register decorators fire.
        import playback.providers.youtube_embed  # noqa: F401
        import playback.providers.deep_link      # noqa: F401
