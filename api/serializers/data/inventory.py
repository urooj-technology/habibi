from rest_framework import serializers
from api.models.data.inventory import Inventory
from api.serializers.data.base import DataRootSerializer


class InventorySerializer(DataRootSerializer):
    product_details = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = "__all__"

    def get_product_details(self, obj):
        if obj.product:
            return {
                "id": obj.product.id,
                "name": obj.product.name,
                "is_weight": obj.product.is_weight,
                "is_meter": obj.product.is_meter,
                "is_khada": obj.product.is_khada,
                "is_grain": obj.product.is_grain,
                "description": obj.product.description,
            }
        else:
            return None
