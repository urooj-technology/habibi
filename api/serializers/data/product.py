from rest_framework import serializers

from api.models.data.product import Product
from api.serializers.data.base import DataRootSerializer


class ProductSerializer(DataRootSerializer):
    category_details = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"
        extra_kwargs = {
            "name": {"validators": []},
        }

    def get_category_details(self, obj):
        if obj.category:
            return {
                "id": obj.category.id,
                "name": obj.category.name,
                "description": obj.category.description,
            }
        return None

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Product name is required.")

        qs = Product.all_objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        existing = qs.first()
        if not existing:
            self._restore_product = None
            return name

        if existing.is_deleted:
            self._restore_product = existing
            return name

        raise serializers.ValidationError(
            "A product with this name already exists. Choose a different name or edit the existing product."
        )

    def create(self, validated_data):
        restore = getattr(self, "_restore_product", None)
        if restore:
            for field, value in validated_data.items():
                setattr(restore, field, value)
            restore.is_deleted = False
            restore.deleted_at = None
            restore.save()
            return restore
        return super().create(validated_data)
