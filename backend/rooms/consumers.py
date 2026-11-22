"""
RoomPlaybackConsumer — WebSocket consumer for synchronized room playback.

Connection: ws/rooms/<room_id>/?token=<jwt>

Message protocol (JSON):
  Client → Server:
    {"type": "play"}
    {"type": "pause"}
    {"type": "seek", "position": <float>}
    {"type": "change_content", "content_id": "<id>", "content_type": "<type>"}
    {"type": "ping"}

  Server → Client:
    {"type": "state",    ...full playback state...}
    {"type": "play",     "position": <float>, "is_playing": true}
    {"type": "pause",    "position": <float>, "is_playing": false}
    {"type": "seek",     "position": <float>}
    {"type": "content_changed", "content_id": ..., "content_type": ...}
    {"type": "participant_joined", "user_id": ..., "username": ...}
    {"type": "participant_left",   "user_id": ..., "username": ...}
    {"type": "host_changed", "new_host_id": ..., "new_host_username": ...}
    {"type": "room_ended"}
    {"type": "error",   "message": "..."}
    {"type": "pong"}

Volume is LOCAL — never broadcast or sync.
"""
import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


class RoomPlaybackConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f"room_{self.room_id}"
        self.user = self.scope.get('user')

        # Reject unauthenticated connections
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        # Load room + validate access
        room, participant = await self._get_room_and_participant()
        if room is None:
            await self.close(code=4404)
            return

        # Private room: must be a known participant or have been invited
        if room.visibility == 'private' and participant is None:
            await self.close(code=4403)
            return

        # Capacity check
        count = await self._active_participant_count(room)
        if count >= room.max_participants and participant is None:
            await self.close(code=4409)
            return

        # Create / re-activate participant (never demote an existing host)
        await self._join_room(room)

        # Join channels group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send full current state to this client
        state = await self._get_playback_state(room)
        participants = await self._get_participants(room)
        await self.send(json.dumps({
            "type": "state",
            "room_id": str(room.id),
            "room_name": room.name,
            "room_type": room.room_type,
            **state,
            "participants": participants,
        }))

        # Broadcast join event to other participants
        await self.channel_layer.group_send(self.group_name, {
            "type": "room.participant_joined",
            "user_id": str(self.user.id),
            "username": self.user.username,
        })

    async def disconnect(self, close_code):
        if not hasattr(self, 'group_name'):
            return

        room, participant = await self._get_room_and_participant()
        if room and participant:
            was_host = await self._is_host(room)
            await self._leave_room(room)

            if was_host:
                new_host = await self._transfer_host(room)
                if new_host:
                    await self.channel_layer.group_send(self.group_name, {
                        "type": "room.host_changed",
                        "new_host_id": str(new_host.user.id),
                        "new_host_username": new_host.user.username,
                    })
                else:
                    await self._end_room(room)
                    await self.channel_layer.group_send(self.group_name, {
                        "type": "room.room_ended",
                    })

            await self.channel_layer.group_send(self.group_name, {
                "type": "room.participant_left",
                "user_id": str(self.user.id),
                "username": self.user.username,
            })

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON.")
            return

        msg_type = data.get('type', '')

        if msg_type == 'ping':
            await self.send(json.dumps({"type": "pong"}))
            return

        room, _ = await self._get_room_and_participant()
        if room is None:
            await self._send_error("Room not found.")
            return

        # Host-only controls
        if msg_type in ('play', 'pause', 'seek', 'change_content'):
            if not await self._is_controller(room):
                await self._send_error("Only the host can control playback.")
                return

            if msg_type == 'play':
                await self._update_playback_state(room, is_playing=True)
                position = await self._compute_position(room)
                await self.channel_layer.group_send(self.group_name, {
                    "type": "room.play",
                    "position": position,
                    "is_playing": True,
                })

            elif msg_type == 'pause':
                position = await self._compute_position(room)
                await self._update_playback_state(room, is_playing=False, position=position)
                await self.channel_layer.group_send(self.group_name, {
                    "type": "room.pause",
                    "position": position,
                    "is_playing": False,
                })

            elif msg_type == 'seek':
                try:
                    position = float(data['position'])
                except (KeyError, TypeError, ValueError):
                    await self._send_error("seek requires a numeric 'position'.")
                    return
                await self._update_playback_state(room, position=position)
                await self.channel_layer.group_send(self.group_name, {
                    "type": "room.seek",
                    "position": position,
                })

            elif msg_type == 'change_content':
                content_id = data.get('content_id', '')
                content_type = data.get('content_type', '')
                if not content_id:
                    await self._send_error("change_content requires 'content_id'.")
                    return
                await self._update_room_content(room, content_id, content_type)
                await self.channel_layer.group_send(self.group_name, {
                    "type": "room.content_changed",
                    "content_id": content_id,
                    "content_type": content_type,
                })
        else:
            await self._send_error(f"Unknown message type: {msg_type}")

    # ---- Group message handlers ----

    async def room_play(self, event):
        await self.send(json.dumps({
            "type": "play",
            "position": event["position"],
            "is_playing": event["is_playing"],
        }))

    async def room_pause(self, event):
        await self.send(json.dumps({
            "type": "pause",
            "position": event["position"],
            "is_playing": event["is_playing"],
        }))

    async def room_seek(self, event):
        await self.send(json.dumps({
            "type": "seek",
            "position": event["position"],
        }))

    async def room_content_changed(self, event):
        await self.send(json.dumps({
            "type": "content_changed",
            "content_id": event["content_id"],
            "content_type": event["content_type"],
        }))

    async def room_participant_joined(self, event):
        await self.send(json.dumps({
            "type": "participant_joined",
            "user_id": event["user_id"],
            "username": event["username"],
        }))

    async def room_participant_left(self, event):
        await self.send(json.dumps({
            "type": "participant_left",
            "user_id": event["user_id"],
            "username": event["username"],
        }))

    async def room_host_changed(self, event):
        await self.send(json.dumps({
            "type": "host_changed",
            "new_host_id": event["new_host_id"],
            "new_host_username": event["new_host_username"],
        }))

    async def room_room_ended(self, event):
        await self.send(json.dumps({"type": "room_ended"}))

    # ---- DB helpers ----

    @database_sync_to_async
    def _get_room_and_participant(self):
        from rooms.models import Room, RoomParticipant
        try:
            room = Room.objects.get(id=self.room_id)
            participant = RoomParticipant.objects.filter(
                room=room, user=self.user
            ).first()
            return room, participant
        except Room.DoesNotExist:
            return None, None

    @database_sync_to_async
    def _active_participant_count(self, room):
        from rooms.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room=room, status=RoomParticipant.STATUS_JOINED
        ).count()

    @database_sync_to_async
    def _join_room(self, room):
        from rooms.models import RoomParticipant
        participant = RoomParticipant.objects.filter(room=room, user=self.user).first()
        if participant:
            # Only update connection status and joined_at; NEVER overwrite role
            participant.status = RoomParticipant.STATUS_JOINED
            participant.joined_at = participant.joined_at or timezone.now()
            participant.connection_status = RoomParticipant.CONNECTION_CONNECTED
            participant.save(update_fields=['status', 'joined_at', 'connection_status'])
        else:
            RoomParticipant.objects.create(
                room=room,
                user=self.user,
                role=RoomParticipant.ROLE_PARTICIPANT,
                status=RoomParticipant.STATUS_JOINED,
                joined_at=timezone.now(),
                connection_status=RoomParticipant.CONNECTION_CONNECTED,
            )

    @database_sync_to_async
    def _leave_room(self, room):
        from rooms.models import RoomParticipant
        RoomParticipant.objects.filter(
            room=room, user=self.user, status=RoomParticipant.STATUS_JOINED
        ).update(
            status=RoomParticipant.STATUS_LEFT,
            left_at=timezone.now(),
            connection_status=RoomParticipant.CONNECTION_DISCONNECTED,
        )

    @database_sync_to_async
    def _is_host(self, room):
        from rooms.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room=room, user=self.user,
            role=RoomParticipant.ROLE_HOST,
            status=RoomParticipant.STATUS_JOINED,
        ).exists()

    @database_sync_to_async
    def _is_controller(self, room):
        from rooms.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room=room, user=self.user,
            role__in=[RoomParticipant.ROLE_HOST, RoomParticipant.ROLE_CO_HOST],
            status=RoomParticipant.STATUS_JOINED,
        ).exists()

    @database_sync_to_async
    def _transfer_host(self, room):
        from rooms.models import RoomParticipant
        next_p = RoomParticipant.objects.filter(
            room=room, status=RoomParticipant.STATUS_JOINED
        ).exclude(user=self.user).select_related('user').first()
        if next_p:
            next_p.role = RoomParticipant.ROLE_HOST
            next_p.save(update_fields=['role'])
            return next_p
        return None

    @database_sync_to_async
    def _end_room(self, room):
        from rooms.models import Room
        room.status = Room.STATUS_ENDED
        room.end_time = timezone.now()
        room.save(update_fields=['status', 'end_time'])

    @database_sync_to_async
    def _get_playback_state(self, room):
        from playback.models import RoomPlaybackState
        try:
            state = RoomPlaybackState.objects.get(room=room)
            position = state.compute_current_position()
            return {
                "is_playing": state.is_playing,
                "position": position,
                "status": state.status,
                "current_content": state.current_content,
            }
        except RoomPlaybackState.DoesNotExist:
            return {
                "is_playing": False,
                "position": 0.0,
                "status": "idle",
                "current_content": {},
            }

    @database_sync_to_async
    def _get_participants(self, room):
        from rooms.models import RoomParticipant
        participants = RoomParticipant.objects.filter(
            room=room, status=RoomParticipant.STATUS_JOINED
        ).select_related('user')
        return [
            {
                "user_id": str(p.user.id),
                "username": p.user.username,
                "role": p.role,
                "readiness_state": p.readiness_state,
            }
            for p in participants
        ]

    @database_sync_to_async
    def _update_playback_state(self, room, is_playing=None, position=None):
        from playback.models import RoomPlaybackState
        state, _ = RoomPlaybackState.objects.get_or_create(
            room=room,
            defaults={
                'is_playing': False,
                'position_seconds': 0.0,
                'last_updated_at': timezone.now(),
                'updated_by': self.user,
            }
        )
        update_fields = ['last_updated_at', 'updated_by', 'version']
        if is_playing is not None:
            state.is_playing = is_playing
            if is_playing:
                state.status = RoomPlaybackState.STATUS_PLAYING
            else:
                state.status = RoomPlaybackState.STATUS_PAUSED
            update_fields += ['is_playing', 'status']
        if position is not None:
            state.position_seconds = position
            update_fields.append('position_seconds')
        state.last_updated_at = timezone.now()
        state.updated_by = self.user
        state.version = state.version + 1
        state.save(update_fields=update_fields)

    @database_sync_to_async
    def _compute_position(self, room):
        from playback.models import RoomPlaybackState
        try:
            state = RoomPlaybackState.objects.get(room=room)
            return state.compute_current_position()
        except RoomPlaybackState.DoesNotExist:
            return 0.0

    @database_sync_to_async
    def _update_room_content(self, room, content_id, content_type):
        from playback.models import RoomPlaybackState, PlaybackEvent
        state, _ = RoomPlaybackState.objects.get_or_create(
            room=room,
            defaults={
                'is_playing': False, 'position_seconds': 0.0,
                'last_updated_at': timezone.now(), 'updated_by': self.user,
            }
        )
        state.current_content = {'content_id': content_id, 'content_type': content_type}
        state.position_seconds = 0.0
        state.is_playing = False
        state.status = RoomPlaybackState.STATUS_IDLE
        state.last_updated_at = timezone.now()
        state.updated_by = self.user
        state.version += 1
        state.save(update_fields=[
            'current_content', 'position_seconds', 'is_playing', 'status',
            'last_updated_at', 'updated_by', 'version'
        ])
        # Log as a playback event
        PlaybackEvent.objects.create(
            room=room,
            actor=self.user,
            event_type=PlaybackEvent.EVENT_SEEK,
            position_seconds=0.0,
            metadata={'content_changed': True, 'content_id': content_id, 'content_type': content_type},
        )

    async def _send_error(self, message):
        await self.send(json.dumps({"type": "error", "message": message}))
