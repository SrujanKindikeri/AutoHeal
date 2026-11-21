import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RoomInvitation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(db_index=True, max_length=128, unique=True)),
                ('room_name', models.CharField(default='Movie Room', max_length=200)),
                ('invitee_email', models.EmailField(blank=True, default='')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('accepted', 'Accepted'),
                        ('rejected', 'Rejected'),
                        ('expired', 'Expired'),
                        ('revoked', 'Revoked'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('inviter', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_room_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('invitee', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_room_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Room Invitation',
                'verbose_name_plural': 'Room Invitations',
                'db_table': 'mf_room_invitations',
            },
        ),
    ]
