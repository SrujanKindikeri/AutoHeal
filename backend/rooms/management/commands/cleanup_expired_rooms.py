"""
Management command: cleanup_expired_rooms

Marks expired invitations, closes inactive rooms, and deletes terminal
invitations past a retention window.

Usage:
    python manage.py cleanup_expired_rooms [--dry-run] [--inactive-hours=24] [--retention-days=7]

Recommended cron (runs every 15 minutes):
    */15 * * * * /path/to/venv/bin/python /path/to/manage.py cleanup_expired_rooms

No Celery required.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from rooms.models import Room, RoomInvitation, RoomParticipant


class Command(BaseCommand):
    help = 'Clean up expired invitations and stale rooms.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview changes without committing them.',
        )
        parser.add_argument(
            '--inactive-hours', type=int, default=24,
            help='Hours of inactivity before a waiting/live room is closed (default: 24).',
        )
        parser.add_argument(
            '--retention-days', type=int, default=7,
            help='Days to retain terminal (accepted/rejected/expired/revoked) invitations before deletion (default: 7).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        inactive_threshold = timezone.now() - timedelta(hours=options['inactive_hours'])
        retention_cutoff = timezone.now() - timedelta(days=options['retention_days'])
        prefix = '[DRY RUN] ' if dry_run else ''

        # 1. Mark pending invitations as expired
        pending_expired = RoomInvitation.objects.filter(
            status=RoomInvitation.STATUS_PENDING,
            expires_at__lt=timezone.now(),
        )
        count = pending_expired.count()
        self.stdout.write(f"{prefix}Expiring {count} pending invitations...")
        if not dry_run and count:
            pending_expired.update(status=RoomInvitation.STATUS_EXPIRED)

        # 2. Delete terminal invitations past retention window
        terminal_statuses = [
            RoomInvitation.STATUS_ACCEPTED,
            RoomInvitation.STATUS_REJECTED,
            RoomInvitation.STATUS_EXPIRED,
            RoomInvitation.STATUS_REVOKED,
        ]
        old_terminal = RoomInvitation.objects.filter(
            status__in=terminal_statuses,
            updated_at__lt=retention_cutoff,
        )
        count = old_terminal.count()
        self.stdout.write(f"{prefix}Deleting {count} terminal invitations past retention window...")
        if not dry_run and count:
            old_terminal.delete()

        # 3. Close waiting/live rooms with no active participants past threshold
        stale_rooms = Room.objects.filter(
            status__in=[Room.STATUS_WAITING, Room.STATUS_LIVE],
            updated_at__lt=inactive_threshold,
        )
        closed = 0
        for room in stale_rooms:
            active = RoomParticipant.objects.filter(
                room=room, status=RoomParticipant.STATUS_JOINED
            ).count()
            if active == 0:
                self.stdout.write(f"{prefix}Closing inactive room: {room.name} ({room.id})")
                if not dry_run:
                    room.status = Room.STATUS_ENDED
                    room.end_time = timezone.now()
                    room.save(update_fields=['status', 'end_time'])
                closed += 1

        # 4. Close rooms that have an explicit end_time in the past but status not ended
        past_end_rooms = Room.objects.filter(
            end_time__lt=timezone.now(),
        ).exclude(status__in=[Room.STATUS_ENDED, Room.STATUS_CANCELLED])
        count = past_end_rooms.count()
        self.stdout.write(f"{prefix}Closing {count} rooms past their end_time...")
        if not dry_run and count:
            past_end_rooms.update(status=Room.STATUS_ENDED)

        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Cleanup complete: {closed} inactive rooms closed."
        ))
