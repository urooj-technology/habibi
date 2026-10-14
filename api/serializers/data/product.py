import re

from rest_framework import serializers

from api.models.data.product import Product
from api.serializers.data.base import DataRootSerializer

BARCODE_PATTERN = re.compile(r"^[0-9A-Za-z\-_.]+$")


class ProductSerializer(DataRootSerializer):
    category_details = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"
        extra_kwargs = {
            "name": {"validators": []},
            "barcode": {
                "validators": [],
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    def get_category_details(self, obj):
        if obj.category:
            return {
                "id": obj.category.id,
                "name": obj.category.name,
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

    def validate_barcode(self, value):
        barcode = (value or "").strip()
        if not barcode:
            return None
        if not BARCODE_PATTERN.match(barcode):
            raise serializers.ValidationError(
                "Barcode may only contain letters, digits, '-', '_' and '.'."
            )

        qs = Product.all_objects.filter(barcode=barcode)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        restore = getattr(self, "_restore_product", None)
        if restore:
            qs = qs.exclude(pk=restore.pk)

        existing = qs.first()
        if existing:
            if existing.is_deleted:
                raise serializers.ValidationError(
                    f"This barcode belongs to the deleted product \"{existing.name}\"."
                )
            raise serializers.ValidationError(
                f"This barcode is already used by \"{existing.name}\"."
            )
        return barcode

    def create(self, validated_data):
        restore = getattr(self, "_restore_product", None)
        if restore:
            if not validated_data.get("barcode"):
                validated_data.pop("barcode", None)
            for field, value in validated_data.items():
                setattr(restore, field, value)
            restore.is_deleted = False
            restore.deleted_at = None
            restore.save()
            return restore
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "barcode" in validated_data and not validated_data["barcode"]:
            # Clearing the barcode on edit keeps the existing one rather than
            # silently issuing a new code that is already printed on labels.
            validated_data.pop("barcode")
        return super().update(instance, validated_data)
