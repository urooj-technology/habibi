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
                "description": obj.product.description,
            }
        return None
