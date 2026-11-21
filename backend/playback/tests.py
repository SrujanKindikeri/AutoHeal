"""
Regression tests for playback.models import chain (Phase fix).
"""

from django.test import TestCase


class PlaybackModelsImportTest(TestCase):
    """
    Verifies that all four playback models can be imported and that
    PlaybackSession status constants have the correct values.
    """

    def test_model_imports_succeed(self):
        from playback.models import (
            PlaybackSession,
            PlaybackProvider,
            UserProviderConnection,
            ContentProviderAvailability,
        )
        self.assertIsNotNone(PlaybackSession)
        self.assertIsNotNone(PlaybackProvider)
        self.assertIsNotNone(UserProviderConnection)
        self.assertIsNotNone(ContentProviderAvailability)

    def test_playback_session_status_active(self):
        from playback.models import PlaybackSession
        self.assertEqual(PlaybackSession.STATUS_ACTIVE, 'active')

    def test_playback_session_status_constants(self):
        from playback.models import PlaybackSession
        self.assertEqual(PlaybackSession.STATUS_INITIATED, 'initiated')
        self.assertEqual(PlaybackSession.STATUS_ACTIVE, 'active')
        self.assertEqual(PlaybackSession.STATUS_PAUSED, 'paused')
        self.assertEqual(PlaybackSession.STATUS_ENDED, 'ended')
        self.assertEqual(PlaybackSession.STATUS_EXPIRED, 'expired')

    def test_playback_provider_type_constants(self):
        from playback.models import PlaybackProvider
        self.assertEqual(PlaybackProvider.PROVIDER_TYPE_OPEN_CONTENT, 'open_content')
        self.assertEqual(PlaybackProvider.PROVIDER_TYPE_OTT_AGGREGATOR, 'ott_aggregator')
        self.assertEqual(PlaybackProvider.PROVIDER_TYPE_LICENSED_EMBED, 'licensed_embed')
        self.assertEqual(PlaybackProvider.PROVIDER_TYPE_PARTNER_API, 'partner_api')

    def test_content_provider_availability_constants(self):
        from playback.models import ContentProviderAvailability
        self.assertEqual(ContentProviderAvailability.STATUS_AVAILABLE, 'available')
        self.assertEqual(ContentProviderAvailability.STATUS_UNAVAILABLE, 'unavailable')
        self.assertEqual(ContentProviderAvailability.MONETIZATION_OPEN_ACCESS, 'free')
        self.assertEqual(ContentProviderAvailability.MONETIZATION_FLATRATE, 'flatrate')
