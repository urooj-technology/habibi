from api.models.data.notification import Notification
from api.serializers.data.base import DataRootSerializer


class NotificationSerializer(DataRootSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "link",
            "ref_type",
            "ref_id",
            "is_read",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
