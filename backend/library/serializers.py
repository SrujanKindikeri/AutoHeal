from rest_framework import serializers
from library.models import (
    UserLibraryItem,
    UserCollection,
    CollectionItem,
    UserFavorite,
    UserFollow,
    VALID_STATUSES,
    CONTENT_TYPE_CHOICES,
)


class UserLibraryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLibraryItem
        fields = [
            'id', 'content_type', 'object_id', 'status',
            'added_at', 'updated_at', 'personal_rating', 'notes',
        ]
        read_only_fields = ['id', 'added_at', 'updated_at']

    def validate(self, data):
        # On update, content_type may not be in data; fall back to instance value.
        content_type = data.get('content_type') or (
            self.instance.content_type if self.instance else None
        )
        status = data.get('status') or (
            self.instance.status if self.instance else None
        )
        if content_type and status:
            valid = VALID_STATUSES.get(content_type, [])
            if valid and status not in valid:
                raise serializers.ValidationError(
                    {'status': f"'{status}' is not valid for content_type '{content_type}'. "
                               f"Valid choices: {valid}"}
                )
        return data


class CollectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionItem
        fields = ['id', 'content_type', 'object_id', 'position', 'added_at']
        read_only_fields = ['id', 'added_at']


class UserCollectionSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = UserCollection
        fields = [
            'id', 'name', 'description', 'cover_image_url',
            'privacy', 'created_at', 'updated_at', 'item_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.items.count()


class UserCollectionDetailSerializer(UserCollectionSerializer):
    items = CollectionItemSerializer(many=True, read_only=True)

    class Meta(UserCollectionSerializer.Meta):
        fields = UserCollectionSerializer.Meta.fields + ['items']


class UserFavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFavorite
        fields = ['id', 'content_type', 'object_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserFollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFollow
        fields = ['id', 'artist_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReorderItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    position = serializers.IntegerField(min_value=0)
