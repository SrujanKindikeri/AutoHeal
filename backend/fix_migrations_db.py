"""
One-time script to remove stale migration records from SQLite
for apps that have .py migration files missing on disk.
Run as: python fix_migrations_db.py
"""
import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

to_remove = [
    ('rooms', '0002_roomsettings_allow_cohosts_and_more'),
    ('rooms', '0003_room_playback_provider_and_more'),
    ('rooms', '0004_alter_roomevent_event_type_roominvitation'),
    ('rooms', '0005_roomsettings_chat_permission_mode_roommessage_and_more'),
    ('rooms', '0006_roomsettings_voice_permission_mode_voicesession_and_more'),
    ('rooms', '0007_roomsettings_video_permission_mode_and_more'),
    ('rooms', '0008_remove_voiceparticipant_mf_voice_pa_voice_s_c35a5b_idx_and_more'),
    ('playback', '0001_initial'),
    ('playback', '0002_roomplaybackstate_playbackevent'),
    ('music', '0003_musicplaybackprovider_musicproviderconnection_and_more'),
    ('music', '0004_musicplaybackevent_musicroomplaybackstate_and_more'),
    ('notifications', '0003_notificationpreference_chat_mentions_and_more'),
    ('history', '0001_initial'),
    ('administration', '0001_initial'),
]

for app, name in to_remove:
    cur.execute("DELETE FROM django_migrations WHERE app=? AND name=?", (app, name))
    print(f"Removed: {app}.{name}")

conn.commit()

print("\nRemaining migrations:")
cur.execute("SELECT app, name FROM django_migrations ORDER BY app, id")
for row in cur.fetchall():
    print(row)

conn.close()
print("\nDone.")
